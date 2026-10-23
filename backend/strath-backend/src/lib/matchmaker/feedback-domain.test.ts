import test from "node:test";
import assert from "node:assert/strict";

import {
    buildMatchmakerFeedbackProposal,
    feedbackReasonNeedsDetail,
    sanitizeMatchmakerFeedbackDetail,
    hasRecordedFeedbackSubmission,
    sanitizeMatchmakerMemoryLabel,
} from "@/lib/matchmaker/feedback-domain";

test("candidate feedback categories only request detail when future learning needs it", () => {
    assert.equal(feedbackReasonNeedsDetail("relationship_goals"), false);
    assert.equal(feedbackReasonNeedsDetail("lifestyle_mismatch"), true);
    assert.equal(buildMatchmakerFeedbackProposal({ reasonCode: "lifestyle_mismatch" }), null);
});

test("retry submission ids are recognized without inspecting private detail", () => {
    const history = [{ submissionId: "feedback-123456", reason: "private words" }];
    assert.equal(hasRecordedFeedbackSubmission(history, "feedback-123456"), true);
    assert.equal(hasRecordedFeedbackSubmission(history, "feedback-other"), false);
});

test("future learning proposal is a confirmed, reversible brief operation", () => {
    const proposal = buildMatchmakerFeedbackProposal({
        reasonCode: "communication_style",
        detail: "more direct communication",
    });
    assert.equal(proposal?.summary, "Prefer this communication style: more direct communication");
    assert.deepEqual(proposal?.operation, {
        type: "add",
        category: "communication",
        value: "more direct communication",
        sentiment: "prefer",
        importance: "prefer",
        certainty: "confirmed",
        source: "feedback",
        metadata: { reasonCode: "communication_style", userConfirmed: true },
    });
});

test("user-facing feedback detail strips internal prefixes, personality tokens, and separators", () => {
    assert.equal(sanitizeMatchmakerFeedbackDetail("avoid:calm | INFJ_music"), "calm music");
    assert.equal(sanitizeMatchmakerFeedbackDetail("INFJ"), null);
});

test("memory labels hide internal prefixes, personality tokens, and sentinel values", () => {
    assert.equal(sanitizeMatchmakerMemoryLabel("avoid:calm"), "calm");
    assert.equal(sanitizeMatchmakerMemoryLabel("INFJ"), null);
    assert.equal(sanitizeMatchmakerMemoryLabel("never"), null);
});
