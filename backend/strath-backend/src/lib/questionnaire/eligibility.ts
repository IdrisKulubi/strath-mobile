import { ageOn, REQUIRED_ANSWER_COUNT, type Preferences } from "./contracts";

type ProfileSnapshot = {
    firstName: string;
    gender: string | null;
    introduction: string;
    photos: string[];
    profileCompleted: boolean;
    isComplete: boolean;
    isVisible: boolean;
    discoveryPaused: boolean;
    anonymous: boolean;
    faceVerificationStatus: string;
    incognitoMode: boolean;
    visibilityMode: string;
};

export type Candidate = {
    id: string;
    revision: number;
    birthDate: string | null;
    preferences: Preferences | null;
    answerCount: number;
    deletedAt: Date | null;
    deletedReason: string | null;
    incomingLike: boolean;
    profile: ProfileSnapshot;
};

function distanceKm(first: Preferences, second: Preferences) {
    if (first.latitude === null || first.longitude === null || second.latitude === null || second.longitude === null) {
        return null;
    }
    const radians = (value: number) => value * Math.PI / 180;
    const latitudeDelta = radians(second.latitude - first.latitude);
    const longitudeDelta = radians(second.longitude - first.longitude);
    const haversine = Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

function acceptsLocation(person: Preferences, other: Preferences, distance: number | null) {
    if (person.radiusKm !== null) return distance !== null && distance <= person.radiusKm;
    return person.city.trim().toLocaleLowerCase() === other.city.trim().toLocaleLowerCase();
}

export type DiscoveryBlocker =
    | "answers"
    | "birthDate"
    | "preferences"
    | "profile"
    | "verification"
    | "visibility"
    | "paused"
    | "anonymous";

export function discoveryBlockers(candidate: Candidate): DiscoveryBlocker[] {
    const missing: DiscoveryBlocker[] = [];
    const age = ageOn(candidate.birthDate ?? "");
    if (!candidate.birthDate || age < 18 || age > 120) missing.push("birthDate");
    if (candidate.answerCount < REQUIRED_ANSWER_COUNT) missing.push("answers");
    if (candidate.preferences === null) missing.push("preferences");
    if (!(candidate.profile.profileCompleted || candidate.profile.isComplete)) missing.push("profile");
    if (candidate.profile.faceVerificationStatus !== "verified") missing.push("verification");
    if (!candidate.profile.isVisible) missing.push("visibility");
    if (candidate.profile.discoveryPaused) missing.push("paused");
    if (candidate.profile.anonymous) missing.push("anonymous");
    return missing;
}

export function isDiscoveryReady(candidate: Candidate) {
    return candidate.deletedAt === null
        && candidate.deletedReason === null
        && discoveryBlockers(candidate).length === 0;
}

export function isReciprocallyEligible(viewer: Candidate, candidate: Candidate) {
    if (viewer.id === candidate.id || !isDiscoveryReady(viewer) || !isDiscoveryReady(candidate)) return false;
    const viewerPreferences = viewer.preferences!;
    const candidatePreferences = candidate.preferences!;
    const viewerAge = ageOn(viewer.birthDate!);
    const candidateAge = ageOn(candidate.birthDate!);

    if (!viewerPreferences.genders.includes(candidate.profile.gender as "male" | "female" | "other")) return false;
    if (!candidatePreferences.genders.includes(viewer.profile.gender as "male" | "female" | "other")) return false;
    if (candidateAge < viewerPreferences.minAge || candidateAge > viewerPreferences.maxAge) return false;
    if (viewerAge < candidatePreferences.minAge || viewerAge > candidatePreferences.maxAge) return false;
    if (!viewerPreferences.intentions.some((intention) => candidatePreferences.intentions.includes(intention))) return false;

    const distance = distanceKm(viewerPreferences, candidatePreferences);
    if (!acceptsLocation(viewerPreferences, candidatePreferences, distance)) return false;
    if (!acceptsLocation(candidatePreferences, viewerPreferences, distance)) return false;

    const incognito = candidate.profile.incognitoMode || candidate.profile.visibilityMode === "incognito";
    return !incognito || candidate.incomingLike;
}

export function publicProfile(candidate: Candidate) {
    return {
        id: candidate.id,
        name: candidate.profile.firstName || "Member",
        age: ageOn(candidate.birthDate ?? ""),
        city: candidate.preferences?.city ?? "",
        intentions: candidate.preferences?.intentions ?? [],
        bio: candidate.profile.introduction,
        photos: candidate.profile.photos,
    };
}

// Compatibility aliases for the parked Phase 5 service draft.
export const ready = isDiscoveryReady;
export const eligible = isReciprocallyEligible;
export const card = publicProfile;
