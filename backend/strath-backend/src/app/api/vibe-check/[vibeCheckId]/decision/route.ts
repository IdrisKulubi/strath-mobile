import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, or, and } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { recordDecision } from "@/lib/services/vibe-check-service";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";
import { vibeChecks, user as userTable, dateMatches } from "@/db/schema";

export const dynamic = "force-dynamic";

async function getSessionUser(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const { session: sessionTable } = await import("@/db/schema");
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });
            if (dbSession && dbSession.expiresAt > new Date()) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                session = { session: dbSession, user: dbSession.user } as any;
            }
        }
    }
    return session?.user?.id ? { id: session.user.id } : null;
}

// ============================================
// POST /api/vibe-check/[vibeCheckId]/decision
// Body: { decision: "meet" | "pass" }
//
// Records the user's post-call decision.
// If both have decided, returns bothAgreedToMeet.
// ============================================
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ vibeCheckId: string }> },
) {
    try {
        const user = await getSessionUser(req);
        if (!user) return errorResponse("Unauthorized", 401);

        const { vibeCheckId } = await params;
        const body = await req.json();
        const { decision } = body;

        if (decision !== "meet" && decision !== "pass") {
            return errorResponse('decision must be "meet" or "pass"', 400);
        }

        const result = await recordDecision(vibeCheckId, user.id, decision);

        // Fire notifications once both people have decided
        if (result.bothDecided) {
            try {
                // Fetch the vibe check to get user IDs
                const check = await db.query.vibeChecks.findFirst({
                    where: eq(vibeChecks.id, vibeCheckId),
                });

                if (check) {
                    const [u1, u2] = await Promise.all([
                        db.query.user.findFirst({ where: eq(userTable.id, check.user1Id!) }),
                        db.query.user.findFirst({ where: eq(userTable.id, check.user2Id!) }),
                    ]);

                    const u1Name = u1?.name?.split(' ')[0] ?? 'Someone';
                    const u2Name = u2?.name?.split(' ')[0] ?? 'Someone';

                    if (result.bothAgreedToMeet) {
                        // Sync to date_match so Dates tab shows "being arranged"
                        const userAId = check.user1Id!;
                        const userBId = check.user2Id!;
                        await db
                            .update(dateMatches)
                            .set({
                                callCompleted: true,
                                userAConfirmed: true,
                                userBConfirmed: true,
                            })
                            .where(
                                or(
                                    and(eq(dateMatches.userAId, userAId), eq(dateMatches.userBId, userBId)),
                                    and(eq(dateMatches.userAId, userBId), eq(dateMatches.userBId, userAId))
                                )
                            );

                        // Both said yes → notify both, status moves to "being arranged"
                        if (u1?.pushToken) {
                            await sendPushNotification(u1.pushToken, {
                                title: "The vibe is real! 🎉",
                                body: `You and ${u2Name} both want to meet. StrathSpace will reach out soon.`,
                                data: { type: NOTIFICATION_TYPES.DATE_SCHEDULED },
                            });
                        }
                        if (u2?.pushToken) {
                            await sendPushNotification(u2.pushToken, {
                                title: "The vibe is real! 🎉",
                                body: `You and ${u1Name} both want to meet. StrathSpace will reach out soon.`,
                                data: { type: NOTIFICATION_TYPES.DATE_SCHEDULED },
                            });
                        }
                    } else {
                        // One or both said no — notify the one who said "meet" that it didn't work out
                        const deciderIsUser1 = check.user1Id === user.id;
                        const partnerDecision = deciderIsUser1 ? check.user2Decision : check.user1Decision;
                        const partnerSaidMeet = partnerDecision === 'meet';

                        // Only notify the partner who said "meet" if the current user said "pass"
                        if (decision === 'pass' && partnerSaidMeet) {
                            const partnerUser = deciderIsUser1 ? u2 : u1;
                            const thisUserName = deciderIsUser1 ? u1Name : u2Name;
                            if (partnerUser?.pushToken) {
                                await sendPushNotification(partnerUser.pushToken, {
                                    title: "No worries 👋",
                                    body: `${thisUserName} decided to pass this time.`,
                                    data: { type: NOTIFICATION_TYPES.DATE_CANCELLED },
                                });
                            }
                        }
                    }
                }
            } catch (notifErr) {
                // Non-fatal — log but don't fail the response
                console.warn("[VibeCheck] Failed to send decision notifications:", notifErr);
            }
        }

        return successResponse({
            decision,
            bothDecided: result.bothDecided,
            bothAgreedToMeet: result.bothAgreedToMeet,
            message: result.bothAgreedToMeet
                ? "🎉 You both want to meet! Full profiles revealed."
                : result.bothDecided
                ? "Thanks for sharing your vibe!"
                : "Decision recorded — waiting for the other person.",
        });
    } catch (err) {
        console.error("[VibeCheck] DECISION error:", err);
        const message = err instanceof Error ? err.message : "Failed to record decision";
        return errorResponse(message, 500);
    }
}
