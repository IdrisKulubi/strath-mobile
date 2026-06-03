import { eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { db as readDb } from "@/lib/db";
import {
    profilePhotoAnalysis,
    profilePhotoEmbeddings,
    userMatchSignals,
    userVisualPreferenceSignals,
} from "@/db/schema";

function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function cosineSimilarity(left: number[], right: number[]) {
    if (left.length === 0 || right.length === 0 || left.length !== right.length) {
        return 0;
    }

    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;

    for (let index = 0; index < left.length; index++) {
        dot += left[index] * right[index];
        leftNorm += left[index] * left[index];
        rightNorm += right[index] * right[index];
    }

    if (leftNorm === 0 || rightNorm === 0) {
        return 0;
    }

    return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function averageVectors(vectors: number[][]) {
    if (vectors.length === 0) {
        return null;
    }

    const dimension = vectors[0].length;
    const sum = new Array(dimension).fill(0);

    for (const vector of vectors) {
        for (let index = 0; index < dimension; index++) {
            sum[index] += vector[index] ?? 0;
        }
    }

    return sum.map((value) => value / vectors.length);
}

function updateRunningCentroid(previous: number[] | null, next: number[], count: number) {
    if (!previous || count <= 1) {
        return next;
    }

    return previous.map((value, index) => value + (next[index] - value) / count);
}

export function calculatePreferenceConfidence(totalLikes: number) {
    if (totalLikes <= 3) return 10;
    if (totalLikes <= 10) return 45;
    return 75;
}

export async function getVisualPreferenceConfidence(userId: string) {
    const row = await readDb.query.userVisualPreferenceSignals.findFirst({
        where: eq(userVisualPreferenceSignals.userId, userId),
    });
    return row?.preferenceConfidence ?? 0;
}

async function getPrimaryEmbeddingForUser(userId: string) {
    const analysis = await readDb.query.profilePhotoAnalysis.findFirst({
        where: eq(profilePhotoAnalysis.userId, userId),
        orderBy: (table, { desc }) => [desc(table.qualityScore)],
    });

    if (!analysis?.embeddingId) {
        return null;
    }

    const embedding = await readDb.query.profilePhotoEmbeddings.findFirst({
        where: eq(profilePhotoEmbeddings.id, analysis.embeddingId),
    });

    return embedding?.embedding ?? null;
}

export async function updateVisualPreferenceFromInteraction(input: {
    actorUserId: string;
    targetUserId: string;
    eventType: "profile_like" | "profile_pass" | "profile_view";
    eventId?: string;
}) {
    const targetEmbedding = await getPrimaryEmbeddingForUser(input.targetUserId);
    if (!targetEmbedding) {
        return;
    }

    const existing = await readDb.query.userVisualPreferenceSignals.findFirst({
        where: eq(userVisualPreferenceSignals.userId, input.actorUserId),
    });

    const likedCentroid = existing?.likedEmbeddingCentroid ?? null;
    const passedCentroid = existing?.passedEmbeddingCentroid ?? null;
    let totalLikes = existing?.totalVisualLikes ?? 0;
    let totalPasses = existing?.totalVisualPasses ?? 0;
    let totalViews = existing?.totalVisualViews ?? 0;

    let nextLiked = likedCentroid;
    let nextPassed = passedCentroid;

    if (input.eventType === "profile_like") {
        totalLikes += 1;
        nextLiked = updateRunningCentroid(likedCentroid, targetEmbedding, totalLikes) ?? targetEmbedding;
    } else if (input.eventType === "profile_pass") {
        totalPasses += 1;
        nextPassed = updateRunningCentroid(passedCentroid, targetEmbedding, totalPasses) ?? targetEmbedding;
    } else {
        totalViews += 1;
    }

    const preferenceConfidence = calculatePreferenceConfidence(totalLikes);

    await db
        .insert(userVisualPreferenceSignals)
        .values({
            userId: input.actorUserId,
            likedEmbeddingCentroid: nextLiked,
            passedEmbeddingCentroid: nextPassed,
            totalVisualLikes: totalLikes,
            totalVisualPasses: totalPasses,
            totalVisualViews: totalViews,
            preferenceConfidence,
            lastUpdatedFromEventId: input.eventId ?? null,
        })
        .onConflictDoUpdate({
            target: userVisualPreferenceSignals.userId,
            set: {
                likedEmbeddingCentroid: nextLiked,
                passedEmbeddingCentroid: nextPassed,
                totalVisualLikes: totalLikes,
                totalVisualPasses: totalPasses,
                totalVisualViews: totalViews,
                preferenceConfidence,
                lastUpdatedFromEventId: input.eventId ?? null,
                updatedAt: new Date(),
            },
        });

    await db
        .insert(userMatchSignals)
        .values({
            userId: input.actorUserId,
            visualPreferenceConfidence: preferenceConfidence,
        })
        .onConflictDoUpdate({
            target: userMatchSignals.userId,
            set: {
                visualPreferenceConfidence: preferenceConfidence,
                updatedAt: new Date(),
            },
        });

    return preferenceConfidence;
}

export async function calculatePhotoPreferenceScore(input: {
    viewerUserId: string;
    candidateUserId: string;
}) {
    const [preference, candidateEmbedding] = await Promise.all([
        readDb.query.userVisualPreferenceSignals.findFirst({
            where: eq(userVisualPreferenceSignals.userId, input.viewerUserId),
        }),
        getPrimaryEmbeddingForUser(input.candidateUserId),
    ]);

    if (!preference || !candidateEmbedding || !preference.likedEmbeddingCentroid) {
        return 50;
    }

    const confidenceWeight = (preference.preferenceConfidence ?? 0) / 100;
    if (confidenceWeight <= 0.1) {
        return 50;
    }

    const likedSimilarity = cosineSimilarity(preference.likedEmbeddingCentroid, candidateEmbedding);
    const passedSimilarity = preference.passedEmbeddingCentroid
        ? cosineSimilarity(preference.passedEmbeddingCentroid, candidateEmbedding)
        : 0;

    const raw = clampScore(likedSimilarity * 100 - passedSimilarity * 35);
    return clampScore(50 + (raw - 50) * confidenceWeight);
}

export async function calculatePhotoDiversityScore(input: {
    viewerUserId: string;
    candidateUserId: string;
    alreadySelectedCandidateIds: string[];
}) {
    const candidateEmbedding = await getPrimaryEmbeddingForUser(input.candidateUserId);
    if (!candidateEmbedding || input.alreadySelectedCandidateIds.length === 0) {
        return 60;
    }

    const selectedEmbeddings: number[][] = [];
    for (const userId of input.alreadySelectedCandidateIds) {
        const embedding = await getPrimaryEmbeddingForUser(userId);
        if (embedding) {
            selectedEmbeddings.push(embedding);
        }
    }

    if (selectedEmbeddings.length === 0) {
        return 60;
    }

    const centroid = averageVectors(selectedEmbeddings);
    if (!centroid) {
        return 60;
    }

    const similarity = cosineSimilarity(centroid, candidateEmbedding);
    return clampScore((1 - similarity) * 100);
}

export async function rebuildVisualPreferenceCentroid(userId: string) {
    const likedRows = await readDb.query.profilePhotoEmbeddings.findMany({
        where: eq(profilePhotoEmbeddings.userId, userId),
        limit: 20,
    });

    const centroid = averageVectors(likedRows.map((row) => row.embedding).filter(Boolean) as number[][]);
    if (!centroid) {
        return null;
    }

    await db
        .insert(userVisualPreferenceSignals)
        .values({
            userId,
            likedEmbeddingCentroid: centroid,
            preferenceConfidence: calculatePreferenceConfidence(likedRows.length),
        })
        .onConflictDoUpdate({
            target: userVisualPreferenceSignals.userId,
            set: {
                likedEmbeddingCentroid: centroid,
                updatedAt: new Date(),
            },
        });

    return centroid;
}
