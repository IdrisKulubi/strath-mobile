import test from "node:test";
import assert from "node:assert/strict";

import { getDailyMatchesPollInterval, MIN_DAILY_MATCHES_POLL_MS } from "@/lib/daily-matches-polling";
import { getPrimaryProfilePhoto, getProfileFirstName } from "@/lib/db/queries/profiles";

test("getDailyMatchesPollInterval never polls faster than 30 seconds", () => {
    const soon = new Date(Date.now() + 5_000).toISOString();
    assert.equal(
        getDailyMatchesPollInterval({
            mode: "matches",
            matches: [{ expiresAt: soon }],
        }),
        MIN_DAILY_MATCHES_POLL_MS,
    );
});

test("getDailyMatchesPollInterval uses 60 seconds when there are no matches", () => {
    assert.equal(
        getDailyMatchesPollInterval({ mode: "matches", matches: [] }),
        60_000,
    );
});

test("profile card helpers prefer explicit profile fields", () => {
    const profile = {
        userId: "user-1",
        firstName: "Ada",
        age: 21,
        profilePhoto: "profile.jpg",
        photos: ["photo-1.jpg"],
        bio: "bio",
        aboutMe: null,
        interests: [],
        personalityAnswers: null,
        course: null,
        university: null,
        faceVerificationStatus: "verified",
        faceVerificationRequired: true,
        isVisible: true,
        user: {
            name: "Ada Lovelace",
            profilePhoto: null,
            image: "fallback.jpg",
        },
    };

    assert.equal(getProfileFirstName(profile), "Ada");
    assert.equal(getPrimaryProfilePhoto(profile), "photo-1.jpg");
});
