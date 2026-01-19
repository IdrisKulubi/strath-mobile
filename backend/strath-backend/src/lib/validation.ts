import { z } from "zod";

export const updateProfileSchema = z.object({
    bio: z.string().max(500).nullable().optional(),
    age: z.number().min(18).max(100).nullable().optional(),
    gender: z.enum(["male", "female", "other"]).nullable().optional(),
    interests: z.array(z.string()).nullable().optional(),
    photos: z.array(z.string()).nullable().optional(),
    lookingFor: z.string().nullable().optional(),
    course: z.string().nullable().optional(),
    yearOfStudy: z.number().nullable().optional(),
    university: z.string().nullable().optional(),
    instagram: z.string().nullable().optional(),
    spotify: z.string().nullable().optional(),
    snapchat: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    drinkingPreference: z.string().nullable().optional(),
    workoutFrequency: z.string().nullable().optional(),
    socialMediaUsage: z.string().nullable().optional(),
    sleepingHabits: z.string().nullable().optional(),
    personalityType: z.string().nullable().optional(),
    communicationStyle: z.string().nullable().optional(),
    loveLanguage: z.string().nullable().optional(),
    zodiacSign: z.string().nullable().optional(),
    visibilityMode: z.enum(["standard", "incognito"]).nullable().optional(),
    readReceiptsEnabled: z.boolean().nullable().optional(),
    showActiveStatus: z.boolean().nullable().optional(),
    anonymous: z.boolean().nullable().optional(),
    anonymousAvatar: z.string().nullable().optional(),
    isComplete: z.boolean().nullable().optional(),
    profilePhoto: z.string().nullable().optional(),
    // New enhanced onboarding fields
    qualities: z.array(z.string()).nullable().optional(),
    prompts: z.array(z.object({
        promptId: z.string(),
        response: z.string().max(150),
    })).nullable().optional(),
    aboutMe: z.string().max(500).nullable().optional(),
    height: z.string().nullable().optional(),
    education: z.string().nullable().optional(),
    smoking: z.string().nullable().optional(),
    politics: z.string().nullable().optional(),
    religion: z.string().nullable().optional(),
    languages: z.array(z.string()).nullable().optional(),
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
