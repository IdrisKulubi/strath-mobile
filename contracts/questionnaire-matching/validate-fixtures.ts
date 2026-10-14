import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

type Answer = {
  questionVersionId: string;
  answerId: string;
  acceptableAnswerIds: string[];
  weight: 0 | 1 | 10 | 50 | 250;
};
type Person = { id: string; revision: number; answers: Answer[] };
type Request = { viewer: Person; candidates: Person[] };
type Result = {
  candidateId: string;
  viewerRevision: number;
  candidateRevision: number;
  algorithmVersion: "questionnaire-v1";
  status: "ready" | "insufficient_evidence";
  score: number | null;
  sharedCount: number;
  evidenceCount: number;
};

const path = fileURLToPath(new URL("./examples.json", import.meta.url));
const fixture = JSON.parse(readFileSync(path, "utf8")) as {
  cases: { name: string; request: Request; response: { results: Result[] } }[];
};

function score(viewer: Person, candidate: Person): Result {
  const other = new Map(candidate.answers.map((answer) => [answer.questionVersionId, answer]));
  let viewerEarned = 0;
  let candidateEarned = 0;
  let viewerTotal = 0;
  let candidateTotal = 0;
  let sharedCount = 0;
  let evidenceCount = 0;
  for (const own of viewer.answers) {
    const theirs = other.get(own.questionVersionId);
    if (!theirs) continue;
    sharedCount += 1;
    viewerTotal += own.weight;
    candidateTotal += theirs.weight;
    if (own.acceptableAnswerIds.includes(theirs.answerId)) viewerEarned += own.weight;
    if (theirs.acceptableAnswerIds.includes(own.answerId)) candidateEarned += theirs.weight;
    if (own.weight > 0 && theirs.weight > 0) evidenceCount += 1;
  }
  const ready = evidenceCount >= 10 && viewerTotal > 0 && candidateTotal > 0;
  return {
    candidateId: candidate.id,
    viewerRevision: viewer.revision,
    candidateRevision: candidate.revision,
    algorithmVersion: "questionnaire-v1",
    status: ready ? "ready" : "insufficient_evidence",
    score: ready ? 100 * Math.sqrt((viewerEarned / viewerTotal) * (candidateEarned / candidateTotal)) : null,
    sharedCount,
    evidenceCount,
  };
}

assert.equal(fixture.cases.length, 6);
for (const example of fixture.cases) {
  assert.equal(example.request.candidates.length, 1, example.name);
  const actual = score(example.request.viewer, example.request.candidates[0]);
  assert.deepEqual(actual, example.response.results[0], example.name);
  assert.deepEqual(Object.keys(actual).sort(), [
    "algorithmVersion",
    "candidateId",
    "candidateRevision",
    "evidenceCount",
    "score",
    "sharedCount",
    "status",
    "viewerRevision",
  ]);
}
console.log(`Validated ${fixture.cases.length} shared questionnaire contract examples.`);
