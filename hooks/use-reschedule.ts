import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    fetchRescheduleOptions,
    postRescheduleCancel,
    postRescheduleRequest,
    postRescheduleRespond,
} from '@/lib/reschedule-api';
import type { MutualDate } from '@/hooks/use-date-requests';
import type { RescheduleViewerState } from '@/lib/reschedule-types';

export function getReschedulePending(match: {
    reschedule?: RescheduleViewerState;
}): RescheduleViewerState['pending'] | undefined {
    return match.reschedule?.pending;
}

export function useRescheduleOptions(mutualMatchId: string | undefined, enabled: boolean) {
    return useQuery({
        queryKey: ['reschedule-options', mutualMatchId],
        queryFn: () => fetchRescheduleOptions(mutualMatchId!),
        enabled: Boolean(mutualMatchId) && enabled,
        staleTime: 30_000,
    });
}

async function invalidateRescheduleQueries(queryClient: ReturnType<typeof useQueryClient>) {
    await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['candidatePairs', 'daily'] }),
        queryClient.invalidateQueries({ queryKey: ['mutualDates'] }),
        queryClient.invalidateQueries({ queryKey: ['reschedule-options'] }),
        queryClient.invalidateQueries({ queryKey: ['notificationCounts'] }),
    ]);
}

export function useRequestReschedule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postRescheduleRequest,
        onSuccess: async () => {
            await invalidateRescheduleQueries(queryClient);
        },
    });
}

export function useRespondReschedule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postRescheduleRespond,
        onSuccess: async () => {
            await invalidateRescheduleQueries(queryClient);
        },
    });
}

export function useCancelRescheduleRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: postRescheduleCancel,
        onSuccess: async () => {
            await invalidateRescheduleQueries(queryClient);
        },
    });
}

export function findMutualMatchNeedingRescheduleResponse(
    matches: MutualDate[],
): MutualDate | undefined {
    return matches.find((m) => m.reschedule?.pending?.isYourTurnToRespond);
}
