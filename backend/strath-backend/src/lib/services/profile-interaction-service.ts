import db from "@/db/drizzle";
import { profileInteractionEvents } from "@/db/schema";
import { updateVisualPreferenceFromInteraction } from "@/lib/services/visual-preference-service";

export type ProfileInteractionEventType =
    | "profile_view"
    | "profile_like"
    | "profile_pass"
    | "profile_skip"
    | "profile_open";

async function recordProfileInteraction(input: {
    actorUserId: string;
    targetUserId: string;
    eventType: ProfileInteractionEventType;
    source: string;
    timeSpentMs?: number;
    metadata?: Record<string, unknown>;
}) {
    const [event] = await db
        .insert(profileInteractionEvents)
        .values({
            actorUserId: input.actorUserId,
            targetUserId: input.targetUserId,
            eventType: input.eventType,
            source: input.source,
            timeSpentMs: input.timeSpentMs,
            metadata: input.metadata ?? {},
        })
        .returning();

    if (
        input.eventType === "profile_like" ||
        input.eventType === "profile_pass" ||
        input.eventType === "profile_view"
    ) {
        await updateVisualPreferenceFromInteraction({
            actorUserId: input.actorUserId,
            targetUserId: input.targetUserId,
            eventType: input.eventType,
            eventId: event.id,
        }).catch((error) => {
            console.warn("[profile-interaction] visual preference update failed", error);
        });
    }

    return event;
}

export async function recordProfileView(
    actorUserId: string,
    targetUserId: string,
    source: string,
    timeSpentMs?: number,
) {
    return recordProfileInteraction({
        actorUserId,
        targetUserId,
        eventType: "profile_view",
        source,
        timeSpentMs,
    });
}

export async function recordProfileLike(actorUserId: string, targetUserId: string, source: string) {
    return recordProfileInteraction({
        actorUserId,
        targetUserId,
        eventType: "profile_like",
        source,
    });
}

export async function recordProfilePass(actorUserId: string, targetUserId: string, source: string) {
    return recordProfileInteraction({
        actorUserId,
        targetUserId,
        eventType: "profile_pass",
        source,
    });
}
