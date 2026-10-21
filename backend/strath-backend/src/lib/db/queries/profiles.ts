import { and, count, eq, getTableColumns, inArray, sql } from "drizzle-orm";

import { profiles, user } from "@/db/schema";
import { db } from "@/lib/db";
import { positionTier } from "@/lib/services/admission-service";

const { embedding: _embedding, ...currentUserProfileColumns } = getTableColumns(profiles);

export const PROFILE_ACCESS_COLUMNS = {
    userId: true,
    firstName: true,
    profilePhoto: true,
    photos: true,
    profileCompleted: true,
    faceVerificationStatus: true,
    faceVerificationRequired: true,
    discoveryPaused: true,
    incognitoMode: true,
    waitlistStatus: true,
    role: true,
    isVisible: true,
} as const;

export const PROFILE_CARD_COLUMNS = {
    userId: true,
    firstName: true,
    age: true,
    profilePhoto: true,
    photos: true,
    bio: true,
    aboutMe: true,
    interests: true,
    personalityAnswers: true,
    course: true,
    university: true,
    faceVerificationStatus: true,
    faceVerificationRequired: true,
    isVisible: true,
} as const;

export const PROFILE_COMPATIBILITY_COLUMNS = {
    userId: true,
    age: true,
    bio: true,
    aboutMe: true,
    interests: true,
    qualities: true,
    languages: true,
    lookingFor: true,
    course: true,
    yearOfStudy: true,
    university: true,
    personalityType: true,
    personalitySummary: true,
    communicationStyle: true,
    loveLanguage: true,
    prompts: true,
    lastActive: true,
    profileCompleted: true,
    photos: true,
    profilePhoto: true,
    personalityAnswers: true,
    lifestyleAnswers: true,
} as const;

export type ProfileCardRow = {
    userId: string;
    firstName: string | null;
    age: number | null;
    profilePhoto: string | null;
    photos: string[] | null;
    bio: string | null;
    aboutMe: string | null;
    interests: string[] | null;
    personalityAnswers: Record<string, unknown> | null;
    course: string | null;
    university: string | null;
    faceVerificationStatus: string;
    faceVerificationRequired: boolean;
    isVisible: boolean | null;
    user?: {
        name: string | null;
        profilePhoto: string | null;
        image: string | null;
    } | null;
};

export async function selectCurrentUserProfile(userId: string) {
    const [profile] = await db
        .select(currentUserProfileColumns)
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1);

    if (!profile) {
        return null;
    }

    const userRow = await db.query.user.findFirst({
        where: eq(user.id, userId),
    });

    return {
        ...profile,
        user: userRow ?? undefined,
    };
}

export async function selectProfileAccessFlags(userId: string) {
    return db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
        columns: PROFILE_ACCESS_COLUMNS,
    });
}

export async function selectProfileCardsByUserIds(userIds: string[]): Promise<Map<string, ProfileCardRow>> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
        return new Map();
    }

    const rows = await db.query.profiles.findMany({
        where: inArray(profiles.userId, uniqueIds),
        columns: PROFILE_CARD_COLUMNS,
        with: {
            user: {
                columns: {
                    name: true,
                    profilePhoto: true,
                    image: true,
                },
            },
        },
    });

    return new Map(rows.map((row) => [row.userId, row as ProfileCardRow]));
}

export async function selectProfilesForCompatibility(userIds: string[]) {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
        return new Map<string, typeof profiles.$inferSelect>();
    }

    const rows = await db.query.profiles.findMany({
        where: inArray(profiles.userId, uniqueIds),
        columns: PROFILE_COMPATIBILITY_COLUMNS,
    });

    return new Map(rows.map((row) => [row.userId, row as typeof profiles.$inferSelect]));
}

export function getPrimaryProfilePhoto(profile: ProfileCardRow): string | undefined {
    const fromPhotos = Array.isArray(profile.photos) ? profile.photos[0] : null;
    return fromPhotos ?? profile.profilePhoto ?? profile.user?.profilePhoto ?? profile.user?.image ?? undefined;
}

export function getProfileFirstName(profile: ProfileCardRow): string {
    return profile.firstName ?? profile.user?.name?.split(" ")[0] ?? "Unknown";
}

export async function buildWaitlistViewForProfile(input: {
    waitlistStatus: "admitted" | "waitlisted" | null;
    waitlistPosition: number | null;
    gender: string | null;
}) {
    if (input.waitlistStatus !== "waitlisted") {
        return null;
    }

    const [{ ahead }] = await db
        .select({ ahead: count() })
        .from(profiles)
        .where(
            and(
                eq(profiles.waitlistStatus, "waitlisted"),
                eq(profiles.gender, input.gender ?? ""),
                sql`${profiles.waitlistPosition} < ${input.waitlistPosition ?? 0}`,
            ),
        );

    const position = input.waitlistPosition ?? (ahead + 1);
    return {
        status: "waitlisted" as const,
        position,
        peopleAhead: ahead,
        tier: positionTier(position),
    };
}
