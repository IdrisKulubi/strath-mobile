// ─── Vouch shapes ─────────────────────────────────────────────────────────────

export interface HypeVouch {
    id: string;
    authorName: string;
    content: string;
    createdAt: string;
    /** Included only when fetching own dashboard (undefined on public view) */
    isApproved?: boolean;
}

export interface ActiveInviteLink {
    token: string;
    url: string;
    maxUses: number | null;
    currentUses: number | null;
    expiresAt: string;
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface HypeResponse {
    vouches: HypeVouch[];
    activeLink: ActiveInviteLink | null;
    total: number;
}

export interface GenerateLinkResponse {
    token: string;
    url: string;
    maxUses: number | null;
    currentUses: number | null;
    expiresAt: string;
}

export interface ModerateVouchPayload {
    vouchId: string;
    action: "approve" | "hide";
}

export interface ModerateVouchResponse {
    id: string;
    isApproved: boolean;
    message: string;
}
