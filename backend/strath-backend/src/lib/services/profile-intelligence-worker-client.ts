const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 2_000;

export interface WorkerProfilePayload {
    userId?: string | null;
    firstName?: string | null;
    age?: number | null;
    gender?: string | null;
    university?: string | null;
    course?: string | null;
    yearOfStudy?: number | null;
    bio?: string | null;
    aboutMe?: string | null;
    lookingFor?: string | null;
    interests?: string[];
    qualities?: string[];
    prompts?: Array<Record<string, unknown>>;
    personalityAnswers?: Record<string, unknown>;
    lifestyleAnswers?: Record<string, unknown>;
    photoUrl?: string | null;
    photos?: string[];
}

export interface WorkerProfileSummaryResponse {
    profileSummary: string;
    searchText: string;
    summaryVersion: string;
}

export interface WorkerTextEmbeddingResponse {
    embedding: number[];
    provider: string;
    model: string;
}

export interface WorkerPhotoPresentationResponse {
    photoPresentationScore: number;
    faceVisible: boolean;
    imageClear: boolean;
    lightingScore: number;
    hasMultiplePeople: boolean;
    isObjectOnly: boolean;
    moderationStatus: "pending" | "approved" | "needs_review" | "rejected" | string;
    analysisVersion: string;
}

export interface WorkerStructuredProfileTags {
    traitTags: string[];
    datingIntentTags: string[];
    socialEnergyTags: string[];
    lifestyleTags: string[];
    interestTags: string[];
    communicationTags: string[];
    availabilityTags: string[];
    dealbreakerTags: string[];
}

export interface WorkerProfileAnalyzeResponse {
    profileSummary: string;
    searchText: string;
    structuredTags?: WorkerStructuredProfileTags;
    textEmbedding: number[];
    textEmbeddingProvider: string;
    textEmbeddingModel: string;
    photoPresentation: WorkerPhotoPresentationResponse;
    visualEmbedding: number[] | null;
    visualEmbeddingProvider: string | null;
    visualEmbeddingModel: string | null;
    analysisVersion: string;
}

export interface WorkerBatchAnalyzeResponse {
    processed: number;
    results: Array<{
        user_id?: string | null;
        status: "ok" | "error";
        analysis?: WorkerProfileAnalyzeResponse;
        detail?: string;
    }>;
}

function getBaseUrl() {
    return (
        process.env.PROFILE_INTELLIGENCE_SERVICE_URL?.trim() ||
        process.env.PHOTO_INTELLIGENCE_SERVICE_URL?.trim() ||
        ""
    );
}

function getSecret() {
    return (
        process.env.PROFILE_INTELLIGENCE_SERVICE_SECRET?.trim() ||
        process.env.PHOTO_INTELLIGENCE_SERVICE_SECRET?.trim() ||
        ""
    );
}

function getTimeoutMs() {
    const value = Number(process.env.PROFILE_INTELLIGENCE_TIMEOUT_MS ?? process.env.PHOTO_INTELLIGENCE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
    return Number.isFinite(value) && value >= 5_000 ? value : DEFAULT_TIMEOUT_MS;
}

function getMaxAttempts() {
    const value = Number(process.env.PROFILE_INTELLIGENCE_MAX_ATTEMPTS ?? process.env.PHOTO_INTELLIGENCE_MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS);
    return Number.isFinite(value) && value >= 1 ? Math.min(Math.floor(value), 5) : DEFAULT_MAX_ATTEMPTS;
}

function getRetryDelayMs() {
    const value = Number(process.env.PROFILE_INTELLIGENCE_RETRY_DELAY_MS ?? process.env.PHOTO_INTELLIGENCE_RETRY_DELAY_MS ?? DEFAULT_RETRY_DELAY_MS);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_RETRY_DELAY_MS;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableWorkerError(error: unknown) {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return (
        error.name === "TimeoutError" ||
        message.includes("timeout") ||
        message.includes("aborted") ||
        message.includes("(502)") ||
        message.includes("(503)") ||
        message.includes("(504)") ||
        message.includes("fetch failed") ||
        message.includes("econnreset")
    );
}

function toWorkerProfile(profile: WorkerProfilePayload) {
    return {
        user_id: profile.userId,
        first_name: profile.firstName,
        age: profile.age,
        gender: profile.gender,
        university: profile.university,
        course: profile.course,
        year_of_study: profile.yearOfStudy,
        bio: profile.bio,
        about_me: profile.aboutMe,
        looking_for: profile.lookingFor,
        interests: profile.interests ?? [],
        qualities: profile.qualities ?? [],
        prompts: profile.prompts ?? [],
        personality_answers: profile.personalityAnswers ?? {},
        lifestyle_answers: profile.lifestyleAnswers ?? {},
        photo_url: profile.photoUrl,
        photos: profile.photos ?? [],
    };
}

async function requestWorker<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return null;

    const secret = getSecret();
    if (!secret) {
        throw new Error(
            "PROFILE_INTELLIGENCE_SERVICE_SECRET or PHOTO_INTELLIGENCE_SERVICE_SECRET is required when the profile intelligence worker URL is set.",
        );
    }

    const maxAttempts = getMaxAttempts();
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${secret}`,
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(getTimeoutMs()),
            });

            if (!response.ok) {
                const responseText = await response.text().catch(() => "");
                throw new Error(`Profile intelligence worker failed (${response.status}): ${responseText}`);
            }

            return (await response.json()) as T;
        } catch (error) {
            lastError = error;
            const shouldRetry = attempt < maxAttempts && isRetryableWorkerError(error);
            if (!shouldRetry) {
                throw error;
            }

            const delayMs = getRetryDelayMs() * attempt;
            if (delayMs > 0) {
                await sleep(delayMs);
            }
        }
    }

    throw lastError instanceof Error ? lastError : new Error("Profile intelligence worker request failed.");
}

export async function requestProfileSummary(profile: WorkerProfilePayload) {
    return requestWorker<WorkerProfileSummaryResponse>("/profiles/summarize", {
        profile: toWorkerProfile(profile),
    });
}

export async function requestProfileTextEmbedding(text: string) {
    return requestWorker<WorkerTextEmbeddingResponse>("/profiles/embed-text", { text });
}

export async function requestProfileImageEmbedding(input: { photoUrl: string; objectKey?: string | null }) {
    return requestWorker<WorkerTextEmbeddingResponse>("/profiles/embed-image", {
        photo_url: input.photoUrl,
        object_key: input.objectKey,
    });
}

export async function requestProfileAnalysis(profile: WorkerProfilePayload) {
    return requestWorker<WorkerProfileAnalyzeResponse>("/profiles/analyze", {
        profile: toWorkerProfile(profile),
    });
}

export async function requestProfileBatchAnalysis(profiles: WorkerProfilePayload[]) {
    return requestWorker<WorkerBatchAnalyzeResponse>("/profiles/batch-analyze", {
        items: profiles.map((profile) => ({ profile: toWorkerProfile(profile) })),
    });
}
