# ModelShift Repository Rules

This repository contains the single OpenAI Build Week Education submission **ModelShift — Proof after help**. `FINAL_PRODUCT_SPEC.md` is the highest-authority product contract. The root Codex task is the integration authority.

## Non-negotiable rules

1. Build only the single ModelShift force-and-motion loop.
2. Deterministic code owns physics, correctness, scoring, permissions, and proof mode.
3. GPT-5.6 interprets language but does not control objective outcomes.
4. Every model action must pass schema and semantic validation.
5. The product must work completely when the model fails.
6. No assistance is available during cold transfer.
7. No second subject or concept.
8. No accounts, database, dashboard, broad chat, gamification, or generated physics.
9. No unsupported claims about learning outcomes.
10. Every feature must strengthen initial model → experiment → independent proof.
11. Tests and rendered verification are required before declaring completion.
12. The principal task owns shared contracts and merges.
13. Do not overwrite human-authored governing files.
14. Preserve the principal task for `/feedback`.
15. Deploy before optional polish.

## Engineering boundaries

- `src/domain/physics/**` is pure deterministic TypeScript. Rendering consumes precomputed samples and never integrates physics.
- `src/domain/learning/**` is the typed transition and assistance-policy layer. Invalid events fail closed.
- `src/content/**` contains authored hypotheses, probes, hints, scenarios, answers, and compatibility rules.
- `src/lib/ai/**` and `app/api/**` may return only validated authored IDs and learner-text evidence spans.
- `src/components/**` presents the experience but does not own correctness or permission rules.
- Do not expose secrets through `NEXT_PUBLIC_*`, log raw learner explanations, or persist learner identity.
- Do not edit `package.json`, lockfiles, root config, shared contracts, or another task's owned files without principal coordination.

## Required verification

Run targeted tests for each owned area. Before integration or handoff, run the full available lint, typecheck, unit, evaluation, production-build, and browser test suite. Verify 1440×900 and 390×844, keyboard-only use, reduced motion, console health, fallback operation, and structural absence of help in proof mode.
