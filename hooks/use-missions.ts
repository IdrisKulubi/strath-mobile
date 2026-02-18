import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { getAuthToken } from "@/lib/auth-helpers";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const MissionTypeSchema = z.enum([
    "coffee_meetup",
    "song_exchange",
    "photo_challenge",
    "study_date",
    "campus_walk",
    "food_adventure",
    "sunset_spot",
    "quiz_challenge",
]);

const MissionStatusSchema = z.enum(["proposed", "accepted", "completed", "expired", "skipped"]);
const MissionRatingSchema = z.enum(["amazing", "nice", "meh", "not_for_me"]);

const MissionSchema = z.object({
    id: z.string(),
    matchId: z.string(),
    missionType: MissionTypeSchema,
    title: z.string(),
    description: z.string(),
    emoji: z.string(),
    suggestedLocation: z.string().nullable().optional(),
    suggestedTime: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),

    status: MissionStatusSchema,

    viewerAccepted: z.boolean().optional().default(false),
    viewerCompleted: z.boolean().optional().default(false),
    viewerRating: MissionRatingSchema.nullable().optional(),

    partnerAccepted: z.boolean().optional().default(false),
    partnerCompleted: z.boolean().optional().default(false),
    partnerRating: MissionRatingSchema.nullable().optional(),
});

const GetMissionResponseSchema = z.object({
    mission: MissionSchema.nullable(),
});

const MutateMissionResponseSchema = z.object({
    mission: MissionSchema,
});

export type Mission = z.infer<typeof MissionSchema>;
export type MissionType = z.infer<typeof MissionTypeSchema>;
export type MissionRating = z.infer<typeof MissionRatingSchema>;

async function fetchMission(matchId: string): Promise<Mission | null> {
    const token = await getAuthToken();
    if (!token) throw new Error("Not authenticated");

    const url = new URL(`${API_URL}/api/missions`);
    url.searchParams.set("matchId", matchId);

    const response = await fetch(url.toString(), {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const message = payload?.error || "Failed to fetch mission";
        throw new Error(message);
    }

    const data = payload?.data ?? payload;
    const parsed = GetMissionResponseSchema.safeParse(data);
    if (!parsed.success) {
        return data?.mission ?? null;
    }

    return parsed.data.mission;
}

const GetAllMissionsResponseSchema = z.object({
    missions: z.array(MissionSchema),
});

async function fetchAllMissions(): Promise<Mission[]> {
    const token = await getAuthToken();
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(`${API_URL}/api/missions`, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const message = payload?.error || "Failed to fetch missions";
        throw new Error(message);
    }

    const data = payload?.data ?? payload;
    const parsed = GetAllMissionsResponseSchema.safeParse(data);
    if (!parsed.success) {
        return data?.missions ?? [];
    }
    return parsed.data.missions;
}

/** Returns all active missions keyed by matchId — one fetch for all cards. */
export function useAllMissions() {
    const { data, ...rest } = useQuery({
        queryKey: ["missions", "all"],
        queryFn: fetchAllMissions,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
    });

    const byMatchId = useMemo(() => {
        const map: Record<string, Mission> = {};
        for (const m of data ?? []) {
            map[m.matchId] = m;
        }
        return map;
    }, [data]);

    return { missions: data ?? [], byMatchId, ...rest };
}

export function useMission(matchId: string) {
    return useQuery({
        queryKey: ["mission", matchId],
        queryFn: () => fetchMission(matchId),
        enabled: !!matchId,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
    });
}

async function postMissionAction(params: {
    matchId: string;
    action: "accept" | "complete" | "suggest_other";
    excludeTypes?: MissionType[];
}): Promise<Mission> {
    const token = await getAuthToken();
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(`${API_URL}/api/missions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            matchId: params.matchId,
            action: params.action,
            excludeTypes: params.excludeTypes,
        }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const message = payload?.error || "Failed to update mission";
        throw new Error(message);
    }

    const data = payload?.data ?? payload;
    const parsed = MutateMissionResponseSchema.safeParse(data);
    if (!parsed.success) {
        return data?.mission as Mission;
    }
    return parsed.data.mission;
}

async function patchMissionRating(params: { matchId: string; rating: MissionRating }): Promise<Mission> {
    const token = await getAuthToken();
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(`${API_URL}/api/missions`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const message = payload?.error || "Failed to submit rating";
        throw new Error(message);
    }

    const data = payload?.data ?? payload;
    const parsed = MutateMissionResponseSchema.safeParse(data);
    if (!parsed.success) {
        return data?.mission as Mission;
    }
    return parsed.data.mission;
}

export function useMissionActions(matchId: string) {
    const queryClient = useQueryClient();

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: ["mission", matchId] });
    };

    const accept = useMutation({
        mutationFn: () => postMissionAction({ matchId, action: "accept" }),
        onSuccess: invalidate,
    });

    const complete = useMutation({
        mutationFn: () => postMissionAction({ matchId, action: "complete" }),
        onSuccess: invalidate,
    });

    const suggestOther = useMutation({
        mutationFn: (excludeTypes?: MissionType[]) =>
            postMissionAction({ matchId, action: "suggest_other", excludeTypes }),
        onSuccess: invalidate,
    });

    const rate = useMutation({
        mutationFn: (rating: MissionRating) => patchMissionRating({ matchId, rating }),
        onSuccess: invalidate,
    });

    return { accept, complete, suggestOther, rate };
}
