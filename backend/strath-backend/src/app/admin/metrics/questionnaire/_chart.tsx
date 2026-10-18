'use client';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DailyActivity } from '@/lib/services/questionnaire-analytics';

export function QuestionnaireActivityChart({ data }: { data: DailyActivity[] }) {
    return <div className="h-72 w-full" role="img" aria-label="Daily setup entries, 32-answer completions, and questionnaire matches. Exact counts are in the daily activity table.">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 12, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={value => value.slice(5)} tick={{ fill: '#A8A0A5', fontSize: 12 }} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fill: '#A8A0A5', fontSize: 12 }} width={35} />
                <Tooltip contentStyle={{ background: '#151215', borderColor: '#2E292E', color: '#F7F3F5' }} />
                <Legend />
                <Line dataKey="started" name="Entered setup" stroke="#A8A0A5" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line dataKey="completed" name="Completed 32 answers" stroke="#FF5C97" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line dataKey="matches" name="Matches created" stroke="#3DB87A" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
        </ResponsiveContainer>
    </div>;
}
