# Compatibility questionnaire expansion: 20 → 32

Status: **implemented in the mobile and backend code; database seeding and deployment pending**  
Prepared: 2026-09-25

## Recommendation

Add **12 questions** after the current 20. Keep the existing Rising-sheet, one-question-at-a-time interaction. These questions cover long-term choices that are currently absent from the required journey. The catalogue already contains related optional questions (`q081`–`q100`), so implementation should reuse immutable question IDs where wording/options are fit for purpose and introduce new versioned IDs for changed wording. Do not edit a published question in place.

The first 20 already cover communication, disagreements, affection, time together, and appreciation. A large longitudinal synthesis found perceived commitment, appreciation, conflict, and other relationship-specific experiences more predictive of relationship quality than simple demographic similarity. This supports retaining those first 20 and adding a small set of concrete life-goal and lifestyle preferences, rather than assuming every shared trait improves a match. [Joel et al., 2020](https://pubmed.ncbi.nlm.nih.gov/32719123/).

## Proposed 12 questions

These are **user-facing drafts**, including the exact option families needed for review. “Prefer not to say” is a completed response for sensitive topics, not a skip. It must be neutral in matching and should never be inferred as a position. The current public-answer policy means saved choices and optional notes appear on a profile; make that disclosure clear before the sensitive section.

| # | Question | Answer choices | Catalogue relationship | Matching purpose |
| --- | --- | --- | --- | --- |
| 21 | Do you have children? | No · Yes · Prefer not to say | New versioned question | Separates current parenting from future plans. |
| 22 | Would you like to have children in the future? | Yes · No · Unsure · Prefer not to say | Replace wording/options of `q083:1` with a new version | Captures a future goal without conflating it with current children. |
| 23 | How do you feel about marriage for yourself? | I would like it · I am open to it · I do not want it · I am undecided | Reuse `q090:1` if its current wording/options are retained | Long-term commitment direction. |
| 24 | What role does faith or spirituality play in your life? | Central · Some role · Not part of my life · Still exploring · Prefer not to say | New versioned question | Distinguishes personal practice from a demand for partner similarity. |
| 25 | How important is shared religious practice with a partner? | Essential · Nice but optional · Not important · Prefer not to say | New version of `q084:1` if these options are adopted | Lets a person state whether faith alignment matters without asking for a religion label. |
| 26 | How do you feel about political differences in a relationship? | Comfortable with differences · Depends on the issue · Prefer broadly similar views · Need close alignment · Prefer not to say | New version of `q085:1` if the disclosure option is added | Measures tolerance of disagreement, without asking for a party or ideology. |
| 27 | How often do you drink alcohol? | Never · Occasionally · Most weeks · More often · Prefer not to say | New version of `q086:1` if frequency wording is adopted | Makes drinking patterns more comparable than “regularly in moderation.” |
| 28 | Do you smoke or vape nicotine? | No · Occasionally · Regularly · Trying to stop · Prefer not to say | New version of `q087:1` if vaping/disclosure are added | Relevant day-to-day compatibility; avoid making health judgments. |
| 29 | What relationship structure are you looking for? | Monogamy · Consensual non-monogamy · Still exploring · Prefer to discuss personally | Reuse `q089:1` if wording is retained | A direct relationship-goal alignment question. |
| 30 | When should partners discuss money and financial expectations? | Early · When things become serious · When sharing expenses · Prefer to discuss privately | Reuse `q082:1` if wording is retained | Tests comfort with financial communication without collecting income or debt. |
| 31 | How involved would you like extended family to be in your relationship? | Very involved · Involved with clear boundaries · Mostly independent · It depends on the situation | New version of `q088:1` if this replaces support-focused wording | Captures family expectations without implying a financial obligation. |
| 32 | How should household responsibilities be shared? | Roughly equally · Based on time and capacity · Through roles we agree on · Decide together as needs change | New version of `q100:1` or `q070:1` | Gives a concrete form to fairness and everyday cooperation. |

### Why these topics

- **Children and family:** Fertility-intention disagreement is relevant to couple decisions; a study of couples in urban Kenya found discordant desires common enough to warrant direct communication. The question should ask both current parenthood and future intention separately. [Partner communication and fertility goals in urban Kenya](https://pmc.ncbi.nlm.nih.gov/articles/PMC3786372/).
- **Religion:** A dyadic study in later-life couples associated differences in religious service attendance with lower relationship satisfaction. It does not establish that every couple needs shared faith, so the user's own importance and partner-acceptance choices should determine its weight. [Schafer, 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC7357957/).
- **Politics:** Political similarity is not a reliable universal proxy for relationship quality; two longitudinal samples found little support that attitude similarity predicted satisfaction. Ask whether differences matter to this person rather than force ideological similarity. [Dyadic political-attitudes study](https://pmc.ncbi.nlm.nih.gov/articles/PMC13089360/).
- **Alcohol:** Longitudinal work links discrepant heavy drinking patterns with lower marital satisfaction, but its samples and outcomes do not justify penalizing ordinary occasional drinking. Ask frequency and use the person's acceptable-partner choices. [Homish & Leonard, 2007](https://pmc.ncbi.nlm.nih.gov/articles/PMC2289776/).
- **Money and household roles:** Couple research identifies financial disagreements, especially perceived fairness and responsibility, as meaningful relationship issues. Questions should cover how people discuss and share responsibilities, rather than financial status. [Financial disagreement study](https://pmc.ncbi.nlm.nih.gov/articles/PMC10632137/).

## Matching and implementation requirements

1. Make the selected 32 **specific question versions** required. Counting any 32 published answers would let unrelated optional answers satisfy the gate. A person with 20 saved answers should resume at question 21; do not erase or republish existing answers.
2. Keep the current own answer → acceptable partner answers → named importance → optional context sequence. For “Prefer not to say” / “Prefer to discuss personally,” avoid asking incompatible partner and importance follow-ups; store a neutral weight and exclude that question from compatibility evidence. This is a question answered without compelled disclosure.
3. Use the person's stated importance and acceptable options for scoring. Do not turn religion, politics, drinking, or smoking into universal automatic exclusions. Relationship science does not support a guarantee of better outcomes from adding these fields.
4. Keep public visibility for new and edited answers as already requested, while preserving previously saved private answers. The sensitive section must disclose profile visibility before a user answers; never expose unpublished drafts.
5. Update both mobile and backend completion counts, discovery gates, progress, copy, and tests together. Version changed catalogue questions and preserve older answers/history. Review the release transition for people who already passed the 20-answer gate so they resume smoothly at the added questions.
6. Measure whether these additions actually help: track questionnaire completion/drop-off and explicit post-match feedback, then compare match quality with the previous journey. Do not claim the questionnaire is scientifically validated or that more questions alone make the algorithm better.

## Implementation record

The user authorized enabling all 32 questions on 2026-09-25. The implementation uses the first 20 question IDs plus the following ordered IDs: `q101:1`, `q083:2`, `q090:1`, `q102:1`, `q084:2`, `q085:2`, `q086:2`, `q087:2`, `q089:1`, `q082:1`, `q088:2`, `q100:2`. Nine new immutable catalogue entries were added; `q090:1`, `q089:1`, and `q082:1` retain their existing wording and option labels. The catalogue now contains 109 questions, of which these 32 exact versions are required.

The backend counts only those 32 question IDs for completion and discovery. People who previously saved the first 20 remain at 20/32 and continue with the children question. Neutral responses save with weight zero, no accepted-partner preferences, and no optional note; the matching engine omits them from scoring evidence. New and edited answers remain public, while existing private answers are not republished. The mobile flow keeps the same Rising-sheet design and shows seven progress segments for 32 answers.

The catalogue is seeded explicitly, not during app startup. For rollout, seed the nine added entries into the intended database using the existing `seed:questionnaire-catalogue -- --apply` procedure **before** activating the updated backend and mobile flow; check that 109 entries are published. No production seed or deployment has been run in this task. Device appearance and onboarding interaction remain for the user's mobile test.
