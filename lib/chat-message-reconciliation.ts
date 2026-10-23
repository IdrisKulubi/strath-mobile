export function replaceOptimisticMessage<T extends { id: string; createdAt: string }>(
  current: T[],
  optimisticId: string,
  saved: T,
): T[] {
  const byId = new Map<string, T>();
  for (const message of current) {
    if (message.id !== optimisticId) byId.set(message.id, message);
  }
  byId.set(saved.id, saved);
  return [...byId.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}
