import { randomUUID } from 'node:crypto';
import { ALGORITHM } from './contracts';
import { query } from './db';

export type RankingTelemetry = {
    source: 'discovery' | 'comparison';
    candidates: number;
    cacheHits: number;
    engineScored: number;
    engineBatches: number;
    failed: boolean;
    durationMs: number;
};

/** Aggregate counts only. Telemetry failure must never interrupt discovery. */
export async function recordRankingTelemetry(userId: string, metrics: RankingTelemetry) {
    try {
        await query(`INSERT INTO analytics_events(id, event_type, user_id, metadata, created_at)
            VALUES($1, 'questionnaire_ranking', $2, $3::jsonb, now() AT TIME ZONE 'UTC')`,
        [randomUUID(), userId, JSON.stringify({ ...metrics, algorithmVersion: ALGORITHM })]);
    } catch {
        console.warn('[questionnaire analytics] Ranking telemetry could not be saved');
    }
}
