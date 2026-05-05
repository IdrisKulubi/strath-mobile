"use client";

import type { CampaignBlock } from "@/db/schema";
import {
    type CampaignAudience,
    type CampaignChannel,
    type CampaignRecipientPreview,
    getAdminCampaignAudienceCount,
    getAdminCampaignRecipients,
    previewAdminCampaign,
    sendAdminCampaign,
} from "@/lib/actions/admin-campaigns";
import { ArrowDown, ArrowUp, ImageIcon, Mail, Plus, Search, Send, Smartphone, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

const DEFAULT_APP_STORE_URL = "https://apps.apple.com/ke/app/strathspace/id6757879443";

type AudienceOption = {
    value: CampaignAudience;
    label: string;
    description: string;
};

type CampaignHistoryItem = {
    id: string;
    name: string;
    subject: string;
    audience: string;
    channels: CampaignChannel[];
    recipientCount: number;
    emailSuccessCount: number;
    emailFailureCount: number;
    pushSuccessCount: number;
    pushFailureCount: number;
    status: string;
    sentAt: string | null;
    createdAt: string;
};

type SendResult = Awaited<ReturnType<typeof sendAdminCampaign>>;

const AUDIENCE_OPTIONS: AudienceOption[] = [
    { value: "no_profile", label: "Signed up, no profile", description: "Users who created auth accounts but never started profile setup." },
    { value: "profile_incomplete", label: "Profile incomplete", description: "Users with a profile that is not finished yet." },
    { value: "needs_verification", label: "Needs verification", description: "Finished profile details but still needs face verification." },
    { value: "verification_issues", label: "Verification issues", description: "Retry, review, failed, or blocked verification states." },
    { value: "waitlisted", label: "Waitlisted", description: "Users waiting for admission." },
    { value: "admitted", label: "Admitted", description: "Users currently admitted into the app." },
    { value: "push_enabled", label: "Push enabled", description: "Users who can receive app notifications." },
    { value: "everyone", label: "Everyone", description: "All non-deleted users." },
    { value: "all_users", label: "All users, including deleted", description: "Every stored account email, including self-deleted users." },
];

const RECIPIENT_TABLE_LIMIT = 5000;

const DEFAULT_BLOCKS: CampaignBlock[] = [
    { id: "eyebrow-1", type: "eyebrow", text: "Finish your StrathSpace profile" },
    {
        id: "hero-1",
        type: "hero",
        heading: "Hey {{firstName}}, your profile is almost ready.",
        body: "You signed up for StrathSpace, but your profile setup is not complete yet. It only takes a few minutes to add your real photos, finish your details, and verify your account.",
    },
    {
        id: "steps-1",
        type: "steps",
        title: "What to do next",
        items: [
            "Open StrathSpace and finish your profile details.",
            "Upload clear, real photos of yourself.",
            "Complete face verification so we can keep the community safe.",
        ],
    },
    {
        id: "callout-1",
        type: "callout",
        tone: "info",
        title: "Need help?",
        text: "If something failed or the app got confusing, message us on WhatsApp at {{supportPhone}} and we will help you finish setup.",
    },
    { id: "button-1", type: "button", label: "Open StrathSpace", href: DEFAULT_APP_STORE_URL },
    { id: "signature-1", type: "signature", name: "The StrathSpace Team", role: "Real profiles. Safer campus dating." },
];

function newBlock(type: CampaignBlock["type"]): CampaignBlock {
    const id = `${type}-${Date.now()}`;
    switch (type) {
        case "eyebrow":
            return { id, type, text: "A note from StrathSpace" };
        case "hero":
            return { id, type, heading: "Hey {{firstName}}, you are almost there.", body: "Finish your setup so we can show you better matches." };
        case "paragraph":
            return { id, type, text: "Write a clean, personal paragraph here." };
        case "image":
            return { id, type, imageUrl: "", alt: "", caption: "" };
        case "checklist":
            return { id, type, title: "Quick checklist", items: ["Add real photos", "Complete verification"] };
        case "steps":
            return { id, type, title: "Next steps", items: ["Open the app", "Finish your profile", "Verify your face"] };
        case "callout":
            return { id, type, tone: "info", title: "Need help?", text: "Message us on WhatsApp at {{supportPhone}}." };
        case "button":
            return { id, type, label: "Open StrathSpace", href: DEFAULT_APP_STORE_URL };
        case "divider":
            return { id, type };
        case "signature":
            return { id, type, name: "The StrathSpace Team", role: "Real profiles. Safer campus dating." };
    }
}

function blockTitle(block: CampaignBlock) {
    if (block.type === "hero") return "Hero";
    if (block.type === "callout") return "Callout";
    return block.type.slice(0, 1).toUpperCase() + block.type.slice(1);
}

function setBlockField<T extends CampaignBlock>(
    block: T,
    key: keyof T,
    value: T[keyof T],
): CampaignBlock {
    return { ...block, [key]: value } as CampaignBlock;
}

function joinItems(items: string[]) {
    return items.join("\n");
}

function splitItems(value: string) {
    return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function CampaignBlockEditor({
    block,
    index,
    total,
    onChange,
    onRemove,
    onMove,
}: {
    block: CampaignBlock;
    index: number;
    total: number;
    onChange: (block: CampaignBlock) => void;
    onRemove: () => void;
    onMove: (direction: -1 | 1) => void;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-white">{blockTitle(block)}</p>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Block {index + 1}</p>
                </div>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="rounded-md border border-white/10 p-2 text-gray-300 disabled:opacity-30">
                        <ArrowUp className="size-4" />
                    </button>
                    <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="rounded-md border border-white/10 p-2 text-gray-300 disabled:opacity-30">
                        <ArrowDown className="size-4" />
                    </button>
                    <button type="button" onClick={onRemove} className="rounded-md border border-red-500/30 p-2 text-red-300">
                        <Trash2 className="size-4" />
                    </button>
                </div>
            </div>

            <div className="grid gap-3">
                {block.type === "eyebrow" && (
                    <TextInput label="Eyebrow" value={block.text} onChange={(value) => onChange(setBlockField(block, "text", value))} />
                )}
                {block.type === "hero" && (
                    <>
                        <TextInput label="Heading" value={block.heading} onChange={(value) => onChange(setBlockField(block, "heading", value))} />
                        <TextArea label="Body" value={block.body} onChange={(value) => onChange(setBlockField(block, "body", value))} />
                        <TextInput label="Hero image URL" value={block.imageUrl ?? ""} onChange={(value) => onChange(setBlockField(block, "imageUrl", value))} />
                    </>
                )}
                {block.type === "paragraph" && (
                    <TextArea label="Text" value={block.text} onChange={(value) => onChange(setBlockField(block, "text", value))} />
                )}
                {block.type === "image" && (
                    <>
                        <TextInput label="Hosted image URL" value={block.imageUrl} onChange={(value) => onChange(setBlockField(block, "imageUrl", value))} />
                        <TextInput label="Alt text" value={block.alt ?? ""} onChange={(value) => onChange(setBlockField(block, "alt", value))} />
                        <TextInput label="Caption" value={block.caption ?? ""} onChange={(value) => onChange(setBlockField(block, "caption", value))} />
                    </>
                )}
                {(block.type === "checklist" || block.type === "steps") && (
                    <>
                        <TextInput label="Title" value={block.title ?? ""} onChange={(value) => onChange(setBlockField(block, "title", value))} />
                        <TextArea label="Items, one per line" value={joinItems(block.items)} onChange={(value) => onChange(setBlockField(block, "items", splitItems(value)))} />
                    </>
                )}
                {block.type === "callout" && (
                    <>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Tone
                            <select value={block.tone} onChange={(e) => onChange(setBlockField(block, "tone", e.target.value as "info" | "success" | "warning"))} className="mt-1 w-full rounded-md border border-white/10 bg-[#0f0f19] px-3 py-2 text-sm text-white">
                                <option value="info">Info</option>
                                <option value="success">Success</option>
                                <option value="warning">Warning</option>
                            </select>
                        </label>
                        <TextInput label="Title" value={block.title ?? ""} onChange={(value) => onChange(setBlockField(block, "title", value))} />
                        <TextArea label="Text" value={block.text} onChange={(value) => onChange(setBlockField(block, "text", value))} />
                    </>
                )}
                {block.type === "button" && (
                    <>
                        <TextInput label="CTA heading" value={block.label} onChange={(value) => onChange(setBlockField(block, "label", value))} />
                        <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-5 text-gray-400">
                            This CTA renders the official App Store and Google Play badges in the email,
                            so both iPhone and Android users can open StrathSpace.
                        </p>
                    </>
                )}
                {block.type === "signature" && (
                    <>
                        <TextInput label="Name" value={block.name} onChange={(value) => onChange(setBlockField(block, "name", value))} />
                        <TextInput label="Role" value={block.role ?? ""} onChange={(value) => onChange(setBlockField(block, "role", value))} />
                        <TextArea label="Note" value={block.note ?? ""} onChange={(value) => onChange(setBlockField(block, "note", value))} />
                    </>
                )}
                {block.type === "divider" && (
                    <p className="text-xs text-gray-500">A thin divider will be inserted here.</p>
                )}
            </div>
        </div>
    );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            {label}
            <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-white/30 focus:outline-none" />
        </label>
    );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            {label}
            <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-white/30 focus:outline-none" />
        </label>
    );
}

export function CampaignComposer() {
    const [name, setName] = useState("Profile setup reminder");
    const [subject, setSubject] = useState("Finish your StrathSpace profile, {{firstName}}");
    const [previewText, setPreviewText] = useState("You are almost ready to start meeting people on StrathSpace.");
    const [audience, setAudience] = useState<CampaignAudience>("no_profile");
    const [channels, setChannels] = useState<CampaignChannel[]>(["email"]);
    const [pushTitle, setPushTitle] = useState("Finish your StrathSpace profile");
    const [pushBody, setPushBody] = useState("You are almost ready. Complete your profile and verification to continue.");
    const ctaUrl = DEFAULT_APP_STORE_URL;
    const [ctaLabel, setCtaLabel] = useState("Open StrathSpace");
    const [blocks, setBlocks] = useState<CampaignBlock[]>(DEFAULT_BLOCKS);
    const [counts, setCounts] = useState<{ total: number; email: number; push: number } | null>(null);
    const [recipients, setRecipients] = useState<CampaignRecipientPreview[]>([]);
    const [recipientSearch, setRecipientSearch] = useState("");
    const [debouncedRecipientSearch, setDebouncedRecipientSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [sentUserIds, setSentUserIds] = useState<Set<string>>(new Set());
    const [failedUserIds, setFailedUserIds] = useState<Set<string>>(new Set());
    const [autoRetry, setAutoRetry] = useState(false);
    const [previewHtml, setPreviewHtml] = useState("");
    const [result, setResult] = useState<SendResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const dbSentUserIds = useMemo(() => new Set(
        recipients
            .filter((recipient) => recipient.emailStatus === "sent" || recipient.pushStatus === "sent")
            .map((recipient) => recipient.userId),
    ), [recipients]);
    const allSentUserIds = useMemo(() => new Set([...dbSentUserIds, ...sentUserIds]), [dbSentUserIds, sentUserIds]);
    const allFailedUserIds = useMemo(() => new Set([
        ...recipients
            .filter((recipient) => (recipient.emailStatus === "failed" || recipient.pushStatus === "failed") && !allSentUserIds.has(recipient.userId))
            .map((recipient) => recipient.userId),
        ...Array.from(failedUserIds).filter((userId) => !allSentUserIds.has(userId)),
    ]), [allSentUserIds, failedUserIds, recipients]);
    const retryOnlyMode = autoRetry && allFailedUserIds.size > 0 && selectedIds.size === 0;
    const selectedCount = retryOnlyMode ? allFailedUserIds.size : selectedIds.size || (counts?.total || recipients.length);
    const channelLabel = channels.join(" + ");
    const alreadySentVisibleCount = recipients.filter((recipient) => allSentUserIds.has(recipient.userId)).length;
    const failedVisibleCount = recipients.filter((recipient) => allFailedUserIds.has(recipient.userId) && !allSentUserIds.has(recipient.userId)).length;
    const pendingVisibleCount = recipients.length - alreadySentVisibleCount - failedVisibleCount;
    const isRecipientSearchActive = debouncedRecipientSearch.trim().length > 0;

    const buildFormData = (targetUserIds = Array.from(selectedIds), excludeUserIds: string[] = []) => {
        const data = new FormData();
        data.set("name", name);
        data.set("subject", subject);
        data.set("previewText", previewText);
        data.set("audience", audience);
        data.set("channels", JSON.stringify(channels));
        data.set("contentBlocks", JSON.stringify(blocks));
        data.set("pushTitle", pushTitle);
        data.set("pushBody", pushBody);
        data.set("ctaUrl", ctaUrl);
        data.set("ctaLabel", ctaLabel);
        data.set("selectedUserIds", JSON.stringify(targetUserIds));
        data.set("excludeUserIds", JSON.stringify(excludeUserIds));
        return data;
    };

    const formData = useMemo(() => {
        return buildFormData([], []);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [name, subject, previewText, audience, channels, blocks, pushTitle, pushBody, ctaUrl, ctaLabel, selectedIds]);

    useEffect(() => {
        const handle = window.setTimeout(() => {
            setDebouncedRecipientSearch(recipientSearch.trim());
        }, 300);
        return () => window.clearTimeout(handle);
    }, [recipientSearch]);

    useEffect(() => {
        let cancelled = false;

        Promise.all([
            getAdminCampaignAudienceCount(audience),
            getAdminCampaignRecipients(
                audience,
                RECIPIENT_TABLE_LIMIT,
                debouncedRecipientSearch || undefined,
            ),
        ])
            .then(([nextCounts, nextRecipients]) => {
                if (cancelled) return;
                setCounts(nextCounts);
                setRecipients(nextRecipients);
                setSentUserIds(new Set(nextRecipients
                    .filter((recipient) => recipient.emailStatus === "sent" || recipient.pushStatus === "sent")
                    .map((recipient) => recipient.userId)));
                setFailedUserIds(new Set(nextRecipients
                    .filter((recipient) => (recipient.emailStatus === "failed" || recipient.pushStatus === "failed") && recipient.emailStatus !== "sent" && recipient.pushStatus !== "sent")
                    .map((recipient) => recipient.userId)));
            })
            .catch(() => {
                if (!cancelled) setCounts(null);
            });

        return () => {
            cancelled = true;
        };
    }, [audience, debouncedRecipientSearch]);

    useEffect(() => {
        let cancelled = false;
        previewAdminCampaign(formData)
            .then((preview) => {
                if (!cancelled) setPreviewHtml(preview.html);
            })
            .catch(() => {
                if (!cancelled) setPreviewHtml("");
            });
        return () => {
            cancelled = true;
        };
    }, [formData]);

    const toggleChannel = (channel: CampaignChannel) => {
        setChannels((current) => (
            current.includes(channel)
                ? current.filter((item) => item !== channel)
                : [...current, channel]
        ));
    };

    const chooseAudience = (nextAudience: CampaignAudience) => {
        setAudience(nextAudience);
        setCounts(null);
        setRecipients([]);
        setRecipientSearch("");
        setDebouncedRecipientSearch("");
        setSelectedIds(new Set());
        setSentUserIds(new Set());
        setFailedUserIds(new Set());
    };

    const updateBlock = (index: number, block: CampaignBlock) => {
        setBlocks((current) => current.map((item, itemIndex) => (itemIndex === index ? block : item)));
    };

    const moveBlock = (index: number, direction: -1 | 1) => {
        setBlocks((current) => {
            const nextIndex = index + direction;
            if (nextIndex < 0 || nextIndex >= current.length) return current;
            const next = [...current];
            const [item] = next.splice(index, 1);
            next.splice(nextIndex, 0, item);
            return next;
        });
    };

    const toggleRecipient = (userId: string) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const handleSend = (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setResult(null);

        const human = AUDIENCE_OPTIONS.find((option) => option.value === audience)?.label ?? audience;
        const selectedTargets = retryOnlyMode
            ? Array.from(allFailedUserIds)
            : selectedIds.size > 0
                ? Array.from(selectedIds)
                : [];
        const excludedTargets = retryOnlyMode
            ? Array.from(allSentUserIds)
            : [];
        const sendCount = selectedTargets.length || selectedCount;
        const audienceDescription = retryOnlyMode
            ? `failed users in "${human}" while skipping already-sent users`
            : `users in "${human}"`;
        if (!window.confirm(`Send this ${channelLabel} campaign to ${sendCount} ${audienceDescription}?`)) return;

        startTransition(async () => {
            try {
                let sendResult = await sendAdminCampaign(buildFormData(selectedTargets, excludedTargets));
                let nextSentUserIds = new Set([...allSentUserIds, ...sendResult.sentUserIds]);
                let nextFailedUserIds = new Set(sendResult.failedUserIds);

                if (autoRetry && sendResult.failedUserIds.length > 0) {
                    const retryResult = await sendAdminCampaign(buildFormData(sendResult.failedUserIds, Array.from(nextSentUserIds)));
                    nextSentUserIds = new Set([...nextSentUserIds, ...retryResult.sentUserIds]);
                    nextFailedUserIds = new Set(retryResult.failedUserIds);
                    sendResult = {
                        ...retryResult,
                        recipientCount: sendResult.recipientCount + retryResult.recipientCount,
                        emailSuccessCount: sendResult.emailSuccessCount + retryResult.emailSuccessCount,
                        emailFailureCount: retryResult.emailFailureCount,
                        pushSuccessCount: sendResult.pushSuccessCount + retryResult.pushSuccessCount,
                        pushFailureCount: retryResult.pushFailureCount,
                        sentUserIds: Array.from(nextSentUserIds),
                        failedUserIds: Array.from(nextFailedUserIds),
                    };
                }

                setSentUserIds(nextSentUserIds);
                setFailedUserIds(nextFailedUserIds);
                setSelectedIds((current) => new Set(Array.from(current).filter((userId) => !nextSentUserIds.has(userId))));
                setResult(sendResult);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to send campaign");
            }
        });
    };

    return (
        <form onSubmit={handleSend} className="space-y-6">
            <section className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="grid gap-4 lg:grid-cols-2">
                    <TextInput label="Campaign name" value={name} onChange={setName} />
                    <TextInput label="Subject" value={subject} onChange={setSubject} />
                    <TextInput label="Preview text" value={previewText} onChange={setPreviewText} />
                    <TextInput label="App CTA heading" value={ctaLabel} onChange={setCtaLabel} />
                    <p className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-400">
                        Emails will include both official App Store and Google Play badges.
                    </p>
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Channels</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => toggleChannel("email")} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${channels.includes("email") ? "border-pink-400/60 bg-pink-500/15 text-white" : "border-white/10 bg-white/5 text-gray-300"}`}>
                                <Mail className="size-4" />
                                Email
                            </button>
                            <button type="button" onClick={() => toggleChannel("push")} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${channels.includes("push") ? "border-emerald-400/60 bg-emerald-500/15 text-white" : "border-white/10 bg-white/5 text-gray-300"}`}>
                                <Smartphone className="size-4" />
                                Push
                            </button>
                        </div>
                    </div>
                </div>

                {channels.includes("push") && (
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <TextInput label="Push title" value={pushTitle} onChange={setPushTitle} />
                        <TextArea label="Push body" value={pushBody} onChange={setPushBody} />
                    </div>
                )}
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-white">Audience</h2>
                        <p className="text-xs text-gray-400">
                            {counts ? `${counts.total} users, ${counts.email} email reachable, ${counts.push} push reachable` : "Loading audience size..."}
                        </p>
                    </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                    {AUDIENCE_OPTIONS.map((option) => {
                        const selected = audience === option.value;
                        return (
                            <button key={option.value} type="button" onClick={() => chooseAudience(option.value)} className={`rounded-lg border px-3 py-3 text-left transition-colors ${selected ? "border-pink-400/60 bg-pink-500/15" : "border-white/10 bg-black/20 hover:bg-white/10"}`}>
                                <p className="text-sm font-semibold text-white">{option.label}</p>
                                <p className="mt-1 text-[11px] text-gray-400">{option.description}</p>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-white">Email blocks</h2>
                            <p className="text-xs text-gray-400">Use image URLs for photo blocks. Merge tags: {"{{firstName}}"}, {"{{supportPhone}}"}, {"{{appUrl}}"}.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(["hero", "paragraph", "image", "checklist", "steps", "callout", "button", "divider", "signature"] as CampaignBlock["type"][]).map((type) => (
                                <button key={type} type="button" onClick={() => setBlocks((current) => [...current, newBlock(type)])} className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/10">
                                    {type === "image" ? <ImageIcon className="size-3.5" /> : <Plus className="size-3.5" />}
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        {blocks.map((block, index) => (
                            <CampaignBlockEditor
                                key={block.id}
                                block={block}
                                index={index}
                                total={blocks.length}
                                onChange={(nextBlock) => updateBlock(index, nextBlock)}
                                onRemove={() => setBlocks((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                                onMove={(direction) => moveBlock(index, direction)}
                            />
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <h2 className="text-base font-semibold text-white">Preview</h2>
                    <p className="mb-3 text-xs text-gray-400">Rendered with sample personalization.</p>
                    <div className="h-[720px] overflow-hidden rounded-xl border border-white/10 bg-white">
                        {previewHtml ? (
                            <iframe title="Email preview" srcDoc={previewHtml} className="h-full w-full bg-white" />
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-gray-500">Preview loading...</div>
                        )}
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-white">Recipients</h2>
                        <p className="text-xs text-gray-400">
                            Select individual users, or leave everyone unselected to send to the full audience.
                        </p>
                    </div>
                    <button type="button" onClick={() => {
                        const selectableIds = recipients
                            .map((recipient) => recipient.userId);
                        setSelectedIds(selectedIds.size === selectableIds.length ? new Set() : new Set(selectableIds));
                    }} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white">
                        {selectedIds.size === recipients.length ? "Clear selection" : "Select visible"}
                    </button>
                </div>
                <div className="mb-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-200">Already sent</p>
                        <p className="mt-1 text-lg font-bold text-white">{allSentUserIds.size}</p>
                        <p className="text-[11px] text-emerald-200/80">{alreadySentVisibleCount} visible</p>
                    </div>
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-red-200">Failed</p>
                        <p className="mt-1 text-lg font-bold text-white">{allFailedUserIds.size}</p>
                        <p className="text-[11px] text-red-200/80">{failedVisibleCount} visible</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Not sent yet</p>
                        <p className="mt-1 text-lg font-bold text-white">{Math.max((counts?.total || recipients.length) - allSentUserIds.size - allFailedUserIds.size, 0)}</p>
                        <p className="text-[11px] text-gray-500">{pendingVisibleCount} visible</p>
                    </div>
                </div>
                <label className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
                    <input
                        type="checkbox"
                        checked={autoRetry}
                        onChange={(event) => setAutoRetry(event.target.checked)}
                    />
                    Retry failed recipients only and skip everyone already sent.
                    {allSentUserIds.size > 0 && (
                        <span className="ml-auto text-emerald-300">{allSentUserIds.size} already sent, still selectable for new campaigns</span>
                    )}
                </label>
                <p className="mb-2 text-[11px] leading-relaxed text-gray-500">
                    Up to {RECIPIENT_TABLE_LIMIT.toLocaleString()} rows load at once (newest signups first). For a specific address, search by email or name — results come from the whole audience, not only the loaded page.
                    {" "}
                    To include every profile state in one send, choose <span className="font-semibold text-gray-400">Everyone</span> above.
                </p>
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <Search className="size-4 text-gray-500" />
                    <input
                        type="search"
                        value={recipientSearch}
                        onChange={(event) => setRecipientSearch(event.target.value)}
                        placeholder="Search by name, email, phone, user ID, or status"
                        className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
                    />
                    <span className="shrink-0 text-xs text-gray-500">
                        {isRecipientSearchActive
                            ? `${recipients.length} match${recipients.length === 1 ? "" : "es"}`
                            : counts && counts.total > recipients.length
                                ? `${recipients.length}/${counts.total}`
                                : `${recipients.length}`}
                    </span>
                </div>
                <div className="max-h-[360px] overflow-auto rounded-lg border border-white/10">
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-[#11111d] text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="w-10 px-3 py-2"></th>
                                <th className="px-3 py-2">User</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2">Contact</th>
                                <th className="px-3 py-2">Push</th>
                                <th className="px-3 py-2">Delivery</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {recipients.map((recipient) => (
                                <tr key={recipient.userId} className={allSentUserIds.has(recipient.userId) ? "bg-emerald-500/5" : "bg-black/10"}>
                                    <td className="px-3 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(recipient.userId)}
                                            onChange={() => toggleRecipient(recipient.userId)}
                                        />
                                    </td>
                                    <td className="px-3 py-3">
                                        <p className="font-semibold text-white">{recipient.name}</p>
                                        <p className="text-xs text-gray-500">{recipient.userId}</p>
                                    </td>
                                    <td className="px-3 py-3 text-xs text-gray-300">
                                        <div>{recipient.profileStatus}</div>
                                        {allSentUserIds.has(recipient.userId) && (
                                            <span className="mt-1 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                                                Sent in DB
                                            </span>
                                        )}
                                        {allFailedUserIds.has(recipient.userId) && !allSentUserIds.has(recipient.userId) && (
                                            <span className="mt-1 inline-flex rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-200">
                                                Failed in DB
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3">
                                        <p className="text-xs text-gray-300">{recipient.email}</p>
                                        <p className="text-xs text-gray-500">{recipient.phoneNumber ?? "No phone"}</p>
                                    </td>
                                    <td className="px-3 py-3 text-xs">
                                        <span className={recipient.hasPush ? "text-emerald-300" : "text-gray-500"}>
                                            {recipient.hasPush ? "Enabled" : "Missing"}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-xs">
                                        {allSentUserIds.has(recipient.userId) ? (
                                            <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-1 font-bold uppercase tracking-wide text-emerald-200">
                                                Already sent
                                            </span>
                                        ) : allFailedUserIds.has(recipient.userId) ? (
                                            <span className="inline-flex rounded-full bg-red-500/15 px-2 py-1 font-bold uppercase tracking-wide text-red-200">
                                                Failed
                                            </span>
                                        ) : (
                                            <span className="text-gray-500">Not sent</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {recipients.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                                        {isRecipientSearchActive ? "No recipients match your search in this audience." : "No recipients in this audience yet."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
            {result && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                    Sent to {result.recipientCount} attempts. Email: {result.emailSuccessCount} sent, {result.emailFailureCount} failed.
                    Push: {result.pushSuccessCount} sent, {result.pushFailureCount} failed.
                    {result.excludedUserCount > 0 && ` Skipped ${result.excludedUserCount} already-sent users.`}
                </div>
            )}

            <button type="submit" disabled={isPending || channels.length === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-4 text-sm font-bold text-black transition-colors hover:bg-white/90 disabled:opacity-40">
                <Send className="size-4" />
                {isPending ? "Sending campaign..." : retryOnlyMode ? `Retry ${allFailedUserIds.size} failed users` : `Send ${channelLabel || "campaign"} to ${selectedCount} users`}
            </button>
        </form>
    );
}

export function CampaignHistory({ history }: { history: CampaignHistoryItem[] }) {
    return (
        <aside className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-semibold text-white">Recent campaigns</h2>
            <div className="mt-4 space-y-3">
                {history.map((item) => (
                    <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-white">{item.name}</p>
                                <p className="mt-1 line-clamp-2 text-xs text-gray-400">{item.subject}</p>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${item.status === "sent" ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"}`}>
                                {item.status}
                            </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-400">
                            <span>{item.audience}</span>
                            <span className="text-right">{item.recipientCount} users</span>
                            <span>Email {item.emailSuccessCount}/{item.emailFailureCount}</span>
                            <span className="text-right">Push {item.pushSuccessCount}/{item.pushFailureCount}</span>
                        </div>
                        <p className="mt-2 text-[11px] text-gray-500">
                            {new Date(item.sentAt ?? item.createdAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                    </div>
                ))}
                {history.length === 0 && (
                    <p className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                        No campaigns sent yet.
                    </p>
                )}
            </div>
        </aside>
    );
}
