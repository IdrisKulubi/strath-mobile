// Campus Events Types

export type EventCategory =
    | "social"
    | "academic"
    | "sports"
    | "career"
    | "arts"
    | "gaming"
    | "faith"
    | "clubs";

export interface CampusEvent {
    id: string;
    title: string;
    description: string | null;
    category: EventCategory;
    coverImage: string | null;
    university: string;
    location: string | null;
    isVirtual: boolean;
    virtualLink: string | null;
    startTime: string;
    endTime: string | null;
    creatorId: string;
    organizerName: string | null;
    maxAttendees: number | null;
    createdAt: string;
    
    // Computed fields from API
    goingCount: number;
    interestedCount: number;
    totalInterest: number;
    userRsvpStatus: "going" | "interested" | null;
    isCreator?: boolean;
}

export interface EventAttendee {
    id: string;
    name: string;
    image: string | null;
    status: "going" | "interested";
    rsvpAt: string;
}

export interface CreateEventData {
    title: string;
    description?: string;
    category: EventCategory;
    coverImage?: string;
    location?: string;
    isVirtual?: boolean;
    virtualLink?: string;
    startTime: string;
    endTime?: string;
    organizerName?: string;
    maxAttendees?: number;
}

export interface EventFilters {
    category?: EventCategory | null;
    time?: "today" | "week" | "all" | null;
    university?: string;
}

// Category display info
export const EVENT_CATEGORIES: { value: EventCategory; label: string; icon: string; color: string }[] = [
    { value: "social", label: "Social & Parties", icon: "🎉", color: "#FF6B6B" },
    { value: "academic", label: "Academic", icon: "📚", color: "#4ECDC4" },
    { value: "sports", label: "Sports & Fitness", icon: "🏃", color: "#45B7D1" },
    { value: "career", label: "Career", icon: "💼", color: "#96CEB4" },
    { value: "arts", label: "Arts & Culture", icon: "🎨", color: "#DDA0DD" },
    { value: "gaming", label: "Gaming", icon: "🎮", color: "#9B59B6" },
    { value: "faith", label: "Faith", icon: "⛪", color: "#F39C12" },
    { value: "clubs", label: "Clubs", icon: "🤝", color: "#1ABC9C" },
];

export function getCategoryInfo(category: EventCategory) {
    return EVENT_CATEGORIES.find(c => c.value === category) || EVENT_CATEGORIES[0];
}

// Format event time for display
export function formatEventTime(startTime: string, endTime?: string | null): string {
    const start = new Date(startTime);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = start.toDateString() === now.toDateString();
    const isTomorrow = start.toDateString() === tomorrow.toDateString();
    
    const timeStr = start.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    
    if (isToday) {
        return `Today ${timeStr}`;
    } else if (isTomorrow) {
        return `Tomorrow ${timeStr}`;
    } else {
        const dayStr = start.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        return `${dayStr} ${timeStr}`;
    }
}

// Get relative time until event
export function getTimeUntil(startTime: string): string {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = start.getTime() - now.getTime();
    
    if (diffMs < 0) return "Started";
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `In ${diffMins}m`;
    } else if (diffHours < 24) {
        return `In ${diffHours}h`;
    } else if (diffDays === 1) {
        return "Tomorrow";
    } else if (diffDays < 7) {
        return `In ${diffDays} days`;
    } else {
        return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}
