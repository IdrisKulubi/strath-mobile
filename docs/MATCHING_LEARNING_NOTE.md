# Matching Learning Note

This is a reminder for when we have enough real usage data to make matching smarter with learning instead of only hand-tuned rules.

## Goal

Upgrade matching from rule-based scoring to outcome-based ranking.

## Data We Need

- recommendation shown
- profile opened
- liked
- passed
- mutual yes / mutual match
- chat started
- first reply sent
- call completed
- date scheduled
- positive post-date feedback

## Models / Scores To Predict

- probability of like
- probability of mutual match
- probability of conversation starting
- probability of real date happening
- probability of positive date feedback

## Rollout Plan

1. Add event logging for recommendation impressions and outcomes.
2. Build a training dataset from real user behavior.
3. Train a simple ranking model and compare it against the current score.
4. Ship it behind a feature flag.
5. Monitor mutual matches, replies, dates, and fairness/diversity.

## Important Guardrails

- keep hard safety and preference filters before ranking
- avoid over-showing only the most popular profiles
- keep some exploration so the model can learn new tastes
- review performance by campus, gender preference, and activity level

## Current Status

Today we use a shared ranking engine, but it is still hand-tuned.
Once enough real data exists, this note is the checkpoint to start the learning phase.
