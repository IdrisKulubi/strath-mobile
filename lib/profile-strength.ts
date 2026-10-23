export function getProfileStrengthLabel(percentage: number): string {
    if (percentage >= 100) return 'Complete';
    if (percentage >= 70) return 'Strong';
    if (percentage >= 40) return 'Growing';
    return 'Getting started';
}

export function getProfileStrengthHint(percentage: number): string {
    const remaining = Math.max(0, 100 - percentage);
    if (remaining <= 0) return 'Your profile is ready for matching.';
    const itemsLeft = Math.max(1, Math.ceil(remaining / 15));
    return `${itemsLeft} ${itemsLeft === 1 ? 'item' : 'items'} left for stronger matches`;
}
