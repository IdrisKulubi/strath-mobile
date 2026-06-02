import { and, eq } from "drizzle-orm";

import {
    faceVerificationAssistance,
    faceVerificationSessions,
    profiles,
    user,
} from "@/db/schema";
import { db } from "@/lib/db";
import {
    FACE_VERIFICATION_STATUSES,
    isFaceVerificationTerminalStatus,
} from "@/lib/services/face-verification-policy";
import type { SubmitFaceVerificationAssistanceInput } from "@/lib/validation/face-verification";

const ELIGIBLE_FAILURE_STATUSES = new Set<string>([
    FACE_VERIFICATION_STATUSES.RETRY_REQUIRED,
    FACE_VERIFICATION_STATUSES.FAILED,
]);

export async function submitFaceVerificationAssistance(
    userId: string,
    input: SubmitFaceVerificationAssistanceInput,
) {
    const session = await db.query.faceVerificationSessions.findFirst({
        where: and(
            eq(faceVerificationSessions.id, input.sessionId),
            eq(faceVerificationSessions.userId, userId),
        ),
    });

    if (!session) {
        throw new Error("Verification session not found.");
    }

    if (session.attemptNumber !== 1) {
        throw new Error("Assistance is only available after your first verification attempt.");
    }

    if (!ELIGIBLE_FAILURE_STATUSES.has(session.status)) {
        throw new Error("Assistance is only available when verification needs another try.");
    }

    if (!isFaceVerificationTerminalStatus(session.status)) {
        throw new Error("Verification is still in progress.");
    }

    const existing = await db.query.faceVerificationAssistance.findFirst({
        where: eq(faceVerificationAssistance.sessionId, input.sessionId),
    });

    if (existing) {
        return { ok: true as const, alreadySubmitted: true as const };
    }

    const [profileRow, userRow] = await Promise.all([
        db.query.profiles.findFirst({
            where: eq(profiles.userId, userId),
        }),
        db.query.user.findFirst({
            where: eq(user.id, userId),
        }),
    ]);

    if (!userRow?.email) {
        throw new Error("Could not resolve your account email.");
    }

    const phoneNumber = profileRow?.phoneNumber?.trim() || userRow.phoneNumber?.trim() || null;

    try {
        await db.insert(faceVerificationAssistance).values({
            userId,
            sessionId: session.id,
            attemptNumber: session.attemptNumber,
            email: userRow.email,
            phoneNumber,
            message: input.message,
            failureReasons: session.failureReasons ?? [],
            verificationStatus: session.status,
            status: "new",
        });
    } catch (error) {
        const code =
            error && typeof error === "object" && "code" in error
                ? String((error as { code?: string }).code)
                : "";

        if (code === "23505") {
            return { ok: true as const, alreadySubmitted: true as const };
        }

        throw error;
    }

    return { ok: true as const, alreadySubmitted: false as const };
}

export async function updateFaceVerificationAssistanceStatus(
    assistanceId: string,
    status: "contacted" | "resolved",
) {
    const [updated] = await db
        .update(faceVerificationAssistance)
        .set({ status })
        .where(eq(faceVerificationAssistance.id, assistanceId))
        .returning();

    if (!updated) {
        throw new Error("Assistance request not found.");
    }

    return updated;
}
