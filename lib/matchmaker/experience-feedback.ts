export function shouldPromptForMatchmakerFeedback(input: {
  sessionDay: string;
  deferredOn: string | null;
  searchesFinished: boolean;
}) {
  if (input.deferredOn === input.sessionDay) return false;
  if (input.deferredOn) return true;
  return input.searchesFinished;
}
