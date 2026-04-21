export type OpsVibe = "coffee" | "walk" | "dinner" | "hangout" | string;

export type OpsStage = "on-call" | "arranging" | "upcoming" | "history";

export interface OpsPairUser {
    id?: string;
    firstName: string;
    profilePhoto?: string | null;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
}

export interface OpsPendingPair {
    id: string;
    userA: OpsPairUser;
    userB: OpsPairUser;
    vibe: OpsVibe;
    createdAt: string;
}

export interface OpsScheduledPair {
    id: string;
    userA: OpsPairUser;
    userB: OpsPairUser;
    vibe: OpsVibe;
    createdAt: string;
    scheduledAt: string | null;
    venueName: string | null;
    venueAddress: string | null;
    status: string;
    feedbackCount: number;
    avgRating: number | null;
}

export type OpsHistoryPair = OpsScheduledPair;

export interface OpsOnCallSession {
    id: string;
    userA: OpsPairUser;
    userB: OpsPairUser;
    roomName: string;
    status: string | null;
    scheduledAt: string | null;
    startedAt: string | null;
    endedAt: string | null;
    createdAt: string;
    dateMatchId: string | null;
    dateMatchStatus: string | null;
    callCompleted: boolean;
    user1Decision: string | null;
    user2Decision: string | null;
}

export interface OpsLocation {
    id: string;
    name: string;
    address: string;
    vibe: string | null;
    notes: string | null;
    isActive: boolean;
}

export const VIBE_META = {
    coffee: {
        emoji: "☕",
        label: "Coffee",
        gradient: "from-amber-500/30 to-orange-500/30",
        ring: "ring-amber-400/40",
        text: "text-amber-300",
        chipBg: "bg-amber-500/15",
        chipBorder: "border-amber-400/30",
    },
    walk: {
        emoji: "🚶",
        label: "Walk",
        gradient: "from-emerald-500/30 to-teal-500/30",
        ring: "ring-emerald-400/40",
        text: "text-emerald-300",
        chipBg: "bg-emerald-500/15",
        chipBorder: "border-emerald-400/30",
    },
    dinner: {
        emoji: "🍽",
        label: "Dinner",
        gradient: "from-rose-500/30 to-pink-500/30",
        ring: "ring-rose-400/40",
        text: "text-rose-300",
        chipBg: "bg-rose-500/15",
        chipBorder: "border-rose-400/30",
    },
    hangout: {
        emoji: "🎮",
        label: "Hangout",
        gradient: "from-violet-500/30 to-purple-500/30",
        ring: "ring-violet-400/40",
        text: "text-violet-300",
        chipBg: "bg-violet-500/15",
        chipBorder: "border-violet-400/30",
    },
} as const;

export function getVibeMeta(vibe: string | null | undefined) {
    const key = (vibe ?? "").toLowerCase() as keyof typeof VIBE_META;
    return (
        VIBE_META[key] ?? {
            emoji: "📅",
            label: vibe ?? "Date",
            gradient: "from-slate-500/30 to-zinc-500/30",
            ring: "ring-slate-400/40",
            text: "text-slate-300",
            chipBg: "bg-slate-500/15",
            chipBorder: "border-slate-400/30",
        }
    );
}

export const STAGE_META: Record<OpsStage, { label: string; accent: string; dot: string }> = {
    "on-call": { label: "On Call", accent: "text-cyan-300", dot: "bg-cyan-400" },
    arranging: { label: "Arranging", accent: "text-amber-300", dot: "bg-amber-400" },
    upcoming: { label: "Upcoming", accent: "text-blue-300", dot: "bg-blue-400" },
    history: { label: "History", accent: "text-gray-300", dot: "bg-gray-400" },
};
