// ─── Enums ────────────────────────────────────────────────────────────────────

export type StudyVibe = "silent_focus" | "chill_chat" | "group_study";

export const VIBE_LABELS: Record<StudyVibe, string> = {
    silent_focus: "Silent focus",
    chill_chat: "Chill chat OK",
    group_study: "Group study",
};

export const VIBE_EMOJIS: Record<StudyVibe, string> = {
    silent_focus: "🤫",
    chill_chat: "💬",
    group_study: "👥",
};

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface StudySessionUser {
    id: string;
    name: string;
    image: string | null;
}

export interface NearbyStudySession {
    id: string;
    userId: string;
    locationName: string;
    university: string;
    availableUntil: string;
    isActive: boolean;
    subject: string | null;
    vibe: StudyVibe | null;
    openToAnyone: boolean;
    preferredGender: string | null;
    createdAt: string;
    user: StudySessionUser | null;
}

export interface MyStudySession {
    id: string;
    locationName: string;
    availableUntil: string;
    subject: string | null;
    vibe: StudyVibe | null;
    openToAnyone: boolean;
    createdAt: string;
}

export interface StudyDateFeedResponse {
    sessions: NearbyStudySession[];
    mySession: MyStudySession | null;
}

// ─── Form state ───────────────────────────────────────────────────────────────

export interface StudySessionForm {
    locationName: string;
    availableUntil: string; // ISO string
    subject: string;
    vibe: StudyVibe;
    openToAnyone: boolean;
}

// Preset durations (minutes from now)
export const DURATION_OPTIONS: { label: string; minutes: number }[] = [
    { label: "30 min", minutes: 30 },
    { label: "1 hour", minutes: 60 },
    { label: "2 hours", minutes: 120 },
    { label: "3 hours", minutes: 180 },
    { label: "4 hours", minutes: 240 },
    { label: "All day", minutes: 480 },
];

export const CAMPUS_LOCATIONS = [
    "Main Library",
    "Learning Commons",
    "Mayfair Hall",
    "Block C Lounge",
    "Student Centre",
    "Cafeteria",
    "Block A Labs",
    "Outside / Grounds",
    "Other",
];
