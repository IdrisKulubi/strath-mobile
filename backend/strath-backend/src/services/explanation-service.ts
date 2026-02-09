import { generateText } from "../lib/gemini";
import type { RankedCandidate } from "./ranking-service";
import type { ParsedIntent } from "./intent-parser";

// ============================================
// EXPLANATION SERVICE
// ============================================
// Generates natural, Gen Z-friendly match explanations and
// conversation starters using Gemini Flash.
//
// Two modes:
// 1. Quick reasons (rule-based, ~0ms) — used for match cards
// 2. Rich explanations (Gemini, ~400ms) — used for detailed view
//
// Cost: ~$0.00005 per explanation (Gemini Flash)

export interface MatchExplanation {
    /** Short tagline (e.g., "Your creative soulmate") */
    tagline: string;
    /** 1-2 sentence explanation */
    summary: string;
    /** Conversation starters tailored to what they have in common */
    conversationStarters: string[];
    /** Emoji that represents the match vibe */
    vibeEmoji: string;
    /** Match percentage (from ranking score) */
    matchPercentage: number;
}

/**
 * Generate quick explanations for a batch of matches.
 * Uses rule-based logic for speed. Falls back to the ranking
 * service's matchReasons.
 */
export function generateQuickExplanations(
    candidates: RankedCandidate[],
    intent: ParsedIntent,
): MatchExplanation[] {
    return candidates.map(candidate => ({
        tagline: generateTagline(candidate, intent),
        summary: candidate.matchReasons.slice(0, 2).join(". ") + ".",
        conversationStarters: generateQuickStarters(candidate, intent),
        vibeEmoji: pickVibeEmoji(intent.vibe, candidate.scores.total),
        matchPercentage: candidate.scores.total,
    }));
}

/**
 * Generate a rich, AI-powered explanation for a single match.
 * Used when the user taps "Why this match?" on a profile card.
 */
export async function generateRichExplanation(
    candidate: RankedCandidate,
    intent: ParsedIntent,
    userName: string,
): Promise<MatchExplanation> {
    const profile = candidate.profile;

    const prompt = `You're a Gen Z dating app AI wingman. Generate a match explanation.

SEARCHER: ${userName}
SEARCHED FOR: "${intent.semanticQuery}"
VIBE: ${intent.vibe}

MATCH PROFILE:
- Name: ${profile.firstName}
- Age: ${profile.age || "?"}
- Course: ${profile.course || "?"}
- Year: ${profile.yearOfStudy || "?"}
- Interests: ${(profile.interests || []).join(", ") || "not listed"}
- About: ${profile.aboutMe || profile.bio || "not listed"}
- Personality: ${profile.personalitySummary || "not available"}
- Communication: ${profile.communicationStyle || "?"}
- Looking for: ${profile.lookingFor || "?"}

MATCH SCORE: ${candidate.scores.total}/100
VECTOR SIMILARITY: ${(candidate.scores.vector * 100).toFixed(0)}%
MATCH REASONS: ${candidate.matchReasons.join("; ")}

Generate JSON with EXACTLY these fields:
{
    "tagline": "A very short, catchy tagline (max 6 words, no cringe)",
    "summary": "1-2 sentences explaining why they're a good match. Be specific, reference actual profile details. Gen Z tone — warm, casual, not corporate.",
    "starters": ["3 conversation starters that reference specific shared interests or their profile details. Make them fun and easy to respond to. No generic 'hey what's up'."],
    "emoji": "Single emoji that captures the match vibe"
}

IMPORTANT: Be genuine, not forced. Reference REAL details from their profile.`;

    try {
        const response = await generateText(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                tagline: parsed.tagline || generateTagline(candidate, intent),
                summary: parsed.summary || candidate.matchReasons.join(". "),
                conversationStarters: parsed.starters || generateQuickStarters(candidate, intent),
                vibeEmoji: parsed.emoji || pickVibeEmoji(intent.vibe, candidate.scores.total),
                matchPercentage: candidate.scores.total,
            };
        }
    } catch (error) {
        console.error("[ExplanationService] Rich explanation failed:", error);
    }

    // Fallback to quick explanation
    return {
        tagline: generateTagline(candidate, intent),
        summary: candidate.matchReasons.join(". ") + ".",
        conversationStarters: generateQuickStarters(candidate, intent),
        vibeEmoji: pickVibeEmoji(intent.vibe, candidate.scores.total),
        matchPercentage: candidate.scores.total,
    };
}

/**
 * Generate a wingman-style commentary for the overall result set.
 * Shown above the match cards (e.g., "Found 12 matches — here's your vibe tribe 🎯")
 */
export async function generateResultCommentary(
    totalResults: number,
    intent: ParsedIntent,
    topCandidate?: RankedCandidate,
): Promise<string> {
    if (totalResults === 0) {
        const noResultMessages = [
            "Hmm, couldn't find anyone matching that vibe rn. Try something different? 🤔",
            "No matches for that search — try broadening your vibe a bit! 🔄",
            "Campus is quiet on that front. Wanna try a different vibe? ✨",
        ];
        return noResultMessages[Math.floor(Math.random() * noResultMessages.length)];
    }

    if (totalResults <= 3) {
        return `Found ${totalResults} ${totalResults === 1 ? "person" : "people"} matching your vibe. Quality over quantity 💎`;
    }

    const vibeWords: Record<string, string> = {
        chill: "chill souls",
        adventurous: "adventure seekers",
        intellectual: "big brain matches",
        social: "social butterflies",
        creative: "creative spirits",
        romantic: "hopeless romantics",
        ambitious: "goal-getters",
        any: "matches",
    };

    const vibeWord = vibeWords[intent.vibe] || "matches";
    const topScore = topCandidate ? `Top match: ${topCandidate.scores.total}% 🎯` : "";

    return `Found ${totalResults} ${vibeWord} for you. ${topScore}`;
}

// ===== PRIVATE HELPERS =====

function generateTagline(candidate: RankedCandidate, intent: ParsedIntent): string {
    const score = candidate.scores.total;
    const profile = candidate.profile;

    if (score >= 80) {
        const highMatchTags = [
            `Your ${intent.vibe} match`,
            `This one's special`,
            `Strong connection potential`,
            `Wingman approved 💯`,
        ];
        return highMatchTags[Math.floor(Math.random() * highMatchTags.length)];
    }

    if (score >= 60) {
        if (profile.course) return `${profile.course} student`;
        return `Worth checking out`;
    }

    return `Discovered for you`;
}

function generateQuickStarters(candidate: RankedCandidate, intent: ParsedIntent): string[] {
    const starters: string[] = [];
    const profile = candidate.profile;

    // Interest-based starter
    const sharedInterests = (intent.preferences.interests || []).filter(i =>
        (profile.interests || []).some(pi => pi.toLowerCase().includes(i.toLowerCase()))
    );
    if (sharedInterests.length > 0) {
        starters.push(`I see you're into ${sharedInterests[0]} — what got you started?`);
    }

    // Course-based starter
    if (profile.course) {
        starters.push(`How's ${profile.course} treating you this semester?`);
    }

    // Prompt-based starter
    if (profile.prompts && profile.prompts.length > 0) {
        const p = profile.prompts[0];
        starters.push(`Loved your answer about "${p.response.substring(0, 40)}..." — tell me more!`);
    }

    // Personality-based starter
    if (profile.personalityType) {
        starters.push(`Fellow campus personality — are you really a ${profile.personalityType}?`);
    }

    // Generic but fun fallback
    if (starters.length === 0) {
        starters.push(
            "What's one thing about campus that surprised you?",
            "Hot take — best food spot on campus?",
        );
    }

    return starters.slice(0, 3);
}

function pickVibeEmoji(vibe: string, score: number): string {
    if (score >= 85) return "🔥";
    if (score >= 70) return "✨";

    const vibeEmojis: Record<string, string> = {
        chill: "😌",
        adventurous: "🏄",
        intellectual: "🧠",
        social: "🎉",
        creative: "🎨",
        romantic: "💕",
        ambitious: "🚀",
        any: "💫",
    };

    return vibeEmojis[vibe] || "💫";
}
