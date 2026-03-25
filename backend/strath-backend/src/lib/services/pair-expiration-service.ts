import { expireCandidatePairs } from "@/lib/services/candidate-pairs-service";

export async function runPairExpiration(now = new Date()) {
    const expired = await expireCandidatePairs(now);

    return {
        expiredCount: expired.length,
        expiredPairIds: expired.map((pair) => pair.id),
        ranAt: now.toISOString(),
    };
}
