export interface ShortlistMessageLike {
    metadata: Record<string, unknown>;
}

function record(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

export function shortlistCandidateIds(messages: ShortlistMessageLike[]) {
    return [...new Set(messages.flatMap((message) => {
        const shortlist = record(message.metadata.shortlist);
        const candidates = Array.isArray(shortlist?.candidates) ? shortlist.candidates : [];
        return candidates.map((value) => record(value)?.candidateUserId).filter((id): id is string => typeof id === "string");
    }))];
}

export function applyShortlistAvailability<T extends ShortlistMessageLike>(messages: T[], unavailableIds: Set<string>) {
    const staleShortlistIds: string[] = [];
    const updatedMessages = messages.map((message) => {
        const shortlist = record(message.metadata.shortlist);
        if (!shortlist || !Array.isArray(shortlist.candidates)) return message;
        if (typeof shortlist.id === "string") staleShortlistIds.push(shortlist.id);
        const candidates = shortlist.candidates.map((value) => {
            const candidate = record(value);
            if (!candidate || typeof candidate.candidateUserId !== "string") return value;
            return { ...candidate, availability: unavailableIds.has(candidate.candidateUserId) ? "unavailable" : "available" };
        });
        const fallback = record(message.metadata.candidate);
        return {
            ...message,
            metadata: {
                ...message.metadata,
                shortlist: { ...shortlist, candidates },
                candidate: fallback && typeof fallback.candidateUserId === "string"
                    ? { ...fallback, availability: unavailableIds.has(fallback.candidateUserId) ? "unavailable" : "available" }
                    : message.metadata.candidate,
            },
        };
    });
    return { messages: updatedMessages, staleShortlistIds: [...new Set(staleShortlistIds)] };
}
