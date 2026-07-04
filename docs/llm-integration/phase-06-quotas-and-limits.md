# Phase 6: Quotas And Graceful Limits

## Goal

Control LLM and search costs without making the product feel cold. The user should understand that the matchmaker is protecting quality, not simply blocking them.

## Backend Scope

- Add daily search limit settings.
- Track per-session and per-day search count.
- Separate cheap conversation turns from expensive candidate searches.
- Add quota response metadata:
  - remaining searches
  - reset time
  - limit reason

## Product Rules

- Searching candidates consumes quota.
- Clarifying questions may not consume quota.
- Interested/Pass does not consume quota.
- "Find another" consumes quota only when it triggers a new backend search.

## Limit Experience

When quota is reached:

```txt
I do not want to keep showing weaker matches today. I have saved what I learned, and tomorrow I can search again with that in mind.
```

Offer useful actions:

- Improve my profile
- Help me describe what I want
- Give me a date idea
- Save this for tomorrow

## Verification

- Quota prevents additional searches.
- Conversation can continue after quota.
- Remaining count is visible in API response.
- Reset timing is correct for Nairobi day boundaries.
