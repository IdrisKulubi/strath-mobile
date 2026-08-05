import { ApiError } from '@/lib/api-client';

export const MATCHMAKER_UNAVAILABLE_MESSAGE =
  'Matchmaker is temporarily unavailable. Please try again.';

export const MATCHMAKER_ERROR_TITLE = 'Something went wrong';

function looksLikeTechnicalMessage(message: string) {
  const trimmed = message.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) return true;
  if (trimmed.includes('"code"') && trimmed.includes('"path"')) return true;
  if (trimmed.includes('OpenAI Responses API failed')) return true;
  if (trimmed.includes('Invalid option: expected one of')) return true;
  return false;
}

export function getMatchmakerUserMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'MATCHMAKER_LLM_UNAVAILABLE') {
      return MATCHMAKER_UNAVAILABLE_MESSAGE;
    }

    if (looksLikeTechnicalMessage(error.message)) {
      return MATCHMAKER_UNAVAILABLE_MESSAGE;
    }
  }

  if (!(error instanceof Error)) {
    return MATCHMAKER_UNAVAILABLE_MESSAGE;
  }

  if (looksLikeTechnicalMessage(error.message)) {
    return MATCHMAKER_UNAVAILABLE_MESSAGE;
  }

  return error.message;
}
