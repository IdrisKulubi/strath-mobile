import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const REPORT_REASONS = [
    { id: "inappropriate_content", label: "Inappropriate content", icon: "🚫" },
    { id: "fake_profile", label: "Fake profile", icon: "🎭" },
    { id: "harassment", label: "Harassment or bullying", icon: "😤" },
    { id: "spam", label: "Spam or scam", icon: "📧" },
    { id: "underage", label: "Underage user", icon: "👶" },
    { id: "threatening", label: "Threatening behavior", icon: "⚠️" },
    { id: "hate_speech", label: "Hate speech", icon: "🗣️" },
    { id: "other", label: "Other", icon: "📝" },
] as const;

export type ReportReason = typeof REPORT_REASONS[number]["id"];

interface ReportUserParams {
    reportedUserId: string;
    reason: ReportReason;
    details?: string;
}

// Report a user
export function useReportUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ reportedUserId, reason, details }: ReportUserParams) => {
            const session = await authClient.getSession();
            if (!session?.data?.session?.token) {
                throw new Error("Not authenticated");
            }

            const response = await fetch(`${API_URL}/api/user/report`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.data.session.token}`,
                },
                body: JSON.stringify({ reportedUserId, reason, details }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to report user");
            }

            return response.json();
        },
        onSuccess: () => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ["discover"] });
            queryClient.invalidateQueries({ queryKey: ["profiles"] });
        },
    });
}

// Get report reasons from backend (optional, we have them locally too)
export function useReportReasons() {
    return useQuery({
        queryKey: ["report-reasons"],
        queryFn: async () => {
            const session = await authClient.getSession();
            if (!session?.data?.session?.token) {
                return { reasons: REPORT_REASONS.map(r => r.id) };
            }

            const response = await fetch(`${API_URL}/api/user/report`, {
                headers: {
                    Authorization: `Bearer ${session.data.session.token}`,
                },
            });

            if (!response.ok) {
                return { reasons: REPORT_REASONS.map(r => r.id) };
            }

            return response.json();
        },
        staleTime: Infinity, // Reasons don't change often
    });
}
