import type { CampaignBlock } from "@/db/schema";

export interface CampaignRecipientPersonalization {
    firstName?: string | null;
    email?: string | null;
    profileStatus?: string | null;
}

export interface CampaignEmailInput {
    subject: string;
    previewText?: string | null;
    blocks: CampaignBlock[];
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    recipient?: CampaignRecipientPersonalization | null;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.strathspace.com";
const DEFAULT_APP_STORE_URL = "https://apps.apple.com/ke/app/strathspace/id6757879443";
const DEFAULT_PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.strathspace.android";
const APP_STORE_BADGE_IMG = "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83";
const GOOGLE_PLAY_BADGE_IMG = "https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png";
const SUPPORT_PHONE = process.env.SUPPORT_WHATSAPP_NUMBER || "+254 714594 345";
const BRAND_PINK = "#e91e8c";
const BRAND_GREEN = "#34d399";

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function interpolate(value: string, recipient?: CampaignRecipientPersonalization | null) {
    const firstName = recipient?.firstName?.trim() || "there";
    return value
        .replaceAll("{{firstName}}", firstName)
        .replaceAll("{{email}}", recipient?.email ?? "")
        .replaceAll("{{profileStatus}}", recipient?.profileStatus ?? "profile setup")
        .replaceAll("{{supportPhone}}", SUPPORT_PHONE)
        .replaceAll("{{appUrl}}", APP_URL);
}

function richText(value: string, recipient?: CampaignRecipientPersonalization | null) {
    return escapeHtml(interpolate(value, recipient)).replace(/\n/g, "<br />");
}

function renderStoreBadges(label?: string, recipient?: CampaignRecipientPersonalization | null) {
    return `
        <div style="text-align:center;">
            ${label ? `<p style="margin:0 0 14px;color:#111827;font-size:15px;font-weight:900;">${richText(label, recipient)}</p>` : ""}
            <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                    <td style="padding:0 6px 10px;">
                        <a href="${DEFAULT_APP_STORE_URL}" style="display:inline-block;text-decoration:none;">
                            <img src="${APP_STORE_BADGE_IMG}" alt="Download on the App Store" width="150" style="display:block;width:150px;max-width:150px;height:auto;border:0;" />
                        </a>
                    </td>
                    <td style="padding:0 6px 10px;">
                        <a href="${DEFAULT_PLAY_STORE_URL}" style="display:inline-block;text-decoration:none;">
                            <img src="${GOOGLE_PLAY_BADGE_IMG}" alt="Get it on Google Play" width="170" style="display:block;width:170px;max-width:170px;height:auto;border:0;" />
                        </a>
                    </td>
                </tr>
            </table>
        </div>
    `;
}

function renderBlock(block: CampaignBlock, recipient?: CampaignRecipientPersonalization | null) {
    switch (block.type) {
        case "eyebrow":
            return `
                <p style="margin:0 0 14px;color:${BRAND_PINK};font-size:12px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;">
                    ${richText(block.text, recipient)}
                </p>
            `;
        case "hero":
            return `
                ${block.imageUrl ? `
                    <img src="${escapeHtml(interpolate(block.imageUrl, recipient))}" alt="" style="display:block;width:100%;max-height:320px;object-fit:cover;border-radius:28px;margin:0 0 26px;" />
                ` : ""}
                <h1 style="margin:0;color:#111827;font-size:40px;line-height:1.03;font-weight:900;letter-spacing:-1.2px;">
                    ${richText(block.heading, recipient)}
                </h1>
                <p style="margin:18px 0 0;color:#4b5563;font-size:18px;line-height:1.55;font-weight:500;">
                    ${richText(block.body, recipient)}
                </p>
            `;
        case "paragraph":
            return `
                <p style="margin:0;color:#374151;font-size:16px;line-height:1.7;">
                    ${richText(block.text, recipient)}
                </p>
            `;
        case "image":
            return `
                <figure style="margin:0;">
                    <img src="${escapeHtml(interpolate(block.imageUrl, recipient))}" alt="${escapeHtml(block.alt ?? "")}" style="display:block;width:100%;border-radius:24px;border:1px solid #f3f4f6;" />
                    ${block.caption ? `<figcaption style="margin-top:10px;color:#6b7280;font-size:13px;text-align:center;">${richText(block.caption, recipient)}</figcaption>` : ""}
                </figure>
            `;
        case "checklist":
            return `
                <div style="border:1px solid #f3d1e4;background:#fff7fb;border-radius:24px;padding:22px;">
                    ${block.title ? `<p style="margin:0 0 14px;color:#111827;font-size:16px;font-weight:800;">${richText(block.title, recipient)}</p>` : ""}
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        ${block.items.map((item) => `
                            <tr>
                                <td style="width:28px;padding:7px 0;vertical-align:top;">
                                    <span style="display:inline-block;width:20px;height:20px;border-radius:999px;background:${BRAND_GREEN};color:white;text-align:center;font-size:13px;line-height:20px;font-weight:900;">&#10003;</span>
                                </td>
                                <td style="padding:7px 0;color:#374151;font-size:15px;line-height:1.5;">${richText(item, recipient)}</td>
                            </tr>
                        `).join("")}
                    </table>
                </div>
            `;
        case "steps":
            return `
                <div style="border:1px solid #e5e7eb;border-radius:24px;padding:22px;">
                    ${block.title ? `<p style="margin:0 0 16px;color:#111827;font-size:16px;font-weight:800;">${richText(block.title, recipient)}</p>` : ""}
                    ${block.items.map((item, index) => `
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${index === block.items.length - 1 ? "" : "margin-bottom:14px;"}">
                            <tr>
                                <td style="width:38px;vertical-align:top;">
                                    <span style="display:inline-block;width:28px;height:28px;border-radius:999px;background:#111827;color:white;text-align:center;font-size:13px;line-height:28px;font-weight:800;">${index + 1}</span>
                                </td>
                                <td style="color:#374151;font-size:15px;line-height:1.55;">${richText(item, recipient)}</td>
                            </tr>
                        </table>
                    `).join("")}
                </div>
            `;
        case "callout": {
            const tone = block.tone === "success"
                ? { bg: "#ecfdf5", border: "#a7f3d0", color: "#065f46" }
                : block.tone === "warning"
                ? { bg: "#fffbeb", border: "#fde68a", color: "#92400e" }
                : { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af" };
            return `
                <div style="border:1px solid ${tone.border};background:${tone.bg};border-radius:22px;padding:18px;">
                    ${block.title ? `<p style="margin:0 0 6px;color:${tone.color};font-size:15px;font-weight:900;">${richText(block.title, recipient)}</p>` : ""}
                    <p style="margin:0;color:${tone.color};font-size:15px;line-height:1.6;">${richText(block.text, recipient)}</p>
                </div>
            `;
        }
        case "button":
            return renderStoreBadges(block.label, recipient);
        case "divider":
            return `<hr style="border:0;border-top:1px solid #f3f4f6;margin:0;" />`;
        case "signature":
            return `
                <div>
                    ${block.note ? `<p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.65;">${richText(block.note, recipient)}</p>` : ""}
                    <p style="margin:0;color:#111827;font-size:15px;font-weight:900;">${richText(block.name, recipient)}</p>
                    ${block.role ? `<p style="margin:3px 0 0;color:#6b7280;font-size:13px;">${richText(block.role, recipient)}</p>` : ""}
                </div>
            `;
        default:
            return "";
    }
}

export function renderCampaignEmailHtml(input: CampaignEmailInput) {
    const previewText = input.previewText
        ? richText(input.previewText, input.recipient)
        : "A note from StrathSpace";
    const body = input.blocks.map((block) => renderBlock(block, input.recipient)).join(`
        <div style="height:26px;line-height:26px;">&nbsp;</div>
    `);
    const hasCtaBlock = input.blocks.some((block) => block.type === "button");
    const fallbackCta = !hasCtaBlock && input.ctaUrl && input.ctaLabel
        ? renderStoreBadges(input.ctaLabel, input.recipient)
        : "";

    return `<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(interpolate(input.subject, input.recipient))}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${previewText}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;">
        <tr>
            <td align="center" style="padding:36px 14px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:660px;background:#ffffff;border-radius:34px;overflow:hidden;box-shadow:0 24px 80px rgba(17,24,39,0.10);">
                    <tr>
                        <td style="padding:28px 30px 0;">
                            <div style="font-size:18px;font-weight:900;color:#111827;letter-spacing:-0.2px;">StrathSpace</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 30px 34px;">
                            ${body}
                            ${fallbackCta ? `<div style="height:26px;line-height:26px;">&nbsp;</div>${fallbackCta}` : ""}
                        </td>
                    </tr>
                </table>
                <p style="max-width:620px;margin:18px auto 0;color:#8b95a1;font-size:12px;line-height:1.6;text-align:center;">
                    You are receiving this because you signed up for StrathSpace. If you got stuck, reply to this email or message us on WhatsApp at ${escapeHtml(SUPPORT_PHONE)}.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export function buildDefaultProfileReminderBlocks(): CampaignBlock[] {
    return [
        {
            id: "eyebrow-1",
            type: "eyebrow",
            text: "Finish your StrathSpace profile",
        },
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
            title: "Got stuck?",
            text: "If something failed or the app got confusing, message us on WhatsApp at {{supportPhone}} and we will help you finish setup.",
        },
        {
            id: "button-1",
            type: "button",
            label: "Open StrathSpace",
            href: DEFAULT_APP_STORE_URL,
        },
        {
            id: "signature-1",
            type: "signature",
            name: "The StrathSpace Team",
            role: "Real profiles. Safer campus dating.",
        },
    ];
}
