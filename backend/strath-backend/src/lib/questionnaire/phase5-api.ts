import { DomainError } from "./phase2-service";
import { notifyQuestionnaireMatch } from "./phase5-notifications";
import { listConnections, listLikes, saveDecision, unmatch, type Phase5Dependencies } from "./phase5-service";

export type Phase5Request = {
    userId: string;
    matchingEnabled: boolean;
    method: string;
    path: string[];
    body?: unknown;
};

export async function handlePhase5Request(request: Phase5Request, dependencies: Phase5Dependencies = {}) {
    if (!request.matchingEnabled) throw new DomainError("Matching unavailable", 404);
    const [resource] = request.path;
    if (request.method === "GET" && resource === "likes") return listLikes(request.userId);
    if (request.method === "GET" && resource === "connections") return listConnections(request.userId);
    if (request.method === "POST" && resource === "decisions") {
        return saveDecision(request.userId, request.body, {
            notifyMatch: dependencies.notifyMatch ?? notifyQuestionnaireMatch,
        });
    }
    if (request.method === "POST" && resource === "unmatch") return unmatch(request.userId, request.body);
    throw new DomainError("Not found", 404);
}
