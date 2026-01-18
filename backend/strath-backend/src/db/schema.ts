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
} from "drizzle-orm/pg-core";



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
    },
    (table) => ({
        emailIdx: index("user_email_idx").on(table.email),
        createdAtIdx: index("user_created_at_idx").on(table.createdAt),
        lastActiveIdx: index("user_last_active_idx").on(table.lastActive),
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
}, (table) => ({
    userIdIdx: index("profile_user_id_idx").on(table.userId),
    isVisibleIdx: index("profile_is_visible_idx").on(table.isVisible),
    genderIdx: index("profile_gender_idx").on(table.gender),
    lastActiveIdx: index("profile_last_active_idx").on(table.lastActive),
    completedIdx: index("profile_completed_idx").on(table.profileCompleted),
    usernameIdx: index("profile_username_idx").on(table.username),
    anonymousIdx: index("profile_anonymous_idx").on(table.anonymous),
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
        id: uuid("id").defaultRandom().primaryKey(),
        user1Id: text("user1_id")
            .notNull()
            .references(() => user.id),
        user2Id: text("user2_id")
            .notNull()
            .references(() => user.id),
        user1Typing: boolean("user1_typing").default(false),
        user2Typing: boolean("user2_typing").default(false),
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
        id: uuid("id")
            .primaryKey()
            .default(sql`gen_random_uuid()`),
        content: text("content").notNull(),
        matchId: uuid("match_id")
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
