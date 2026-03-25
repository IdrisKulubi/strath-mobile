import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
    getSessionWithBearerFallback,
    isAllowedImageContentType,
    sanitizeUploadFilename,
} from "@/lib/security";

export async function POST(req: NextRequest) {
    try {
        let session = await auth.api.getSession({
            headers: await headers()
        });
        session ??= await getSessionWithBearerFallback(req);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { filename, contentType } = await req.json();

        if (!filename || !contentType) {
            return NextResponse.json({ error: "Filename and content type are required" }, { status: 400 });
        }

        if (!isAllowedImageContentType(contentType)) {
            return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
        }

        const safeFilename = sanitizeUploadFilename(filename);
        const uniqueFilename = `uploads/${session.user.id}/${Date.now()}-${safeFilename}`;

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: uniqueFilename,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(r2, command, { expiresIn: 600 });
        const baseUrl = R2_PUBLIC_URL.startsWith("http") ? R2_PUBLIC_URL : `https://${R2_PUBLIC_URL}`;
        const publicUrl = `${baseUrl}/${uniqueFilename}`;

        return NextResponse.json({ signedUrl, publicUrl });
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
    }
}
