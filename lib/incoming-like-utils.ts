import type { ConnectionRequest } from '@/hooks/use-connection-requests';

export function getIncomingLikeTimeAgo(iso: string): string {
    const created = new Date(iso);
    const diffMs = Date.now() - created.getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) return '';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function getIncomingLikeMeta(request: ConnectionRequest): string {
    const parts: string[] = [];
    const course = request.fromUser.profile?.course;
    const year = request.fromUser.profile?.yearOfStudy;
    const university = request.fromUser.profile?.university;
    if (course) parts.push(course);
    if (year) parts.push(`Year ${year}`);
    if (university) parts.push(university);
    return parts.length > 0 ? parts.join(' · ') : 'Chose you on StrathSpace';
}

export function getIncomingLikeIdentityLine(request: ConnectionRequest): string {
    const meta = getIncomingLikeMeta(request);
    const timeAgo = getIncomingLikeTimeAgo(request.createdAt);
    if (timeAgo) return `${meta} · ${timeAgo}`;
    return meta;
}

export function getIncomingLikeFirstName(fullName: string): string {
    return fullName.trim().split(/\s+/)[0] || fullName;
}

export function getIncomingLikePhoto(request: ConnectionRequest): string | null {
    return (
        request.fromUser.profilePhoto
        || request.fromUser.image
        || request.fromUser.profile?.photos?.[0]
        || null
    );
}
