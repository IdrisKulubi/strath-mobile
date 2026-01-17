// Opportunity types for the frontend

export const OPPORTUNITY_CATEGORIES = [
    "internship",
    "part_time",
    "full_time",
    "scholarship",
    "grant",
    "event",
    "workshop",
    "announcement",
] as const;

export type OpportunityCategory = typeof OPPORTUNITY_CATEGORIES[number];

export type LocationType = "remote" | "onsite" | "hybrid";

export interface Opportunity {
    id: string;
    title: string;
    description: string;
    category: OpportunityCategory;
    organization: string;
    logo?: string | null;
    location?: string | null;
    locationType?: LocationType | null;
    deadline?: string | null; // ISO date string
    applicationUrl?: string | null;
    requirements?: string[] | null;
    salary?: string | null;
    stipend?: string | null;
    duration?: string | null;
    slots?: number | null;
    isActive: boolean;
    isFeatured: boolean;
    viewCount: number;
    postedBy?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    tags?: string[] | null;
    postedAt: string;
    updatedAt: string;
    isSaved?: boolean;
    savedAt?: string;
}

export interface OpportunitiesResponse {
    opportunities: Opportunity[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

export interface OpportunityFilters {
    category?: OpportunityCategory;
    search?: string;
    featured?: boolean;
}

// Category display config
export const CATEGORY_CONFIG: Record<OpportunityCategory, {
    label: string;
    emoji: string;
    color: string;
    bgColor: string;
}> = {
    internship: {
        label: "Internship",
        emoji: "💼",
        color: "#3B82F6",
        bgColor: "#DBEAFE",
    },
    part_time: {
        label: "Part-Time",
        emoji: "⏰",
        color: "#8B5CF6",
        bgColor: "#EDE9FE",
    },
    full_time: {
        label: "Full-Time",
        emoji: "🏢",
        color: "#059669",
        bgColor: "#D1FAE5",
    },
    scholarship: {
        label: "Scholarship",
        emoji: "🎓",
        color: "#F59E0B",
        bgColor: "#FEF3C7",
    },
    grant: {
        label: "Grant",
        emoji: "💰",
        color: "#10B981",
        bgColor: "#D1FAE5",
    },
    event: {
        label: "Event",
        emoji: "🎉",
        color: "#EC4899",
        bgColor: "#FCE7F3",
    },
    workshop: {
        label: "Workshop",
        emoji: "🛠️",
        color: "#F97316",
        bgColor: "#FFEDD5",
    },
    announcement: {
        label: "Announcement",
        emoji: "📢",
        color: "#6B7280",
        bgColor: "#F3F4F6",
    },
};
