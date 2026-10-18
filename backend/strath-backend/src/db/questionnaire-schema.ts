import {
    bigint,
    boolean,
    date,
    doublePrecision,
    index,
    integer,
    jsonb,
    pgTable,
    primaryKey,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";

// SQL supplies cross-domain foreign keys, checks, and the immutability trigger.
export const questionCategories = pgTable("q_categories", {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
});

export const questionVersions = pgTable(
    "q_questions",
    {
        id: text("id").primaryKey(),
        questionKey: text("question_key").notNull(),
        version: integer("version").notNull(),
        categoryId: text("category_id").notNull(),
        prompt: text("prompt").notNull(),
        options: jsonb("options").notNull(),
        pool: text("pool").$type<"starter" | "replacement" | "sensitive">().notNull(),
        position: integer("position").notNull(),
        sensitive: boolean("sensitive").notNull().default(false),
        published: boolean("published").notNull().default(true),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("q_questions_key_version_idx").on(table.questionKey, table.version),
        uniqueIndex("q_questions_position_idx").on(table.position),
        index("q_questions_catalogue_idx").on(table.published, table.pool, table.position),
    ],
);

export const questionnaireState = pgTable("q_state", {
    userId: text("user_id").primaryKey(),
    revision: integer("revision").notNull().default(0),
    birthDate: date("birth_date"),
    preferences: jsonb("preferences"),
    skipped: jsonb("skipped").$type<string[]>().notNull().default([]),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questionAnswers = pgTable(
    "q_answers",
    {
        userId: text("user_id").notNull(),
        questionId: text("question_id").notNull(),
        answerId: text("answer_id").notNull(),
        acceptable: jsonb("acceptable").$type<string[]>().notNull(),
        weight: integer("weight").notNull(),
        public: boolean("public").notNull().default(false),
        explanation: text("explanation").notNull().default(""),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        primaryKey({ columns: [table.userId, table.questionId] }),
        index("q_answers_question_idx").on(table.questionId),
    ],
);

export const questionnaireEvents = pgTable(
    "q_questionnaire_events",
    {
        id: bigint("id", { mode: "number" }).primaryKey(),
        userId: text("user_id"),
        event: text("event").$type<"questionnaire_started" | "questionnaire_progress" | "questionnaire_completed">().notNull(),
        answerCount: integer("answer_count").notNull(),
        revision: integer("revision").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [index("q_questionnaire_events_funnel_idx").on(table.event, table.createdAt)],
);

export const compatibilityCache = pgTable(
    "q_compatibility_cache",
    {
        userA: text("user_a").notNull(),
        userB: text("user_b").notNull(),
        revisionA: integer("revision_a").notNull(),
        revisionB: integer("revision_b").notNull(),
        algorithmVersion: text("algorithm_version").notNull(),
        status: text("status").$type<"ready" | "insufficient_evidence">().notNull(),
        score: doublePrecision("score"),
        sharedCount: integer("shared_count").notNull(),
        evidenceCount: integer("evidence_count").notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        primaryKey({ columns: [table.userA, table.userB] }),
        index("q_compatibility_cache_version_idx").on(table.algorithmVersion, table.updatedAt),
    ],
);

export const discoveryEvents = pgTable(
    "q_discovery_events",
    {
        id: bigint("id", { mode: "number" }).primaryKey(),
        userId: text("user_id"),
        event: text("event").$type<"discovery_served" | "discovery_empty" | "engine_unavailable">().notNull(),
        candidateCount: integer("candidate_count").notNull(),
        durationMs: integer("duration_ms").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [index("q_discovery_events_operation_idx").on(table.event, table.createdAt)],
);

export const profileDecisions = pgTable(
    "q_profile_decisions",
    {
        actorId: text("actor_id").notNull(),
        targetId: text("target_id").notNull(),
        decision: text("decision").$type<"like" | "pass">().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        primaryKey({ columns: [table.actorId, table.targetId] }),
        index("q_profile_decisions_received_idx").on(table.targetId, table.decision, table.updatedAt),
    ],
);

export const questionnaireConnections = pgTable(
    "q_connections",
    {
        userA: text("user_a").notNull(),
        userB: text("user_b").notNull(),
        matchId: text("match_id"),
        status: text("status").$type<"pending" | "active" | "unmatched" | "blocked">().notNull().default("pending"),
        origin: text("origin").$type<"questionnaire" | "legacy">().notNull().default("questionnaire"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        connectedAt: timestamp("connected_at", { withTimezone: true }),
        endedAt: timestamp("ended_at", { withTimezone: true }),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        primaryKey({ columns: [table.userA, table.userB] }),
        uniqueIndex("q_connections_match_unique").on(table.matchId),
        index("q_connections_user_b_idx").on(table.userB, table.status),
        index("q_connections_status_idx").on(table.status, table.updatedAt),
    ],
);

export const connectionEvents = pgTable(
    "q_connection_events",
    {
        id: bigint("id", { mode: "number" }).primaryKey(),
        userId: text("user_id"),
        matchId: text("match_id"),
        event: text("event").$type<"like_sent" | "pass_saved" | "mutual_like" | "conversation_started" | "message_sent" | "unmatched" | "blocked">().notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index("q_connection_events_funnel_idx").on(table.event, table.createdAt),
        index("q_connection_events_match_idx").on(table.matchId, table.event, table.createdAt),
    ],
);
