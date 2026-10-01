import Link from 'next/link';
import type { ReactNode } from 'react';
import { percentage, type QuestionnaireAnalytics } from '@/lib/services/questionnaire-analytics';
import { ALGORITHM } from '@/lib/questionnaire/contracts';
import { QuestionnaireActivityChart } from './_chart';

const number = (value: number) => value.toLocaleString();
function Panel({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
    return <section className="space-y-5 rounded-xl border border-white/10 bg-white/5 p-5 sm:p-6">
        <div><h2 className="text-lg font-semibold text-white">{title}</h2>{detail && <p className="mt-1 text-sm text-gray-400">{detail}</p>}</div>{children}
    </section>;
}
function Stats({ items }: { items: { label: string; value: string; hint: string }[] }) {
    return <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">{items.map(item => <div key={item.label}>
        <dt className="text-sm text-gray-300">{item.label}</dt><dd className="mt-2 text-3xl font-semibold text-white tabular-nums">{item.value}</dd>
        <dd className="mt-2 text-sm text-gray-400">{item.hint}</dd>
    </div>)}</dl>;
}

export function QuestionnaireDashboard({ data, featureFlags }: {
    data: QuestionnaireAnalytics;
    featureFlags: { collection: boolean; matching: boolean; shell: boolean };
}) {
    const period = data.window;
    const f = featureFlags;
    const s = data.summary;
    const c = data.connections;
    const d = data.discovery;
    const r = data.ranking;
    const stages = [0, 1, 5, 10, 16, 20, 25, data.required].map(step => ({ step,
        count: step === 0 ? s.entered : step === 1 ? s.started : step === data.required ? s.complete :
            data.milestones.find(item => item.step === step)?.users ?? 0,
    }));
    return <div className="mx-auto max-w-7xl space-y-7 p-4 sm:p-8">
        <header className="space-y-4">
            <Link href="/admin/metrics" className="inline-flex min-h-11 items-center text-sm text-pink-300 hover:underline">← All analytics</Link>
            <div><h1 className="text-2xl font-bold text-white">Questionnaire & matching</h1>
                <p className="mt-2 max-w-3xl text-sm text-gray-300">See who finishes, where progress stalls, and whether compatibility rankings lead to real conversations.</p></div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <nav aria-label="Analytics period" className="flex flex-wrap gap-2">{(['7', '30', '90', 'all'] as const).map(value =>
                    <Link key={value} href={`?period=${value}`} aria-current={String(period) === value ? 'page' : undefined}
                        className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${String(period) === value ? 'border-pink-400 text-pink-200 bg-pink-400/10' : 'border-white/15 text-gray-300 hover:bg-white/5'}`}>
                        {value === 'all' ? 'All time' : `${value} days`}</Link>)}</nav>
                <Link href={`?period=${period}`} className="inline-flex min-h-11 items-center text-sm text-pink-300 hover:underline">Refresh data</Link>
            </div>
            <p className="text-xs text-gray-400">Updated {new Date(data.generatedAt).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })} EAT · {ALGORITHM} · Live retained data</p>
            <div className="flex flex-wrap gap-3 text-sm text-gray-300">{Object.entries(f).map(([key, enabled]) => <span key={key}>{key}: <strong className={enabled ? 'text-emerald-300' : 'text-amber-200'}>{enabled ? 'Enabled' : 'Disabled'}</strong></span>)}</div>
        </header>
        {!data.available ? <Panel title="Questionnaire analytics is not ready"><p className="text-gray-300">The database is missing questionnaire tables. Apply the existing questionnaire migrations before reviewing results.</p><p className="text-sm text-gray-400">Missing: {data.missing.join(', ')}</p></Panel> : <>
            <Panel title="Questionnaire completion" detail="People whose first saved preference/questionnaire action occurred in this period, measured by their current saved required answers. Deleted accounts are excluded. Completion does not imply verification or discovery eligibility.">
                <Stats items={[
                    { label: 'Started answering', value: number(s.started), hint: `${number(s.entered)} entered setup; ${number(s.zero)} have no saved required answers` },
                    { label: `Completed all ${data.required}`, value: number(s.complete), hint: `${percentage(s.complete, s.started)} of people with at least one saved answer` },
                    { label: 'Incomplete, recently progressing', value: number(s.recent), hint: 'At least one answer saved; latest saved progress within 7 days' },
                    { label: 'Incomplete, inactive 7+ days', value: number(s.inactive), hint: 'No saved answer activity for 7 days. This is a stall signal, not confirmed abandonment.' },
                ]} />
                {s.entered === 0 && <p className="text-sm text-gray-300">No questionnaire setup entries in this period. Try All time.</p>}
            </Panel>
            <Panel title="How far people get" detail="Each bar counts people with at least this many current required answers. Every bar uses the same setup cohort denominator.">
                <div className="space-y-4">{stages.map(stage => <div key={stage.step}>
                    <div className="mb-2 flex justify-between gap-4 text-sm text-gray-300"><span>{stage.step === 0 ? 'Entered setup' : stage.step === data.required ? `Finished ${stage.step}/${data.required}` : `${stage.step} or more answers`}</span><span className="tabular-nums">{number(stage.count)} · {percentage(stage.count, s.entered)}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-pink-400" style={{ width: `${s.entered ? stage.count / s.entered * 100 : 0}%` }} /></div>
                </div>)}</div>
            </Panel>
            <Panel title="Where progress stalls" detail="The next unanswered required question for incomplete people. This is saved progress, not proof they opened this question or stopped on a specific answer beat.">
                <Stats items={[
                    { label: 'Inactive near the start', value: number(data.progress.filter(row => row.step <= 10).reduce((sum, row) => sum + row.inactive, 0)), hint: 'Next required question: 1–10' },
                    { label: 'Inactive around the middle', value: number(data.progress.filter(row => row.step > 10 && row.step <= 20).reduce((sum, row) => sum + row.inactive, 0)), hint: 'Next required question: 11–20' },
                    { label: 'Inactive near the end', value: number(data.progress.filter(row => row.step > 20).reduce((sum, row) => sum + row.inactive, 0)), hint: `Next required question: 21–${data.required}` },
                ]} />
                <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="text-gray-300"><tr className="border-b border-white/10"><th className="py-3 pr-4">Question</th><th className="px-3 text-right">Saved answers</th><th className="px-3 text-right">Next for</th><th className="pl-3 text-right">Inactive 7+ days</th></tr></thead>
                    <tbody>{data.progress.map(row => <tr key={row.step} className="border-b border-white/10 last:border-0 text-gray-300"><th className="max-w-md py-3 pr-4 font-normal"><span className="mr-2 text-pink-300">{row.step}.</span>{row.prompt}</th><td className="px-3 text-right tabular-nums">{number(row.answered)}</td><td className="px-3 text-right tabular-nums">{number(row.next)}</td><td className="pl-3 text-right font-medium tabular-nums text-white">{number(row.inactive)}</td></tr>)}</tbody>
                </table></div>
                <p className="text-sm text-gray-400">People with zero answers are reported above. Optional/replacement answers do not inflate the {data.required}-answer requirement.</p>
            </Panel>
            <Panel title="Matching engine workload" detail="New telemetry counts candidates evaluated per ranking request, including repeated requests. Discovery and profile comparisons are included. Cache reuse is separated from new engine work.">
                {!r.available ? <p className="text-sm text-amber-200">Workload tracking starts with the first ranking request after this backend update. Historical total ranking operations cannot be reconstructed from the cache.</p> : <>
                    <Stats items={[
                        { label: 'Profiles ranked or reused', value: number(r.cacheHits + r.engineScored), hint: `${number(r.candidates)} candidates considered in ${number(r.requests)} requests; repeats count again` },
                        { label: 'New engine scores', value: number(r.engineScored), hint: `${number(r.batches)} successful engine batches` },
                        { label: 'Cached scores reused', value: number(r.cacheHits), hint: `${percentage(r.cacheHits, r.candidates)} of candidate evaluations` },
                        { label: 'Failed ranking requests', value: number(r.failed), hint: `${percentage(r.failed, r.requests)} of tracked requests` },
                    ]} />
                    <p className="text-xs text-gray-400">Telemetry available since {r.since ? new Date(r.since).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' }) : '—'} EAT. Partial work before failures is counted; internal HTTP retry attempts are not counted.</p>
                </>}
                <div className="border-t border-white/10 pt-5"><Stats items={[
                    { label: 'Profiles in current score cache', value: number(data.cache.profiles), hint: 'Unique people across revision-valid pairs; current snapshot, all time' },
                    { label: 'Current scored pairs', value: number(data.cache.pairs), hint: `${number(data.cache.ready)} ready; ${number(data.cache.insufficient)} insufficient evidence` },
                    { label: 'Average cached compatibility', value: data.cache.average === null ? '—' : `${data.cache.average.toFixed(1)} / 100`, hint: 'Ready pairs only. Score strength does not measure real-world success.' },
                ]} /></div>
            </Panel>
            <Panel title="Discovery reliability" detail="Recorded discovery outcomes during the selected period. Candidate totals count the full eligible result pool, not page impressions.">
                <Stats items={[
                    { label: 'Discovery requests', value: number(d.requests), hint: `${number(d.viewers)} unique identified viewers` },
                    { label: 'Empty results', value: number(d.empty), hint: `${percentage(d.empty, d.requests)} of requests` },
                    { label: 'Engine unavailable', value: number(d.failed), hint: `${percentage(d.failed, d.requests)} of recorded requests` },
                    { label: '95th percentile latency', value: d.p95 === null ? '—' : `${Math.round(d.p95)} ms`, hint: 'Recorded discovery outcomes; includes successful and failed requests' },
                ]} />
            </Panel>
            <Panel title="From rankings to connections" detail="Match and message counts exclude imported legacy pairs. Match creation uses connected time, not the first like. Action counts cover questionnaire endpoints, including actions on imported connections.">
                <Stats items={[
                    { label: 'Matches created', value: number(c.matches), hint: 'Retained unique pairs first connected in this period' },
                    { label: 'Matches with a message', value: number(c.messagingMatches), hint: `${percentage(c.messagingMatches, c.matches)} of these matches have a recorded message, including later activity` },
                    { label: 'Like actions', value: number(c.likes), hint: `${number(c.passes)} pass actions in the period` },
                    { label: 'Messages sent', value: number(c.messages), hint: 'Recorded questionnaire conversation messages in the period' },
                    { label: 'Active matches now', value: number(c.active), hint: 'Current all-time snapshot' },
                    { label: 'Unmatch actions', value: number(c.unmatched), hint: 'Actions during the selected period' },
                    { label: 'Block actions', value: number(c.blocked), hint: 'Actions during the selected period' },
                ]} />
            </Panel>
            <Panel title="Daily activity" detail={`Nairobi calendar days. ${period === 'all' ? 'The trend shows the last 90 days.' : 'The trend follows the selected period.'} Completion is the first retained progress event reaching ${data.required} answers; older 20-answer completions are excluded.`}>
                <QuestionnaireActivityChart data={data.daily} />
                <details><summary className="cursor-pointer py-3 text-sm text-pink-300">View exact daily counts</summary><div className="max-h-80 overflow-auto"><table className="w-full text-sm text-gray-300"><thead><tr><th className="py-2 text-left">Date (EAT)</th><th className="text-right">Entered setup</th><th className="text-right">Completed</th><th className="text-right">Matches</th></tr></thead><tbody>{data.daily.map(day => <tr key={day.date} className="border-t border-white/10"><th className="py-2 text-left font-normal">{day.date}</th><td className="text-right">{day.started}</td><td className="text-right">{day.completed}</td><td className="text-right">{day.matches}</td></tr>)}</tbody></table></div></details>
            </Panel>
            <p className="text-sm text-gray-400">Metrics describe retained server records. Unsaved drafts, question views and time spent on individual beats are not tracked. Ranking volume shows usage; completion and conversations show whether that usage leads somewhere.</p>
        </>}
    </div>;
}
