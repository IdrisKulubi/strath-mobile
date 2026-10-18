import { profiles, user } from "@/db/schema";
import { db } from "@/lib/db";
import { inArray } from "drizzle-orm";

export type AdminUserSummary = {
    id: string;
    firstName: string;
    name: string;
    profilePhoto: string | null | undefined;
    email: string | null | undefined;
    phone: string | null | undefined;
    location: string | null | undefined;
    university: string | null | undefined;
    course: string | null | undefined;
};

function buildAdminUserSummary(
    userId: string,
    profile:
        | (typeof profiles.$inferSelect & {
              user?: typeof user.$inferSelect | null;
          })
        | undefined,
    fallbackUser: typeof user.$inferSelect | undefined,
): AdminUserSummary {
    const linkedUser = profile?.user ?? fallbackUser;

    return {
        id: userId,
        firstName:
            profile?.firstName ||
            linkedUser?.name?.split(" ")[0] ||
            "Unknown",
        name: profile
            ? [profile.firstName, profile.lastName].filter(Boolean).join(" ")
            : linkedUser?.name ?? "Unknown",
        profilePhoto:
            profile?.profilePhoto ??
            linkedUser?.profilePhoto ??
            linkedUser?.image,
        email: linkedUser?.email,
        phone: profile?.phoneNumber ?? linkedUser?.phoneNumber,
        location: profile?.currentLocation,
        university: profile?.university,
        course: profile?.course,
    };
}

const EMPTY_SUMMARY = (userId: string): AdminUserSummary => ({
    id: userId,
    firstName: "Unknown",
    name: "Unknown",
    profilePhoto: undefined,
    email: undefined,
    phone: undefined,
    location: undefined,
    university: undefined,
    course: undefined,
});

export async function loadAdminUserSummaries(
    userIds: string[],
): Promise<Map<string, AdminUserSummary>> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    const summaries = new Map<string, AdminUserSummary>();

    if (uniqueIds.length === 0) {
        return summaries;
    }

    const [profileRows, userRows] = await Promise.all([
        db.query.profiles.findMany({
            where: inArray(profiles.userId, uniqueIds),
            with: { user: true },
        }),
        db.query.user.findMany({
            where: inArray(user.id, uniqueIds),
        }),
    ]);

    const profileByUserId = new Map(profileRows.map((row) => [row.userId, row]));
    const userById = new Map(userRows.map((row) => [row.id, row]));

    for (const userId of uniqueIds) {
        const profile = profileByUserId.get(userId);
        const fallbackUser = profile?.user ?? userById.get(userId);
        summaries.set(
            userId,
            buildAdminUserSummary(userId, profile, fallbackUser),
        );
    }

    return summaries;
}

export function getAdminUserSummaryFromMap(
    summaries: Map<string, AdminUserSummary>,
    userId: string,
): AdminUserSummary {
    return summaries.get(userId) ?? EMPTY_SUMMARY(userId);
}
