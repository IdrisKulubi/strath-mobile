import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/auth-helpers";

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
            const token = await getAuthToken();
            if (!token) {
                throw new Error("Not authenticated");
            }

            console.log("Reporting user:", { reportedUserId, reason, details });
            console.log("API URL:", `${API_URL}/api/user/report`);

            const response = await fetch(`${API_URL}/api/user/report`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ reportedUserId, reason, details }),
            });

            const responseText = await response.text();
            console.log("Report response status:", response.status);
            console.log("Report response body:", responseText);

            if (!response.ok) {
                let errorMessage = "Failed to report user";
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    errorMessage = responseText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            return JSON.parse(responseText);
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
            const token = await getAuthToken();
            if (!token) {
                return { reasons: REPORT_REASONS.map(r => r.id) };
            }

            const response = await fetch(`${API_URL}/api/user/report`, {
                headers: {
                    Authorization: `Bearer ${token}`,
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
