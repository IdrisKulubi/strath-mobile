import { getAuthToken } from '@/lib/auth-helpers';
import {
    messageForRescheduleRequestReason,
    messageForRescheduleRespondReason,
} from '@/lib/reschedule-messages';
import type { RescheduleSlotOption } from '@/lib/reschedule-types';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function authHeaders(): Promise<HeadersInit> {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

async function parseRescheduleFailure(res: Response, fallback: string): Promise<Error> {
    const json = await res.json().catch(() => ({}));
    const reason = typeof json?.reason === 'string' ? json.reason : undefined;
    if (reason) {
        const message =
            messageForRescheduleRespondReason(reason) !== 'Could not update your date.'
                ? messageForRescheduleRespondReason(reason)
                : messageForRescheduleRequestReason(reason);
        return new Error(message);
    }
    const errorText = typeof json?.error === 'string' ? json.error : fallback;
    return new Error(errorText);
}

export async function fetchRescheduleOptions(mutualMatchId: string): Promise<{
    options: RescheduleSlotOption[];
    currentScheduledAt: string | null;
}> {
    const headers = await authHeaders();
    const res = await fetch(
        `${API_URL}/api/me/match-hold/reschedule/options?mutualMatchId=${encodeURIComponent(mutualMatchId)}`,
        { headers },
    );

    if (!res.ok) {
        throw await parseRescheduleFailure(res, 'Could not load date options');
    }

    const json = await res.json();
    return json?.data ?? { options: [], currentScheduledAt: null };
}

export async function postRescheduleRequest(input: {
    mutualMatchId: string;
    proposedScheduledAt: string;
}) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/me/match-hold/reschedule/request`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
    });

    if (!res.ok) {
        throw await parseRescheduleFailure(res, 'Could not request a date change');
    }

    const json = await res.json();
    return json?.data ?? {};
}

export async function postRescheduleRespond(input:
    | { requestId: string; action: 'accept' }
    | {
          requestId: string;
          action: 'decline';
          declineReason: string;
          counterScheduledAt: string;
      }) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/me/match-hold/reschedule/respond`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
    });

    if (!res.ok) {
        throw await parseRescheduleFailure(res, 'Could not respond to date change');
    }

    const json = await res.json();
    return json?.data ?? {};
}

export async function postRescheduleCancel(mutualMatchId: string) {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/me/match-hold/reschedule/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ mutualMatchId }),
    });

    if (!res.ok) {
        throw await parseRescheduleFailure(res, 'Could not cancel date change request');
    }

    const json = await res.json();
    return json?.data ?? {};
}
