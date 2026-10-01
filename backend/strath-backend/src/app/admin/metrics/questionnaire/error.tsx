'use client';
export default function QuestionnaireMetricsError({ reset }: { reset: () => void }) {
    return <div className="space-y-4 p-8"><h1 className="text-xl font-semibold">Analytics could not load</h1><p className="text-gray-300">The backend could not read questionnaire metrics. This is not a zero-results report.</p><button className="min-h-11 rounded-full border border-white/20 px-5" onClick={reset}>Try again</button></div>;
}
