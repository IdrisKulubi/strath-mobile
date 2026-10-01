import { NextRequest, NextResponse } from 'next/server';
import { APP_FEATURE_KEYS, isFeatureEnabled } from '@/lib/feature-flags';
import { flags } from '@/lib/questionnaire/flags';
import { createReviewDemoSession, ReviewDemoError } from '@/lib/services/review-demo-session';

export async function POST(request: NextRequest) {
    try {
        const enabled = await isFeatureEnabled(APP_FEATURE_KEYS.demoLoginEnabled, false);
        const data = await createReviewDemoSession({ enabled, questionnaireEnabled: flags().shell,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            userAgent: request.headers.get('user-agent') });
        return NextResponse.json({ success:true,data }, { headers: { 'Cache-Control':'no-store' } });
    } catch (error) {
        if (error instanceof ReviewDemoError) {
            return NextResponse.json({ success:false,error:error.message,code:error.code }, { status:error.status });
        }
        console.error('Demo authentication failed');
        return NextResponse.json({ success:false,error:'Demo access is temporarily unavailable. Please try again.',code:'DEMO_AUTH_FAILED' }, { status:503 });
    }
}
