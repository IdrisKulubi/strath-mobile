import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { reports } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { successResponse, errorResponse } from "@/lib/api-response";

// Report reasons
export const REPORT_REASONS = [
    { id: "inappropriate_content", label: "Inappropriate content", description: "Photos or text that violate community guidelines" },
    { id: "fake_profile", label: "Fake profile", description: "This person is pretending to be someone else" },
    { id: "harassment", label: "Harassment or bullying", description: "This person is harassing or bullying me or others" },
    { id: "spam", label: "Spam or scam", description: "This person is sending spam or trying to scam people" },
    { id: "underage", label: "Underage user", description: "This person appears to be under 18" },
    { id: "threatening", label: "Threatening behavior", description: "This person is making threats" },
    { id: "hate_speech", label: "Hate speech", description: "Content promoting hatred or discrimination" },
    { id: "other", label: "Other", description: "Something else not listed above" },
];

// POST - Submit a report
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const { reportedUserId, reason, details } = await request.json();

        if (!reportedUserId) {
            return errorResponse("Reported user ID is required", 400);
        }

        if (!reason) {
            return errorResponse("Report reason is required", 400);
        }

        if (reportedUserId === session.user.id) {
            return errorResponse("You cannot report yourself", 400);
        }

        // Check if already reported (pending)
        const existingReport = await db.query.reports.findFirst({
            where: and(
                eq(reports.reporterId, session.user.id),
                eq(reports.reportedUserId, reportedUserId),
                eq(reports.status, "PENDING")
            ),
        });

        if (existingReport) {
            return errorResponse("You have already reported this user. Our team is reviewing it.", 400);
        }

        // Create report with reason and optional details
        const fullReason = details ? `${reason}: ${details}` : reason;

        const [newReport] = await db
            .insert(reports)
            .values({
                reporterId: session.user.id,
                reportedUserId: reportedUserId,
                reason: fullReason,
                status: "PENDING",
            })
            .returning();

        return successResponse({ 
            message: "Report submitted successfully. Our team will review it.",
            report: newReport 
        });
    } catch (error) {
        console.error("Error submitting report:", error);
        return errorResponse("Failed to submit report", 500);
    }
}

// GET - Get report reasons (for the frontend)
export async function GET() {
    return successResponse(REPORT_REASONS);
}
