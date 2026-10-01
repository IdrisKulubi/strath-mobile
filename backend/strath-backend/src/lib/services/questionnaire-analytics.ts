import type { QueryResultRow } from 'pg';
import { ALGORITHM, REQUIRED_ANSWER_COUNT, REQUIRED_QUESTION_IDS } from '../questionnaire/contracts';
import { query, type SqlExecutor } from '../questionnaire/db';

export type AnalyticsWindow = 7 | 30 | 90 | 'all';
export function analyticsWindow(value: unknown): AnalyticsWindow {
    return value === '7' ? 7 : value === '90' ? 90 : value === 'all' ? 'all' : 30;
}
export function percentage(value: number, total: number): string {
    return total === 0 ? '—' : `${(value / total * 100).toFixed(1)}%`;
}
export type ProgressStep = { step: number; prompt: string; answered: number; next: number; inactive: number };
export type DailyActivity = { date: string; started: number; completed: number; matches: number };
export type QuestionnaireAnalytics = {
    available: boolean;
    missing: string[];
    window: AnalyticsWindow;
    required: number;
    generatedAt: string;
    summary: { entered: number; started: number; complete: number; inactive: number; recent: number; zero: number };
    progress: ProgressStep[];
    milestones: { step: number; users: number }[];
    discovery: { requests: number; viewers: number; empty: number; failed: number; candidates: number; p95: number | null };
    connections: { matches: number; active: number; likes: number; passes: number; messagingMatches: number; messages: number; unmatched: number; blocked: number };
    cache: { pairs: number; profiles: number; ready: number; insufficient: number; average: number | null };
    ranking: { available: boolean; requests: number; candidates: number; cacheHits: number; engineScored: number; batches: number; failed: number; since: string | null };
    daily: DailyActivity[];
};

/** Read-only aggregates. The admin action is the authorization boundary. */
export async function loadQuestionnaireAnalytics(window: AnalyticsWindow, executor?: SqlExecutor): Promise<QuestionnaireAnalytics> {
    const run = <T extends QueryResultRow>(sql: string, values: unknown[] = []) => query<T>(sql, values, executor);
    const result: QuestionnaireAnalytics = {
        available: false, missing: [], window, required: REQUIRED_ANSWER_COUNT, generatedAt: new Date().toISOString(),
        summary: { entered: 0, started: 0, complete: 0, inactive: 0, recent: 0, zero: 0 }, progress: [], milestones: [], daily: [],
        discovery: { requests: 0, viewers: 0, empty: 0, failed: 0, candidates: 0, p95: null },
        connections: { matches: 0, active: 0, likes: 0, passes: 0, messagingMatches: 0, messages: 0, unmatched: 0, blocked: 0 },
        cache: { pairs: 0, profiles: 0, ready: 0, insufficient: 0, average: null },
        ranking: { available: false, requests: 0, candidates: 0, cacheHits: 0, engineScored: 0, batches: 0, failed: 0, since: null },
    };
    const tables = ['q_state', 'q_answers', 'q_questions', 'q_discovery_events', 'q_compatibility_cache', 'q_connections', 'q_connection_events', 'q_questionnaire_events'];
    const presence = await run<{ name: string; present: boolean } & QueryResultRow>(
        `SELECT name, to_regclass(name) IS NOT NULL AS present FROM unnest($1::text[]) AS name`, [tables]);
    result.missing = presence.filter(row => !row.present).map(row => row.name);
    if (result.missing.length) return result;
    // Selected periods are calendar days in Nairobi, including today. All-time trend shows 90 days.
    const values = [window === 'all' ? null : window, REQUIRED_QUESTION_IDS, REQUIRED_ANSWER_COUNT];
    const cutoff = `CASE WHEN $1::int IS NULL THEN '-infinity'::timestamptz ELSE
        ((now() AT TIME ZONE 'Africa/Nairobi')::date - ($1::int - 1))::timestamp AT TIME ZONE 'Africa/Nairobi' END`;
    const cohort = `WITH required AS (
        SELECT id, ord::int AS step FROM unnest($2::text[]) WITH ORDINALITY AS r(id, ord)
    ), progress AS (
        SELECT s.user_id, count(a.question_id)::int AS count,
            coalesce(max(a.updated_at), s.started_at) AS last_progress,
            min(r.step) FILTER (WHERE a.question_id IS NULL) AS next_step
        FROM q_state s JOIN "user" u ON u.id = s.user_id AND u.deleted_at IS NULL AND u.deleted_reason IS NULL
        CROSS JOIN required r
        LEFT JOIN q_questions q ON q.id = r.id AND q.published
        LEFT JOIN q_answers a ON a.user_id = s.user_id AND a.question_id = q.id
        WHERE s.started_at >= ${cutoff}
        GROUP BY s.user_id, s.started_at
    )`;
    const [summary, progress, discovery, connections, cache, daily] = await Promise.all([
        run<{ data: QuestionnaireAnalytics['summary']; milestones: QuestionnaireAnalytics['milestones'] } & QueryResultRow>(`${cohort}
            SELECT json_build_object('entered', count(*), 'started', count(*) FILTER (WHERE count > 0),
                'zero', count(*) FILTER (WHERE count = 0), 'complete', count(*) FILTER (WHERE count >= $3),
                'inactive', count(*) FILTER (WHERE count > 0 AND count < $3 AND last_progress < now() - interval '7 days'),
                'recent', count(*) FILTER (WHERE count > 0 AND count < $3 AND last_progress >= now() - interval '7 days')) AS data,
                (SELECT json_agg(json_build_object('step', m.step, 'users',
                    (SELECT count(*) FROM progress p WHERE p.count >= m.step))) FROM unnest(ARRAY[5,10,16,20,25]) AS m(step)) AS milestones
                FROM progress`, values),
        run<ProgressStep & QueryResultRow>(`${cohort}
            SELECT r.step, coalesce(q.prompt, 'Unpublished required question') AS prompt,
                (SELECT count(*)::int FROM progress p WHERE EXISTS
                    (SELECT 1 FROM q_answers a JOIN q_questions question ON question.id = a.question_id AND question.published
                     WHERE a.user_id = p.user_id AND a.question_id = r.id)) AS answered,
                (SELECT count(*)::int FROM progress WHERE count > 0 AND next_step = r.step) AS next,
                (SELECT count(*)::int FROM progress WHERE count > 0 AND next_step = r.step AND last_progress < now() - interval '7 days') AS inactive
            FROM required r LEFT JOIN q_questions q ON q.id = r.id ORDER BY r.step`, values.slice(0, 2)),
        run<{ data: QuestionnaireAnalytics['discovery'] } & QueryResultRow>(`SELECT json_build_object(
            'requests', count(*), 'viewers', count(DISTINCT user_id),
            'empty', count(*) FILTER (WHERE event = 'discovery_empty'),
            'failed', count(*) FILTER (WHERE event = 'engine_unavailable'),
            'candidates', coalesce(sum(candidate_count), 0),
            'p95', percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)) AS data
            FROM q_discovery_events WHERE created_at >= ${cutoff}`, [values[0]]),
        run<{ data: QuestionnaireAnalytics['connections'] } & QueryResultRow>(`WITH created AS (
            SELECT * FROM q_connections WHERE origin = 'questionnaire' AND connected_at >= ${cutoff}
        ) SELECT json_build_object('matches', (SELECT count(*) FROM created),
            'active', (SELECT count(*) FROM q_connections WHERE origin = 'questionnaire' AND status = 'active'),
            'likes', count(*) FILTER (WHERE event = 'like_sent'), 'passes', count(*) FILTER (WHERE event = 'pass_saved'),
            'messages', count(*) FILTER (WHERE event = 'message_sent' AND EXISTS
                (SELECT 1 FROM q_connections c WHERE c.match_id = e.match_id AND c.origin = 'questionnaire')),
            'messagingMatches', (SELECT count(*) FROM created c WHERE EXISTS
                (SELECT 1 FROM q_connection_events e WHERE e.match_id = c.match_id AND e.event = 'message_sent')),
            'unmatched', count(*) FILTER (WHERE event = 'unmatched'), 'blocked', count(*) FILTER (WHERE event = 'blocked')) AS data
            FROM q_connection_events e WHERE created_at >= ${cutoff}`, [values[0]]),
        run<{ data: QuestionnaireAnalytics['cache'] } & QueryResultRow>(`WITH current AS (
            SELECT c.* FROM q_compatibility_cache c JOIN q_state a ON a.user_id = c.user_a AND a.revision = c.revision_a
            JOIN q_state b ON b.user_id = c.user_b AND b.revision = c.revision_b WHERE c.algorithm_version = $1
        ) SELECT json_build_object('pairs', count(*), 'ready', count(*) FILTER (WHERE status = 'ready'),
            'insufficient', count(*) FILTER (WHERE status = 'insufficient_evidence'), 'average', avg(score) FILTER (WHERE status = 'ready'),
            'profiles', (SELECT count(*) FROM (SELECT user_a FROM current UNION SELECT user_b FROM current) people)) AS data FROM current`, [ALGORITHM]),
        run<DailyActivity & QueryResultRow>(`WITH days AS (
            SELECT generate_series((now() AT TIME ZONE 'Africa/Nairobi')::date - ($1::int - 1),
                (now() AT TIME ZONE 'Africa/Nairobi')::date, interval '1 day')::date AS day
        ), completions AS (
            SELECT user_id, min(created_at) AS at FROM q_questionnaire_events
            WHERE answer_count >= $2 AND user_id IS NOT NULL GROUP BY user_id
        ) SELECT day::text AS date,
            (SELECT count(*)::int FROM q_state WHERE (started_at AT TIME ZONE 'Africa/Nairobi')::date = day) AS started,
            (SELECT count(*)::int FROM completions WHERE (at AT TIME ZONE 'Africa/Nairobi')::date = day) AS completed,
            (SELECT count(*)::int FROM q_connections WHERE origin = 'questionnaire' AND (connected_at AT TIME ZONE 'Africa/Nairobi')::date = day) AS matches
            FROM days ORDER BY day`, [window === 'all' ? 90 : window, REQUIRED_ANSWER_COUNT]),
    ]);
    result.available = true;
    result.summary = summary[0].data; result.milestones = summary[0].milestones; result.progress = progress;
    result.discovery = discovery[0].data; result.connections = connections[0].data;
    result.cache = cache[0].data; result.daily = daily;
    const [telemetryTable] = await run<{ present: boolean } & QueryResultRow>(`SELECT to_regclass('analytics_events') IS NOT NULL AS present`);
    if (telemetryTable.present) {
        const [ranking] = await run<{ data: QuestionnaireAnalytics['ranking'] } & QueryResultRow>(`WITH events AS (
            SELECT metadata, created_at FROM analytics_events WHERE event_type = 'questionnaire_ranking'
                AND metadata->>'algorithmVersion' = $2
        ) SELECT json_build_object('available', (SELECT count(*) > 0 FROM events), 'since', (SELECT (min(created_at) AT TIME ZONE 'UTC')::text FROM events),
            'requests', count(*), 'candidates', coalesce(sum((metadata->>'candidates')::int), 0),
            'cacheHits', coalesce(sum((metadata->>'cacheHits')::int), 0), 'engineScored', coalesce(sum((metadata->>'engineScored')::int), 0),
            'batches', coalesce(sum((metadata->>'engineBatches')::int), 0),
            'failed', count(*) FILTER (WHERE (metadata->>'failed')::boolean)) AS data
            FROM events WHERE created_at AT TIME ZONE 'UTC' >= ${cutoff}`, [values[0], ALGORITHM]);
        result.ranking = ranking.data;
    }
    return result;
}
