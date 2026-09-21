import { query } from "./db";
import * as questionnaire from "./phase2-service";

export type Phase2Request = {
    userId: string | null;
    collectionEnabled: boolean;
    featureFlags?: { collection: boolean; matching: boolean; shell: boolean };
    method: string;
    path: string[];
    body?: unknown;
};

export async function handlePhase2Request(request: Phase2Request) {
    if (!request.userId) throw new questionnaire.DomainError("Authentication required", 401);
    const [account] = await query<{ deleted_at: Date | null } & import("pg").QueryResultRow>(
        'SELECT deleted_at FROM "user" WHERE id = $1',
        [request.userId],
    );
    if (!account || account.deleted_at) throw new questionnaire.DomainError("Account unavailable", 403);

    const [resource] = request.path;
    if (request.method === "GET" && resource === "experience") {
        return request.featureFlags ?? { collection: request.collectionEnabled, matching: false, shell: false };
    }
    if (!request.collectionEnabled) throw new questionnaire.DomainError("Questionnaire unavailable", 404);
    if (request.method === "GET" && resource === "status") return questionnaire.status(request.userId);
    if (request.method === "GET" && resource === "questions") return questionnaire.questions(request.userId);
    if (request.method === "GET" && resource === "profile") return questionnaire.ownProfile(request.userId);
    if (request.method === "PUT" && resource === "answers") return questionnaire.saveAnswer(request.userId, request.body);
    if (request.method === "DELETE" && resource === "answers") return questionnaire.deleteAnswer(request.userId, request.body);
    if (request.method === "POST" && resource === "skip") return questionnaire.skipQuestion(request.userId, request.body);
    if (request.method === "PUT" && resource === "preferences") return questionnaire.savePreferences(request.userId, request.body);
    if (request.method === "PUT" && resource === "profile") return questionnaire.saveProfile(request.userId, request.body);
    throw new questionnaire.DomainError("Not found", 404);
}
