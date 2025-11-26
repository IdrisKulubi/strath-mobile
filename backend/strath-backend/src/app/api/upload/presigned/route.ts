import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { session as sessionTable } from "@/db/schema";

export async function POST(req: NextRequest) {
    try {
        let session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session) {
            // Fallback: Manual token check if getSession fails (e.g. Bearer token issue)
            const authHeader = req.headers.get('authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const dbSession = await db.query.session.findFirst({
                    where: eq(sessionTable.token, token),
                    with: { user: true }
                });

                if (dbSession && dbSession.expiresAt > new Date()) {
                    session = {
                        session: dbSession,
                        user: dbSession.user
                    } as any;
                }
            }
        }

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { filename, contentType } = await req.json();

        if (!filename || !contentType) {
            return NextResponse.json({ error: "Filename and content type are required" }, { status: 400 });
        }

        const uniqueFilename = `uploads/${session.user.id}/${Date.now()}-${filename}`;

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: uniqueFilename,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
        const baseUrl = R2_PUBLIC_URL.startsWith("http") ? R2_PUBLIC_URL : `https://${R2_PUBLIC_URL}`;
        const publicUrl = `${baseUrl}/${uniqueFilename}`;

        return NextResponse.json({ signedUrl, publicUrl });
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
    }
}
