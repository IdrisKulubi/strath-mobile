# LLM Matchmaker Phases

This folder breaks the LLM matchmaker work into buildable phases. Each phase should ship independently with tests or verification before moving on.

| Phase | File | Outcome |
| --- | --- | --- |
| 1 | `phase-01-conversation-shell.md` | Session-based matchmaker UI/API with scripted replies |
| 2 | `phase-02-llm-provider-layer.md` | OpenAI/Gemini provider abstraction |
| 3 | `phase-03-session-aware-search.md` | No-repeat search and one-candidate presentation |
| 4 | `phase-04-feedback-memory.md` | Feedback and user memory |
| 5 | `phase-05-structured-profile-intelligence.md` | Rich tags for accurate matching |
| 6 | `phase-06-quotas-and-limits.md` | Daily budget and graceful limit UX |
| 7 | `phase-07-quality-analytics-tuning.md` | Metrics, admin tools, safe rollout |
