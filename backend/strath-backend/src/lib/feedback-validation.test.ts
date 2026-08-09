import assert from "node:assert/strict";
import test from "node:test";

import { appFeedbackSchema } from "@/lib/validation";

test("general app feedback still requires a written message", () => {
    const result = appFeedbackSchema.safeParse({
        category: "general",
        message: "",
        source: "app",
    });

    assert.equal(result.success, false);
});

test("Matchmaker feedback requires stars but allows an empty comment", () => {
    const result = appFeedbackSchema.safeParse({
        category: "general",
        message: "",
        source: "matchmaker_v2",
        rating: 4,
    });

    assert.equal(result.success, true);
});

test("Matchmaker feedback rejects ratings outside the five-star scale", () => {
    const result = appFeedbackSchema.safeParse({
        category: "general",
        message: "I do not like it",
        source: "matchmaker_v2",
        rating: 6,
    });

    assert.equal(result.success, false);
});
