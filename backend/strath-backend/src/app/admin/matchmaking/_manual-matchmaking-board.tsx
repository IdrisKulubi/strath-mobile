"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
    BookOpen,
    Check,
    ChevronDown,
    ChevronUp,
    Eye,
    ImageIcon,
    Loader2,
    PhoneCall,
    RotateCcw,
    Search,
    Send,
    SlidersHorizontal,
    Sparkles,
    UserRound,
    Users,
    X,
} from "lucide-react";

import {
    cancelManualCandidatePair,
    createManualCandidatePair,
    getManualMatchSuggestions,
    markManualMatchCallOutcome,
    type ManualMatchSuggestion,
    type ManualMatchmakingProfile,
} from "@/lib/actions/manual-matchmaking";

type ActivityItem = Awaited<ReturnType<typeof import("@/lib/actions/manual-matchmaking").getManualMatchmakingActivity>>[number];

type PoolFilter = "all" | "available" | "active" | "hold" | "incomplete";
type CandidateTab = "suggested" | "all";
type CandidateStateFilter = "all" | ManualMatchmakingProfile["activeState"];
type CandidateSort = "compatibility" | "newest" | "age_asc" | "age_desc" | "year_asc" | "year_desc" | "name_asc";
type CompareMode = "photos" | "bio" | "interests" | "answers" | "history";
type AdminAction =
    | { type: "create" }
    | { type: "cancel"; pairId: string; title: string }
    | { type: "call"; pairId: string; outcome: "accepted" | "rejected"; title: string };

type CandidateDeckItem = ManualMatchmakingProfile & {
    compatibilityScore?: number;
    reasons?: string[];
    warnings?: string[];
};

const POOL_FILTERS: { value: PoolFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "available", label: "Available" },
    { value: "active", label: "Active" },
    { value: "hold", label: "Matched" },
    { value: "incomplete", label: "Incomplete" },
];

const SORT_OPTIONS: { value: CandidateSort; label: string }[] = [
    { value: "compatibility", label: "Compatibility" },
    { value: "newest", label: "Newest active" },
    { value: "age_asc", label: "Age low-high" },
    { value: "age_desc", label: "Age high-low" },
    { value: "year_asc", label: "Year low-high" },
    { value: "year_desc", label: "Year high-low" },
    { value: "name_asc", label: "Name A-Z" },
];

function fullName(profile: Pick<ManualMatchmakingProfile, "firstName" | "lastName" | "name">) {
    return [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || profile.name;
}

function formatDate(value: string) {
    return new Date(value).toLocaleString("en-KE", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function normalizeGender(value: string | null) {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return null;
    if (["female", "woman", "lady", "girl", "f"].includes(normalized)) return "female";
    if (["male", "man", "guy", "boy", "m"].includes(normalized)) return "male";
    return normalized;
}

function isOppositeSide(selectedGender: string | null, candidateGender: string | null) {
    const selected = normalizeGender(selectedGender);
    const candidate = normalizeGender(candidateGender);
    if (selected === "female") return candidate === "male";
    if (selected === "male") return candidate === "female";
    return true;
}

function isVerified(profile: ManualMatchmakingProfile) {
    return profile.faceVerificationStatus === "verified" || Boolean(profile.faceVerifiedAt);
}

function isManualMatchReady(profile: ManualMatchmakingProfile) {
    return isVerified(profile) && profile.waitlistStatus === "admitted";
}

function manualLaunchPool(profile: ManualMatchmakingProfile) {
    return profile.waitlistStatus === "admitted" || isVerified(profile);
}

function stateLabel(profile: ManualMatchmakingProfile) {
    if (profile.activeState === "available") return "Available";
    if (profile.activeState === "active_pair") return `Active with ${profile.activePartnerName ?? "someone"}`;
    if (profile.activeState === "mutual_hold") return `Matched with ${profile.activePartnerName ?? "someone"}`;
    return "Incomplete or hidden";
}

function stateClass(state: ManualMatchmakingProfile["activeState"]) {
    if (state === "available") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    if (state === "active_pair") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    if (state === "mutual_hold") return "border-pink-500/30 bg-pink-500/10 text-pink-200";
    return "border-white/10 bg-white/5 text-gray-400";
}

function allPhotos(profile: ManualMatchmakingProfile) {
    return [profile.profilePhoto, ...profile.photos].filter((photo): photo is string => Boolean(photo));
}

function profileSearchText(profile: ManualMatchmakingProfile) {
    return [
        fullName(profile),
        profile.email,
        profile.phoneNumber,
        profile.gender,
        profile.course,
        profile.university,
        profile.yearOfStudy,
        profile.faceVerificationStatus,
        profile.waitlistStatus,
    ].filter(Boolean).join(" ").toLowerCase();
}

function sharedValues(left: string[], right: string[]) {
    const rightSet = new Set(right.map((item) => item.toLowerCase()));
    return left.filter((item) => rightSet.has(item.toLowerCase()));
}

function compactText(value: unknown) {
    if (!value) return "Not set";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value).replace(/_/g, " ");
}

function Detail({ label, value }: { label: string; value: unknown }) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-1 text-sm text-gray-200">{value ? String(value) : "Not set"}</p>
        </div>
    );
}

function Pill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "pink" | "green" | "amber" }) {
    const classes = {
        default: "bg-white/10 text-gray-200",
        pink: "bg-pink-500/15 text-pink-100",
        green: "bg-emerald-500/15 text-emerald-100",
        amber: "bg-amber-500/15 text-amber-100",
    };
    return <span className={`rounded-full px-2 py-1 text-xs ${classes[tone]}`}>{children}</span>;
}

function JsonPanel({ title, value }: { title: string; value: Record<string, unknown> | null }) {
    const entries = Object.entries(value ?? {}).filter(([, entryValue]) => Boolean(entryValue));
    if (entries.length === 0) return null;
    return (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">{title}</p>
            <div className="grid gap-2 sm:grid-cols-2">
                {entries.map(([key, entryValue]) => (
                    <div key={key}>
                        <p className="text-[10px] uppercase text-gray-500">{key.replace(/([A-Z])/g, " $1")}</p>
                        <p className="text-sm text-gray-200">{compactText(entryValue)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ProfileInspector({ profile, onClose }: { profile: ManualMatchmakingProfile; onClose: () => void }) {
    const photos = allPhotos(profile);
    const [activePhoto, setActivePhoto] = useState(photos[0] ?? null);

    return (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-[#10101c] shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#10101c]/95 p-4 backdrop-blur">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{fullName(profile)}</h2>
                        <p className="text-sm text-gray-400">{profile.email} - {profile.phoneNumber ?? "No phone"}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg border border-white/10 p-2 text-gray-300 hover:bg-white/10">
                        <X className="size-5" />
                    </button>
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-[420px_minmax(0,1fr)]">
                    <section>
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                            {activePhoto ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={activePhoto} alt={fullName(profile)} className="max-h-[620px] w-full object-contain" />
                            ) : (
                                <div className="flex h-[420px] items-center justify-center text-sm text-gray-500">No photos</div>
                            )}
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-2">
                            {photos.map((photo, index) => (
                                <button key={`${photo}-${index}`} type="button" onClick={() => setActivePhoto(photo)} className={`overflow-hidden rounded-lg border ${photo === activePhoto ? "border-pink-400" : "border-white/10"}`}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={photo} alt={`${fullName(profile)} ${index + 1}`} className="aspect-square w-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <Detail label="Age" value={profile.age} />
                            <Detail label="Gender" value={profile.gender} />
                            <Detail label="Looking for" value={profile.lookingFor} />
                            <Detail label="Course" value={profile.course} />
                            <Detail label="University" value={profile.university} />
                            <Detail label="Year" value={profile.yearOfStudy} />
                            <Detail label="Verification" value={profile.faceVerificationStatus} />
                            <Detail label="Verified at" value={profile.faceVerifiedAt ? formatDate(profile.faceVerifiedAt) : null} />
                            <Detail label="State" value={stateLabel(profile)} />
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                                <BookOpen className="size-4" />
                                Bio
                            </p>
                            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-200">{profile.aboutMe || profile.bio || "No bio yet."}</p>
                        </div>

                        <TokenBlock title="Interests" items={profile.interests} />
                        <TokenBlock title="Qualities" items={profile.qualities} tone="pink" />
                        {profile.prompts.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Prompts</p>
                                {profile.prompts.map((prompt) => (
                                    <div key={`${prompt.promptId}-${prompt.response}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                                        <p className="text-xs text-gray-500">{prompt.promptId}</p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-200">{prompt.response}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <JsonPanel title="Personality answers" value={profile.personalityAnswers} />
                        <JsonPanel title="Lifestyle answers" value={profile.lifestyleAnswers} />
                    </section>
                </div>
            </div>
        </div>
    );
}

function PhotoFolder({ profile, onClose }: { profile: ManualMatchmakingProfile; onClose: () => void }) {
    const photos = allPhotos(profile);
    const [activePhoto, setActivePhoto] = useState(photos[0] ?? null);

    return (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/85 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col rounded-2xl border border-white/10 bg-[#090912] shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-white/10 p-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{fullName(profile)}</h2>
                        <p className="text-sm text-gray-500">{photos.length} photo{photos.length === 1 ? "" : "s"}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg border border-white/10 p-2 text-gray-300 hover:bg-white/10">
                        <X className="size-5" />
                    </button>
                </div>

                <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <section className="flex min-h-[480px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40">
                        {activePhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={activePhoto} alt={fullName(profile)} className="max-h-[calc(100vh-10rem)] w-full object-contain" />
                        ) : (
                            <div className="text-sm text-gray-500">No photos</div>
                        )}
                    </section>
                    <section className="grid max-h-[calc(100vh-10rem)] grid-cols-3 gap-2 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-3 lg:grid-cols-2">
                        {photos.map((photo, index) => (
                            <button key={`${photo}-${index}`} type="button" onClick={() => setActivePhoto(photo)} className={`overflow-hidden rounded-lg border ${photo === activePhoto ? "border-pink-400" : "border-white/10 hover:border-white/30"}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={photo} alt={`${fullName(profile)} ${index + 1}`} className="aspect-square w-full object-cover" />
                            </button>
                        ))}
                    </section>
                </div>
            </div>
        </div>
    );
}

function TokenBlock({ title, items, tone = "default" }: { title: string; items: string[]; tone?: "default" | "pink" | "green" | "amber" }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{title}</p>
            <div className="flex flex-wrap gap-2">
                {(items.length ? items : ["Not set"]).map((item) => (
                    <Pill key={item} tone={tone}>{item}</Pill>
                ))}
            </div>
        </div>
    );
}

function MiniProfileHeader({
    label,
    profile,
    score,
    onInspect,
    onPhotos,
}: {
    label: string;
    profile: CandidateDeckItem | null;
    score?: number;
    onInspect: (profile: ManualMatchmakingProfile) => void;
    onPhotos: (profile: ManualMatchmakingProfile) => void;
}) {
    if (!profile) {
        return (
            <section className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-5 text-center">
                <div>
                    <UserRound className="mx-auto mb-3 size-8 text-gray-500" />
                    <p className="font-semibold text-white">{label}</p>
                    <p className="mt-1 text-sm text-gray-500">Choose a profile to fill this slot.</p>
                </div>
            </section>
        );
    }

    const photo = allPhotos(profile)[0];
    return (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-4">
                <button type="button" onClick={() => onPhotos(profile)} className="h-32 w-24 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={fullName(profile)} className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-500">No photo</div>
                    )}
                </button>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${stateClass(profile.activeState)}`}>
                            {stateLabel(profile)}
                        </span>
                        {score !== undefined && (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-200">{score}%</span>
                        )}
                    </div>
                    <h2 className="mt-2 truncate text-2xl font-bold text-white">{fullName(profile)}</h2>
                    <p className="mt-1 text-sm text-gray-400">{[profile.age, profile.gender, profile.course, profile.yearOfStudy ? `Year ${profile.yearOfStudy}` : null, profile.university].filter(Boolean).join(" - ") || "No school details"}</p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-300">{profile.aboutMe || profile.bio || "No bio yet."}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => onInspect(profile)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">
                            <Eye className="size-3.5" />
                            Inspect
                        </button>
                        <button type="button" onClick={() => onPhotos(profile)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10">
                            <ImageIcon className="size-3.5" />
                            Photos
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

function CandidateCard({
    candidate,
    selected,
    onCompare,
    onInspect,
    onPhotos,
}: {
    candidate: CandidateDeckItem;
    selected: boolean;
    onCompare: () => void;
    onInspect: () => void;
    onPhotos: () => void;
}) {
    const photo = allPhotos(candidate)[0];
    return (
        <article className={`rounded-xl border p-3 transition-colors ${selected ? "border-pink-400/60 bg-pink-500/15" : "border-white/10 bg-black/20 hover:bg-white/10"}`}>
            <div className="flex items-start gap-3">
                <button type="button" onClick={onPhotos} className="size-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={fullName(candidate)} className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-gray-500">No photo</div>
                    )}
                </button>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="truncate font-semibold text-white">{fullName(candidate)}</h3>
                            <p className="truncate text-xs text-gray-400">{[candidate.age, candidate.gender, candidate.course, candidate.yearOfStudy ? `Y${candidate.yearOfStudy}` : null].filter(Boolean).join(" - ") || candidate.email}</p>
                            <p className="truncate text-xs text-gray-500">{candidate.university ?? "No university"}</p>
                        </div>
                        {candidate.compatibilityScore !== undefined ? (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-200">{candidate.compatibilityScore}%</span>
                        ) : (
                            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold text-gray-400">score after select</span>
                        )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${stateClass(candidate.activeState)}`}>{candidate.activeState.replaceAll("_", " ")}</span>
                        {candidate.pushEnabled ? <Pill tone="green">Push</Pill> : <Pill tone="amber">No push</Pill>}
                        {allPhotos(candidate).length > 0 && <Pill>{allPhotos(candidate).length} photos</Pill>}
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-gray-300">{candidate.reasons?.slice(0, 3).join(" - ") || candidate.interests.slice(0, 3).join(" - ") || "Open profile to review fit."}</p>
                    {candidate.warnings && candidate.warnings.length > 0 && (
                        <p className="mt-2 text-xs text-amber-200">{candidate.warnings.join(" - ")}</p>
                    )}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                        <button type="button" onClick={onCompare} className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-black hover:bg-white/90">
                            Compare
                        </button>
                        <button type="button" onClick={onPhotos} className="rounded-lg border border-white/10 px-2 py-2 text-xs font-bold text-gray-200 hover:bg-white/10">
                            Photos
                        </button>
                        <button type="button" onClick={onInspect} className="rounded-lg border border-white/10 px-2 py-2 text-xs font-bold text-gray-200 hover:bg-white/10">
                            Inspect
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}

function ComparePanel({
    mode,
    selectedUser,
    candidate,
    reasons,
}: {
    mode: CompareMode;
    selectedUser: ManualMatchmakingProfile | null;
    candidate: CandidateDeckItem | null;
    reasons: string[];
}) {
    if (!selectedUser || !candidate) {
        return (
            <section className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-gray-400">
                Select a person and compare a candidate to see the working view.
            </section>
        );
    }

    const sharedInterests = sharedValues(selectedUser.interests, candidate.interests);
    const sharedQualities = sharedValues(selectedUser.qualities, candidate.qualities);

    if (mode === "photos") {
        return (
            <section className="grid gap-3 md:grid-cols-2">
                {[selectedUser, candidate].map((profile) => (
                    <div key={profile.userId} className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">{fullName(profile)}</p>
                        <div className="grid grid-cols-4 gap-2">
                            {allPhotos(profile).slice(0, 8).map((photo, index) => (
                                <div key={`${photo}-${index}`} className="overflow-hidden rounded-lg border border-white/10">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={photo} alt={`${fullName(profile)} ${index + 1}`} className="aspect-square w-full object-cover" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        );
    }

    if (mode === "bio") {
        return (
            <section className="grid gap-3 md:grid-cols-2">
                {[selectedUser, candidate].map((profile) => (
                    <div key={profile.userId} className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">{fullName(profile)} bio</p>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-200">{profile.aboutMe || profile.bio || "No bio yet."}</p>
                    </div>
                ))}
            </section>
        );
    }

    if (mode === "interests") {
        return (
            <section className="grid gap-3 lg:grid-cols-3">
                <TokenBlock title="Shared interests" items={sharedInterests} tone="green" />
                <TokenBlock title="Shared qualities" items={sharedQualities} tone="pink" />
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Why this could work</p>
                    <div className="space-y-2">
                        {(reasons.length ? reasons : ["No compatibility reasons yet."]).map((reason) => (
                            <p key={reason} className="rounded-lg bg-black/20 p-2 text-sm text-gray-200">{reason}</p>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (mode === "answers") {
        return (
            <section className="grid gap-3 md:grid-cols-2">
                {[selectedUser, candidate].map((profile) => (
                    <div key={profile.userId} className="space-y-3">
                        <JsonPanel title={`${fullName(profile)} personality`} value={profile.personalityAnswers} />
                        <JsonPanel title={`${fullName(profile)} lifestyle`} value={profile.lifestyleAnswers} />
                    </div>
                ))}
            </section>
        );
    }

    return (
        <section className="grid gap-3 md:grid-cols-2">
            {[selectedUser, candidate].map((profile) => (
                <div key={profile.userId} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">{fullName(profile)} history</p>
                    <div className="grid gap-2 text-sm text-gray-300">
                        <span>Total pairs: {profile.stats.totalPairs}</span>
                        <span>Interested: {profile.stats.interested}</span>
                        <span>Passed: {profile.stats.passed}</span>
                        <span>Maybe: {profile.stats.maybe}</span>
                        <span>Mutual: {profile.stats.mutual}</span>
                    </div>
                </div>
            ))}
        </section>
    );
}

function ActionModal({
    action,
    selectedUser,
    selectedCandidate,
    note,
    isPending,
    onNoteChange,
    onClose,
    onConfirm,
}: {
    action: AdminAction;
    selectedUser: ManualMatchmakingProfile | null;
    selectedCandidate: CandidateDeckItem | null;
    note: string;
    isPending: boolean;
    onNoteChange: (value: string) => void;
    onClose: () => void;
    onConfirm: () => void;
}) {
    const isCreate = action.type === "create";
    const title = isCreate ? "Create curated match" : action.title;
    let description = "Review this action before applying it.";
    if (action.type === "create" && selectedUser && selectedCandidate) {
        description = `Send ${fullName(selectedCandidate)} to ${fullName(selectedUser)} and ${fullName(selectedUser)} to ${fullName(selectedCandidate)}.`;
    } else if (action.type === "cancel") {
        description = "Cancel this sent match, remove it from Sent, and return both people to the matching pool.";
    } else if (action.type === "call") {
        description = action.outcome === "accepted"
            ? "Mark the call as accepted and keep these people out of the matching pool."
            : "Mark this as rejected, cancel the match, and return both people to the pool.";
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
            <section className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#10101c] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-pink-200">Confirm action</p>
                        <h2 className="mt-1 text-2xl font-bold text-white">{title}</h2>
                        <p className="mt-2 text-sm leading-6 text-gray-300">{description}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg border border-white/10 p-2 text-gray-300 hover:bg-white/10">
                        <X className="size-5" />
                    </button>
                </div>

                {isCreate && selectedUser && selectedCandidate && (
                    <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 sm:grid-cols-2">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Person A</p>
                            <p className="mt-1 font-semibold text-white">{fullName(selectedUser)}</p>
                            <p className="text-xs text-gray-500">{selectedUser.phoneNumber ?? selectedUser.email}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Candidate B</p>
                            <p className="mt-1 font-semibold text-white">{fullName(selectedCandidate)}</p>
                            <p className="text-xs text-gray-500">{selectedCandidate.phoneNumber ?? selectedCandidate.email}</p>
                        </div>
                    </div>
                )}

                {!isCreate && (
                    <label className="mt-4 block">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                            {action.type === "cancel" ? "Cancellation reason" : "Call notes"}
                        </span>
                        <textarea
                            value={note}
                            onChange={(event) => onNoteChange(event.target.value)}
                            rows={4}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-gray-500 focus:outline-none"
                            placeholder={action.type === "cancel" ? "Why are we cancelling this match?" : "What happened on the call?"}
                        />
                    </label>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-gray-200 hover:bg-white/10">
                        Keep editing
                    </button>
                    <button type="button" onClick={onConfirm} disabled={isPending} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-black hover:bg-white/90 disabled:opacity-50">
                        {isPending && <Loader2 className="size-4 animate-spin" />}
                        Confirm
                    </button>
                </div>
            </section>
        </div>
    );
}

export function ManualMatchmakingBoard({
    initialPool,
    initialActivity,
}: {
    initialPool: ManualMatchmakingProfile[];
    initialActivity: ActivityItem[];
}) {
    const [pool] = useState(initialPool);
    const [activity] = useState(initialActivity);
    const [poolQuery, setPoolQuery] = useState("");
    const [poolFilter, setPoolFilter] = useState<PoolFilter>("all");
    const [selectedUserId, setSelectedUserId] = useState(initialPool.find(manualLaunchPool)?.userId ?? initialPool[0]?.userId ?? "");
    const [selectedCandidateId, setSelectedCandidateId] = useState("");
    const [candidateTab, setCandidateTab] = useState<CandidateTab>("suggested");
    const [candidateQuery, setCandidateQuery] = useState("");
    const [ageMin, setAgeMin] = useState("");
    const [ageMax, setAgeMax] = useState("");
    const [yearFilter, setYearFilter] = useState("");
    const [courseFilter, setCourseFilter] = useState("all");
    const [universityFilter, setUniversityFilter] = useState("all");
    const [candidateStateFilter, setCandidateStateFilter] = useState<CandidateStateFilter>("all");
    const [hasPhotosOnly, setHasPhotosOnly] = useState(false);
    const [pushOnly, setPushOnly] = useState(false);
    const [candidateSort, setCandidateSort] = useState<CandidateSort>("compatibility");
    const [compareMode, setCompareMode] = useState<CompareMode>("photos");
    const [sentQuery, setSentQuery] = useState("");
    const [showSentMatches, setShowSentMatches] = useState(false);
    const [showCandidateFilters, setShowCandidateFilters] = useState(false);
    const [suggestions, setSuggestions] = useState<ManualMatchSuggestion[]>([]);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [adminAction, setAdminAction] = useState<AdminAction | null>(null);
    const [actionNote, setActionNote] = useState("");
    const [inspectingProfile, setInspectingProfile] = useState<ManualMatchmakingProfile | null>(null);
    const [photoProfile, setPhotoProfile] = useState<ManualMatchmakingProfile | null>(null);
    const [isPending, startTransition] = useTransition();

    const selectedUser = pool.find((item) => item.userId === selectedUserId) ?? null;
    const suggestionById = useMemo(() => new Map(suggestions.map((item) => [item.userId, item])), [suggestions]);

    const selectedCandidate = useMemo((): CandidateDeckItem | null => {
        if (!selectedCandidateId) return null;
        const suggested = suggestionById.get(selectedCandidateId);
        if (suggested) return suggested;
        const profile = pool.find((item) => item.userId === selectedCandidateId);
        if (!profile) return null;
        return profile;
    }, [pool, selectedCandidateId, suggestionById]);

    const stats = useMemo(() => ({
        total: pool.length,
        verified: pool.filter(manualLaunchPool).length,
        available: pool.filter((item) => item.activeState === "available").length,
        sent: activity.filter((item) => item.status !== "closed" && item.status !== "expired").length,
    }), [activity.length, pool]);

    const courseOptions = useMemo(() => Array.from(new Set(pool.map((item) => item.course).filter(Boolean) as string[])).sort(), [pool]);
    const universityOptions = useMemo(() => Array.from(new Set(pool.map((item) => item.university).filter(Boolean) as string[])).sort(), [pool]);
    const yearOptions = useMemo(() => Array.from(new Set(pool.map((item) => item.yearOfStudy).filter((item): item is number => typeof item === "number"))).sort((a, b) => a - b), [pool]);
    const matchablePool = useMemo(() => pool.filter((item) => (
        manualLaunchPool(item)
    )), [pool]);

    const filteredPool = useMemo(() => {
        const normalized = poolQuery.trim().toLowerCase();
        return matchablePool.filter((item) => {
            const matchesFilter =
                poolFilter === "all"
                || (poolFilter === "available" && item.activeState === "available")
                || (poolFilter === "active" && item.activeState === "active_pair")
                || (poolFilter === "hold" && item.activeState === "mutual_hold")
                || (poolFilter === "incomplete" && item.activeState === "unavailable");

            return matchesFilter && (!normalized || profileSearchText(item).includes(normalized));
        });
    }, [matchablePool, poolFilter, poolQuery]);

    const allEligibleCandidates = useMemo((): CandidateDeckItem[] => {
        if (!selectedUser) return [];
        const candidates = pool
            .filter((item) => (
                item.userId !== selectedUser.userId
                && manualLaunchPool(item)
                && isOppositeSide(selectedUser.gender, item.gender)
            ))
            .map((item) => {
                const suggested = suggestionById.get(item.userId);
                return suggested ? { ...item, compatibilityScore: suggested.compatibilityScore, reasons: suggested.reasons, warnings: suggested.warnings } : item;
            });
        const selectedGender = normalizeGender(selectedUser.gender);
        if (selectedGender === "female") {
            return candidates.slice(0, 100);
        }
        return candidates;
    }, [pool, selectedUser, suggestionById]);

    const candidateCountBreakdown = useMemo(() => {
        if (!selectedUser) {
            return { oppositeSide: 0, completeVisible: 0, verifiedEligible: 0 };
        }
        const oppositeSide = pool.filter((item) => (
            item.userId !== selectedUser.userId
            && isOppositeSide(selectedUser.gender, item.gender)
        ));
        const admitted = oppositeSide.filter(manualLaunchPool);
        const verifiedEligible = admitted;
        const selectedGender = normalizeGender(selectedUser.gender);
        const cappedEligible = selectedGender === "female" ? verifiedEligible.slice(0, 100) : verifiedEligible;
        return {
            oppositeSide: oppositeSide.length,
            completeVisible: admitted.length,
            verifiedEligible: cappedEligible.length,
        };
    }, [pool, selectedUser]);

    const rawCandidates = candidateTab === "suggested" ? suggestions : allEligibleCandidates;

    const filteredCandidates = useMemo(() => {
        const normalized = candidateQuery.trim().toLowerCase();
        const minAge = Number(ageMin);
        const maxAge = Number(ageMax);
        const sorted = rawCandidates.filter((item) => {
            if (normalized && !profileSearchText(item).includes(normalized)) return false;
            if (ageMin && (!item.age || item.age < minAge)) return false;
            if (ageMax && (!item.age || item.age > maxAge)) return false;
            if (yearFilter && String(item.yearOfStudy ?? "") !== yearFilter) return false;
            if (courseFilter !== "all" && item.course !== courseFilter) return false;
            if (universityFilter !== "all" && item.university !== universityFilter) return false;
            if (candidateStateFilter !== "all" && item.activeState !== candidateStateFilter) return false;
            if (hasPhotosOnly && allPhotos(item).length === 0) return false;
            if (pushOnly && !item.pushEnabled) return false;
            return true;
        });

        return [...sorted].sort((left, right) => {
            if (candidateSort === "compatibility") return (right.compatibilityScore ?? -1) - (left.compatibilityScore ?? -1);
            if (candidateSort === "newest") return new Date(right.lastActive).getTime() - new Date(left.lastActive).getTime();
            if (candidateSort === "age_asc") return (left.age ?? 999) - (right.age ?? 999);
            if (candidateSort === "age_desc") return (right.age ?? -1) - (left.age ?? -1);
            if (candidateSort === "year_asc") return (left.yearOfStudy ?? 999) - (right.yearOfStudy ?? 999);
            if (candidateSort === "year_desc") return (right.yearOfStudy ?? -1) - (left.yearOfStudy ?? -1);
            return fullName(left).localeCompare(fullName(right));
        });
    }, [ageMax, ageMin, candidateQuery, candidateSort, candidateStateFilter, courseFilter, hasPhotosOnly, pushOnly, rawCandidates, universityFilter, yearFilter]);

    const sentActivity = useMemo(() => {
        const normalized = sentQuery.trim().toLowerCase();
        const activeSent = activity.filter((item) => item.status !== "closed" && item.status !== "expired");
        if (!normalized) return activeSent;
        return activeSent.filter((item) => [
            item.userAName,
            item.userBName,
            item.userAPhone,
            item.userBPhone,
            item.userAEmail,
            item.userBEmail,
            item.status,
            item.aDecision,
            item.bDecision,
        ].filter(Boolean).join(" ").toLowerCase().includes(normalized));
    }, [activity, sentQuery]);

    const loadSuggestions = (userId: string) => {
        setSelectedUserId(userId);
        setSelectedCandidateId("");
        setCandidateTab("suggested");
        setError(null);
        setMessage(null);
        startTransition(async () => {
            try {
                const next = await getManualMatchSuggestions(userId);
                setSuggestions(next);
            } catch (err) {
                setSuggestions([]);
                setError(err instanceof Error ? err.message : "Could not load suggestions");
            }
        });
    };

    useEffect(() => {
        if (selectedUserId) loadSuggestions(selectedUserId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshPageData = () => {
        window.location.reload();
    };

    const resetCandidateFilters = () => {
        setCandidateQuery("");
        setAgeMin("");
        setAgeMax("");
        setYearFilter("");
        setCourseFilter("all");
        setUniversityFilter("all");
        setCandidateStateFilter("all");
        setHasPhotosOnly(false);
        setPushOnly(false);
        setCandidateSort("compatibility");
    };

    const openCreateMatch = () => {
        if (!selectedUser || !selectedCandidate) return;
        setActionNote("");
        setAdminAction({ type: "create" });
    };

    const openCancelPair = (pairId: string, title: string) => {
        setActionNote("Cancelled after admin review");
        setAdminAction({ type: "cancel", pairId, title });
    };

    const openMarkCall = (pairId: string, outcome: "accepted" | "rejected", title: string) => {
        setActionNote(outcome === "rejected" ? "Rejected after admin call" : "");
        setAdminAction({ type: "call", pairId, outcome, title });
    };

    const runAdminAction = () => {
        if (!adminAction) return;
        setError(null);
        setMessage(null);
        startTransition(async () => {
            try {
                if (adminAction.type === "create") {
                    if (!selectedUser || !selectedCandidate) return;
                    await createManualCandidatePair(selectedUser.userId, selectedCandidate.userId);
                    setMessage("Curated match created and notifications sent.");
                } else if (adminAction.type === "cancel") {
                    await cancelManualCandidatePair(adminAction.pairId, actionNote.trim() || "Cancelled after admin review");
                    setMessage("Match cancelled. Both people are back in the pool.");
                } else {
                    await markManualMatchCallOutcome(adminAction.pairId, adminAction.outcome, actionNote.trim());
                    setMessage(adminAction.outcome === "accepted" ? "Call accepted and match kept on hold." : "Match rejected and both people are back in the pool.");
                }
                setAdminAction(null);
                setActionNote("");
                refreshPageData();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Could not update match");
            }
        });
    };

    const sharedInterests = selectedUser && selectedCandidate ? sharedValues(selectedUser.interests, selectedCandidate.interests) : [];
    const sharedQualities = selectedUser && selectedCandidate ? sharedValues(selectedUser.qualities, selectedCandidate.qualities) : [];
    const activeReasons = selectedCandidate?.reasons ?? [];

    return (
        <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Pool</p>
                    <p className="mt-1 text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-emerald-200">Verified</p>
                    <p className="mt-1 text-2xl font-bold text-white">{stats.verified}</p>
                </div>
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-sky-200">Available</p>
                    <p className="mt-1 text-2xl font-bold text-white">{stats.available}</p>
                </div>
                <div className="rounded-xl border border-pink-500/30 bg-pink-500/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-pink-200">Sent</p>
                    <p className="mt-1 text-2xl font-bold text-white">{stats.sent}</p>
                </div>
            </div>

            {(message || error) && (
                <div className={`rounded-lg border p-3 text-sm ${error ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"}`}>
                    {error ?? message}
                </div>
            )}

            <div className="grid gap-4 xl:grid-cols-[280px_minmax(340px,1fr)_540px] 2xl:grid-cols-[320px_minmax(0,1fr)_600px]">
                <section className="xl:sticky xl:top-16 xl:max-h-[calc(100vh-5rem)] overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    <div className="border-b border-white/10 p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-white">Person A</h2>
                            <Users className="size-4 text-gray-500" />
                        </div>
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                            <Search className="size-4 text-gray-500" />
                            <input value={poolQuery} onChange={(event) => setPoolQuery(event.target.value)} placeholder="Search pool..." className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {POOL_FILTERS.map((item) => (
                                <button key={item.value} type="button" onClick={() => setPoolFilter(item.value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${poolFilter === item.value ? "border-pink-400/60 bg-pink-500/15 text-white" : "border-white/10 bg-black/20 text-gray-300"}`}>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="max-h-[520px] overflow-y-auto p-2 xl:max-h-[calc(100vh-17rem)]">
                        {filteredPool.map((item) => (
                            <button key={item.userId} type="button" onClick={() => loadSuggestions(item.userId)} className={`mb-2 w-full rounded-lg border p-3 text-left ${selectedUserId === item.userId ? "border-pink-400/60 bg-pink-500/15" : "border-white/10 bg-black/20 hover:bg-white/10"}`}>
                                <div className="flex items-center gap-3">
                                    <div className="size-10 overflow-hidden rounded-full bg-white/10">
                                        {item.profilePhoto ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.profilePhoto} alt={fullName(item)} className="h-full w-full object-cover" />
                                        ) : null}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-white">{fullName(item)}</p>
                                        <p className="truncate text-xs text-gray-500">{[item.age, item.gender, item.course].filter(Boolean).join(" - ") || item.email}</p>
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${stateClass(item.activeState)}`}>{item.activeState.replaceAll("_", " ")}</span>
                                    {isVerified(item) ? <span className="text-xs text-emerald-300">verified</span> : <span className="text-xs text-gray-500">unverified</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                <main className="min-w-0 xl:sticky xl:top-16 xl:max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">
                    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Workbench</p>
                                <h2 className="text-xl font-bold text-white">Compare and send</h2>
                            </div>
                            {selectedCandidate && (
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => setCompareMode("photos")} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white hover:bg-white/10">
                                        <ImageIcon className="size-3.5" />
                                        Compare photos
                                    </button>
                                    <button type="button" onClick={() => selectedUser && setInspectingProfile(selectedUser)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white hover:bg-white/10">
                                        <Eye className="size-3.5" />
                                        Inspect A
                                    </button>
                                    <button type="button" onClick={() => setInspectingProfile(selectedCandidate)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white hover:bg-white/10">
                                        <Eye className="size-3.5" />
                                        Inspect B
                                    </button>
                                    <button type="button" onClick={openCreateMatch} disabled={isPending} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-black hover:bg-white/90 disabled:opacity-50">
                                        <Send className="size-3.5" />
                                        Create curated match
                                    </button>
                                    <button type="button" onClick={() => setSelectedCandidateId("")} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-gray-200 hover:bg-white/10">
                                        <X className="size-3.5" />
                                        Clear
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid gap-3 xl:grid-cols-2">
                            <MiniProfileHeader label="Person A" profile={selectedUser} onInspect={setInspectingProfile} onPhotos={setPhotoProfile} />
                            <MiniProfileHeader label="Candidate B" profile={selectedCandidate} score={selectedCandidate?.compatibilityScore} onInspect={setInspectingProfile} onPhotos={setPhotoProfile} />
                        </div>

                        {selectedUser && selectedCandidate && (
                            <>
                                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Shared interests</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {(sharedInterests.length ? sharedInterests : ["None found"]).map((item) => <Pill key={item} tone="green">{item}</Pill>)}
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Shared qualities</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {(sharedQualities.length ? sharedQualities : ["None found"]).map((item) => <Pill key={item} tone="pink">{item}</Pill>)}
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Warnings</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {(selectedCandidate.warnings?.length ? selectedCandidate.warnings : ["No warnings"]).map((item) => <Pill key={item} tone={item === "No warnings" ? "green" : "amber"}>{item}</Pill>)}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {(["photos", "bio", "interests", "answers", "history"] as CompareMode[]).map((mode) => (
                                        <button key={mode} type="button" onClick={() => setCompareMode(mode)} className={`rounded-lg border px-3 py-2 text-xs font-bold capitalize ${compareMode === mode ? "border-pink-400/60 bg-pink-500/15 text-white" : "border-white/10 bg-black/20 text-gray-300 hover:bg-white/10"}`}>
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </section>

                    <div className="mt-4">
                        <ComparePanel mode={compareMode} selectedUser={selectedUser} candidate={selectedCandidate} reasons={activeReasons} />
                    </div>
                </main>

                <aside className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 xl:sticky xl:top-14 xl:max-h-[calc(100vh-4rem)]">
                    <div className="shrink-0 border-b border-white/10 p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-white">Candidate deck</h2>
                            {isPending ? <Loader2 className="size-4 animate-spin text-gray-400" /> : <Sparkles className="size-4 text-pink-300" />}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-black/20 p-1">
                            {(["suggested", "all"] as CandidateTab[]).map((tab) => (
                                <button key={tab} type="button" onClick={() => setCandidateTab(tab)} className={`rounded-md px-3 py-2 text-xs font-bold capitalize ${candidateTab === tab ? "bg-white text-black" : "text-gray-300 hover:bg-white/10"}`}>
                                    {tab === "suggested" ? `Suggested (${suggestions.length})` : `All eligible (${allEligibleCandidates.length})`}
                                </button>
                            ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-400">
                            <span>
                                {candidateCountBreakdown.verifiedEligible} eligible from {candidateCountBreakdown.oppositeSide} opposite-side profiles
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowCandidateFilters((value) => !value)}
                                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-1 font-bold text-gray-200 hover:bg-white/10"
                            >
                                Filters
                                {showCandidateFilters ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                            </button>
                        </div>

                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                            <Search className="size-4 text-gray-500" />
                            <input value={candidateQuery} onChange={(event) => setCandidateQuery(event.target.value)} placeholder="Search candidates..." className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none" />
                        </div>

                        {showCandidateFilters && (
                            <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
                                <p className="text-xs text-gray-400">
                                    All shows the opposite-side manual launch pool for {selectedUser ? fullName(selectedUser) : "the selected person"}. Men are capped to the first 100 for this phase.
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-md bg-white/5 p-2">
                                        <p className="font-bold text-white">{candidateCountBreakdown.oppositeSide}</p>
                                        <p className="mt-0.5 text-[10px] uppercase text-gray-500">opposite side</p>
                                    </div>
                                    <div className="rounded-md bg-white/5 p-2">
                                        <p className="font-bold text-white">{candidateCountBreakdown.completeVisible}</p>
                                        <p className="mt-0.5 text-[10px] uppercase text-gray-500">launch pool</p>
                                    </div>
                                    <div className="rounded-md bg-emerald-500/10 p-2">
                                        <p className="font-bold text-emerald-200">{candidateCountBreakdown.verifiedEligible}</p>
                                        <p className="mt-0.5 text-[10px] uppercase text-emerald-300/70">deck total</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <input value={ageMin} onChange={(event) => setAgeMin(event.target.value)} placeholder="Min age" inputMode="numeric" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none" />
                                    <input value={ageMax} onChange={(event) => setAgeMax(event.target.value)} placeholder="Max age" inputMode="numeric" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white focus:outline-none">
                                        <option value="">Any year</option>
                                        {yearOptions.map((year) => <option key={year} value={year}>Year {year}</option>)}
                                    </select>
                                    <select value={candidateStateFilter} onChange={(event) => setCandidateStateFilter(event.target.value as CandidateStateFilter)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white focus:outline-none">
                                        <option value="all">Any state</option>
                                        <option value="available">Available</option>
                                        <option value="active_pair">Active card</option>
                                        <option value="mutual_hold">Matched hold</option>
                                        <option value="unavailable">Unavailable</option>
                                    </select>
                                </div>
                                <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white focus:outline-none">
                                    <option value="all">Any course</option>
                                    {courseOptions.map((course) => <option key={course} value={course}>{course}</option>)}
                                </select>
                                <select value={universityFilter} onChange={(event) => setUniversityFilter(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white focus:outline-none">
                                    <option value="all">Any university</option>
                                    {universityOptions.map((university) => <option key={university} value={university}>{university}</option>)}
                                </select>
                                <div className="grid grid-cols-[1fr_auto] gap-2">
                                    <select value={candidateSort} onChange={(event) => setCandidateSort(event.target.value as CandidateSort)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white focus:outline-none">
                                        {SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                    </select>
                                    <button type="button" onClick={resetCandidateFilters} className="rounded-lg border border-white/10 px-3 py-2 text-gray-300 hover:bg-white/10" title="Reset filters">
                                        <RotateCcw className="size-4" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
                                        <input type="checkbox" checked={hasPhotosOnly} onChange={(event) => setHasPhotosOnly(event.target.checked)} />
                                        Has photos
                                    </label>
                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
                                        <input type="checkbox" checked={pushOnly} onChange={(event) => setPushOnly(event.target.checked)} />
                                        Push enabled
                                    </label>
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-200">
                                        <SlidersHorizontal className="size-3.5" />
                                        Verified only
                                    </span>
                                </div>
                            </div>
                        )}
                        {!showCandidateFilters && (hasPhotosOnly || pushOnly || ageMin || ageMax || yearFilter || courseFilter !== "all" || universityFilter !== "all" || candidateStateFilter !== "all" || candidateSort !== "compatibility") && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                                <span className="rounded-full bg-pink-500/15 px-2 py-1 text-pink-100">Filters active</span>
                                <button type="button" onClick={resetCandidateFilters} className="rounded-full border border-white/10 px-2 py-1 text-gray-200 hover:bg-white/10">
                                    Reset
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="min-h-[360px] max-h-[560px] space-y-2 overflow-y-auto p-3 xl:min-h-0 xl:flex-1 xl:max-h-none">
                        {filteredCandidates.map((candidate) => (
                            <CandidateCard
                                key={candidate.userId}
                                candidate={candidate}
                                selected={candidate.userId === selectedCandidateId}
                                onCompare={() => setSelectedCandidateId(candidate.userId)}
                                onInspect={() => setInspectingProfile(candidate)}
                                onPhotos={() => setPhotoProfile(candidate)}
                            />
                        ))}
                        {selectedUser && filteredCandidates.length === 0 && (
                            <p className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                                No verified opposite-side profiles match these filters.
                            </p>
                        )}
                    </div>
                </aside>
            </div>

            <section className="rounded-xl border border-white/10 bg-white/5">
                <button
                    type="button"
                    onClick={() => setShowSentMatches((value) => !value)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-white/[0.03]"
                >
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Sent</p>
                        <h2 className="text-lg font-bold text-white">Sent matches and calls</h2>
                        <p className="mt-1 text-xs text-gray-500">
                            {sentActivity.length} active sent match{sentActivity.length === 1 ? "" : "es"}. Expand only when you need call follow-up.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-bold text-gray-200">
                        {showSentMatches ? "Hide sent" : "Show sent"}
                        {showSentMatches ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </span>
                </button>
                {showSentMatches && (
                    <div className="border-t border-white/10 p-4">
                        <div className="flex max-w-xl items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                            <Search className="size-4 text-gray-500" />
                            <input value={sentQuery} onChange={(event) => setSentQuery(event.target.value)} placeholder="Search sent matches..." className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none" />
                        </div>
                        <div className="mt-4 grid gap-3 xl:grid-cols-2">
                            {sentActivity.map((item) => (
                                <article key={item.pairId} className="rounded-xl border border-white/10 bg-black/20 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-semibold text-white">{item.userAName} + {item.userBName}</h3>
                                            <p className="mt-1 text-xs text-gray-500">{item.status} - {item.compatibilityScore}% - {formatDate(item.updatedAt)}</p>
                                        </div>
                                        <div className="flex gap-2 text-xs">
                                            <Pill>{item.aDecision}</Pill>
                                            <Pill>{item.bDecision}</Pill>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <p className="text-sm font-semibold text-white">{item.userAName}</p>
                                            <p className="mt-1 text-xs text-gray-300">{item.userAPhone ?? "No phone"}</p>
                                            <p className="text-xs text-gray-500">{item.userAEmail ?? "No email"}</p>
                                        </div>
                                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                            <p className="text-sm font-semibold text-white">{item.userBName}</p>
                                            <p className="mt-1 text-xs text-gray-300">{item.userBPhone ?? "No phone"}</p>
                                            <p className="text-xs text-gray-500">{item.userBEmail ?? "No email"}</p>
                                        </div>
                                    </div>
                                    <p className="mt-3 line-clamp-2 text-xs text-gray-400">{item.reasons.join(" - ")}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button type="button" onClick={() => openMarkCall(item.pairId, "accepted", `${item.userAName} + ${item.userBName}`)} className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 px-2 py-1 text-xs font-semibold text-emerald-200">
                                            <Check className="size-3" />
                                            Call accepted
                                        </button>
                                        <button type="button" onClick={() => openMarkCall(item.pairId, "rejected", `${item.userAName} + ${item.userBName}`)} className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 px-2 py-1 text-xs font-semibold text-amber-200">
                                            <PhoneCall className="size-3" />
                                            Call rejected
                                        </button>
                                        <button type="button" onClick={() => openCancelPair(item.pairId, `${item.userAName} + ${item.userBName}`)} className="inline-flex items-center gap-1 rounded-md border border-red-500/30 px-2 py-1 text-xs font-semibold text-red-200">
                                            <X className="size-3" />
                                            Cancel
                                        </button>
                                    </div>
                                </article>
                            ))}
                            {sentActivity.length === 0 && (
                                <p className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                                    No sent matches found.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </section>

            {adminAction && (
                <ActionModal
                    action={adminAction}
                    selectedUser={selectedUser}
                    selectedCandidate={selectedCandidate}
                    note={actionNote}
                    isPending={isPending}
                    onNoteChange={setActionNote}
                    onClose={() => {
                        if (isPending) return;
                        setAdminAction(null);
                        setActionNote("");
                    }}
                    onConfirm={runAdminAction}
                />
            )}
            {inspectingProfile && <ProfileInspector profile={inspectingProfile} onClose={() => setInspectingProfile(null)} />}
            {photoProfile && <PhotoFolder profile={photoProfile} onClose={() => setPhotoProfile(null)} />}
        </div>
    );
}
