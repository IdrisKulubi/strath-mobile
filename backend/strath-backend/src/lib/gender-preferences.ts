const SUPPORTED_GENDERS = ["male", "female", "other"] as const;

type SupportedGender = (typeof SUPPORTED_GENDERS)[number];

function normalizeGender(value: string | null | undefined): SupportedGender | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === "male" || normalized === "female" || normalized === "other") {
        return normalized;
    }
    return null;
}

function normalizeInterestedIn(interestedIn: string[] | null | undefined): SupportedGender[] {
    if (!Array.isArray(interestedIn) || interestedIn.length === 0) return [];

    const rawValues = interestedIn.map((item) => item.trim().toLowerCase());
    if (rawValues.some((item) => item === "both" || item === "all" || item === "everyone")) {
        return [...SUPPORTED_GENDERS];
    }

    const normalized = rawValues
        .map((item) => {
            if (item === "men") return "male";
            if (item === "women") return "female";
            return item;
        })
        .filter((item): item is SupportedGender =>
            item === "male" || item === "female" || item === "other",
        );

    return [...new Set(normalized)];
}

export function getTargetGenders(
    userGender: string | null | undefined,
    interestedIn: string[] | null | undefined,
): SupportedGender[] {
    const normalizedInterestedIn = normalizeInterestedIn(interestedIn);
    if (normalizedInterestedIn.length > 0) return normalizedInterestedIn;

    const normalizedGender = normalizeGender(userGender);
    if (normalizedGender === "male") return ["female"];
    if (normalizedGender === "female") return ["male"];

    return [...SUPPORTED_GENDERS];
}

export function isReciprocalGenderMatch(
    viewerGender: string | null | undefined,
    candidateGender: string | null | undefined,
    candidateInterestedIn: string[] | null | undefined,
): boolean {
    const normalizedViewerGender = normalizeGender(viewerGender);

    // If viewer gender is unknown, don't hard-exclude candidates.
    if (!normalizedViewerGender) return true;

    const candidateTargets = getTargetGenders(candidateGender, candidateInterestedIn);
    return candidateTargets.includes(normalizedViewerGender);
}
