export function isDailyLimitError(error: string | null): boolean {
    if (!error) return false;
    return /exhausted.*wingman.*today|come back tomorrow|searches for today/i.test(error);
}
