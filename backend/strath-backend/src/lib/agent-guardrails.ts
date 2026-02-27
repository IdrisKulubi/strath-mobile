export type GuardrailCode =
    | "empty"
    | "too_short"
    | "gibberish"
    | "prompt_injection"
    | "out_of_scope";

export interface GuardrailDecision {
    allowed: boolean;
    code?: GuardrailCode;
    normalizedQuery: string;
    userMessage?: string;
}

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
    /system\s+prompt/i,
    /developer\s+mode/i,
    /jailbreak/i,
    /reveal\s+(your\s+)?(prompt|instructions|rules)/i,
    /show\s+me\s+your\s+(prompt|chain[- ]of[- ]thought)/i,
    /(api\s*key|access\s*token|secret|password)/i,
    /(drop\s+table|select\s+\*\s+from|union\s+select)/i,
    /<script|javascript:/i,
];

const TECH_OR_OFFTOPIC_PATTERNS: RegExp[] = [
    /\b(code|debug|compile|deploy|backend|server|database|sql|javascript|python|typescript|aws|azure|linux|windows|hack|exploit|phish|malware)\b/i,
    /\b(stock|crypto|bitcoin|forex|bet|casino|lottery|trading)\b/i,
    /\b(homework|exam\s+answers?|assignment\s+solutions?)\b/i,
    /https?:\/\//i,
];

const DATING_CONTEXT_HINTS: RegExp[] = [
    /\b(match|dating|date|relationship|partner|girlfriend|boyfriend|campus\b|strathmore|student)\b/i,
    /\b(looking\s+for|someone\s+who|person\s+who|vibe|chemistry|connection)\b/i,
    /\b(funny|kind|ambitious|creative|sporty|introvert|extrovert|music|movies|study|faith|fitness)\b/i,
];

const HELP_MESSAGE =
    "I can’t process that right now. I can only help with campus match requests. Try something like: ‘someone funny, ambitious, and into music’.";

export function evaluateAgentQueryGuardrails(input: string): GuardrailDecision {
    const normalizedQuery = normalizeQuery(input);

    if (!normalizedQuery) {
        return {
            allowed: false,
            code: "empty",
            normalizedQuery,
            userMessage: HELP_MESSAGE,
        };
    }

    if (normalizedQuery.length < 3) {
        return {
            allowed: false,
            code: "too_short",
            normalizedQuery,
            userMessage: HELP_MESSAGE,
        };
    }

    if (isLikelyGibberish(normalizedQuery)) {
        return {
            allowed: false,
            code: "gibberish",
            normalizedQuery,
            userMessage: HELP_MESSAGE,
        };
    }

    if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(normalizedQuery))) {
        return {
            allowed: false,
            code: "prompt_injection",
            normalizedQuery,
            userMessage: HELP_MESSAGE,
        };
    }

    const hasOfftopicSignals = TECH_OR_OFFTOPIC_PATTERNS.some((pattern) => pattern.test(normalizedQuery));
    const hasDatingSignals = DATING_CONTEXT_HINTS.some((pattern) => pattern.test(normalizedQuery));
    if (hasOfftopicSignals && !hasDatingSignals) {
        return {
            allowed: false,
            code: "out_of_scope",
            normalizedQuery,
            userMessage: HELP_MESSAGE,
        };
    }

    return {
        allowed: true,
        normalizedQuery,
    };
}

function normalizeQuery(input: string): string {
    return input
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function isLikelyGibberish(text: string): boolean {
    if (/^(.)\1{6,}$/.test(text)) return true;

    const letters = (text.match(/[a-z]/gi) || []).length;
    const digits = (text.match(/\d/g) || []).length;
    const symbols = (text.match(/[^a-z0-9\s]/gi) || []).length;
    const total = text.length;

    if (total === 0) return true;
    const alphaRatio = letters / total;
    const noisyRatio = (digits + symbols) / total;

    return alphaRatio < 0.25 || noisyRatio > 0.65;
}
