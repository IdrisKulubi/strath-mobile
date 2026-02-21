export interface WingmanStatusResponse {
    activeLink: {
        roundNumber: number;
        token: string;
        url: string;
        targetSubmissions: number;
        currentSubmissions: number;
        expiresAt: string;
        status: "collecting" | "ready" | "expired";
        lastSubmissionAt: string | null;
    } | null;
    latestPack: {
        id: string;
        roundNumber: number;
        generatedAt: string;
        openedAt: string | null;
    } | null;
}

export interface WingmanLinkResponse {
    roundNumber: number;
    token: string;
    url: string;
    targetSubmissions: number;
    currentSubmissions: number;
    expiresAt: string;
    status: "collecting" | "ready" | "expired";
}

export interface WingmanPackResponse {
    roundNumber: number | null;
    compiledSummary: Record<string, unknown> | null;
    wingmanPrompt: string | null;
    matches: {
        profile: Record<string, unknown>;
        explanation: {
            tagline: string;
            summary: string;
            conversationStarters: string[];
            vibeEmoji: string;
            matchPercentage: number;
        };
        scores: {
            total: number;
            vector: number;
            preference: number;
            filterMatch: boolean;
        };
    }[];
    generatedAt: string | null;
    openedAt: string | null;
}

export interface WingmanHistoryResponse {
    packs: {
        id: string;
        roundNumber: number;
        compiledSummary: Record<string, unknown>;
        generatedAt: string;
        openedAt: string | null;
    }[];
}
