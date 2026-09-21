import {
    bigint,
    boolean,
    date,
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
