import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { user, session as sessionTable, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { removeQuestionnaireDataForAccount } from "@/lib/questionnaire/phase5-service";
import { getSessionWithBearerFallback } from "@/lib/security";

// DELETE /api/user/delete-account - Soft delete user account
export async function DELETE(request: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(request);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const userId = session.user.id;

        // Mark the user as deleted (soft delete)
        await db.update(user)
            .set({ 
                deletedAt: new Date(),
                deletedReason: "self_deleted",
                deletedByUserId: userId,
                isOnline: false,
            })
            .where(eq(user.id, userId));

        // Mark profile as invisible so they don't show in discovery
        await db.update(profiles)
            .set({
                isVisible: false,
                discoveryPaused: true,
            })
            .where(eq(profiles.userId, userId));

        // Remove questionnaire preference/answer data and end new connections.
        // Conversation and message records remain available for safety/audit retention.
        await removeQuestionnaireDataForAccount(userId);

        // Delete all sessions to log them out everywhere
        await db.delete(sessionTable)
            .where(eq(sessionTable.userId, userId));

        return successResponse({ 
            message: "Account has been deleted successfully",
            deletedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error deleting account:", error);
        return errorResponse("Failed to delete account", 500);
    }
}
