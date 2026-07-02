# Backend Improvement Phases

This folder breaks the backend matching brain into small implementation phases. Finish one phase, test it, and only then move to the next phase.

## Phase Index

1. [Phase 01: Data Foundation](./phase-01-data-foundation.md)
2. [Phase 02: Python Intelligence Worker](./phase-02-python-intelligence-worker.md)
3. [Phase 03: Backfill And Refresh Pipeline](./phase-03-backfill-and-refresh-pipeline.md)
4. [Phase 04: Activity And Behavior Signals](./phase-04-activity-and-behavior-signals.md)
5. [Phase 05: Recommendation Integration](./phase-05-recommendation-integration.md)
6. [Phase 06: Matchmaker Search API](./phase-06-matchmaker-search-api.md)
7. [Phase 07: Monitoring And Tuning](./phase-07-monitoring-and-tuning.md)

## Working Rule

Each phase must end with:

- database migration or code changes complete
- focused tests passing
- one manual verification path documented
- rollback notes updated
- no frontend dependency unless the phase explicitly says so
