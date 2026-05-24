/**
 * Turn backend match-reason strings into short, human labels for UI.
 */

function capitalize(word: string) {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
}

export function humanizeMatchReason(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return trimmed;

    const sharedInterest = trimmed.match(/^Shared interest in (.+)$/i);
    if (sharedInterest) return capitalize(sharedInterest[1]);

    const sharedInterests = trimmed.match(/^Shared interests:\s*(.+)$/i);
    if (sharedInterests) {
        const first = sharedInterests[1].split(',')[0]?.trim();
        return first ? capitalize(first) : 'Shared interests';
    }

    const bothValue = trimmed.match(/^Both value (.+)$/i);
    if (bothValue) return bothValue[1].toLowerCase();

    const bothSpeak = trimmed.match(/^Both speak (.+)$/i);
    if (bothSpeak) return capitalize(bothSpeak[1]);

    if (/^similar vibe$/i.test(trimmed)) return 'Similar energy';

    if (/^good fit for your vibe$/i.test(trimmed)) return 'Similar vibe';

    return trimmed;
}

function joinNaturalList(items: string[]): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    const last = items[items.length - 1];
    const rest = items.slice(0, -1).join(', ');
    return `${rest}, and ${last}`;
}

/** Short profile line, e.g. "In common: film, reading, and humor." */
export function formatMatchReasonsLine(reasons: string[], max = 4): string {
    const labels = [...new Set(reasons.map(humanizeMatchReason).filter(Boolean))].slice(0, max);
    if (labels.length === 0) return '';
    return `In common: ${joinNaturalList(labels)}.`;
}
