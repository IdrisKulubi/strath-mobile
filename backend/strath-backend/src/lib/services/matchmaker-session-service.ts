import { and, asc, desc, eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { matchmakerMessages, matchmakerSessions, profiles } from "@/db/schema";

export type MatchmakerConversationState =
    | "greeting"
    | "collecting_intent"
    | "clarifying"
    | "ready_to_search"
    | "presenting_candidate"
    | "collecting_feedback"
    | "limit_reached";

export type MatchmakerMessageRole = "user" | "assistant" | "system";
export type MatchmakerMessageKind =
    | "greeting"
    | "text"
    | "intent"
    | "clarifying_question"
    | "search_plan"
    | "candidate"
    | "feedback"
    | "limit";

export interface MatchmakerConversationMessage {
    id: string;
    role: MatchmakerMessageRole;
    kind: MatchmakerMessageKind;
    text: string;
    quickReplies: string[];
    metadata: Record<string, unknown>;
    createdAt: string;
}

export interface MatchmakerConversationSession {
    id: string;
    state: MatchmakerConversationState;
    status: "active" | "completed" | "expired";
    sessionDay: string;
    dailySearchCount: number;
    searchLimit: number;
    remainingSearches: number;
    currentIntent: Record<string, unknown>;
    currentPlan: Record<string, unknown>;
}

export interface MatchmakerConversationResponse {
    session: MatchmakerConversationSession;
    messages: MatchmakerConversationMessage[];
    quickReplies: string[];
}

const DEFAULT_SEARCH_LIMIT = Number(process.env.MATCHMAKER_DAILY_SEARCH_LIMIT || 3);

const INITIAL_QUICK_REPLIES = [
    "I want someone calm",
    "Someone serious",
    "Someone active today",
    "Help me figure it out",
];

const CLARIFY_QUICK_REPLIES = [
    "Emotionally mature",
    "Quiet and calm",
    "Low-drama and consistent",
    "A mix of all three",
];

const READY_QUICK_REPLIES = [
    "Go ahead and search",
    "Change something",
    "Make it more serious",
    "Show someone active",
];

function getNairobiDay(date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Nairobi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

function normalizeText(text: string) {
    return text.trim().replace(/\s+/g, " ");
}

function includesAny(text: string, words: string[]) {
    const lower = text.toLowerCase();
    return words.some((word) => lower.includes(word));
}

function inferIntent(text: string) {
    const lower = text.toLowerCase();
    const traits: string[] = [];
    if (includesAny(lower, ["calm", "quiet", "chill", "peaceful", "low-drama", "low drama"])) traits.push("calm");
    if (includesAny(lower, ["serious", "intentional", "relationship", "long-term", "long term"])) traits.push("serious");
    if (includesAny(lower, ["social", "funny", "fun", "outgoing"])) traits.push("social");
    if (includesAny(lower, ["active", "today", "online", "available"])) traits.push("active_today");
    if (includesAny(lower, ["consistent", "loyal", "mature"])) traits.push("consistent");

    return {
        rawText: text,
        traits: [...new Set(traits)],
        activeToday: includesAny(lower, ["active", "today", "online", "available"]),
        seriousIntent: includesAny(lower, ["serious", "intentional", "relationship", "long-term", "long term"]),
    };
}

function shouldClarify(text: string) {
    const lower = text.toLowerCase();
    return lower.length < 28 || lower === "i want someone calm" || lower === "someone serious";
}

function buildSearchPlan(intent: ReturnType<typeof inferIntent>) {
    const priorities = new Set<string>();
    if (intent.traits.includes("calm")) priorities.add("calm or grounded profile signals");
    if (intent.traits.includes("serious")) priorities.add("intentional dating signals");
    if (intent.traits.includes("social")) priorities.add("social energy and shared interests");
    if (intent.activeToday) priorities.add("recent activity");
    priorities.add("response likelihood");
    priorities.add("profile completeness");

    return {
        intent,
        priorities: [...priorities],
        avoid: ["blocked users", "already passed users", "people already shown in this session"],
    };
}

function serializeMessage(row: typeof matchmakerMessages.$inferSelect): MatchmakerConversationMessage {
    return {
        id: row.id,
        role: row.role,
        kind: row.kind,
        text: row.text,
        quickReplies: row.quickReplies ?? [],
        metadata: row.metadata ?? {},
        createdAt: row.createdAt.toISOString(),
    };
}

function serializeSession(row: typeof matchmakerSessions.$inferSelect): MatchmakerConversationSession {
    return {
        id: row.id,
        state: row.state,
        status: row.status,
        sessionDay: row.sessionDay,
        dailySearchCount: row.dailySearchCount,
        searchLimit: row.searchLimit,
        remainingSearches: Math.max(0, row.searchLimit - row.dailySearchCount),
        currentIntent: row.currentIntent ?? {},
        currentPlan: row.currentPlan ?? {},
    };
}

async function getUserFirstName(userId: string) {
    const profile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
        columns: { firstName: true },
    });
    return profile?.firstName ?? null;
}

async function listMessages(sessionId: string) {
    const rows = await db.query.matchmakerMessages.findMany({
        where: eq(matchmakerMessages.sessionId, sessionId),
        orderBy: [asc(matchmakerMessages.createdAt)],
    });
    return rows.map(serializeMessage);
}

async function createMessage(input: {
    sessionId: string;
    role: MatchmakerMessageRole;
    kind: MatchmakerMessageKind;
    text: string;
    quickReplies?: string[];
    metadata?: Record<string, unknown>;
}) {
    const [message] = await db
        .insert(matchmakerMessages)
        .values({
            sessionId: input.sessionId,
            role: input.role,
            kind: input.kind,
            text: input.text,
            quickReplies: input.quickReplies ?? [],
            metadata: input.metadata ?? {},
        })
        .returning();
    return message;
}

async function ensureGreeting(session: typeof matchmakerSessions.$inferSelect) {
    const existing = await db.query.matchmakerMessages.findFirst({
        where: eq(matchmakerMessages.sessionId, session.id),
    });
    if (existing) return;

    const firstName = await getUserFirstName(session.userId);
    const greetingName = firstName ? ` ${firstName}` : "";
    await createMessage({
        sessionId: session.id,
        role: "assistant",
        kind: "greeting",
        text: `Morning${greetingName}. I can help you find someone who fits how you feel today. What kind of person would feel right?`,
        quickReplies: INITIAL_QUICK_REPLIES,
    });
}

async function getOrCreateRawSession(userId: string) {
    const sessionDay = getNairobiDay();
    const existing = await db.query.matchmakerSessions.findFirst({
        where: and(
            eq(matchmakerSessions.userId, userId),
            eq(matchmakerSessions.sessionDay, sessionDay),
            eq(matchmakerSessions.status, "active"),
        ),
        orderBy: [desc(matchmakerSessions.updatedAt)],
    });
    if (existing) {
        await ensureGreeting(existing);
        return existing;
    }

    const [created] = await db
        .insert(matchmakerSessions)
        .values({
            userId,
            sessionDay,
            status: "active",
            state: "greeting",
            searchLimit: Math.max(1, DEFAULT_SEARCH_LIMIT),
            metadata: { provider: "scripted", phase: "conversation_shell" },
        })
        .returning();
    await ensureGreeting(created);
    return created;
}

async function buildResponse(sessionId: string): Promise<MatchmakerConversationResponse> {
    const session = await db.query.matchmakerSessions.findFirst({
        where: eq(matchmakerSessions.id, sessionId),
    });
    if (!session) throw new Error("Matchmaker session not found");

    const messages = await listMessages(session.id);
    const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");

    return {
        session: serializeSession(session),
        messages,
        quickReplies: latestAssistant?.quickReplies ?? [],
    };
}

export async function getOrCreateMatchmakerConversation(userId: string) {
    const session = await getOrCreateRawSession(userId);
    return buildResponse(session.id);
}

export async function addMatchmakerConversationMessage(input: {
    userId: string;
    text: string;
}) {
    const cleaned = normalizeText(input.text);
    if (cleaned.length < 1) throw new Error("Message is required");
    if (cleaned.length > 800) throw new Error("Message is too long");

    const session = await getOrCreateRawSession(input.userId);
    await createMessage({
        sessionId: session.id,
        role: "user",
        kind: "text",
        text: cleaned,
    });

    const intent = inferIntent(cleaned);
    const nextState: MatchmakerConversationState = shouldClarify(cleaned)
        ? "clarifying"
        : "ready_to_search";
    const plan = buildSearchPlan(intent);

    const assistantMessage = nextState === "clarifying"
        ? {
            kind: "clarifying_question" as const,
            text: "When you say that, what matters most: emotional maturity, a quiet personality, or someone low-drama and consistent?",
            quickReplies: CLARIFY_QUICK_REPLIES,
        }
        : {
            kind: "search_plan" as const,
            text: `That makes sense. I would search for ${plan.priorities.slice(0, 3).join(", ")} and avoid people you have already passed or seen in this session. Should I go ahead?`,
            quickReplies: READY_QUICK_REPLIES,
        };

    const currentIntent = {
        ...intent,
        lastUserMessage: cleaned,
    };

    await db
        .update(matchmakerSessions)
        .set({
            state: nextState,
            currentIntent,
            currentPlan: plan,
            updatedAt: new Date(),
        })
        .where(eq(matchmakerSessions.id, session.id));

    await createMessage({
        sessionId: session.id,
        role: "assistant",
        kind: assistantMessage.kind,
        text: assistantMessage.text,
        quickReplies: assistantMessage.quickReplies,
        metadata: { intent: currentIntent, plan },
    });

    return buildResponse(session.id);
}
