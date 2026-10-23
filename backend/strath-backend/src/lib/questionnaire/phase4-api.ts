import { z } from "zod";

import { comparison, discovery, safetyAction, type Phase4Dependencies } from "./phase4-service";
import { DomainError } from "./phase2-service";

export type Phase4Request = {
    userId: string;
    matchingEnabled: boolean;
    method: string;
    path: string[];
    query?: Record<string, string>;
    body?: unknown;
};

export async function handlePhase4Request(request: Phase4Request, dependencies: Phase4Dependencies = {}) {
    if (!request.matchingEnabled) throw new DomainError("Compatible discovery is unavailable", 404);
    if (request.method === "POST" && request.path[0] === "block") {
        return safetyAction(request.userId, request.body, "block");
    }
    if (request.method === "POST" && request.path[0] === "report") {
        return safetyAction(request.userId, request.body, "report");
    }
    if (request.method !== "GET") throw new DomainError("Not found", 404);
    if (request.path[0] === "discovery") {
        const page = z.coerce.number().int().min(0).max(250).default(0).parse(request.query?.page);
        return discovery(request.userId, page, dependencies);
    }
    if (request.path[0] === "comparison" && request.path[1]) {
        return comparison(request.userId, request.path[1], dependencies);
    }
    throw new DomainError("Not found", 404);
}
