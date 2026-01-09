import { z } from 'zod';

// Profile schema for discover feature
export const DiscoverProfileSchema = z.object({
    id: z.string(),
    userId: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    age: z.number().nullable().optional(),
    gender: z.string().nullable().optional(),
    university: z.string().nullable().optional(),
    course: z.string().nullable().optional(),
    yearOfStudy: z.number().nullable().optional(),
    interests: z.array(z.string()).nullable().optional(),
    photos: z.array(z.string()).nullable().optional(),
    profilePhoto: z.string().nullable().optional(),
    score: z.number().optional(),
    sharedInterests: z.number().optional(),
    user: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().optional(),
        image: z.string().nullable().optional(),
    }).optional(),
});

export type DiscoverProfile = z.infer<typeof DiscoverProfileSchema>;

// Section types
export type SectionType = 'featured' | 'horizontal' | 'grid';

export interface DiscoverSection {
    id: string;
    title: string;
    subtitle?: string;
    type: SectionType;
    profiles: DiscoverProfile[];
    emptyMessage?: string;
}

// API response schema
export const DiscoverSectionsResponseSchema = z.object({
    sections: z.array(z.object({
        id: z.string(),
        title: z.string(),
        subtitle: z.string().optional(),
        type: z.enum(['featured', 'horizontal', 'grid']),
        profiles: z.array(DiscoverProfileSchema),
        emptyMessage: z.string().optional(),
    })),
    refreshAt: z.string().optional(),
});

export type DiscoverSectionsResponse = z.infer<typeof DiscoverSectionsResponseSchema>;
