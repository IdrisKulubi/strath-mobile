import { generateText } from "../lib/gemini";
import type { Profile } from "../db/schema";

// ============================================
// PROFILE SUMMARIZER SERVICE
// ============================================
// Takes structured profile data and generates a natural language
// personality summary suitable for embedding.
//
// This summary is the foundation of semantic matching —
// it captures WHO someone is, not just their data fields.

/**
 * Generate a natural language personality summary from profile data.
 * 
 * Example output:
 * "Third-year female student studying Computer Science at Strathmore. 
 *  Introverted but social with close friends. Loves fitness and reading, 
 *  avoids nightlife. Values loyalty and deep conversations. Calm, focused energy."
 * 
 * Cost: ~$0.00003 per profile (Gemini Flash Lite)
 * Latency: ~400ms
 */
export async function generateProfileSummary(profile: Partial<Profile>): Promise<string> {
    const profileData = buildProfileContext(profile);
    
    const prompt = `You are a profile summarizer for a university dating app.
Given the following profile data, write a concise 2-3 sentence personality summary 
that captures who this person is, their vibe, and what they value.

Rules:
- Be natural and human-sounding, like describing a friend
- Focus on personality, lifestyle, and energy — not just listing facts
- Include their year of study and university if available
- Mention notable interests or lifestyle traits
- Do NOT use bullet points, headers, or formatting
- Do NOT mention their name
- Keep it under 100 words

Profile data:
${profileData}

Personality summary:`;

    try {
        const summary = await generateText(prompt);
        return summary;
    } catch (error) {
        console.error("[ProfileSummarizer] Error generating summary:", error);
        // Fallback: Build a basic summary from structured data
        return buildFallbackSummary(profile);
    }
}

/**
 * Build a structured text representation of profile data for the LLM prompt.
 */
function buildProfileContext(profile: Partial<Profile>): string {
    const parts: string[] = [];
    
    if (profile.age) parts.push(`Age: ${profile.age}`);
    if (profile.gender) parts.push(`Gender: ${profile.gender}`);
    if (profile.yearOfStudy) parts.push(`Year of study: ${profile.yearOfStudy}`);
    if (profile.university) parts.push(`University: ${profile.university}`);
    if (profile.course) parts.push(`Course: ${profile.course}`);
    if (profile.bio) parts.push(`Bio: ${profile.bio}`);
    if (profile.aboutMe) parts.push(`About me: ${profile.aboutMe}`);
    if (profile.lookingFor) parts.push(`Looking for: ${profile.lookingFor}`);
    
    // Interests
    if (profile.interests && profile.interests.length > 0) {
        parts.push(`Interests: ${profile.interests.join(", ")}`);
    }
    
    // Qualities they value
    if (profile.qualities && profile.qualities.length > 0) {
        parts.push(`Values in others: ${profile.qualities.join(", ")}`);
    }
    
    // Lifestyle
    if (profile.workoutFrequency) parts.push(`Workout: ${profile.workoutFrequency}`);
    if (profile.drinkingPreference) parts.push(`Drinking: ${profile.drinkingPreference}`);
    if (profile.smoking) parts.push(`Smoking: ${profile.smoking}`);
    if (profile.sleepingHabits) parts.push(`Sleep: ${profile.sleepingHabits}`);
    if (profile.socialMediaUsage) parts.push(`Social media: ${profile.socialMediaUsage}`);
    
    // Personality indicators
    if (profile.personalityType) parts.push(`Personality: ${profile.personalityType}`);
    if (profile.communicationStyle) parts.push(`Communication: ${profile.communicationStyle}`);
    if (profile.loveLanguage) parts.push(`Love language: ${profile.loveLanguage}`);
    if (profile.religion) parts.push(`Religion: ${profile.religion}`);
    if (profile.politics) parts.push(`Politics: ${profile.politics}`);
    
    // Prompt responses (rich personality data)
    if (profile.prompts && profile.prompts.length > 0) {
        const promptTexts = profile.prompts
            .map(p => `Q: ${p.promptId} → "${p.response}"`)
            .join("\n");
        parts.push(`Prompt responses:\n${promptTexts}`);
    }
    
    // Languages
    if (profile.languages && profile.languages.length > 0) {
        parts.push(`Languages: ${profile.languages.join(", ")}`);
    }
    
    return parts.join("\n");
}

/**
 * Fallback summary when LLM is unavailable.
 * Uses structured data to build a basic human-readable summary.
 */
function buildFallbackSummary(profile: Partial<Profile>): string {
    const parts: string[] = [];
    
    // Opening
    const year = profile.yearOfStudy ? `Year ${profile.yearOfStudy}` : "";
    const uni = profile.university || "";
    const course = profile.course || "";
    
    if (year || uni) {
        parts.push(`${year} ${course} student${uni ? ` at ${uni}` : ""}.`.trim());
    }
    
    // Interests
    if (profile.interests && profile.interests.length > 0) {
        const top3 = profile.interests.slice(0, 3);
        parts.push(`Enjoys ${top3.join(", ")}.`);
    }
    
    // Bio/about
    if (profile.aboutMe) {
        parts.push(profile.aboutMe.slice(0, 100));
    } else if (profile.bio) {
        parts.push(profile.bio.slice(0, 100));
    }
    
    return parts.join(" ") || "University student with an incomplete profile.";
}
