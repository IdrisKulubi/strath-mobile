export type DemoSessionPayload = {
  success: boolean;
  data?: { token?: string; user?: { id?: string; name?: string; email?: string }; expiresAt?: string };
};

export function demoSignInError(error: unknown): string {
  if (error && typeof error === 'object') {
    const details = error as { isNetworkError?: boolean; status?: number; code?: string };
    if (details.isNetworkError) return 'Could not reach StrathSpace. Check your connection and try again.';
    if (details.code === 'DEMO_LOGIN_DISABLED' || details.status === 403) return 'Demo access is currently disabled.';
  }
  return 'Demo access is temporarily unavailable. Please try again shortly.';
}

export function parseDemoSession(payload: DemoSessionPayload) {
  const data = payload?.data;
  if (!payload?.success || !data || typeof data.token !== 'string' || !data.token.trim() ||
      typeof data.user?.id !== 'string' || !data.user.id || typeof data.expiresAt !== 'string' ||
      !Number.isFinite(Date.parse(data.expiresAt)) || Date.parse(data.expiresAt) <= Date.now()) {
    throw new Error('Invalid demo session response');
  }
  return { session: { token: data.token, userId: data.user.id, expiresAt: data.expiresAt }, user: data.user };
}
