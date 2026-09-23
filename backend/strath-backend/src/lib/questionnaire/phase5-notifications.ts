import type { QueryResultRow } from "pg";

import { sendPushNotification } from "@/lib/notifications";

import { query } from "./db";

export async function notifyQuestionnaireMatch(userA: string, userB: string, matchId: string) {
    const recipients = await query<{ id: string; name: string; pushToken: string | null } & QueryResultRow>(`
        SELECT id, name, push_token AS "pushToken" FROM "user" WHERE id = ANY($1::text[])
    `, [[userA, userB]]);
    await Promise.all(recipients.flatMap((recipient) => {
        if (!recipient.pushToken) return [];
        const partner = recipients.find((candidate) => candidate.id !== recipient.id);
        return [sendPushNotification(recipient.pushToken, {
            title: "It’s a match",
            body: `You and ${partner?.name?.split(" ")[0] ?? "someone"} liked each other. Say hello.`,
            data: { type: "questionnaire_match", matchId, route: `/dating-chat/${matchId}` },
        })];
    }));
}
