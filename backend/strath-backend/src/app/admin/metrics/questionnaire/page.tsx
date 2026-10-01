import { getAdminQuestionnaireAnalytics } from '@/lib/actions/admin-questionnaire-analytics';
import { analyticsWindow } from '@/lib/services/questionnaire-analytics';
import { flags } from '@/lib/questionnaire/flags';
import { QuestionnaireDashboard } from './_dashboard';

export const dynamic = 'force-dynamic';

export default async function QuestionnaireMetricsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
    const period = analyticsWindow((await searchParams).period);
    const data = await getAdminQuestionnaireAnalytics(String(period));
    return <QuestionnaireDashboard data={data} featureFlags={flags()} />;
}
