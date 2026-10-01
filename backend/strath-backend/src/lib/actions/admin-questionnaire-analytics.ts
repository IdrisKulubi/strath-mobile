'use server';
import { requireAdmin } from '@/lib/admin-auth';
import { analyticsWindow, loadQuestionnaireAnalytics } from '@/lib/services/questionnaire-analytics';

export async function getAdminQuestionnaireAnalytics(period: string) {
    await requireAdmin();
    return loadQuestionnaireAnalytics(analyticsWindow(period));
}
