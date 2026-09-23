import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { z } from "zod";

import { query, transaction, type SqlExecutor } from "./db";
import { isDiscoveryReady, isReciprocallyEligible, publicProfile, type Candidate } from "./eligibility";
import { DomainError } from "./phase2-service";

const idSchema = z.string().trim().min(1).max(128);
const decisionInput = z.object({ targetId: idSchema, decision: z.enum(["like", "pass"]) }).strict();
const unmatchInput = z.object({ matchId: idSchema }).strict();

type CandidateRow = QueryResultRow & {
    id: string;
    revision: number;
    birthDate: string | null;
    preferences: Candidate["preferences"];
    answerCount: number;
    deletedAt: Date | null;
    deletedReason: string | null;
    firstName: string;
    gender: string | null;
    introduction: string;
    photos: unknown;
    profileCompleted: boolean;
    isComplete: boolean;
    isVisible: boolean;
    discoveryPaused: boolean;
    anonymous: boolean;
    faceVerificationStatus: string;
    incognitoMode: boolean;
    visibilityMode: string;
    incomingLike: boolean;
};

type ConnectionRow = QueryResultRow & {
    userA: string;
    userB: string;
    matchId: string | null;
    status: "pending" | "active" | "unmatched" | "blocked";
    origin: "questionnaire" | "legacy";
    createdAt: Date;
};

export type Phase5Dependencies = {
    notifyMatch?: (userA: string, userB: string, matchId: string) => Promise<void>;
};

function pairIds(first: string, second: string) {
    return first < second ? { userA: first, userB: second } : { userA: second, userB: first };
}

function parsePhotos(value: unknown) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function loadCandidates(viewerId: string, ids: string[], executor?: SqlExecutor) {
    if (ids.length === 0) return [];
    const rows = await query<CandidateRow>(`
        SELECT account.id, account.deleted_at AS "deletedAt", account.deleted_reason AS "deletedReason",
               state.revision, state.birth_date::text AS "birthDate", state.preferences,
               (SELECT count(*)::int FROM q_answers answer
                JOIN q_questions question ON question.id = answer.question_id AND question.published
                WHERE answer.user_id = account.id) AS "answerCount",
               profile.first_name AS "firstName", profile.gender,
               coalesce(profile.about_me, profile.bio, '') AS introduction,
               coalesce(profile.photos::jsonb, '[]'::jsonb) AS photos,
               coalesce(profile.profile_completed, false) AS "profileCompleted",
               coalesce(profile.is_complete, false) AS "isComplete",
               coalesce(profile.is_visible, false) AS "isVisible",
               coalesce(profile.discovery_paused, false) AS "discoveryPaused",
               coalesce(profile.anonymous, false) AS anonymous,
               profile.face_verification_status AS "faceVerificationStatus",
               coalesce(profile.incognito_mode, false) AS "incognitoMode",
               coalesce(profile.visibility_mode, 'standard') AS "visibilityMode",
               EXISTS(SELECT 1 FROM q_profile_decisions incoming
                      WHERE incoming.actor_id = account.id AND incoming.target_id = $1
                        AND incoming.decision = 'like') AS "incomingLike"
        FROM "user" account
        JOIN profiles profile ON profile.user_id = account.id
        JOIN q_state state ON state.user_id = account.id
        WHERE account.id = ANY($2::text[])
          AND NOT EXISTS (
              SELECT 1 FROM blocks block
              WHERE (block.blocker_id = $1 AND block.blocked_id = account.id)
                 OR (block.blocked_id = $1 AND block.blocker_id = account.id)
          )
    `, [viewerId, ids], executor);
    return rows.map((row): Candidate => ({
        id: row.id,
        revision: row.revision,
        birthDate: row.birthDate,
        preferences: row.preferences,
        answerCount: row.answerCount,
        deletedAt: row.deletedAt,
        deletedReason: row.deletedReason,
        incomingLike: row.incomingLike,
        profile: {
            firstName: row.firstName,
            gender: row.gender,
            introduction: row.introduction,
            photos: parsePhotos(row.photos),
            profileCompleted: row.profileCompleted,
            isComplete: row.isComplete,
            isVisible: row.isVisible,
            discoveryPaused: row.discoveryPaused,
            anonymous: row.anonymous,
            faceVerificationStatus: row.faceVerificationStatus,
            incognitoMode: row.incognitoMode,
            visibilityMode: row.visibilityMode,
        },
    }));
}

async function eligiblePair(viewerId: string, targetId: string, executor?: SqlExecutor) {
    if (viewerId === targetId) throw new DomainError("Choose another member");
    const people = await loadCandidates(viewerId, [viewerId, targetId], executor);
    const viewer = people.find((person) => person.id === viewerId);
    const target = people.find((person) => person.id === targetId);
    if (!viewer || !target || !isDiscoveryReady(viewer) || !isReciprocallyEligible(viewer, target)) {
        throw new DomainError("This profile is no longer available", 409);
    }
    return { viewer, target };
}

async function ensureLegacyConversation(userA: string, userB: string, executor: SqlExecutor) {
    const existing = await query<{ id: string } & QueryResultRow>(`
        SELECT id FROM matches
        WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
        ORDER BY created_at, id LIMIT 1
    `, [userA, userB], executor);
    if (existing[0]) return existing[0].id;
    const matchId = randomUUID();
    await query(`
        INSERT INTO matches(id, user1_id, user2_id, created_at, updated_at)
        VALUES($1, $2, $3, now(), now()) ON CONFLICT DO NOTHING
    `, [matchId, userA, userB], executor);
    const [created] = await query<{ id: string } & QueryResultRow>(`
        SELECT id FROM matches
        WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
        ORDER BY created_at, id LIMIT 1
    `, [userA, userB], executor);
    if (!created) throw new Error("Unable to create or locate the conversation");
    return created.id;
}

export async function saveDecision(userId: string, input: unknown, dependencies: Phase5Dependencies = {}) {
    const parsed = decisionInput.parse(input);
    const pair = pairIds(userId, parsed.targetId);
    const result = await transaction(async (executor) => {
        await query(`
            INSERT INTO q_connections(user_a, user_b, status)
            VALUES($1, $2, 'pending') ON CONFLICT(user_a, user_b) DO NOTHING
        `, [pair.userA, pair.userB], executor);
        const [connection] = await query<ConnectionRow>(`
            SELECT user_a AS "userA", user_b AS "userB", match_id AS "matchId",
                   status, origin, created_at AS "createdAt"
            FROM q_connections WHERE user_a = $1 AND user_b = $2 FOR UPDATE
        `, [pair.userA, pair.userB], executor);
        if (!connection) throw new Error("Unable to lock the connection pair");
        if (connection.status === "active") {
            return { mutual: true, matchId: connection.matchId as string, created: false };
        }
        if (connection.status !== "pending") {
            throw new DomainError("This connection is no longer available", 409);
        }

        await eligiblePair(userId, parsed.targetId, executor);
        await query(`
            INSERT INTO q_profile_decisions(actor_id, target_id, decision, updated_at)
            VALUES($1, $2, $3, now())
            ON CONFLICT(actor_id, target_id)
            DO UPDATE SET decision = excluded.decision, updated_at = now()
        `, [userId, parsed.targetId, parsed.decision], executor);
        await query("INSERT INTO q_connection_events(user_id, event) VALUES($1, $2)", [
            userId,
            parsed.decision === "like" ? "like_sent" : "pass_saved",
        ], executor);
        if (parsed.decision === "pass") return { mutual: false, created: false };

        const reverse = await query(`
            SELECT 1 FROM q_profile_decisions
            WHERE actor_id = $1 AND target_id = $2 AND decision = 'like'
        `, [parsed.targetId, userId], executor);
        if (reverse.length === 0) return { mutual: false, created: false };

        // Eligibility is checked again after both likes exist and while the pair row is locked.
        await eligiblePair(userId, parsed.targetId, executor);
        const matchId = await ensureLegacyConversation(pair.userA, pair.userB, executor);
        await query(`
            UPDATE q_connections
            SET match_id = $3, status = 'active', connected_at = now(), ended_at = NULL, updated_at = now()
            WHERE user_a = $1 AND user_b = $2
        `, [pair.userA, pair.userB, matchId], executor);
        await query(`
            INSERT INTO q_connection_events(user_id, event)
            VALUES($1, 'mutual_like'), ($2, 'conversation_started')
        `, [userId, parsed.targetId], executor);
        return { mutual: true, matchId, created: true };
    });

    if (result.created && result.matchId && dependencies.notifyMatch) {
        await dependencies.notifyMatch(pair.userA, pair.userB, result.matchId).catch(() => undefined);
    }
    return { mutual: result.mutual, ...(result.matchId ? { matchId: result.matchId } : {}) };
}

export async function listLikes(userId: string) {
    const decisions = await query<{ actorId: string; targetId: string } & QueryResultRow>(`
        SELECT actor_id AS "actorId", target_id AS "targetId"
        FROM q_profile_decisions
        WHERE decision = 'like' AND (actor_id = $1 OR target_id = $1)
        ORDER BY updated_at DESC
    `, [userId]);
    const connectionRows = await query<ConnectionRow>(`
        SELECT user_a AS "userA", user_b AS "userB", match_id AS "matchId",
               status, origin, created_at AS "createdAt"
        FROM q_connections WHERE user_a = $1 OR user_b = $1
    `, [userId]);
    const active = new Set(connectionRows.filter((row) => row.status === "active").map((row) => row.userA === userId ? row.userB : row.userA));
    const ids = [...new Set(decisions.map((row) => row.actorId === userId ? row.targetId : row.actorId))];
    const candidates = await loadCandidates(userId, [userId, ...ids]);
    const viewer = candidates.find((candidate) => candidate.id === userId);
    const cards = (direction: "sent" | "received") => decisions.flatMap((row) => {
        const relevant = direction === "sent" ? row.actorId === userId : row.targetId === userId;
        const candidateId = direction === "sent" ? row.targetId : row.actorId;
        const candidate = candidates.find((item) => item.id === candidateId);
        return relevant && viewer && candidate && !active.has(candidateId) && isReciprocallyEligible(viewer, candidate)
            ? [publicProfile(candidate)]
            : [];
    });
    return { received: cards("received"), sent: cards("sent") };
}

export async function listConnections(userId: string) {
    const rows = await query<ConnectionRow>(`
        SELECT user_a AS "userA", user_b AS "userB", match_id AS "matchId",
               status, origin, created_at AS "createdAt"
        FROM q_connections
        WHERE (user_a = $1 OR user_b = $1) AND status = 'active'
        ORDER BY connected_at DESC, created_at DESC
    `, [userId]);
    const partnerIds = rows.map((row) => row.userA === userId ? row.userB : row.userA);
    const candidates = await loadCandidates(userId, partnerIds);
    return {
        items: rows.flatMap((row) => {
            const partnerId = row.userA === userId ? row.userB : row.userA;
            const partner = candidates.find((candidate) => candidate.id === partnerId);
            return partner && row.matchId ? [{ matchId: row.matchId, partner: publicProfile(partner), createdAt: row.createdAt }] : [];
        }),
    };
}

export type QuestionnaireConversation = {
    id: string;
    mutualMatchId: string;
    arrangementStatus: "questionnaire";
    partner: { id: string; name: string; image: string | null; lastActive: string | null };
    lastMessage: { id: string; content: string; senderId: string; status: "sent" | "delivered" | "read"; createdAt: string } | null;
    unreadCount: number;
    createdAt: string;
};

export async function listQuestionnaireConversations(userId: string): Promise<QuestionnaireConversation[]> {
    const table = await query<{ exists: boolean } & QueryResultRow>(
        "SELECT to_regclass('public.q_connections') IS NOT NULL AS exists",
    );
    if (!table[0]?.exists) return [];
    const rows = await query<{
        id: string;
        userA: string;
        userB: string;
        createdAt: Date;
        partnerId: string;
        partnerName: string;
        partnerImage: string | null;
        lastActive: Date | null;
        messageId: string | null;
        messageContent: string | null;
        messageSenderId: string | null;
        messageStatus: "sent" | "delivered" | "read" | null;
        messageCreatedAt: Date | null;
        unreadCount: number;
    } & QueryResultRow>(`
        SELECT connection.match_id AS id, connection.user_a AS "userA", connection.user_b AS "userB",
               connection.created_at AS "createdAt", partner.id AS "partnerId",
               coalesce(profile.first_name, split_part(partner.name, ' ', 1), 'Unknown') AS "partnerName",
               coalesce(profile.profile_photo, partner.profile_photo, partner.image) AS "partnerImage",
               partner.last_active AS "lastActive",
               latest.id AS "messageId", latest.content AS "messageContent",
               latest.sender_id AS "messageSenderId", latest.status AS "messageStatus",
               latest.created_at AS "messageCreatedAt",
               (SELECT count(*)::int FROM messages unread
                WHERE unread.match_id = connection.match_id AND unread.sender_id <> $1 AND unread.status <> 'read') AS "unreadCount"
        FROM q_connections connection
        JOIN "user" partner ON partner.id = CASE WHEN connection.user_a = $1 THEN connection.user_b ELSE connection.user_a END
        LEFT JOIN profiles profile ON profile.user_id = partner.id
        LEFT JOIN LATERAL (
            SELECT id, content, sender_id, status, created_at FROM messages
            WHERE match_id = connection.match_id ORDER BY created_at DESC, id DESC LIMIT 1
        ) latest ON true
        WHERE (connection.user_a = $1 OR connection.user_b = $1)
          AND connection.status = 'active' AND connection.match_id IS NOT NULL
          AND partner.deleted_at IS NULL AND partner.deleted_reason IS NULL
          AND NOT EXISTS (
              SELECT 1 FROM blocks block
              WHERE (block.blocker_id = connection.user_a AND block.blocked_id = connection.user_b)
                 OR (block.blocked_id = connection.user_a AND block.blocker_id = connection.user_b)
          )
        ORDER BY coalesce(latest.created_at, connection.connected_at, connection.created_at) DESC
    `, [userId]);
    return rows.map((row) => ({
        id: row.id,
        mutualMatchId: `questionnaire:${row.userA}:${row.userB}`,
        arrangementStatus: "questionnaire",
        partner: {
            id: row.partnerId,
            name: row.partnerName,
            image: row.partnerImage,
            lastActive: row.lastActive?.toISOString() ?? null,
        },
        lastMessage: row.messageId && row.messageContent && row.messageSenderId && row.messageStatus && row.messageCreatedAt
            ? {
                id: row.messageId,
                content: row.messageContent,
                senderId: row.messageSenderId,
                status: row.messageStatus,
                createdAt: row.messageCreatedAt.toISOString(),
            }
            : null,
        unreadCount: Number(row.unreadCount) || 0,
        createdAt: row.createdAt.toISOString(),
    }));
}

export async function unmatch(userId: string, input: unknown) {
    const parsed = unmatchInput.parse(input);
    const changed = await transaction(async (executor) => {
        const rows = await query<ConnectionRow>(`
            SELECT user_a AS "userA", user_b AS "userB", match_id AS "matchId",
                   status, origin, created_at AS "createdAt"
            FROM q_connections
            WHERE match_id = $1 AND (user_a = $2 OR user_b = $2) FOR UPDATE
        `, [parsed.matchId, userId], executor);
        if (!rows[0]) throw new DomainError("Connection unavailable", 404);
        if (rows[0].status !== "active") return false;
        await query(`
            UPDATE q_connections SET status = 'unmatched', ended_at = now(), updated_at = now()
            WHERE match_id = $1
        `, [parsed.matchId], executor);
        await query("INSERT INTO q_connection_events(user_id, event) VALUES($1, 'unmatched')", [userId], executor);
        return true;
    });
    return { removed: true, changed };
}

export async function questionnaireChatAccess(matchId: string, userId: string): Promise<boolean | undefined> {
    const table = await query<{ exists: boolean } & QueryResultRow>(
        "SELECT to_regclass('public.q_connections') IS NOT NULL AS exists",
    );
    if (!table[0]?.exists) return undefined;
    const rows = await query<{ allowed: boolean } & QueryResultRow>(`
        SELECT (
            connection.status = 'active'
            AND (connection.user_a = $2 OR connection.user_b = $2)
            AND NOT EXISTS (
                SELECT 1 FROM blocks block
                WHERE (block.blocker_id = connection.user_a AND block.blocked_id = connection.user_b)
                   OR (block.blocker_id = connection.user_b AND block.blocked_id = connection.user_a)
            )
            AND NOT EXISTS (
                SELECT 1 FROM "user" account
                WHERE account.id IN (connection.user_a, connection.user_b)
                  AND (account.deleted_at IS NOT NULL OR account.deleted_reason IS NOT NULL)
            )
        ) AS allowed
        FROM q_connections connection WHERE connection.match_id = $1
    `, [matchId, userId]);
    return rows[0]?.allowed;
}

export async function saveMessageIdempotently(matchId: string, senderId: string, content: string, clientRequestId?: string) {
    return transaction(async (executor) => {
        const messageId = randomUUID();
        const inserted = await query<{
            id: string;
            content: string;
            matchId: string;
            senderId: string;
            status: "sent" | "delivered" | "read";
            createdAt: Date;
            updatedAt: Date;
        } & QueryResultRow>(`
            INSERT INTO messages(id, content, match_id, sender_id, status, client_request_id, created_at, updated_at)
            VALUES($1, $2, $3, $4, 'sent', $5, now(), now())
            ON CONFLICT DO NOTHING
            RETURNING id, content, match_id AS "matchId", sender_id AS "senderId", status,
                      created_at AS "createdAt", updated_at AS "updatedAt"
        `, [messageId, content, matchId, senderId, clientRequestId ?? null], executor);
        if (inserted[0]) {
            await query("UPDATE matches SET last_message_at = now(), updated_at = now() WHERE id = $1", [matchId], executor);
            await query(`
                INSERT INTO q_connection_events(user_id, match_id, event)
                SELECT $1, $2, 'message_sent'
                WHERE EXISTS(SELECT 1 FROM q_connections WHERE match_id = $2 AND status = 'active')
            `, [senderId, matchId], executor);
            return { message: inserted[0], created: true };
        }
        if (!clientRequestId) throw new Error("Unable to save message");
        const [existing] = await query<(typeof inserted)[number]>(`
            SELECT id, content, match_id AS "matchId", sender_id AS "senderId", status,
                   created_at AS "createdAt", updated_at AS "updatedAt"
            FROM messages
            WHERE match_id = $1 AND sender_id = $2 AND client_request_id = $3
        `, [matchId, senderId, clientRequestId], executor);
        if (!existing) throw new Error("Unable to locate the retried message");
        return { message: existing, created: false };
    });
}

export async function removeQuestionnaireDataForAccount(userId: string) {
    return transaction(async (executor) => {
        const exists = await query<{ exists: boolean } & QueryResultRow>(
            "SELECT to_regclass('public.q_connections') IS NOT NULL AS exists",
            [],
            executor,
        );
        if (!exists[0]?.exists) return { cleaned: false };
        await query("DELETE FROM q_answers WHERE user_id = $1", [userId], executor);
        await query("DELETE FROM q_compatibility_cache WHERE user_a = $1 OR user_b = $1", [userId], executor);
        await query("DELETE FROM q_profile_decisions WHERE actor_id = $1 OR target_id = $1", [userId], executor);
        await query("UPDATE q_questionnaire_events SET user_id = NULL WHERE user_id = $1", [userId], executor);
        await query("UPDATE q_discovery_events SET user_id = NULL WHERE user_id = $1", [userId], executor);
        await query("UPDATE q_connection_events SET user_id = NULL WHERE user_id = $1", [userId], executor);
        await query(`
            UPDATE q_connections SET status = 'unmatched', ended_at = now(), updated_at = now()
            WHERE (user_a = $1 OR user_b = $1) AND status IN ('pending', 'active')
        `, [userId], executor);
        await query(`
            UPDATE q_state SET birth_date = NULL, preferences = NULL, skipped = '[]'::jsonb,
                               revision = revision + 1, updated_at = now()
            WHERE user_id = $1
        `, [userId], executor);
        return { cleaned: true };
    });
}
