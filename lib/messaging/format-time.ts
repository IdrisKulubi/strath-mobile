/** Relative timestamp for conversation list rows. */
export function getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Presence label for conversation list avatars. */
export function getLastActiveStatus(
    dateString: string | null | undefined,
): { text: string; isOnline: boolean } {
    if (!dateString) return { text: 'Offline', isOnline: false };

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 5) return { text: 'Online now', isOnline: true };
    if (diffMins < 60) return { text: `Active ${diffMins}m ago`, isOnline: false };

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return { text: `Active ${diffHours}h ago`, isOnline: false };

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return { text: 'Active yesterday', isOnline: false };
    if (diffDays < 7) return { text: `Active ${diffDays}d ago`, isOnline: false };

    return { text: 'Offline', isOnline: false };
}
