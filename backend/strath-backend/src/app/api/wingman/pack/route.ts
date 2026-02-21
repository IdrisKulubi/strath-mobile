import { NextRequest } from "next/server";
import { and, eq, gt } from "drizzle-orm";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
    agentAnalytics,
    session as sessionTable,
    wingmanLinks,
    wingmanPacks,
    wingmanSubmissions,
} from "@/db/schema";

import { embedIntent, parseIntent } from "@/services/intent-parser";
import { agentSearch } from "@/services/agent-search";
import { rankCandidates } from "@/services/ranking-service";
import { generateQuickExplanations } from "@/services/explanation-service";
import { getAgentContext } from "@/services/agent-context";

export const dynamic = "force-dynamic";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

async function getSession(req: NextRequest): Promise<AuthSession> {
    let session: AuthSession = await auth.api.getSession({ headers: req.headers });

    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });
            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as unknown as AuthSession;
            }
        }
    }

    return session;
}

function sanitizeProfile(profile: Record<string, unknown>) {
    const clean: Record<string, unknown> = { ...profile };
    delete clean.embedding;
    delete clean.embeddingUpdatedAt;
    delete clean.isVisible;
    delete clean.profileCompleted;
    return clean;
}

function compilePack(submissions: Array<{ threeWords: string[] | null; greenFlags: string[] | null; redFlagFunny: string | null; hypeNote: string | null; }>) {
    const wordCounts = new Map<string, number>();
    const green = new Set<string>();
    const redFlags: string[] = [];
    const hypeLines: string[] = [];

    for (const s of submissions) {
        for (const w of s.threeWords ?? []) {
            const key = w.trim().toLowerCase();
            if (!key) continue;
            wordCounts.set(key, (wordCounts.get(key) ?? 0) + 1);
        }
        for (const g of s.greenFlags ?? []) {
            const key = g.trim();
            if (key) green.add(key);
        }
        if (s.redFlagFunny?.trim()) redFlags.push(s.redFlagFunny.trim());
        if (s.hypeNote?.trim()) hypeLines.push(s.hypeNote.trim());
    }

    const topWords = [...wordCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([w]) => w);

    const greenFlags = [...green].slice(0, 5);
    const funniestRedFlag = redFlags[0] ?? null;

    const compiledSummary = {
        topWords,
        greenFlags,
        funniestRedFlag,
        hypeLines: hypeLines.slice(0, 3),
    };

    const promptParts = [
        topWords.length ? `My friends describe me as ${topWords.join(", ")}.` : null,
        greenFlags.length ? `My green flags: ${greenFlags.slice(0, 3).join(", ")}.` : null,
        funniestRedFlag ? `Funny red flag (take lightly): ${funniestRedFlag}.` : null,
        "Find someone compatible with me using this info.",
    ].filter(Boolean);

    const wingmanPrompt = promptParts.join(" ");

    return { compiledSummary, wingmanPrompt };
}

async function buildMatches(userId: string, wingmanPrompt: string) {
    // Load agent memory (nice-to-have). If it fails, continue.
    let learnedPreferences: Record<string, number> | undefined = undefined;
    try {
        const ctx = await getAgentContext(userId);
        learnedPreferences = ctx.learnedPreferences ?? undefined;
    } catch {
        learnedPreferences = undefined;
    }

    // Parse intent (fallback to simple intent if LLM fails)
    let intent: Awaited<ReturnType<typeof parseIntent>>;
    let intentParseFailed = false;
    try {
        intent = await parseIntent(wingmanPrompt, null, learnedPreferences);
    } catch {
        intentParseFailed = true;
        intent = {
            vibe: "any" as const,
            filters: {},
            preferences: { traits: [], interests: [], personality: [] },
            semanticQuery: wingmanPrompt,
            confidence: 0.2,
            isRefinement: false,
        };
    }

    // Embed (fallback to structured-only)
    let intentEmbedding: number[] | null = null;
    try {
        intentEmbedding = intentParseFailed ? null : await embedIntent(intent);
    } catch {
        intentEmbedding = null;
    }

    const searchResults = await agentSearch(userId, intent, intentEmbedding, 20, 0, []);
    const ranked = rankCandidates(searchResults.candidates, intent, learnedPreferences);
    const top = ranked.slice(0, 7);

    const explanations = generateQuickExplanations(top, intent);

    const matches = top.map((candidate, i) => ({
        profile: sanitizeProfile(candidate.profile),
        explanation: explanations[i],
        scores: {
            total: candidate.scores.total,
            vector: Math.round(candidate.scores.vector * 100),
            preference: Math.round(candidate.scores.preference * 100),
            filterMatch: candidate.scores.filterMatch,
        },
    }));

    return matches;
}

export async function GET(req: NextRequest) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const userId = session.user.id;

        const latestLink = await db.query.wingmanLinks.findFirst({
            where: and(eq(wingmanLinks.profileUserId, userId), gt(wingmanLinks.expiresAt, new Date())),
            orderBy: (t, { desc }) => [desc(t.createdAt)],
        });

        // If a pack exists, return latest.
        const existingPack = await db.query.wingmanPacks.findFirst({
            where: eq(wingmanPacks.profileUserId, userId),
            orderBy: (t, { desc }) => [desc(t.generatedAt)],
        });

        // If the user started a newer round than the latest pack, don't keep showing the old pack.
        if (existingPack && (!latestLink || existingPack.roundNumber >= latestLink.roundNumber)) {
            if (!existingPack.openedAt) {
                db.update(wingmanPacks)
                    .set({ openedAt: new Date() })
                    .where(eq(wingmanPacks.id, existingPack.id))
                    .catch(() => {});

                db.insert(agentAnalytics)
                    .values({
                        userId,
                        eventType: "wingman_pack_opened",
                        metadata: { roundNumber: existingPack.roundNumber },
                    })
                    .catch(() => {});
            }

            return successResponse({
                roundNumber: existingPack.roundNumber,
                compiledSummary: existingPack.compiledSummary,
                wingmanPrompt: existingPack.wingmanPrompt,
                matches: existingPack.matchData ?? [],
                generatedAt: existingPack.generatedAt,
                openedAt: existingPack.openedAt,
            });
        }

        // Otherwise, see if there's a ready (or complete) link we can compile.
        const link = latestLink;

        if (!link) {
            return successResponse({
                roundNumber: null,
                compiledSummary: null,
                wingmanPrompt: null,
                matches: [],
                generatedAt: null,
                openedAt: null,
            });
        }

        if ((link.currentSubmissions ?? 0) < (link.targetSubmissions ?? 3)) {
            return errorResponse("Wingman pack not ready yet", 409);
        }

        const submissions = await db.query.wingmanSubmissions.findMany({
            where: eq(wingmanSubmissions.linkId, link.id),
            columns: {
                threeWords: true,
                greenFlags: true,
                redFlagFunny: true,
                hypeNote: true,
            },
            orderBy: (t, { desc }) => [desc(t.createdAt)],
        });

        const { compiledSummary, wingmanPrompt } = compilePack(submissions);
        const matches = await buildMatches(userId, wingmanPrompt);

        const [pack] = await db
            .insert(wingmanPacks)
            .values({
                profileUserId: userId,
                linkId: link.id,
                roundNumber: link.roundNumber,
                compiledSummary,
                wingmanPrompt,
                matchData: matches,
                generatedAt: new Date(),
                openedAt: new Date(),
            })
            .returning();

        db.insert(agentAnalytics)
            .values({
                userId,
                eventType: "wingman_pack_opened",
                metadata: { roundNumber: link.roundNumber },
            })
            .catch(() => {});

        return successResponse({
            roundNumber: pack.roundNumber,
            compiledSummary: pack.compiledSummary,
            wingmanPrompt: pack.wingmanPrompt,
            matches: pack.matchData ?? [],
            generatedAt: pack.generatedAt,
            openedAt: pack.openedAt,
        });
    } catch (error) {
        console.error("[GET /api/wingman/pack]", error);
        return errorResponse("Failed to load wingman pack", 500);
    }
}
