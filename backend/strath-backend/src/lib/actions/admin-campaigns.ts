"use server";

import { adminCampaignRecipients, adminCampaigns, profiles, type CampaignBlock, user } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";
import { renderCampaignEmailHtml } from "@/lib/services/admin-campaign-email";
import { and, count, desc, eq, inArray, isNotNull, isNull, notInArray, sql } from "drizzle-orm";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { revalidatePath } from "next/cache";

export type CampaignAudience =
    | "everyone"
    | "no_profile"
    | "profile_incomplete"
    | "needs_verification"
    | "verification_issues"
    | "waitlisted"
    | "admitted"
    | "push_enabled";

export type CampaignChannel = "email" | "push";

export type CampaignRecipientPreview = {
    userId: string;
    name: string;
    firstName: string;
    email: string;
    pushToken: string | null;
    phoneNumber: string | null;
    profilePhoto: string | null;
    profilePhotos: string[];
    profileStatus: string;
    faceVerificationStatus: string | null;
    waitlistStatus: string | null;
    createdAt: string;
    lastActive: string;
    hasPush: boolean;
    emailStatus: "none" | "sent" | "failed";
    pushStatus: "none" | "sent" | "failed";
    lastCampaignSentAt: string | null;
};

type CampaignRecipient = CampaignRecipientPreview & {
    createdAtDate: Date;
    lastActiveDate: Date;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_RESEND_FROM_EMAIL = "hello@strathspace.com";
const RESEND_FROM_NAME = "StrathSpace Team";

function audienceWhereClause(audience: CampaignAudience) {
    switch (audience) {
        case "no_profile":
            return isNull(profiles.id);
        case "profile_incomplete":
            return sql`${profiles.id} is not null and coalesce(${profiles.profileCompleted}, false) = false and coalesce(${profiles.isComplete}, false) = false`;
        case "needs_verification":
            return sql`${profiles.id} is not null and (coalesce(${profiles.profileCompleted}, false) = true or coalesce(${profiles.isComplete}, false) = true) and ${profiles.faceVerificationStatus} in ('not_started', 'pending_capture', 'retry_required', 'manual_review', 'failed')`;
        case "verification_issues":
            return sql`${profiles.faceVerificationStatus} in ('retry_required', 'manual_review', 'failed', 'blocked')`;
        case "waitlisted":
            return eq(profiles.waitlistStatus, "waitlisted");
        case "admitted":
            return eq(profiles.waitlistStatus, "admitted");
        case "push_enabled":
            return isNotNull(user.pushToken);
        case "everyone":
        default:
            return undefined;
    }
}

function combineConditions(audience: CampaignAudience, selectedUserIds?: string[], excludeUserIds?: string[]) {
    const conditions = [isNull(user.deletedAt)];
    const audienceCondition = audienceWhereClause(audience);
    if (audienceCondition) conditions.push(audienceCondition);
    if (selectedUserIds?.length) conditions.push(inArray(user.id, selectedUserIds));
    if (excludeUserIds?.length) conditions.push(notInArray(user.id, excludeUserIds));
    return and(...conditions);
}

function parseJson<T>(value: FormDataEntryValue | null, fallback: T): T {
    if (typeof value !== "string" || value.trim().length === 0) return fallback;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}

function firstNameFrom(name: string | null | undefined, fallbackEmail: string) {
    const trimmed = name?.trim();
    if (trimmed) return trimmed.split(/\s+/)[0] ?? trimmed;
    return fallbackEmail.split("@")[0] ?? "there";
}

function profileStatusFor(row: {
    profileId: string | null;
    profileCompleted: boolean | null;
    isComplete: boolean | null;
    faceVerificationStatus: string | null;
    waitlistStatus: string | null;
}) {
    if (!row.profileId) return "No profile yet";
    if (row.faceVerificationStatus && ["retry_required", "manual_review", "failed", "blocked"].includes(row.faceVerificationStatus)) {
        return `Verification ${row.faceVerificationStatus.replaceAll("_", " ")}`;
    }
    if (row.profileCompleted || row.isComplete) return row.waitlistStatus ? `Profile complete - ${row.waitlistStatus}` : "Profile complete";
    return "Profile incomplete";
}

async function fetchCampaignRecipients(
    audience: CampaignAudience,
    selectedUserIds?: string[],
    excludeUserIds?: string[],
    limit = 1000,
): Promise<CampaignRecipient[]> {
    const rows = await db
        .select({
            userId: user.id,
            name: user.name,
            email: user.email,
            pushToken: user.pushToken,
            userPhoneNumber: user.phoneNumber,
            userProfilePhoto: user.profilePhoto,
            userImage: user.image,
            createdAt: user.createdAt,
            lastActive: user.lastActive,
            profileId: profiles.id,
            profileFirstName: profiles.firstName,
            profilePhoneNumber: profiles.phoneNumber,
            profilePhoto: profiles.profilePhoto,
            profilePhotos: profiles.photos,
            profileCompleted: profiles.profileCompleted,
            isComplete: profiles.isComplete,
            faceVerificationStatus: profiles.faceVerificationStatus,
            waitlistStatus: profiles.waitlistStatus,
        })
        .from(user)
        .leftJoin(profiles, eq(profiles.userId, user.id))
        .where(combineConditions(audience, selectedUserIds, excludeUserIds))
        .orderBy(desc(user.createdAt))
        .limit(limit);

    const userIds = rows.map((row) => row.userId);
    const deliveryRows = userIds.length > 0
        ? await db
            .select({
                userId: adminCampaignRecipients.userId,
                emailStatus: adminCampaignRecipients.emailStatus,
                pushStatus: adminCampaignRecipients.pushStatus,
                sentAt: adminCampaignRecipients.sentAt,
            })
            .from(adminCampaignRecipients)
            .where(inArray(adminCampaignRecipients.userId, userIds))
            .orderBy(desc(adminCampaignRecipients.sentAt))
        : [];

    const deliveryByUser = new Map<string, {
        emailStatus: "none" | "sent" | "failed";
        pushStatus: "none" | "sent" | "failed";
        lastCampaignSentAt: string | null;
    }>();

    for (const row of deliveryRows) {
        const current = deliveryByUser.get(row.userId) ?? {
            emailStatus: "none" as const,
            pushStatus: "none" as const,
            lastCampaignSentAt: row.sentAt.toISOString(),
        };

        if (!current.lastCampaignSentAt) current.lastCampaignSentAt = row.sentAt.toISOString();
        if (row.emailStatus === "sent") current.emailStatus = "sent";
        else if (row.emailStatus === "failed" && current.emailStatus !== "sent") current.emailStatus = "failed";

        if (row.pushStatus === "sent") current.pushStatus = "sent";
        else if (row.pushStatus === "failed" && current.pushStatus !== "sent") current.pushStatus = "failed";

        deliveryByUser.set(row.userId, current);
    }

    return rows.map((row) => {
        const firstName = row.profileFirstName?.trim() || firstNameFrom(row.name, row.email);
        const profilePhotos = Array.isArray(row.profilePhotos) ? row.profilePhotos.filter(Boolean) : [];
        const delivery = deliveryByUser.get(row.userId);
        return {
            userId: row.userId,
            name: row.name,
            firstName,
            email: row.email,
            pushToken: row.pushToken,
            phoneNumber: row.profilePhoneNumber ?? row.userPhoneNumber,
            profilePhoto: row.profilePhoto ?? row.userProfilePhoto ?? row.userImage,
            profilePhotos,
            profileStatus: profileStatusFor(row),
            faceVerificationStatus: row.faceVerificationStatus,
            waitlistStatus: row.waitlistStatus,
            createdAt: row.createdAt.toISOString(),
            lastActive: row.lastActive.toISOString(),
            createdAtDate: row.createdAt,
            lastActiveDate: row.lastActive,
            hasPush: typeof row.pushToken === "string" && Expo.isExpoPushToken(row.pushToken),
            emailStatus: delivery?.emailStatus ?? "none",
            pushStatus: delivery?.pushStatus ?? "none",
            lastCampaignSentAt: delivery?.lastCampaignSentAt ?? null,
        };
    });
}

function publicRecipient(recipient: CampaignRecipient): CampaignRecipientPreview {
    const { createdAtDate, lastActiveDate, ...rest } = recipient;
    void createdAtDate;
    void lastActiveDate;
    return rest;
}

function personalize(value: string, recipient: CampaignRecipient) {
    return value
        .replaceAll("{{firstName}}", recipient.firstName || "there")
        .replaceAll("{{name}}", recipient.name || recipient.firstName || "there")
        .replaceAll("{{email}}", recipient.email)
        .replaceAll("{{profileStatus}}", recipient.profileStatus);
}

async function sendResendEmail(input: {
    to: string;
    subject: string;
    html: string;
}) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error("RESEND_API_KEY is not set");
    }

    const configuredFrom = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_RESEND_FROM_EMAIL;
    const emailMatch = configuredFrom.match(/<([^<>@\s]+@[^<>\s]+)>/) ?? configuredFrom.match(/([^<>,\s]+@[^<>,\s]+)/);
    const fromAddress = emailMatch?.[1] ?? DEFAULT_RESEND_FROM_EMAIL;
    const from = `${RESEND_FROM_NAME} <${fromAddress}>`;
    const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from,
            to: input.to,
            subject: input.subject,
            html: input.html,
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Resend failed (${response.status}): ${text}`);
    }
}

function campaignFromForm(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();
    const previewText = String(formData.get("previewText") ?? "").trim();
    const audience = String(formData.get("audience") ?? "no_profile") as CampaignAudience;
    const pushTitle = String(formData.get("pushTitle") ?? "").trim();
    const pushBody = String(formData.get("pushBody") ?? "").trim();
    const ctaUrl = String(formData.get("ctaUrl") ?? "").trim();
    const ctaLabel = String(formData.get("ctaLabel") ?? "").trim();
    const channels = parseJson<CampaignChannel[]>(formData.get("channels"), ["email"]);
    const blocks = parseJson<CampaignBlock[]>(formData.get("contentBlocks"), []);
    const selectedUserIds = parseJson<string[]>(formData.get("selectedUserIds"), []);
    const excludeUserIds = parseJson<string[]>(formData.get("excludeUserIds"), []);

    return {
        name,
        subject,
        previewText,
        audience,
        pushTitle,
        pushBody,
        ctaUrl,
        ctaLabel,
        channels: channels.filter((channel): channel is CampaignChannel => channel === "email" || channel === "push"),
        blocks,
        selectedUserIds: selectedUserIds.filter(Boolean),
        excludeUserIds: excludeUserIds.filter(Boolean),
    };
}

export async function getAdminCampaignAudienceCount(audience: CampaignAudience) {
    await requireAdmin();

    const [{ total }] = await db
        .select({ total: count() })
        .from(user)
        .leftJoin(profiles, eq(profiles.userId, user.id))
        .where(combineConditions(audience));

    const [{ push }] = await db
        .select({ push: count() })
        .from(user)
        .leftJoin(profiles, eq(profiles.userId, user.id))
        .where(and(combineConditions(audience), isNotNull(user.pushToken)));

    return {
        total,
        email: total,
        push,
    };
}

export async function getAdminCampaignRecipients(audience: CampaignAudience, limit = 250) {
    await requireAdmin();
    const recipients = await fetchCampaignRecipients(audience, undefined, undefined, limit);
    return recipients.map(publicRecipient);
}

export async function previewAdminCampaign(formData: FormData) {
    await requireAdmin();
    const campaign = campaignFromForm(formData);
    const sampleRecipient: CampaignRecipient = {
        userId: "preview",
        name: "Maria Kamau",
        firstName: "Maria",
        email: "maria@example.com",
        pushToken: null,
        phoneNumber: null,
        profilePhoto: null,
        profilePhotos: [],
        profileStatus: "No profile yet",
        faceVerificationStatus: null,
        waitlistStatus: null,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        createdAtDate: new Date(),
        lastActiveDate: new Date(),
        hasPush: false,
        emailStatus: "none",
        pushStatus: "none",
        lastCampaignSentAt: null,
    };

    return {
        subject: personalize(campaign.subject || "Finish your StrathSpace profile", sampleRecipient),
        html: renderCampaignEmailHtml({
            subject: campaign.subject || "Finish your StrathSpace profile",
            previewText: campaign.previewText,
            blocks: campaign.blocks,
            ctaLabel: campaign.ctaLabel,
            ctaUrl: campaign.ctaUrl,
            recipient: sampleRecipient,
        }),
    };
}

export async function sendAdminCampaign(formData: FormData) {
    const session = await requireAdmin();
    const campaign = campaignFromForm(formData);

    if (!campaign.name) throw new Error("Campaign name is required");
    if (!campaign.channels.length) throw new Error("Choose email, push, or both");
    if (campaign.channels.includes("email")) {
        if (!campaign.subject) throw new Error("Email subject is required");
        if (!campaign.blocks.length) throw new Error("Add at least one email block");
        if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
    }
    if (campaign.channels.includes("push")) {
        if (!campaign.pushTitle) throw new Error("Push title is required");
        if (!campaign.pushBody) throw new Error("Push body is required");
    }

    const recipients = await fetchCampaignRecipients(
        campaign.audience,
        campaign.selectedUserIds.length > 0 ? campaign.selectedUserIds : undefined,
        campaign.excludeUserIds.length > 0 ? campaign.excludeUserIds : undefined,
        5000,
    );
    const sendableRecipients = recipients;

    if (sendableRecipients.length === 0) {
        throw new Error("No recipients match this campaign");
    }

    const [createdCampaign] = await db
        .insert(adminCampaigns)
        .values({
            name: campaign.name,
            subject: campaign.subject,
            previewText: campaign.previewText || null,
            audience: campaign.audience,
            channels: campaign.channels,
            contentBlocks: campaign.blocks,
            pushTitle: campaign.pushTitle || null,
            pushBody: campaign.pushBody || null,
            ctaUrl: campaign.ctaUrl || null,
            ctaLabel: campaign.ctaLabel || null,
            recipientCount: sendableRecipients.length,
            sentByUserId: session.user.id,
            status: "sent",
            sentAt: new Date(),
        })
        .returning({ id: adminCampaigns.id });

    let emailSuccessCount = 0;
    let emailFailureCount = 0;
    let pushSuccessCount = 0;
    let pushFailureCount = 0;

    const recipientRows = [];
    const outcomes: {
        userId: string;
        emailStatus: "skipped" | "sent" | "failed";
        pushStatus: "skipped" | "sent" | "failed";
        error: string | null;
    }[] = [];

    for (const recipient of sendableRecipients) {
        let emailStatus: "skipped" | "sent" | "failed" = "skipped";
        let pushStatus: "skipped" | "sent" | "failed" = "skipped";
        const errors: string[] = [];

        if (campaign.channels.includes("email")) {
            try {
                await sendResendEmail({
                    to: recipient.email,
                    subject: personalize(campaign.subject, recipient),
                    html: renderCampaignEmailHtml({
                        subject: campaign.subject,
                        previewText: campaign.previewText,
                        blocks: campaign.blocks,
                        ctaLabel: campaign.ctaLabel,
                        ctaUrl: campaign.ctaUrl,
                        recipient,
                    }),
                });
                emailStatus = "sent";
                emailSuccessCount += 1;
            } catch (err) {
                emailStatus = "failed";
                emailFailureCount += 1;
                errors.push(err instanceof Error ? err.message : "Email failed");
            }
        }

        if (campaign.channels.includes("push")) {
            if (!recipient.pushToken || !Expo.isExpoPushToken(recipient.pushToken)) {
                pushStatus = "skipped";
            } else {
                try {
                    const expo = new Expo();
                    const message: ExpoPushMessage = {
                        to: recipient.pushToken,
                        title: personalize(campaign.pushTitle, recipient),
                        body: personalize(campaign.pushBody, recipient),
                        sound: "default",
                        priority: "high",
                        data: {
                            type: NOTIFICATION_TYPES.ADMIN_ANNOUNCEMENT,
                            campaignId: createdCampaign.id,
                            url: campaign.ctaUrl || undefined,
                        },
                    };
                    const [ticket] = await expo.sendPushNotificationsAsync([message]);
                    if (ticket?.status === "ok") {
                        pushStatus = "sent";
                        pushSuccessCount += 1;
                    } else {
                        pushStatus = "failed";
                        pushFailureCount += 1;
                        errors.push("Expo push ticket failed");
                    }
                } catch (err) {
                    pushStatus = "failed";
                    pushFailureCount += 1;
                    errors.push(err instanceof Error ? err.message : "Push failed");
                }
            }
        }

        recipientRows.push({
            campaignId: createdCampaign.id,
            userId: recipient.userId,
            email: recipient.email,
            pushToken: recipient.pushToken,
            emailStatus,
            pushStatus,
            error: errors.join(" | ") || null,
        });
        outcomes.push({
            userId: recipient.userId,
            emailStatus,
            pushStatus,
            error: errors.join(" | ") || null,
        });
    }

    if (recipientRows.length) {
        await db.insert(adminCampaignRecipients).values(recipientRows);
    }

    await db
        .update(adminCampaigns)
        .set({
            emailSuccessCount,
            emailFailureCount,
            pushSuccessCount,
            pushFailureCount,
            status: emailFailureCount + pushFailureCount > 0 ? "failed" : "sent",
        })
        .where(eq(adminCampaigns.id, createdCampaign.id));

    revalidatePath("/admin/campaigns");

    return {
        campaignId: createdCampaign.id,
        recipientCount: sendableRecipients.length,
        emailSuccessCount,
        emailFailureCount,
        pushSuccessCount,
        pushFailureCount,
        outcomes,
        sentUserIds: outcomes
            .filter((outcome) => outcome.emailStatus === "sent" || outcome.pushStatus === "sent")
            .map((outcome) => outcome.userId),
        failedUserIds: outcomes
            .filter((outcome) => outcome.emailStatus === "failed" || outcome.pushStatus === "failed")
            .map((outcome) => outcome.userId),
        excludedUserCount: campaign.excludeUserIds.length,
        skippedAlreadySentCount: campaign.excludeUserIds.length,
    };
}

export async function getAdminCampaignHistory(limit = 30) {
    await requireAdmin();

    const rows = await db
        .select()
        .from(adminCampaigns)
        .orderBy(desc(adminCampaigns.createdAt))
        .limit(limit);

    return rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        sentAt: row.sentAt?.toISOString() ?? null,
    }));
}
