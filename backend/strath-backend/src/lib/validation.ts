import { z } from "zod";

export const updateProfileSchema = z.object({
    bio: z.string().max(500).optional(),
    age: z.number().min(18).max(100).optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    interests: z.array(z.string()).optional(),
    photos: z.array(z.string()).optional(),
    lookingFor: z.string().optional(),
    course: z.string().optional(),
    yearOfStudy: z.number().optional(),
    university: z.string().optional(),
    instagram: z.string().optional(),
    spotify: z.string().optional(),
    snapchat: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    drinkingPreference: z.string().optional(),
    workoutFrequency: z.string().optional(),
    socialMediaUsage: z.string().optional(),
    sleepingHabits: z.string().optional(),
    personalityType: z.string().optional(),
    communicationStyle: z.string().optional(),
    loveLanguage: z.string().optional(),
    zodiacSign: z.string().optional(),
    visibilityMode: z.enum(["standard", "incognito"]).optional(),
    readReceiptsEnabled: z.boolean().optional(),
    showActiveStatus: z.boolean().optional(),
    anonymous: z.boolean().optional(),
    anonymousAvatar: z.string().optional(),
    isComplete: z.boolean().optional(),
});

export const swipeSchema = z.object({
    targetUserId: z.string(),
    action: z.enum(["like", "pass"]),
});

export const messageSchema = z.object({
    content: z.string().min(1),
});

export const reportSchema = z.object({
    reportedUserId: z.string(),
    reason: z.string().min(1),
});
