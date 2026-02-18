import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/auth-helpers";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VibeCheckSession {
    id: string;
    matchId: string;
    roomName: string;
    roomUrl: string;
    token: string;
    suggestedTopic: string;
    status: "pending" | "active" | "completed" | "expired";
    bothAgreedToMeet: boolean;
    isUser1: boolean;
}

export interface VibeCheckStatus {
    exists: boolean;
    vibeCheckId?: string;
    status?: string;
    bothAgreedToMeet?: boolean;
    userDecision?: "meet" | "pass" | null;
    partnerDecided?: boolean;
}

export interface VibeCheckResult {
    vibeCheckId: string;
    status: string;
    bothAgreedToMeet: boolean;
    userDecision: "meet" | "pass" | null;
    partnerDecision: "meet" | "pass" | null;
    bothDecided: boolean;
    durationSeconds: number | null;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
    const token = await getAuthToken();
    return token
        ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        : { "Content-Type": "application/json" };
}

async function getVibeCheckStatusAPI(matchId: string): Promise<VibeCheckStatus> {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/vibe-check?matchId=${matchId}`, { headers });
    if (!res.ok) throw new Error("Failed to fetch vibe check status");
    const json = await res.json();
    return json.data ?? json;
}

async function createVibeCheckAPI(matchId: string): Promise<VibeCheckSession> {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/vibe-check`, {
        method: "POST",
        headers,
        body: JSON.stringify({ matchId }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create vibe check");
    }
    const json = await res.json();
    return json.data ?? json;
}

async function joinVibeCheckAPI(vibeCheckId: string): Promise<VibeCheckSession> {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/vibe-check/${vibeCheckId}/join`, {
        method: "POST",
        headers,
    });
    if (!res.ok) throw new Error("Failed to join vibe check");
    const json = await res.json();
    return json.data ?? json;
}

async function submitDecisionAPI(
    vibeCheckId: string,
    decision: "meet" | "pass",
): Promise<{ decision: "meet" | "pass"; bothDecided: boolean; bothAgreedToMeet: boolean; message: string }> {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/vibe-check/${vibeCheckId}/decision`, {
        method: "POST",
        headers,
        body: JSON.stringify({ decision }),
    });
    if (!res.ok) throw new Error("Failed to submit decision");
    const json = await res.json();
    return json.data ?? json;
}

async function endCallAPI(
    vibeCheckId: string,
    durationSeconds: number,
): Promise<{ message: string }> {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/vibe-check/${vibeCheckId}/result`, {
        method: "POST",
        headers,
        body: JSON.stringify({ durationSeconds }),
    });
    if (!res.ok) throw new Error("Failed to end call");
    const json = await res.json();
    return json.data ?? json;
}

async function getVibeCheckResultAPI(vibeCheckId: string): Promise<VibeCheckResult> {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/vibe-check/${vibeCheckId}/result`, { headers });
    if (!res.ok) throw new Error("Failed to get result");
    const json = await res.json();
    return json.data ?? json;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useVibeCheck — all vibe-check interactions for a given match.
 *
 * @param matchId — the match this vibe check belongs to
 * @param activeVibeCheckId — when provided, enables result polling
 */
export function useVibeCheck(matchId: string, activeVibeCheckId?: string) {
    const qc = useQueryClient();

    // ── Status query (does a vibe check exist for this match?) ──────────────
    const statusQuery = useQuery({
        queryKey: ["vibe-check-status", matchId],
        queryFn: () => getVibeCheckStatusAPI(matchId),
        enabled: !!matchId,
        staleTime: 30 * 1000,
    });

    // ── Result polling (after a call, poll until partner decides) ────────────
    const resultQuery = useQuery({
        queryKey: ["vibe-check-result", activeVibeCheckId],
        queryFn: () => getVibeCheckResultAPI(activeVibeCheckId!),
        enabled: !!activeVibeCheckId,
        refetchInterval: 5000, // poll every 5s
        staleTime: 0,
    });

    // ── Create vibe check ────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: (mId: string) => createVibeCheckAPI(mId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["vibe-check-status", matchId] });
        },
    });

    // ── Join (get fresh token) ───────────────────────────────────────────────
    const joinMutation = useMutation({
        mutationFn: (vcId: string) => joinVibeCheckAPI(vcId),
    });

    // ── Submit decision ──────────────────────────────────────────────────────
    const decisionMutation = useMutation({
        mutationFn: ({ vibeCheckId, decision }: { vibeCheckId: string; decision: "meet" | "pass" }) =>
            submitDecisionAPI(vibeCheckId, decision),
        onSuccess: (_, { vibeCheckId }) => {
            qc.invalidateQueries({ queryKey: ["vibe-check-result", vibeCheckId] });
            qc.invalidateQueries({ queryKey: ["vibe-check-status", matchId] });
        },
    });

    // ── End call ─────────────────────────────────────────────────────────────
    const endCallMutation = useMutation({
        mutationFn: ({ vibeCheckId, durationSeconds }: { vibeCheckId: string; durationSeconds: number }) =>
            endCallAPI(vibeCheckId, durationSeconds),
        onSuccess: (_, { vibeCheckId }) => {
            qc.invalidateQueries({ queryKey: ["vibe-check-result", vibeCheckId] });
        },
    });

    return {
        // Status
        vibeCheckStatus: statusQuery.data,
        isStatusLoading: statusQuery.isLoading,
        hasActiveVibeCheck: statusQuery.data?.exists ?? false,

        // Result polling
        vibeCheckResult: resultQuery.data,
        isResultLoading: resultQuery.isLoading,

        // Mutations
        createVibeCheck: createMutation.mutate,
        isCreating: createMutation.isPending,
        createdSession: createMutation.data,

        joinVibeCheck: joinMutation.mutate,
        isJoining: joinMutation.isPending,
        joinedSession: joinMutation.data,

        submitDecision: decisionMutation.mutate,
        isSubmittingDecision: decisionMutation.isPending,

        endCall: endCallMutation.mutate,
        isEndingCall: endCallMutation.isPending,
    };
}
