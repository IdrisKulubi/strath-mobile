import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import * as SecureStore from 'expo-secure-store';
import type { 
    CampusEvent, 
    EventFilters,
    CreateEventData,
    EventAttendee,
} from "@/types/events";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

// Helper to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
    const session = await authClient.getSession();
    const token = session?.data?.session?.token;
    const storedToken = await SecureStore.getItemAsync('strathmobile.session_token');
    const finalToken = token || storedToken;

    return {
        'Content-Type': 'application/json',
        ...(finalToken && { 'Authorization': `Bearer ${finalToken}` }),
    };
}

// Fetch events with filters
async function fetchEvents(
    filters: EventFilters = {},
    limit = 20,
    offset = 0
): Promise<{ events: CampusEvent[]; total: number }> {
    const params = new URLSearchParams();
    
    if (filters.category) params.append("category", filters.category);
    if (filters.time) params.append("time", filters.time);
    if (filters.university) params.append("university", filters.university);
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const url = `${API_URL}/api/events?${params.toString()}`;
    console.log("[useEvents] Fetching from:", url);

    try {
        const headers = await getAuthHeaders();
        const response = await fetch(url, { headers });
        console.log("[useEvents] Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[useEvents] Error response:", errorText);
            throw new Error(`Failed to fetch events: ${response.status}`);
        }

        const data = await response.json();
        console.log("[useEvents] Got", data.events?.length, "events");
        return data;
    } catch (error) {
        console.error("[useEvents] Fetch error:", error);
        throw error;
    }
}

// Fetch single event
async function fetchEvent(eventId: string): Promise<{ event: CampusEvent }> {
    const url = `${API_URL}/api/events/${eventId}`;
    const headers = await getAuthHeaders();
    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error(`Failed to fetch event: ${response.status}`);
    }

    return response.json();
}

// Create event
async function createEvent(data: CreateEventData): Promise<{ event: CampusEvent }> {
    const url = `${API_URL}/api/events`;
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create event');
    }

    return response.json();
}

// RSVP to event
async function rsvpToEvent(
    eventId: string, 
    status: "going" | "interested" | null
): Promise<{
    message: string;
    userRsvpStatus: string | null;
    goingCount: number;
    interestedCount: number;
    totalInterest: number;
}> {
    const url = `${API_URL}/api/events/${eventId}/rsvp`;
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to RSVP');
    }

    return response.json();
}

// Fetch event attendees
async function fetchAttendees(
    eventId: string,
    status?: "going" | "interested"
): Promise<{
    attendees: EventAttendee[];
    going: EventAttendee[];
    interested: EventAttendee[];
    goingCount: number;
    interestedCount: number;
    total: number;
}> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    
    const url = `${API_URL}/api/events/${eventId}/attendees?${params.toString()}`;
    const headers = await getAuthHeaders();
    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error(`Failed to fetch attendees: ${response.status}`);
    }

    return response.json();
}

// ============================================
// HOOKS
// ============================================

// Hook to fetch events list
export function useEvents(filters: EventFilters = {}) {
    return useQuery({
        queryKey: ['events', filters],
        queryFn: () => fetchEvents(filters),
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}

// Hook to fetch single event
export function useEvent(eventId: string | null) {
    return useQuery({
        queryKey: ['event', eventId],
        queryFn: () => fetchEvent(eventId!),
        enabled: !!eventId,
        staleTime: 1 * 60 * 1000, // 1 minute
    });
}

// Hook to create event
export function useCreateEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createEvent,
        onSuccess: () => {
            // Invalidate events list to refetch
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
    });
}

// Hook to RSVP
export function useRsvpEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventId, status }: { eventId: string; status: "going" | "interested" | null }) =>
            rsvpToEvent(eventId, status),
        onSuccess: (data, variables) => {
            // Optimistically update the event in cache
            queryClient.setQueryData(['event', variables.eventId], (old: any) => {
                if (!old?.event) return old;
                return {
                    ...old,
                    event: {
                        ...old.event,
                        goingCount: data.goingCount,
                        interestedCount: data.interestedCount,
                        totalInterest: data.totalInterest,
                        userRsvpStatus: data.userRsvpStatus,
                    },
                };
            });

            // Invalidate events list
            queryClient.invalidateQueries({ queryKey: ['events'] });
            // Invalidate attendees
            queryClient.invalidateQueries({ queryKey: ['event-attendees', variables.eventId] });
        },
    });
}

// Hook to fetch attendees
export function useEventAttendees(eventId: string | null, status?: "going" | "interested") {
    return useQuery({
        queryKey: ['event-attendees', eventId, status],
        queryFn: () => fetchAttendees(eventId!, status),
        enabled: !!eventId,
        staleTime: 30 * 1000, // 30 seconds
    });
}

// Hook to delete event
export function useDeleteEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (eventId: string) => {
            const url = `${API_URL}/api/events/${eventId}`;
            const headers = await getAuthHeaders();
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers,
            });

            if (!response.ok) {
                throw new Error('Failed to delete event');
            }

            return response.json();
        },
        onSuccess: (_, eventId) => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.removeQueries({ queryKey: ['event', eventId] });
        },
    });
}
