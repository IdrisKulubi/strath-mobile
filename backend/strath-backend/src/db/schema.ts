import { relations, sql } from "drizzle-orm";
import {
    timestamp,
    pgTable,
    text,
    integer,
    boolean,
    uuid,
    json,
    index,
    customType,
    jsonb,
} from "drizzle-orm/pg-core";

// ============================================
// CUSTOM TYPES
// ============================================

// pgvector type for embedding storage
export const vector = customType<{
    data: number[];
    dpiData: string;
    config: { dimension: number };
}>({
    dataType(config) {
        return `vector(${config?.dimension ?? 3072})`;
    },
    fromDriver(value: unknown): number[] {
        // pgvector returns '[1,2,3]' format
        return JSON.parse(value as string);
    },
    toDriver(value: number[]): string {
        return `[${value.join(",")}]`;
    },
});



// First define all tables
export const user = pgTable(
    "user",
    {
        id: text("id").primaryKey(),
        name: text("name").notNull(),
        email: text("email").notNull().unique(),
        role: text("role").$type<"user" | "admin">().default("user"),
        emailVerified: boolean("email_verified").default(false).notNull(),
        image: text("image"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
        lastActive: timestamp("last_active").defaultNow().notNull(),
        isOnline: boolean("is_online").default(false),
        profilePhoto: text("profile_photo"),
        phoneNumber: text("phone_number"),
        pushToken: text("push_token"),
        deletedAt: timestamp("deleted_at"), // Soft delete - when set, account is marked as deleted
    },
    (table) => ({
        emailIdx: index("user_email_idx").on(table.email),
        createdAtIdx: index("user_created_at_idx").on(table.createdAt),
        lastActiveIdx: index("user_last_active_idx").on(table.lastActive),
        deletedAtIdx: index("user_deleted_at_idx").on(table.deletedAt),
    })
);

// Auth tables (BetterAuth compatible)
export const account = pgTable(
    "account",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        accountId: text("account_id").notNull(),
        providerId: text("provider_id").notNull(),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at"),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
        scope: text("scope"),
        password: text("password"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => ({
        userIdIdx: index("account_userId_idx").on(table.userId),
    })
);

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
}, (table) => ({
    userIdIdx: index("session_userId_idx").on(table.userId),
}));

export const verification = pgTable(
    "verification",
    {
        id: text("id").primaryKey(),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => ({
        identifierIdx: index("verification_identifier_idx").on(table.identifier),
    })
);

// Extended user profiles
export const profiles = pgTable("profiles", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    bio: text("bio"),
    age: integer("age"),
    gender: text("gender"),
    role: text("role").$type<"user" | "admin">().default("user"),
    interests: json("interests").$type<string[]>(),
    photos: json("photos").$type<string[]>(),
    isVisible: boolean("is_visible").default(true),
    lastActive: timestamp("last_active").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    isComplete: boolean("is_complete").default(false),
    profileCompleted: boolean("profile_completed").default(false),
    lookingFor: text("looking_for"),
    course: text("course"),
    yearOfStudy: integer("year_of_study"),
    university: text("university"),
    instagram: text("instagram"),
    spotify: text("spotify"),
    snapchat: text("snapchat"),
    profilePhoto: text("profile_photo"),
    phoneNumber: text("phone_number"),
    firstName: text("first_name").notNull().default(""),
    lastName: text("last_name").notNull().default(""),
    isMatch: boolean("is_match").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    anonymous: boolean("anonymous").default(false),
    anonymousAvatar: text("anonymous_avatar"),
    anonymousRevealRequested: boolean("anonymous_reveal_requested").default(
        false
    ),
    drinkingPreference: text("drinking_preference"),
    workoutFrequency: text("workout_frequency"),
    socialMediaUsage: text("social_media_usage"),
    sleepingHabits: text("sleeping_habits"),
    personalityType: text("personality_type"),
    communicationStyle: text("communication_style"),
    loveLanguage: text("love_language"),
    zodiacSign: text("zodiac_sign"),
    visibilityMode: text("visibility_mode").default("standard"),
    incognitoMode: boolean("incognito_mode").default(false),
    discoveryPaused: boolean("discovery_paused").default(false),
    readReceiptsEnabled: boolean("read_receipts_enabled").default(true),
    showActiveStatus: boolean("show_active_status").default(true),
    username: text("username"),
    // New profile fields for enhanced onboarding
    qualities: json("qualities").$type<string[]>(), // ['humor', 'kindness', 'optimism', 'loyalty', 'sarcasm', etc.]
    prompts: json("prompts").$type<{ promptId: string; response: string }[]>(), // Array of prompt responses
    aboutMe: text("about_me"), // Personal bio/description
    height: text("height"), // e.g., "5'10\""
    education: text("education"), // 'high_school', 'bachelors', 'masters', 'phd'
    smoking: text("smoking"), // 'yes', 'no', 'sometimes'
    politics: text("politics"), // 'liberal', 'conservative', 'moderate', 'prefer_not_to_say'
    religion: text("religion"), // Open text field
    languages: json("languages").$type<string[]>(), // ['English', 'Spanish', 'French', etc.]
    interestedIn: json("interested_in").$type<string[]>(), // ['male', 'female', 'other'] - genders the user wants to see

    // ============================================
    // AGENTIC AI FIELDS
    // ============================================
    personalitySummary: text("personality_summary"), // AI-generated natural language summary
    embedding: vector("embedding", { dimension: 3072 }), // pgvector embedding for semantic search
    embeddingUpdatedAt: timestamp("embedding_updated_at"), // Track when embedding was last generated
}, (table) => ({
    userIdIdx: index("profile_user_id_idx").on(table.userId),
    isVisibleIdx: index("profile_is_visible_idx").on(table.isVisible),
    genderIdx: index("profile_gender_idx").on(table.gender),
    lastActiveIdx: index("profile_last_active_idx").on(table.lastActive),
    completedIdx: index("profile_completed_idx").on(table.profileCompleted),
    usernameIdx: index("profile_username_idx").on(table.username),
    anonymousIdx: index("profile_anonymous_idx").on(table.anonymous),
    educationIdx: index("profile_education_idx").on(table.education),
    smokingIdx: index("profile_smoking_idx").on(table.smoking),
    politicsIdx: index("profile_politics_idx").on(table.politics),
}));

// Swipes/Likes
export const swipes = pgTable(
    "swipes",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        swiperId: text("swiper_id")
            .notNull()
            .references(() => user.id),
        swipedId: text("swiped_id")
            .notNull()
            .references(() => user.id),
        isLike: boolean("is_like").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => ({
        swiperIdx: index("swipe_swiper_idx").on(table.swiperId),
        swipedIdx: index("swipe_swiped_idx").on(table.swipedId),
        createdAtIdx: index("swipe_created_at_idx").on(table.createdAt),
        swipeComboIdx: index("swipe_combo_idx").on(table.swiperId, table.swipedId),
    })
);

// Matches
export const matches = pgTable(
    "matches",
    {
        id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
        user1Id: text("user1_id")
            .notNull()
            .references(() => user.id),
        user2Id: text("user2_id")
            .notNull()
            .references(() => user.id),
        user1Typing: boolean("user1_typing").default(false),
        user2Typing: boolean("user2_typing").default(false),
        user1Opened: boolean("user1_opened").default(false), // Track if user1 has opened/seen this match
        user2Opened: boolean("user2_opened").default(false), // Track if user2 has opened/seen this match
        lastMessageAt: timestamp("last_message_at"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => ({
        userIdx: index("match_users_idx").on(table.user1Id, table.user2Id),
        lastMessageIdx: index("last_message_idx").on(table.lastMessageAt),
    })
);

export const feedbacks = pgTable("feedbacks", {
    id: text("id").primaryKey().notNull(),
    name: text("name"),
    phoneNumber: text("phone_number"),
    message: text("message").notNull(),
    status: text("status").notNull().default("new"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Messages
export const messages = pgTable(
    "messages",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        content: text("content").notNull(),
        matchId: text("match_id")
            .references(() => matches.id)
            .notNull(),
        senderId: text("sender_id")
            .references(() => user.id)
            .notNull(),
        status: text("status", { enum: ["sent", "delivered", "read"] })
            .default("sent")
            .notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => ({
        matchIdIdx: index("match_id_idx").on(table.matchId),
        senderIdIdx: index("sender_id_idx").on(table.senderId),
        createdAtIdx: index("created_at_idx").on(table.createdAt),
        // Composite index for efficient message pagination queries
        matchIdCreatedAtIdx: index("match_id_created_at_idx").on(table.matchId, table.createdAt),
    })
);

export const messagesRelations = relations(messages, ({ one }) => ({
    sender: one(user, {
        fields: [messages.senderId],
        references: [user.id],
    }),
    match: one(matches, {
        fields: [messages.matchId],
        references: [matches.id],
    }),
}));

// Matches Relations - required for relational queries with 'with:' clause
export const matchesRelations = relations(matches, ({ one, many }) => ({
    user1: one(user, {
        fields: [matches.user1Id],
        references: [user.id],
        relationName: "matchUser1",
    }),
    user2: one(user, {
        fields: [matches.user2Id],
        references: [user.id],
        relationName: "matchUser2",
    }),
    messages: many(messages),
}));

// Blocks
export const blocks = pgTable("blocks", {
    id: uuid("id").defaultRandom().primaryKey(),
    blockerId: text("blocker_id")
        .notNull()
        .references(() => user.id),
    blockedId: text("blocked_id")
        .notNull()
        .references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    blockerIdx: index("blocks_blocker_idx").on(table.blockerId),
    blockedIdx: index("blocks_blocked_idx").on(table.blockedId),
    uniqueBlock: index("blocks_unique_idx").on(table.blockerId, table.blockedId),
}));

// Blocks Relations
export const blocksRelations = relations(blocks, ({ one }) => ({
    blocker: one(user, {
        fields: [blocks.blockerId],
        references: [user.id],
        relationName: "blockerRelation",
    }),
    blocked: one(user, {
        fields: [blocks.blockedId],
        references: [user.id],
        relationName: "blockedRelation",
    }),
}));

// Starred Profiles
export const starredProfiles = pgTable("starred_profiles", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    starredId: text("starred_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reports
export const reports = pgTable(
    "reports",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        reporterId: text("reporter_id")
            .notNull()
            .references(() => user.id),
        reportedUserId: text("reported_user_id")
            .notNull()
            .references(() => user.id),
        reason: text("reason").notNull(),
        status: text("status").$type<"PENDING" | "RESOLVED">().default("PENDING"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        resolvedAt: timestamp("resolved_at"),
        adminNotes: text("admin_notes"),
    },
    (table) => ({
        reportedIdx: index("reported_user_idx").on(table.reportedUserId),
        statusIdx: index("report_status_idx").on(table.status),
    })
);

// Profile Views
export const profileViews = pgTable(
    "profile_views",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        viewerId: text("viewer_id")
            .notNull()
            .references(() => user.id),
        viewedId: text("viewed_id")
            .notNull()
            .references(() => user.id),
        viewedAt: timestamp("viewed_at").defaultNow().notNull(),
        source: text("source")
            .$type<"VIEW_MORE" | "PROFILE_CARD" | "SEARCH" | "MATCHES">()
            .default("VIEW_MORE"),
        viewDuration: integer("view_duration"),
    },
    (table) => ({
        viewerIdx: index("profile_views_viewer_idx").on(table.viewerId),
        viewedIdx: index("profile_views_viewed_idx").on(table.viewedId),
        viewedAtIdx: index("profile_views_viewed_at_idx").on(table.viewedAt),
    })
);

// Relations
export const userRelations = relations(user, ({ one, many }) => ({
    profile: one(profiles, {
        fields: [user.id],
        references: [profiles.userId],
    }),
    sentSwipes: many(swipes, { relationName: "swiperRelation" }),
    receivedSwipes: many(swipes, { relationName: "swipedRelation" }),
    matches1: many(matches, { relationName: "user1Relation" }),
    matches2: many(matches, { relationName: "user2Relation" }),
    starredProfiles: many(starredProfiles, {
        relationName: "userStarredProfiles",
    }),
    reports: many(reports, { relationName: "userReports" }),
    blockedUsers: many(blocks, { relationName: "blockerRelation" }),
    blockedBy: many(blocks, { relationName: "blockedRelation" }),
    sessions: many(session),
    accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}));

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}));


export const reportsRelations = relations(reports, ({ one }) => ({
    reporter: one(user, {
        fields: [reports.reporterId],
        references: [user.id],
        relationName: "userReports",
    }),
    reportedUser: one(user, {
        fields: [reports.reportedUserId],
        references: [user.id],
    }),
}));

export const swipesRelations = relations(swipes, ({ one }) => ({
    swiper: one(user, {
        fields: [swipes.swiperId],
        references: [user.id],
        relationName: "swiperRelation",
    }),
    swiped: one(user, {
        fields: [swipes.swipedId],
        references: [user.id],
        relationName: "swipedRelation",
    }),
}));

export const starredProfilesRelations = relations(starredProfiles, ({ one }) => ({
    user: one(user, {
        fields: [starredProfiles.userId],
        references: [user.id],
        relationName: "userStarredProfiles",
    }),
    starred: one(user, {
        fields: [starredProfiles.starredId],
        references: [user.id],
    }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
    user: one(user, {
        fields: [profiles.userId],
        references: [user.id],
    }),
}));

export const profileViewsRelations = relations(profileViews, ({ one }) => ({
    viewer: one(user, {
        fields: [profileViews.viewerId],
        references: [user.id],
        relationName: "profileViewer",
    }),
    viewed: one(user, {
        fields: [profileViews.viewedId],
        references: [user.id],
        relationName: "profileViewed",
    }),
}));

// Then create type references at the end
export type Profile = typeof profiles.$inferSelect & {
    isMatch: boolean | null;
    userId: string;
    unreadMessages?: number;
    matchId?: string;
};

// Export the Message type if needed
export type Message = typeof messages.$inferSelect;

export type ProfileView = typeof profileViews.$inferSelect;

// ============================================
// OPPORTUNITIES / JOBS SECTION
// ============================================

// Opportunity Categories Enum
export const opportunityCategories = [
    "internship",
    "part_time",
    "full_time", 
    "scholarship",
    "grant",
    "event",
    "workshop",
    "announcement"
] as const;

export type OpportunityCategory = typeof opportunityCategories[number];

// Location Types
export const locationTypes = ["remote", "onsite", "hybrid"] as const;
export type LocationType = typeof locationTypes[number];

// Opportunities Table
export const opportunities = pgTable(
    "opportunities",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        title: text("title").notNull(),
        description: text("description").notNull(),
        category: text("category").$type<OpportunityCategory>().notNull(),
        organization: text("organization").notNull(),
        logo: text("logo"), // Organization logo URL
        location: text("location"),
        locationType: text("location_type").$type<LocationType>().default("onsite"),
        deadline: timestamp("deadline"),
        applicationUrl: text("application_url"),
        requirements: json("requirements").$type<string[]>(),
        salary: text("salary"), // e.g., "KES 30,000 - 50,000" or "Unpaid"
        stipend: text("stipend"),
        duration: text("duration"), // e.g., "3 months", "6 weeks"
        slots: integer("slots"), // Number of available positions
        isActive: boolean("is_active").default(true),
        isFeatured: boolean("is_featured").default(false),
        viewCount: integer("view_count").default(0),
        postedBy: text("posted_by").references(() => user.id),
        contactEmail: text("contact_email"),
        contactPhone: text("contact_phone"),
        tags: json("tags").$type<string[]>(),
        postedAt: timestamp("posted_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
    },
    (table) => ({
        categoryIdx: index("opportunity_category_idx").on(table.category),
        deadlineIdx: index("opportunity_deadline_idx").on(table.deadline),
        isActiveIdx: index("opportunity_is_active_idx").on(table.isActive),
        isFeaturedIdx: index("opportunity_is_featured_idx").on(table.isFeatured),
        postedAtIdx: index("opportunity_posted_at_idx").on(table.postedAt),
        organizationIdx: index("opportunity_organization_idx").on(table.organization),
    })
);

// Saved/Bookmarked Opportunities
export const savedOpportunities = pgTable(
    "saved_opportunities",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        opportunityId: uuid("opportunity_id")
            .notNull()
            .references(() => opportunities.id, { onDelete: "cascade" }),
        savedAt: timestamp("saved_at").defaultNow().notNull(),
    },
    (table) => ({
        userIdIdx: index("saved_opportunity_user_idx").on(table.userId),
        opportunityIdIdx: index("saved_opportunity_opp_idx").on(table.opportunityId),
        uniqueSave: index("saved_opportunity_unique_idx").on(table.userId, table.opportunityId),
    })
);

// Opportunity Applications (track who applied)
export const opportunityApplications = pgTable(
    "opportunity_applications",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        opportunityId: uuid("opportunity_id")
            .notNull()
            .references(() => opportunities.id, { onDelete: "cascade" }),
        appliedAt: timestamp("applied_at").defaultNow().notNull(),
        status: text("status").$type<"pending" | "viewed" | "shortlisted" | "rejected">().default("pending"),
    },
    (table) => ({
        userIdIdx: index("application_user_idx").on(table.userId),
        opportunityIdIdx: index("application_opp_idx").on(table.opportunityId),
    })
);

// Relations for Opportunities
export const opportunitiesRelations = relations(opportunities, ({ one, many }) => ({
    postedByUser: one(user, {
        fields: [opportunities.postedBy],
        references: [user.id],
    }),
    savedBy: many(savedOpportunities),
    applications: many(opportunityApplications),
}));

export const savedOpportunitiesRelations = relations(savedOpportunities, ({ one }) => ({
    user: one(user, {
        fields: [savedOpportunities.userId],
        references: [user.id],
    }),
    opportunity: one(opportunities, {
        fields: [savedOpportunities.opportunityId],
        references: [opportunities.id],
    }),
}));

export const opportunityApplicationsRelations = relations(opportunityApplications, ({ one }) => ({
    user: one(user, {
        fields: [opportunityApplications.userId],
        references: [user.id],
    }),
    opportunity: one(opportunities, {
        fields: [opportunityApplications.opportunityId],
        references: [opportunities.id],
    }),
}));

// Types
export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
export type SavedOpportunity = typeof savedOpportunities.$inferSelect;
export type OpportunityApplication = typeof opportunityApplications.$inferSelect;

// ===============================
// CAMPUS EVENTS
// ===============================

export const campusEvents = pgTable(
    "campus_events",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        title: text("title").notNull(),
        description: text("description"),
        category: text("category").$type<
            | "social"
            | "academic"
            | "sports"
            | "career"
            | "arts"
            | "gaming"
            | "faith"
            | "clubs"
        >().notNull(),
        coverImage: text("cover_image"),
        
        // Location
        university: text("university").notNull(),
        location: text("location"), // "Main Auditorium", "Student Center"
        isVirtual: boolean("is_virtual").default(false),
        virtualLink: text("virtual_link"),
        
        // Time
        startTime: timestamp("start_time").notNull(),
        endTime: timestamp("end_time"),
        
        // Creator
        creatorId: text("creator_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        organizerName: text("organizer_name"), // "Tech Club", "Student Government"
        
        // Stats & Settings
        maxAttendees: integer("max_attendees"),
        isPublic: boolean("is_public").default(true),
        
        // Timestamps
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => ({
        universityIdx: index("event_university_idx").on(table.university),
        categoryIdx: index("event_category_idx").on(table.category),
        startTimeIdx: index("event_start_time_idx").on(table.startTime),
        creatorIdx: index("event_creator_idx").on(table.creatorId),
        publicIdx: index("event_public_idx").on(table.isPublic),
    })
);

export const eventRsvps = pgTable(
    "event_rsvps",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        eventId: uuid("event_id")
            .notNull()
            .references(() => campusEvents.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        status: text("status").$type<"going" | "interested">().default("going"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => ({
        eventIdx: index("rsvp_event_idx").on(table.eventId),
        userIdx: index("rsvp_user_idx").on(table.userId),
        uniqueRsvp: index("rsvp_unique_idx").on(table.eventId, table.userId),
    })
);

// Relations for Events
export const campusEventsRelations = relations(campusEvents, ({ one, many }) => ({
    creator: one(user, {
        fields: [campusEvents.creatorId],
        references: [user.id],
    }),
    rsvps: many(eventRsvps),
}));

export const eventRsvpsRelations = relations(eventRsvps, ({ one }) => ({
    event: one(campusEvents, {
        fields: [eventRsvps.eventId],
        references: [campusEvents.id],
    }),
    user: one(user, {
        fields: [eventRsvps.userId],
        references: [user.id],
    }),
}));

// Event Types
export type CampusEvent = typeof campusEvents.$inferSelect;
export type NewCampusEvent = typeof campusEvents.$inferInsert;
export type EventRsvp = typeof eventRsvps.$inferSelect;
export type NewEventRsvp = typeof eventRsvps.$inferInsert;
export type EventCategory = "social" | "academic" | "sports" | "career" | "arts" | "gaming" | "faith" | "clubs";


// ============================================
// AGENTIC AI TABLES
// ============================================

// Agent Context (Wingman Memory) — stores learned preferences per user
export const agentContext = pgTable("agent_context", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" })
        .unique(),

    // Accumulated preferences learned over time
    // e.g. { "prefers_introverts": 0.8, "dislikes_party": 0.9 }
    learnedPreferences: jsonb("learned_preferences").$type<Record<string, number>>().default({}),

    // History of queries (last 20)
    queryHistory: jsonb("query_history").$type<{
        query: string;
        timestamp: string;
        matchedIds: string[];
        feedback?: string;
    }[]>().default([]),

    // Match feedback history
    matchFeedback: jsonb("match_feedback").$type<{
        matchedUserId: string;
        outcome: "amazing" | "nice" | "meh" | "not_for_me";
        date: string;
    }[]>().default([]),

    // Agent conversation state
    lastAgentMessage: text("last_agent_message"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
    userIdx: index("agent_context_user_idx").on(table.userId),
}));

// Weekly Drops — pre-computed match batches delivered weekly
export const weeklyDrops = pgTable("weekly_drops", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),

    // The matches in this drop
    matchedUserIds: jsonb("matched_user_ids").$type<string[]>().default([]).notNull(),
    matchData: jsonb("match_data").$type<{
        userId: string;
        score: number;
        reasons: string[];
        starters: string[];
    }[]>().default([]).notNull(),

    // Drop metadata
    dropNumber: integer("drop_number").notNull(),
    deliveredAt: timestamp("delivered_at"),
    openedAt: timestamp("opened_at"),
    expiresAt: timestamp("expires_at").notNull(),

    // Status
    status: text("status").$type<"pending" | "delivered" | "opened" | "expired">().default("pending"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    userIdx: index("drops_user_idx").on(table.userId),
    statusIdx: index("drops_status_idx").on(table.status),
    expiresIdx: index("drops_expires_idx").on(table.expiresAt),
}));

// Match Missions — post-match IRL activities
export const matchMissions = pgTable("match_missions", {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: text("match_id")
        .notNull()
        .references(() => matches.id, { onDelete: "cascade" }),

    // Mission details
    missionType: text("mission_type").$type<
        "coffee_meetup" | "song_exchange" | "photo_challenge" | "study_date" |
        "campus_walk" | "food_adventure" | "sunset_spot" | "quiz_challenge"
    >().notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    emoji: text("emoji").notNull(),

    // Location/time suggestion
    suggestedLocation: text("suggested_location"),
    suggestedTime: text("suggested_time"),
    deadline: timestamp("deadline").notNull(),

    // Status tracking
    user1Accepted: boolean("user1_accepted").default(false),
    user2Accepted: boolean("user2_accepted").default(false),
    user1Completed: boolean("user1_completed").default(false),
    user2Completed: boolean("user2_completed").default(false),

    status: text("status").$type<"proposed" | "accepted" | "completed" | "expired" | "skipped">().default("proposed"),

    // Post-mission feedback
    user1Rating: text("user1_rating").$type<"amazing" | "nice" | "meh" | "not_for_me">(),
    user2Rating: text("user2_rating").$type<"amazing" | "nice" | "meh" | "not_for_me">(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
    matchIdx: index("missions_match_idx").on(table.matchId),
    statusIdx: index("missions_status_idx").on(table.status),
    deadlineIdx: index("missions_deadline_idx").on(table.deadline),
}));

// Vibe Checks — 3-minute anonymous voice calls
export const vibeChecks = pgTable("vibe_checks", {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: text("match_id")
        .notNull()
        .references(() => matches.id, { onDelete: "cascade" }),

    // Call details
    roomName: text("room_name").notNull().unique(),
    roomUrl: text("room_url"),

    // Participants
    user1Id: text("user1_id").notNull().references(() => user.id),
    user2Id: text("user2_id").notNull().references(() => user.id),

    // Scheduling
    scheduledAt: timestamp("scheduled_at"),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    durationSeconds: integer("duration_seconds"),

    // Post-call decisions
    user1Decision: text("user1_decision").$type<"meet" | "pass">(),
    user2Decision: text("user2_decision").$type<"meet" | "pass">(),
    bothAgreedToMeet: boolean("both_agreed_to_meet").default(false),

    // Conversation starter provided
    suggestedTopic: text("suggested_topic"),

    status: text("status").$type<"pending" | "scheduled" | "active" | "completed" | "expired" | "cancelled">().default("pending"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    matchIdx: index("vibe_checks_match_idx").on(table.matchId),
    statusIdx: index("vibe_checks_status_idx").on(table.status),
}));

// Campus Pulse — anonymous social feed
export const pulsePosts = pgTable("pulse_posts", {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: text("author_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),

    content: text("content").notNull(),
    category: text("category").$type<
        "missed_connection" | "campus_thought" | "dating_rant" | "hot_take" | "looking_for" | "general"
    >().default("general"),

    // Privacy
    isAnonymous: boolean("is_anonymous").default(true),

    // Engagement counters
    fireCount: integer("fire_count").default(0),
    skullCount: integer("skull_count").default(0),
    heartCount: integer("heart_count").default(0),

    // Reveal system — user IDs who want to reveal
    revealRequests: jsonb("reveal_requests").$type<string[]>().default([]),

    // Moderation
    isFlagged: boolean("is_flagged").default(false),
    isHidden: boolean("is_hidden").default(false),

    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    createdIdx: index("pulse_posts_created_idx").on(table.createdAt),
    categoryIdx: index("pulse_posts_category_idx").on(table.category),
    authorIdx: index("pulse_posts_author_idx").on(table.authorId),
}));

// Pulse Reactions
export const pulseReactions = pgTable("pulse_reactions", {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
        .notNull()
        .references(() => pulsePosts.id, { onDelete: "cascade" }),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    reaction: text("reaction").$type<"fire" | "skull" | "heart">().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    postIdx: index("pulse_reactions_post_idx").on(table.postId),
    uniqueReaction: index("pulse_reactions_unique_idx").on(table.postId, table.userId),
}));

// Study Date Mode — broadcast study availability
export const studySessions = pgTable("study_sessions", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),

    locationName: text("location_name").notNull(),
    university: text("university").notNull(),

    availableUntil: timestamp("available_until").notNull(),
    isActive: boolean("is_active").default(true),

    subject: text("subject"),
    vibe: text("vibe").$type<"silent_focus" | "chill_chat" | "group_study">(),

    openToAnyone: boolean("open_to_anyone").default(true),
    preferredGender: text("preferred_gender"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    activeIdx: index("study_sessions_active_idx").on(table.isActive, table.university),
    userIdx: index("study_sessions_user_idx").on(table.userId),
    expiresIdx: index("study_sessions_expires_idx").on(table.availableUntil),
}));

// Wingman — pass-the-phone links + friend submissions + compiled packs
export const wingmanLinks = pgTable("wingman_links", {
    id: uuid("id").defaultRandom().primaryKey(),
    profileUserId: text("profile_user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),

    roundNumber: integer("round_number").notNull(),

    token: text("token").notNull().unique(),

    targetSubmissions: integer("target_submissions").default(3),
    currentSubmissions: integer("current_submissions").default(0),
    expiresAt: timestamp("expires_at").notNull(),

    status: text("status").$type<"collecting" | "ready" | "expired">().default("collecting"),
    lastSubmissionAt: timestamp("last_submission_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    profileIdx: index("wingman_links_profile_idx").on(table.profileUserId),
    expiresIdx: index("wingman_links_expires_idx").on(table.expiresAt),
    profileRoundIdx: index("wingman_links_profile_round_idx").on(table.profileUserId, table.roundNumber),
}));

export const wingmanSubmissions = pgTable("wingman_submissions", {
    id: uuid("id").defaultRandom().primaryKey(),
    linkId: uuid("link_id")
        .notNull()
        .references(() => wingmanLinks.id, { onDelete: "cascade" }),

    authorName: text("author_name").notNull(),
    relationship: text("relationship"),

    threeWords: jsonb("three_words").$type<string[]>().default([]),
    greenFlags: jsonb("green_flags").$type<string[]>().default([]),
    redFlagFunny: text("red_flag_funny"),
    hypeNote: text("hype_note"),

    isFlagged: boolean("is_flagged").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    linkIdx: index("wingman_submissions_link_idx").on(table.linkId),
}));

export const wingmanPacks = pgTable("wingman_packs", {
    id: uuid("id").defaultRandom().primaryKey(),
    profileUserId: text("profile_user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    linkId: uuid("link_id")
        .notNull()
        .references(() => wingmanLinks.id, { onDelete: "cascade" }),

    roundNumber: integer("round_number").notNull(),

    compiledSummary: jsonb("compiled_summary").$type<Record<string, unknown>>().default({}),
    wingmanPrompt: text("wingman_prompt").notNull(),
    matchData: jsonb("match_data").$type<any[]>().default([]),

    generatedAt: timestamp("generated_at").defaultNow().notNull(),
    openedAt: timestamp("opened_at"),
}, (table) => ({
    profileIdx: index("wingman_packs_profile_idx").on(table.profileUserId),
    profileRoundIdx: index("wingman_packs_profile_round_idx").on(table.profileUserId, table.roundNumber),
}));

// Hype Me — friend vouches on profiles
export const hypeVouches = pgTable("hype_vouches", {
    id: uuid("id").defaultRandom().primaryKey(),
    profileUserId: text("profile_user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),

    // Author (may not be a user — external friends via link)
    authorUserId: text("author_user_id").references(() => user.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),

    content: text("content").notNull(), // Max 200 chars

    isApproved: boolean("is_approved").default(true),
    isFlagged: boolean("is_flagged").default(false),

    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    profileIdx: index("hype_vouches_profile_idx").on(table.profileUserId),
}));

// Hype Invite Links — for external vouchers
export const hypeInviteLinks = pgTable("hype_invite_links", {
    id: uuid("id").defaultRandom().primaryKey(),
    profileUserId: text("profile_user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),

    token: text("token").notNull().unique(),
    maxUses: integer("max_uses").default(5),
    currentUses: integer("current_uses").default(0),
    expiresAt: timestamp("expires_at").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    tokenIdx: index("hype_links_token_idx").on(table.token),
}));

// Blind Dates — IRL meetups arranged by the app
export const blindDates = pgTable("blind_dates", {
    id: uuid("id").defaultRandom().primaryKey(),

    user1Id: text("user1_id").notNull().references(() => user.id),
    user2Id: text("user2_id").notNull().references(() => user.id),
    matchId: text("match_id").references(() => matches.id),

    location: text("location").notNull(),
    suggestedTime: timestamp("suggested_time").notNull(),
    codeWord: text("code_word").notNull(),

    user1OptedIn: boolean("user1_opted_in").default(false),
    user2OptedIn: boolean("user2_opted_in").default(false),

    status: text("status").$type<"proposed" | "confirmed" | "completed" | "cancelled" | "no_show">().default("proposed"),

    user1Feedback: text("user1_feedback").$type<"amazing" | "nice" | "meh" | "not_for_me">(),
    user2Feedback: text("user2_feedback").$type<"amazing" | "nice" | "meh" | "not_for_me">(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    usersIdx: index("blind_dates_users_idx").on(table.user1Id, table.user2Id),
    statusIdx: index("blind_dates_status_idx").on(table.status),
}));

// Agent Analytics — lightweight event tracking
export const agentAnalytics = pgTable("agent_analytics", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),

    eventType: text("event_type").$type<
        "agent_search" | "agent_refine" | "drop_opened" | "drop_expired" |
        "mission_accepted" | "mission_completed" | "vibe_check_started" |
        "vibe_check_agreed" | "study_date_created" | "blind_date_confirmed" |
        "pulse_posted" | "hype_written" |
        "wingman_link_created" | "wingman_submission_received" |
        "wingman_pack_opened" | "wingman_pack_shared" | "wingman_match_connected"
    >().notNull(),

    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    userIdx: index("analytics_user_idx").on(table.userId),
    eventIdx: index("analytics_event_idx").on(table.eventType),
    createdIdx: index("analytics_created_idx").on(table.createdAt),
}));

// ============================================
// AGENTIC RELATIONS
// ============================================

export const agentContextRelations = relations(agentContext, ({ one }) => ({
    user: one(user, {
        fields: [agentContext.userId],
        references: [user.id],
    }),
}));

export const weeklyDropsRelations = relations(weeklyDrops, ({ one }) => ({
    user: one(user, {
        fields: [weeklyDrops.userId],
        references: [user.id],
    }),
}));

export const matchMissionsRelations = relations(matchMissions, ({ one }) => ({
    match: one(matches, {
        fields: [matchMissions.matchId],
        references: [matches.id],
    }),
}));

export const vibeChecksRelations = relations(vibeChecks, ({ one }) => ({
    match: one(matches, {
        fields: [vibeChecks.matchId],
        references: [matches.id],
    }),
    user1: one(user, {
        fields: [vibeChecks.user1Id],
        references: [user.id],
        relationName: "vibeCheckUser1",
    }),
    user2: one(user, {
        fields: [vibeChecks.user2Id],
        references: [user.id],
        relationName: "vibeCheckUser2",
    }),
}));

export const pulsePostsRelations = relations(pulsePosts, ({ one, many }) => ({
    author: one(user, {
        fields: [pulsePosts.authorId],
        references: [user.id],
    }),
    reactions: many(pulseReactions),
}));

export const pulseReactionsRelations = relations(pulseReactions, ({ one }) => ({
    post: one(pulsePosts, {
        fields: [pulseReactions.postId],
        references: [pulsePosts.id],
    }),
    user: one(user, {
        fields: [pulseReactions.userId],
        references: [user.id],
    }),
}));

export const studySessionsRelations = relations(studySessions, ({ one }) => ({
    user: one(user, {
        fields: [studySessions.userId],
        references: [user.id],
    }),
}));

export const wingmanLinksRelations = relations(wingmanLinks, ({ one, many }) => ({
    profileUser: one(user, {
        fields: [wingmanLinks.profileUserId],
        references: [user.id],
    }),
    submissions: many(wingmanSubmissions),
}));

export const wingmanSubmissionsRelations = relations(wingmanSubmissions, ({ one }) => ({
    link: one(wingmanLinks, {
        fields: [wingmanSubmissions.linkId],
        references: [wingmanLinks.id],
    }),
}));

export const wingmanPacksRelations = relations(wingmanPacks, ({ one }) => ({
    profileUser: one(user, {
        fields: [wingmanPacks.profileUserId],
        references: [user.id],
    }),
    link: one(wingmanLinks, {
        fields: [wingmanPacks.linkId],
        references: [wingmanLinks.id],
    }),
}));

export const hypeVouchesRelations = relations(hypeVouches, ({ one }) => ({
    profileUser: one(user, {
        fields: [hypeVouches.profileUserId],
        references: [user.id],
        relationName: "hypeProfileUser",
    }),
    author: one(user, {
        fields: [hypeVouches.authorUserId],
        references: [user.id],
        relationName: "hypeAuthor",
    }),
}));

export const hypeInviteLinksRelations = relations(hypeInviteLinks, ({ one }) => ({
    profileUser: one(user, {
        fields: [hypeInviteLinks.profileUserId],
        references: [user.id],
    }),
}));

export const blindDatesRelations = relations(blindDates, ({ one }) => ({
    user1: one(user, {
        fields: [blindDates.user1Id],
        references: [user.id],
        relationName: "blindDateUser1",
    }),
    user2: one(user, {
        fields: [blindDates.user2Id],
        references: [user.id],
        relationName: "blindDateUser2",
    }),
    match: one(matches, {
        fields: [blindDates.matchId],
        references: [matches.id],
    }),
}));

export const agentAnalyticsRelations = relations(agentAnalytics, ({ one }) => ({
    user: one(user, {
        fields: [agentAnalytics.userId],
        references: [user.id],
    }),
}));

// ============================================
// AGENTIC TYPES
// ============================================
export type AgentContext = typeof agentContext.$inferSelect;
export type NewAgentContext = typeof agentContext.$inferInsert;
export type WeeklyDrop = typeof weeklyDrops.$inferSelect;
export type NewWeeklyDrop = typeof weeklyDrops.$inferInsert;
export type MatchMission = typeof matchMissions.$inferSelect;
export type NewMatchMission = typeof matchMissions.$inferInsert;
export type VibeCheck = typeof vibeChecks.$inferSelect;
export type NewVibeCheck = typeof vibeChecks.$inferInsert;
export type PulsePost = typeof pulsePosts.$inferSelect;
export type NewPulsePost = typeof pulsePosts.$inferInsert;
export type PulseReaction = typeof pulseReactions.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type NewStudySession = typeof studySessions.$inferInsert;
export type WingmanLink = typeof wingmanLinks.$inferSelect;
export type NewWingmanLink = typeof wingmanLinks.$inferInsert;
export type WingmanSubmission = typeof wingmanSubmissions.$inferSelect;
export type NewWingmanSubmission = typeof wingmanSubmissions.$inferInsert;
export type WingmanPack = typeof wingmanPacks.$inferSelect;
export type NewWingmanPack = typeof wingmanPacks.$inferInsert;
export type HypeVouch = typeof hypeVouches.$inferSelect;
export type NewHypeVouch = typeof hypeVouches.$inferInsert;
export type HypeInviteLink = typeof hypeInviteLinks.$inferSelect;
export type BlindDate = typeof blindDates.$inferSelect;
export type NewBlindDate = typeof blindDates.$inferInsert;
export type AgentAnalyticsEvent = typeof agentAnalytics.$inferSelect;

// Mission type for templates
export type MissionType = "coffee_meetup" | "song_exchange" | "photo_challenge" | "study_date" |
    "campus_walk" | "food_adventure" | "sunset_spot" | "quiz_challenge";

// Feedback rating type
export type FeedbackRating = "amazing" | "nice" | "meh" | "not_for_me";

// Pulse category type
export type PulseCategory = "missed_connection" | "campus_thought" | "dating_rant" | "hot_take" | "looking_for" | "general";
