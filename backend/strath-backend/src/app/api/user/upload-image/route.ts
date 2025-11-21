import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";

// NOTE: In a real production app, you should upload to S3/Cloudinary.
// For this implementation, we'll assume the client sends a URL or base64 string
// and we just store it. If file upload is needed, we'd use formData.

export async function POST(req: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) {
            return errorResponse(new Error("No file provided"), 400);
        }

        // TODO: Implement actual file upload to storage (S3/Cloudinary)
        // For now, we'll just mock it and return a dummy URL
        const imageUrl = `https://placehold.co/600x400?text=Uploaded+Image`;

        // Optionally update profile photo if requested
        const isProfilePhoto = formData.get("isProfilePhoto") === "true";

        if (isProfilePhoto) {
            await db.update(profiles)
                .set({ profilePhoto: imageUrl })
                .where(eq(profiles.userId, session.user.id));
        } else {
            // Add to photos array
            const profile = await db.query.profiles.findFirst({
                where: eq(profiles.userId, session.user.id),
            });

            const currentPhotos = profile?.photos || [];
            await db.update(profiles)
                .set({ photos: [...currentPhotos, imageUrl] })
                .where(eq(profiles.userId, session.user.id));
        }

        return successResponse({ url: imageUrl });
    } catch (error) {
        return errorResponse(error);
    }
}
