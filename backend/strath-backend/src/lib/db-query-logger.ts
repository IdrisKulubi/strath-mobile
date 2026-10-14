type QueryLogEntry = {
    name: string;
    route?: string;
    durationMs: number;
};

const requestLogs = new Map<string, QueryLogEntry[]>();

function getRequestId(): string | null {
    if (typeof globalThis === "undefined") return null;
    return (globalThis as { __strathRequestId?: string }).__strathRequestId ?? null;
}

export function bindRequestId(requestId: string) {
    if (typeof globalThis !== "undefined") {
        (globalThis as { __strathRequestId?: string }).__strathRequestId = requestId;
    }
}

export function clearRequestId() {
    if (typeof globalThis !== "undefined") {
        delete (globalThis as { __strathRequestId?: string }).__strathRequestId;
    }
}

export async function logDbQuery<T>(name: string, fn: () => Promise<T>, route?: string): Promise<T> {
    if (process.env.NODE_ENV === "production" && process.env.DB_QUERY_LOG !== "1") {
        return fn();
    }

    const started = performance.now();
    try {
        return await fn();
    } finally {
        const durationMs = performance.now() - started;
        const requestId = getRequestId();
        const entry: QueryLogEntry = { name, route, durationMs: Math.round(durationMs * 10) / 10 };

        if (requestId) {
            const existing = requestLogs.get(requestId) ?? [];
            existing.push(entry);
            requestLogs.set(requestId, existing);
        }

        console.info("[DB]", {
            name,
            route: route ?? requestId ?? "unknown",
            durationMs: entry.durationMs,
        });
    }
}

export function flushRequestQueryLogs(requestId: string) {
    const entries = requestLogs.get(requestId) ?? [];
    requestLogs.delete(requestId);

    if (entries.length === 0) {
        return [];
    }

    const duplicates = entries.reduce<Record<string, number>>((acc, entry) => {
        acc[entry.name] = (acc[entry.name] ?? 0) + 1;
        return acc;
    }, {});

    const repeated = Object.entries(duplicates).filter(([, count]) => count > 1);
    if (repeated.length > 0) {
        console.warn("[DB] duplicate queries in request", { requestId, repeated });
    }

    return entries;
}
