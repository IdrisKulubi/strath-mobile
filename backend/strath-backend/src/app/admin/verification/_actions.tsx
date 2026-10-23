"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-auth";
import { updateFaceVerificationAssistanceStatus } from "@/lib/services/face-verification-assistance-service";
import {
    markFaceVerificationSessionReviewed,
    queueFaceVerificationSessionForProcessing,
} from "@/lib/services/face-verification-service";

export async function processVerificationSessionAction(formData: FormData) {
    await requireAdmin();

    const sessionId = formData.get("sessionId");
    if (typeof sessionId !== "string" || !sessionId) {
        throw new Error("Missing verification session id");
    }

    await queueFaceVerificationSessionForProcessing(sessionId);
    revalidatePath("/admin/verification");
}

export async function reviewVerificationSessionAction(formData: FormData) {
    await requireAdmin();

    const sessionId = formData.get("sessionId");
    const status = formData.get("status");
    const reason = formData.get("reason");

    if (typeof sessionId !== "string" || !sessionId) {
        throw new Error("Missing verification session id");
    }

    if (
        status !== "verified" &&
        status !== "manual_review" &&
        status !== "failed" &&
        status !== "blocked"
    ) {
        throw new Error("Invalid review status");
    }

    if (typeof reason !== "string" || reason.trim().length < 3) {
        throw new Error("Review reason is required");
    }

    await markFaceVerificationSessionReviewed(sessionId, status, reason.trim());
    revalidatePath("/admin/verification");
}

export async function updateVerificationAssistanceStatusAction(formData: FormData) {
    await requireAdmin();

    const assistanceId = formData.get("assistanceId");
    const status = formData.get("status");

    if (typeof assistanceId !== "string" || !assistanceId) {
        throw new Error("Missing assistance request id");
    }

    if (status !== "contacted" && status !== "resolved") {
        throw new Error("Invalid assistance status");
    }

    await updateFaceVerificationAssistanceStatus(assistanceId, status);
    revalidatePath("/admin/verification");
}
