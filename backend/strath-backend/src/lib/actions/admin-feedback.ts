import "server-only";

import { and, count, desc, eq, gte, sql, type SQL } from "drizzle-orm";

import { feedbacks } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const ADMIN_FEEDBACK_SOURCES = ["all", "app", "matchmaker_v2"] as const;
export type AdminFeedbackSource = (typeof ADMIN_FEEDBACK_SOURCES)[number];

export const ADMIN_FEEDBACK_PERIODS = ["today", "2d", "7d", "30d", "1y", "all"] as const;
export type AdminFeedbackPeriod = (typeof ADMIN_FEEDBACK_PERIODS)[number];

const PAGE_SIZE = 25;
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

function startOfNairobiDay(date: Date) {
    const nairobiTime = new Date(date.getTime() + NAIROBI_OFFSET_MS);
    return new Date(
        Date.UTC(
            nairobiTime.getUTCFullYear(),
            nairobiTime.getUTCMonth(),
            nairobiTime.getUTCDate(),
        ) - NAIROBI_OFFSET_MS,
    );
}

export function getAdminFeedbackPeriodStart(period: AdminFeedbackPeriod, now = new Date()) {
    if (period === "all") return null;

    const days = period === "today"
        ? 1
        : period === "2d"
            ? 2
            : period === "7d"
                ? 7
                : period === "30d"
                    ? 30
                    : 365;
    const start = startOfNairobiDay(now);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    return start;
}

function whereFrom(conditions: SQL[]) {
    return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getAdminFeedback(input: {
    source: AdminFeedbackSource;
    period: AdminFeedbackPeriod;
    page?: number;
}) {
    await requireAdmin();

    const page = Math.max(1, Math.floor(input.page ?? 1));
    const periodStart = getAdminFeedbackPeriodStart(input.period);
    const periodConditions: SQL[] = periodStart ? [gte(feedbacks.createdAt, periodStart)] : [];
    const rowConditions = [...periodConditions];

    if (input.source !== "all") {
        rowConditions.push(eq(feedbacks.source, input.source));
    }

    const [rows, [{ filteredCount }], [summary]] = await Promise.all([
        db
            .select({
                id: feedbacks.id,
                userId: feedbacks.userId,
                name: feedbacks.name,
                email: feedbacks.email,
                phoneNumber: feedbacks.phoneNumber,
                rating: feedbacks.rating,
                source: feedbacks.source,
                message: feedbacks.message,
                status: feedbacks.status,
                createdAt: feedbacks.createdAt,
            })
            .from(feedbacks)
            .where(whereFrom(rowConditions))
            .orderBy(desc(feedbacks.createdAt), desc(feedbacks.id))
            .limit(PAGE_SIZE)
            .offset((page - 1) * PAGE_SIZE),
        db
            .select({ filteredCount: count() })
            .from(feedbacks)
            .where(whereFrom(rowConditions)),
        db
            .select({
                total: count(),
                general: sql<number>`count(*) filter (where ${feedbacks.source} = 'app')::int`,
                matchmakerV2: sql<number>`count(*) filter (where ${feedbacks.source} = 'matchmaker_v2')::int`,
                averageRating: sql<number | null>`round(avg(${feedbacks.rating}) filter (where ${feedbacks.source} = 'matchmaker_v2'), 1)::float`,
            })
            .from(feedbacks)
            .where(whereFrom(periodConditions)),
    ]);

    const total = Number(filteredCount ?? 0);

    return {
        items: rows.map((row) => ({
            ...row,
            createdAt: row.createdAt.toISOString(),
        })),
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        summary: {
            total: Number(summary?.total ?? 0),
            general: Number(summary?.general ?? 0),
            matchmakerV2: Number(summary?.matchmakerV2 ?? 0),
            averageRating: summary?.averageRating == null ? null : Number(summary.averageRating),
        },
    };
}
