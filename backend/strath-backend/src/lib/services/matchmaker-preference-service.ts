import { and, asc, eq } from "drizzle-orm";

import db from "@/db/drizzle";
import {
    matchmakerPreferenceChanges,
    matchmakerUserBriefs,
    matchmakerUserPreferences,
} from "@/db/schema";
import {
    assertValidBriefOperations,
    inferPreferenceCategory,
    normalizePreferenceValue,
    type MatchmakerBriefOperation,
    type MatchmakerPreferenceCategory,
} from "@/lib/matchmaker/preference-domain";
import { trackMatchmakerEvent } from "@/lib/services/matchmaker-analytics-service";

type PreferenceRow = typeof matchmakerUserPreferences.$inferSelect;
type BriefReader = Pick<typeof db, "query">;
type PreferenceSnapshot = MatchmakerBriefPreference & { normalizedValue: string };

export interface MatchmakerBriefPreference {
    id: string;
    category: string;
    value: string;
    sentiment: "prefer" | "avoid";
    importance: "must_have" | "prefer" | "flexible";
    certainty: "confirmed" | "inferred";
    source: "direct" | "feedback" | "migrated_memory" | "system";
    status: "active" | "removed";
    version: number;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface MatchmakerBrief {
    version: number;
    latestChangeId: string | null;
    preferences: MatchmakerBriefPreference[];
    updatedAt: string | null;
}

export class MatchmakerBriefVersionConflictError extends Error {
    readonly code = "MATCHMAKER_BRIEF_VERSION_CONFLICT";

    constructor(readonly latestBrief: MatchmakerBrief) {
        super("The match brief changed. Review the latest version and try again.");
        this.name = "MatchmakerBriefVersionConflictError";
    }
}

class ConcurrentBriefMutationError extends Error {}

function serializePreference(row: PreferenceRow): MatchmakerBriefPreference {
    return {
        id: row.id,
        category: row.category,
        value: row.value,
        sentiment: row.sentiment,
        importance: row.importance,
        certainty: row.certainty,
        source: row.source,
        status: row.status,
        version: row.version,
        metadata: row.metadata,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

function snapshot(rows: PreferenceRow[]): Record<string, unknown>[] {
    return rows.map((row) => ({
        ...serializePreference(row),
        normalizedValue: row.normalizedValue,
    }));
}

async function readBrief(client: BriefReader, userId: string): Promise<MatchmakerBrief> {
    const [brief, rows] = await Promise.all([
        client.query.matchmakerUserBriefs.findFirst({
            where: eq(matchmakerUserBriefs.userId, userId),
        }),
        client.query.matchmakerUserPreferences.findMany({
            where: and(
                eq(matchmakerUserPreferences.userId, userId),
                eq(matchmakerUserPreferences.status, "active"),
            ),
            orderBy: [asc(matchmakerUserPreferences.createdAt)],
        }),
    ]);

    return {
        version: brief?.version ?? 0,
        latestChangeId: brief?.latestChangeId ?? null,
        preferences: rows.map(serializePreference),
        updatedAt: brief?.updatedAt.toISOString() ?? null,
    };
}

export function getMatchmakerBrief(userId: string) {
    return readBrief(db, userId);
}

export interface MatchmakerPreferenceProposal {
    category: MatchmakerPreferenceCategory;
    value: string;
    sentiment: "prefer" | "avoid";
    importance: "must_have" | "prefer" | "flexible";
    evidence: "explicit" | "inferred";
}

export function buildMatchmakerBriefSummary(brief: MatchmakerBrief) {
    const confirmed = brief.preferences.filter((preference) => preference.certainty === "confirmed");
    const inferred = brief.preferences.filter((preference) => preference.certainty === "inferred");
    const label = (preference: MatchmakerBriefPreference) =>
        `${preference.sentiment === "avoid" ? "avoid" : preference.importance}: ${preference.value}`;
    return [
        confirmed.length ? `Confirmed: ${confirmed.map(label).join("; ")}` : "Confirmed: none yet",
        inferred.length ? `Still learning (not confirmed): ${inferred.map(label).join("; ")}` : null,
    ].filter(Boolean).join(". ");
}

export function buildMatchmakerBriefSearchPlan(brief: MatchmakerBrief) {
    const conflictingIds = new Set(findMatchmakerBriefContradictions(brief).flatMap((item) => item.preferenceIds));
    const confirmed = brief.preferences.filter((preference) =>
        preference.status === "active"
        && preference.certainty === "confirmed"
        && !conflictingIds.has(preference.id),
    );
    return {
        priorities: confirmed
            .filter((preference) => preference.sentiment === "prefer" && preference.importance !== "flexible")
            .map((preference) => preference.value),
        mustHaves: confirmed
            .filter((preference) => preference.sentiment === "prefer" && preference.importance === "must_have")
            .map((preference) => preference.value),
        flexible: confirmed
            .filter((preference) => preference.sentiment === "prefer" && preference.importance === "flexible")
            .map((preference) => preference.value),
        avoid: confirmed
            .filter((preference) => preference.sentiment === "avoid")
            .map((preference) => preference.value),
        unresolved: brief.preferences
            .filter((preference) => preference.status === "active" && preference.certainty === "inferred")
            .map((preference) => preference.value),
    };
}

export function buildMatchmakerSearchConfirmation(brief: MatchmakerBrief) {
    const plan = buildMatchmakerBriefSearchPlan(brief);
    const parts = [
        plan.mustHaves.length ? `must-haves: ${plan.mustHaves.join(", ")}` : null,
        plan.priorities.length ? `preferences: ${plan.priorities.filter((value) => !plan.mustHaves.includes(value)).join(", ")}` : null,
        plan.flexible.length ? `flexible: ${plan.flexible.join(", ")}` : null,
        plan.avoid.length ? `avoid: ${plan.avoid.join(", ")}` : null,
    ].filter((part): part is string => Boolean(part && !part.endsWith(": ")));
    const criteria = parts.length
        ? `I’ll search using ${parts.join("; ")}.`
        : "I’ll keep this search broad because nothing is confirmed yet.";
    const uncertainty = plan.unresolved.length
        ? ` I’m still learning about ${plan.unresolved.join(", ")}, so I won’t treat ${plan.unresolved.length === 1 ? "it" : "them"} as a filter.`
        : "";
    return `${criteria}${uncertainty} Want me to search now?`;
}

export function findMatchmakerBriefContradictions(brief: MatchmakerBrief) {
    const active = brief.preferences.filter((preference) => preference.status === "active");
    const contradictions: Array<{ category: string; value: string; preferenceIds: string[] }> = [];
    const grouped = new Map<string, MatchmakerBriefPreference[]>();
    for (const preference of active) {
        const key = `${preference.category}:${normalizePreferenceValue(preference.value)}`;
        grouped.set(key, [...(grouped.get(key) ?? []), preference]);
    }
    for (const preferences of grouped.values()) {
        if (new Set(preferences.map((preference) => preference.sentiment)).size < 2) continue;
        contradictions.push({
            category: preferences[0].category,
            value: preferences[0].value,
            preferenceIds: preferences.map((preference) => preference.id),
        });
    }
    return contradictions;
}

export async function applyMatchmakerPreferenceProposals(input: {
    userId: string;
    proposals: MatchmakerPreferenceProposal[];
    sessionId?: string;
}) {
    const operations: MatchmakerBriefOperation[] = input.proposals.map((proposal) => ({
        type: "add",
        category: proposal.category,
        value: proposal.value,
        sentiment: proposal.sentiment,
        importance: proposal.importance,
        certainty: proposal.evidence === "explicit" ? "confirmed" : "inferred",
        source: proposal.evidence === "explicit" ? "direct" : "system",
        metadata: { evidence: proposal.evidence, sessionId: input.sessionId },
    }));
    if (operations.length === 0) return getMatchmakerBrief(input.userId);

    let brief = await getMatchmakerBrief(input.userId);
    try {
        return await mutateMatchmakerBrief({ userId: input.userId, baseVersion: brief.version, operations, metadata: { source: "conversation", sessionId: input.sessionId } });
    } catch (error) {
        if (!(error instanceof MatchmakerBriefVersionConflictError)) throw error;
        brief = error.latestBrief;
        return mutateMatchmakerBrief({ userId: input.userId, baseVersion: brief.version, operations, metadata: { source: "conversation", sessionId: input.sessionId } });
    }
}

export async function resolveMatchmakerBriefContradiction(input: {
    userId: string;
    preferPreferenceId: string;
    avoidPreferenceId: string;
    choice: "prefer" | "avoid" | "flexible";
}) {
    const brief = await getMatchmakerBrief(input.userId);
    const operations: MatchmakerBriefOperation[] = input.choice === "avoid"
        ? [{ type: "remove", preferenceId: input.preferPreferenceId }]
        : input.choice === "prefer"
            ? [{ type: "remove", preferenceId: input.avoidPreferenceId }]
            : [
                { type: "remove", preferenceId: input.avoidPreferenceId },
                { type: "reclassify", preferenceId: input.preferPreferenceId, importance: "flexible" },
            ];
    return mutateMatchmakerBrief({
        userId: input.userId,
        baseVersion: brief.version,
        operations,
        metadata: { source: "contradiction_resolution" },
    });
}

export async function syncConfirmedFeedbackPreferences(input: {
    userId: string;
    positiveSignals: string[];
    negativeSignals: string[];
    metadata?: Record<string, unknown>;
}) {
    const operations: MatchmakerBriefOperation[] = [
        ...input.positiveSignals.map((value): MatchmakerBriefOperation => ({
            type: "add",
            category: inferPreferenceCategory(value),
            value,
            sentiment: "prefer",
            importance: "prefer",
            certainty: "confirmed",
            source: "feedback",
        })),
        ...input.negativeSignals.map((value): MatchmakerBriefOperation => ({
            type: "add",
            category: inferPreferenceCategory(value),
            value,
            sentiment: "avoid",
            importance: "prefer",
            certainty: "confirmed",
            source: "feedback",
        })),
    ];
    if (operations.length === 0) return getMatchmakerBrief(input.userId);

    let brief = await getMatchmakerBrief(input.userId);
    try {
        return await mutateMatchmakerBrief({
            userId: input.userId,
            baseVersion: brief.version,
            operations,
            metadata: input.metadata,
        });
    } catch (error) {
        if (!(error instanceof MatchmakerBriefVersionConflictError)) throw error;
        brief = error.latestBrief;
        return mutateMatchmakerBrief({
            userId: input.userId,
            baseVersion: brief.version,
            operations,
            metadata: input.metadata,
        });
    }
}

function requirePreference(rows: Map<string, PreferenceRow>, preferenceId: string) {
    const row = rows.get(preferenceId);
    if (!row) throw new Error("Preference not found");
    return row;
}

export async function mutateMatchmakerBrief(input: {
    userId: string;
    baseVersion: number;
    operations: MatchmakerBriefOperation[];
    metadata?: Record<string, unknown>;
}) {
    assertValidBriefOperations(input.operations);

    try {
        const result = await db.transaction(async (tx) => {
        await tx.insert(matchmakerUserBriefs).values({
            userId: input.userId,
            version: 0,
        }).onConflictDoNothing();

        const brief = await tx.query.matchmakerUserBriefs.findFirst({
            where: eq(matchmakerUserBriefs.userId, input.userId),
        });
        if (!brief) throw new Error("Matchmaker brief could not be created");
        if (brief.version !== input.baseVersion) {
            throw new MatchmakerBriefVersionConflictError(await readBrief(tx, input.userId));
        }

        const beforeRows = await tx.query.matchmakerUserPreferences.findMany({
            where: eq(matchmakerUserPreferences.userId, input.userId),
            orderBy: [asc(matchmakerUserPreferences.createdAt)],
        });
        const beforeSnapshot = snapshot(beforeRows);
        const byId = new Map(beforeRows.map((row) => [row.id, row]));
        const byKey = new Map(beforeRows.map((row) => [
            `${row.category}:${row.normalizedValue}:${row.sentiment}`,
            row,
        ]));

        for (const operation of input.operations) {
            if (operation.type === "add") {
                const normalizedValue = normalizePreferenceValue(operation.value);
                const sentiment = operation.sentiment ?? "prefer";
                const key = `${operation.category}:${normalizedValue}:${sentiment}`;
                const existing = byKey.get(key);
                if (existing) {
                    const [updated] = await tx.update(matchmakerUserPreferences).set({
                        value: operation.value.trim(),
                        sentiment,
                        importance: operation.importance ?? "prefer",
                        certainty: operation.certainty ?? "confirmed",
                        source: operation.source ?? "direct",
                        status: "active",
                        version: existing.version + 1,
                        metadata: operation.metadata ?? existing.metadata,
                        updatedAt: new Date(),
                    }).where(eq(matchmakerUserPreferences.id, existing.id)).returning();
                    byId.set(updated.id, updated);
                    byKey.set(key, updated);
                    continue;
                }
                const [created] = await tx.insert(matchmakerUserPreferences).values({
                    userId: input.userId,
                    category: operation.category,
                    value: operation.value.trim(),
                    normalizedValue,
                    sentiment,
                    importance: operation.importance ?? "prefer",
                    certainty: operation.certainty ?? "confirmed",
                    source: operation.source ?? "direct",
                    metadata: operation.metadata ?? {},
                }).returning();
                byId.set(created.id, created);
                byKey.set(key, created);
                continue;
            }

            const current = requirePreference(byId, operation.preferenceId);
            const updates: Partial<typeof matchmakerUserPreferences.$inferInsert> = {
                version: current.version + 1,
                updatedAt: new Date(),
            };
            if (operation.type === "update") {
                if (operation.value !== undefined) {
                    const normalizedValue = normalizePreferenceValue(operation.value);
                    if (!normalizedValue) throw new Error("Preference value is required");
                    updates.value = operation.value.trim();
                    updates.normalizedValue = normalizedValue;
                }
                if (operation.sentiment !== undefined) updates.sentiment = operation.sentiment;
                if (operation.metadata !== undefined) updates.metadata = operation.metadata;
            } else if (operation.type === "confirm") {
                updates.certainty = "confirmed";
                updates.source = "direct";
            } else if (operation.type === "reclassify") {
                updates.importance = operation.importance;
            } else if (operation.type === "remove") {
                updates.status = "removed";
            }

            const [updated] = await tx.update(matchmakerUserPreferences)
                .set(updates)
                .where(eq(matchmakerUserPreferences.id, current.id))
                .returning();
            byId.set(updated.id, updated);
        }

        const nextVersion = brief.version + 1;
        const afterRows = await tx.query.matchmakerUserPreferences.findMany({
            where: eq(matchmakerUserPreferences.userId, input.userId),
            orderBy: [asc(matchmakerUserPreferences.createdAt)],
        });
        const operation = input.operations.length === 1 ? input.operations[0].type : "update";
        const [change] = await tx.insert(matchmakerPreferenceChanges).values({
            userId: input.userId,
            operation,
            briefVersionBefore: brief.version,
            briefVersionAfter: nextVersion,
            beforeSnapshot,
            afterSnapshot: snapshot(afterRows),
            metadata: input.metadata ?? {},
        }).returning();

        const updatedBriefRows = await tx.update(matchmakerUserBriefs).set({
            version: nextVersion,
            latestChangeId: change.id,
            updatedAt: new Date(),
        }).where(and(
            eq(matchmakerUserBriefs.userId, input.userId),
            eq(matchmakerUserBriefs.version, input.baseVersion),
        )).returning();
        if (updatedBriefRows.length !== 1) {
            throw new ConcurrentBriefMutationError("Match brief was changed concurrently");
        }

            return readBrief(tx, input.userId);
        });
        trackMatchmakerEvent({
            event: "brief_mutated",
            userId: input.userId,
            metadata: {
                operationCount: input.operations.length,
                operationTypes: [...new Set(input.operations.map((operation) => operation.type))],
                version: result.version,
            },
        }).catch(() => undefined);
        return result;
    } catch (error) {
        if (error instanceof ConcurrentBriefMutationError) {
            const conflict = new MatchmakerBriefVersionConflictError(
                await getMatchmakerBrief(input.userId),
            );
            trackMatchmakerEvent({
                event: "brief_version_conflict",
                userId: input.userId,
                metadata: {
                    requestedVersion: input.baseVersion,
                    latestVersion: conflict.latestBrief.version,
                },
            }).catch(() => undefined);
            throw conflict;
        }
        if (error instanceof MatchmakerBriefVersionConflictError) {
            trackMatchmakerEvent({
                event: "brief_version_conflict",
                userId: input.userId,
                metadata: {
                    requestedVersion: input.baseVersion,
                    latestVersion: error.latestBrief.version,
                },
            }).catch(() => undefined);
        }
        throw error;
    }
}

function snapshotDate(value: unknown) {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return new Date();
    return date;
}

export async function undoMatchmakerBriefChange(input: {
    userId: string;
    changeId: string;
}) {
    const result = await db.transaction(async (tx) => {
        const [brief, change] = await Promise.all([
            tx.query.matchmakerUserBriefs.findFirst({
                where: eq(matchmakerUserBriefs.userId, input.userId),
            }),
            tx.query.matchmakerPreferenceChanges.findFirst({
                where: and(
                    eq(matchmakerPreferenceChanges.id, input.changeId),
                    eq(matchmakerPreferenceChanges.userId, input.userId),
                ),
            }),
        ]);
        if (!brief || !change) throw new Error("Reversible match brief change not found");
        if (!change.reversible || change.revertedByChangeId) throw new Error("Match brief change cannot be undone");
        if (brief.latestChangeId !== change.id) throw new Error("Only the latest match brief change can be undone");

        const before = change.beforeSnapshot as unknown as PreferenceSnapshot[];
        const current = await tx.query.matchmakerUserPreferences.findMany({
            where: eq(matchmakerUserPreferences.userId, input.userId),
            orderBy: [asc(matchmakerUserPreferences.createdAt)],
        });
        const beforeIds = new Set(before.map((item) => item.id));
        for (const row of current) {
            if (!beforeIds.has(row.id)) {
                await tx.update(matchmakerUserPreferences).set({
                    status: "removed",
                    version: row.version + 1,
                    updatedAt: new Date(),
                }).where(eq(matchmakerUserPreferences.id, row.id));
            }
        }
        for (const item of before) {
            await tx.insert(matchmakerUserPreferences).values({
                id: item.id,
                userId: input.userId,
                category: item.category,
                value: item.value,
                normalizedValue: item.normalizedValue,
                sentiment: item.sentiment,
                importance: item.importance,
                certainty: item.certainty,
                source: item.source,
                status: item.status,
                version: item.version,
                metadata: item.metadata,
                createdAt: snapshotDate(item.createdAt),
                updatedAt: new Date(),
            }).onConflictDoUpdate({
                target: matchmakerUserPreferences.id,
                set: {
                    category: item.category,
                    value: item.value,
                    normalizedValue: item.normalizedValue,
                    sentiment: item.sentiment,
                    importance: item.importance,
                    certainty: item.certainty,
                    source: item.source,
                    status: item.status,
                    version: item.version,
                    metadata: item.metadata,
                    updatedAt: new Date(),
                },
            });
        }

        const nextVersion = brief.version + 1;
        const restored = await tx.query.matchmakerUserPreferences.findMany({
            where: eq(matchmakerUserPreferences.userId, input.userId),
            orderBy: [asc(matchmakerUserPreferences.createdAt)],
        });
        const [undoChange] = await tx.insert(matchmakerPreferenceChanges).values({
            userId: input.userId,
            operation: "undo",
            briefVersionBefore: brief.version,
            briefVersionAfter: nextVersion,
            beforeSnapshot: snapshot(current),
            afterSnapshot: snapshot(restored),
            reversible: false,
            metadata: { revertedChangeId: change.id },
        }).returning();
        await tx.update(matchmakerPreferenceChanges).set({
            revertedByChangeId: undoChange.id,
        }).where(eq(matchmakerPreferenceChanges.id, change.id));
        await tx.update(matchmakerUserBriefs).set({
            version: nextVersion,
            latestChangeId: null,
            updatedAt: new Date(),
        }).where(eq(matchmakerUserBriefs.userId, input.userId));

        return readBrief(tx, input.userId);
    });
    trackMatchmakerEvent({
        event: "brief_undone",
        userId: input.userId,
        metadata: { version: result.version },
    }).catch(() => undefined);
    return result;
}
