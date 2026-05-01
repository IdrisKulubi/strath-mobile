"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { UserActions } from "./_actions";

type AdminUser = {
    id: string;
    name: string;
    email: string;
    role: "user" | "admin" | null;
    createdAt: string;
    lastActive: string;
    deletedAt: string | null;
    phoneNumber: string | null;
    profileComplete: boolean;
    isComplete: boolean;
    firstName: string | null;
    lastName: string | null;
    profilePhoto: string | null;
    photos: string[];
    age: number | null;
    gender: string | null;
    bio: string | null;
    aboutMe: string | null;
    course: string | null;
    university: string | null;
    yearOfStudy: number | null;
    education: string | null;
    lookingFor: string | null;
    currentLocation: string | null;
    locationPermissionStatus: string | null;
    interests: string[];
    qualities: string[];
    prompts: { promptId: string; response: string }[];
    faceVerificationStatus: string | null;
    faceVerifiedAt: string | null;
    faceVerificationRetryCount: number;
    waitlistStatus: "admitted" | "waitlisted" | null;
    waitlistPosition: number | null;
    admittedAt: string | null;
    isVisible: boolean | null;
    anonymous: boolean | null;
    discoveryPaused: boolean | null;
    aiConsentGranted: boolean | null;
    sentRequests: number;
    receivedRequests: number;
    dateMatches: number;
};

type Filter = "all" | "complete" | "incomplete" | "noPhotos" | "verification" | "waitlisted" | "suspended" | "admins";

const FILTERS: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "complete", label: "Complete" },
    { value: "incomplete", label: "Incomplete" },
    { value: "noPhotos", label: "No photos" },
    { value: "verification", label: "Verification issues" },
    { value: "waitlisted", label: "Waitlisted" },
    { value: "suspended", label: "Suspended" },
    { value: "admins", label: "Admins" },
];

function formatDate(value: string | null) {
    if (!value) return "Not set";
    return new Date(value).toLocaleString("en-KE", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function fullName(user: AdminUser) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.name;
}

function profileDone(user: AdminUser) {
    return user.profileComplete || user.isComplete;
}

function allPhotos(user: AdminUser) {
    return [user.profilePhoto, ...user.photos].filter((photo): photo is string => Boolean(photo));
}

function verificationIssue(user: AdminUser) {
    return ["retry_required", "manual_review", "failed", "blocked"].includes(user.faceVerificationStatus ?? "");
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "good" | "bad" }) {
    const toneClass = tone === "good"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
        : tone === "bad"
            ? "border-red-500/30 bg-red-500/10 text-red-200"
            : "border-white/10 bg-white/5 text-gray-300";

    return (
        <div className={`rounded-xl border p-4 ${toneClass}`}>
            <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        </div>
    );
}

function UserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
    const photos = allPhotos(user);
    const details = [
        ["Email", user.email],
        ["Phone", user.phoneNumber],
        ["Age", user.age],
        ["Gender", user.gender],
        ["University", user.university],
        ["Course", user.course],
        ["Year", user.yearOfStudy],
        ["Education", user.education],
        ["Looking for", user.lookingFor],
        ["Location", user.currentLocation],
        ["Location permission", user.locationPermissionStatus],
        ["Waitlist", user.waitlistStatus ?? "Not gated"],
        ["Face verification", user.faceVerificationStatus ?? "No profile"],
        ["Retries", user.faceVerificationRetryCount],
        ["Visible", user.isVisible === null ? "No profile" : user.isVisible ? "Yes" : "No"],
        ["Discovery paused", user.discoveryPaused === null ? "No profile" : user.discoveryPaused ? "Yes" : "No"],
        ["AI consent", user.aiConsentGranted === null ? "No profile" : user.aiConsentGranted ? "Yes" : "No"],
        ["Created", formatDate(user.createdAt)],
        ["Last active", formatDate(user.lastActive)],
    ];

    return (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="mx-auto max-h-[92vh] max-w-5xl overflow-auto rounded-2xl border border-white/10 bg-[#11111d] shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#11111d]/95 p-5">
                    <div>
                        <h2 className="text-xl font-bold text-white">{fullName(user)}</h2>
                        <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg border border-white/10 p-2 text-gray-300 hover:bg-white/10">
                        <X className="size-5" />
                    </button>
                </div>

                <div className="grid gap-6 p-5 lg:grid-cols-[360px_1fr]">
                    <section>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Photos</p>
                        {photos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                                {photos.map((photo, index) => (
                                    <a key={`${photo}-${index}`} href={photo} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/10 bg-black/30">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={photo} alt={`${fullName(user)} photo ${index + 1}`} className="aspect-[3/4] w-full object-cover" />
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-sm text-gray-400">
                                No profile photos uploaded yet.
                            </div>
                        )}
                    </section>

                    <section className="space-y-5">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <Stat label="Sent requests" value={user.sentRequests} />
                            <Stat label="Received" value={user.receivedRequests} />
                            <Stat label="Date matches" value={user.dateMatches} />
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Profile details</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {details.map(([label, value]) => (
                                    <div key={String(label)} className="rounded-lg bg-white/5 p-3">
                                        <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
                                        <p className="mt-1 break-words text-sm text-white">{value ?? "Not set"}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {(user.bio || user.aboutMe) && (
                            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Bio</p>
                                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-200">{user.aboutMe || user.bio}</p>
                            </div>
                        )}

                        <div className="grid gap-4 lg:grid-cols-2">
                            <TagPanel title="Interests" items={user.interests} />
                            <TagPanel title="Qualities" items={user.qualities} />
                        </div>

                        {user.prompts.length > 0 && (
                            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Prompt answers</p>
                                <div className="space-y-2">
                                    {user.prompts.map((prompt) => (
                                        <div key={prompt.promptId} className="rounded-lg bg-white/5 p-3">
                                            <p className="text-[11px] uppercase tracking-wide text-gray-500">{prompt.promptId}</p>
                                            <p className="mt-1 text-sm text-white">{prompt.response}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

function TagPanel({ title, items }: { title: string; items: string[] }) {
    return (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
            {items.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                        <span key={item} className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-200">{item}</span>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-gray-500">None set.</p>
            )}
        </div>
    );
}

export function UsersExplorer({ users, total }: { users: AdminUser[]; total: number }) {
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

    const stats = useMemo(() => ({
        complete: users.filter(profileDone).length,
        incomplete: users.filter((user) => !profileDone(user)).length,
        noPhotos: users.filter((user) => allPhotos(user).length === 0).length,
        verificationIssues: users.filter(verificationIssue).length,
        waitlisted: users.filter((user) => user.waitlistStatus === "waitlisted").length,
        suspended: users.filter((user) => Boolean(user.deletedAt)).length,
    }), [users]);

    const filteredUsers = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return users.filter((user) => {
            const matchesQuery = !normalized || [
                fullName(user),
                user.name,
                user.email,
                user.phoneNumber,
                user.course,
                user.university,
                user.faceVerificationStatus,
                user.waitlistStatus,
                user.id,
            ].filter(Boolean).join(" ").toLowerCase().includes(normalized);

            if (!matchesQuery) return false;

            switch (filter) {
                case "complete":
                    return profileDone(user);
                case "incomplete":
                    return !profileDone(user);
                case "noPhotos":
                    return allPhotos(user).length === 0;
                case "verification":
                    return verificationIssue(user);
                case "waitlisted":
                    return user.waitlistStatus === "waitlisted";
                case "suspended":
                    return Boolean(user.deletedAt);
                case "admins":
                    return user.role === "admin";
                case "all":
                default:
                    return true;
            }
        });
    }, [filter, query, users]);

    return (
        <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Stat label="Total users" value={total} />
                <Stat label="Complete" value={stats.complete} tone="good" />
                <Stat label="Incomplete" value={stats.incomplete} />
                <Stat label="No photos" value={stats.noPhotos} tone="bad" />
                <Stat label="Verification issues" value={stats.verificationIssues} tone="bad" />
                <Stat label="Suspended" value={stats.suspended} tone="bad" />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                        <Search className="size-4 text-gray-500" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search name, email, phone, course, university, status, or user ID"
                            className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
                        />
                    </div>
                    <p className="text-sm text-gray-400">
                        Showing <span className="font-semibold text-white">{filteredUsers.length}</span> of {total}
                    </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    {FILTERS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setFilter(option.value)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === option.value ? "border-pink-400/60 bg-pink-500/15 text-white" : "border-white/10 bg-black/20 text-gray-300 hover:bg-white/10"}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">User</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Profile</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Verification</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Education</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Activity</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Last Active</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user, index) => {
                            const photos = allPhotos(user);
                            return (
                                <tr
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    className={`cursor-pointer border-b border-white/5 align-middle transition-colors hover:bg-white/8 ${user.deletedAt ? "opacity-50" : ""} ${index % 2 === 0 ? "" : "bg-white/2"}`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {user.profilePhoto ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={user.profilePhoto} alt="" className="size-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-xs font-bold text-white">
                                                    {fullName(user).charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium leading-tight text-white">
                                                    {fullName(user)}
                                                    {user.deletedAt && <span className="ml-2 text-xs text-red-400">(suspended)</span>}
                                                </div>
                                                <div className="max-w-[220px] truncate text-xs text-gray-500">{user.email}</div>
                                                <div className="text-[11px] text-gray-600">{user.phoneNumber ?? "No phone"} · {user.role ?? "user"}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="space-y-1">
                                            {profileDone(user)
                                                ? <span className="text-xs font-medium text-green-400">Complete</span>
                                                : <span className="text-xs text-gray-500">Incomplete</span>}
                                            <div className="text-[11px] text-gray-500">{photos.length} photo{photos.length === 1 ? "" : "s"}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${verificationIssue(user) ? "bg-red-500/15 text-red-200" : user.faceVerificationStatus === "approved" ? "bg-emerald-500/15 text-emerald-200" : "bg-white/8 text-gray-400"}`}>
                                            {user.faceVerificationStatus ?? "No profile"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400">
                                        <div>{user.university ?? "No university"}</div>
                                        <div className="text-gray-500">{user.course ?? "No course"}</div>
                                    </td>
                                    <td className="space-y-0.5 px-4 py-3 text-xs text-gray-400">
                                        <div>{user.sentRequests} sent · {user.receivedRequests} received</div>
                                        <div className="text-gray-500">{user.dateMatches} date matches</div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(user.lastActive)}</td>
                                    <td className="px-4 py-3">
                                        <UserActions userId={user.id} isSuspended={!!user.deletedAt} role={user.role ?? "user"} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-sm text-gray-500">No users match these filters.</div>
                )}
            </div>

            {selectedUser && <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
        </div>
    );
}
