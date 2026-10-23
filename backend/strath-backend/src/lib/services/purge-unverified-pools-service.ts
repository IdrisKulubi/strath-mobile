import { sql } from "drizzle-orm";

import db from "@/db/drizzle";

export type PurgeUnverifiedPoolsResult = {
    shortlistRowsDeleted: number;
    candidatePairsClosed: number;
};

/**
 * Remove unverified users from cached discovery pools and close live candidate pairs
 * where either participant has not completed face verification.
 */
export async function purgeUnverifiedFromMatchPools(): Promise<PurgeUnverifiedPoolsResult> {
    const shortlistResult = await db.execute(sql`
        DELETE FROM daily_shortlists ds
        USING profiles p
        WHERE p.user_id = ds.candidate_user_id
          AND p.face_verification_status <> 'verified'
          AND p.face_verified_at IS NULL
    `);

    const pairsResult = await db.execute(sql`
        UPDATE candidate_pairs cp
        SET status = 'closed',
            updated_at = NOW()
        FROM profiles pa, profiles pb
        WHERE cp.user_a_id = pa.user_id
          AND cp.user_b_id = pb.user_id
          AND cp.status IN ('active', 'queued')
          AND (
            (pa.face_verification_status <> 'verified' AND pa.face_verified_at IS NULL)
            OR (pb.face_verification_status <> 'verified' AND pb.face_verified_at IS NULL)
          )
    `);

    return {
        shortlistRowsDeleted: Number(shortlistResult.rowCount ?? 0),
        candidatePairsClosed: Number(pairsResult.rowCount ?? 0),
    };
}
