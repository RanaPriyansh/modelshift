# FORGE

**Build something real. Prove it’s yours.**

FORGE is a browser-local seven-day project sprint for students who have an idea worth making but need help scoping it, finishing it, and explaining what is genuinely theirs.

The primary product is deliberately practical: choose one audience, define one Day 7 finish line, make a meaningful move each day, attach inspectable evidence, complete a protected Proof Lab, and leave with an honest project record. No account, feed, streak, score, ranking, or mandatory AI is required.

## The product loop

| Day | Move | Outcome |
| --- | --- | --- |
| 1 | Define and scope | One useful finish line |
| 2 | Meet the user or problem | A real observation that changes the plan |
| 3 | Build the core | The smallest end-to-end outcome |
| 4 | Test and repair | The most important failure removed |
| 5 | Polish | A clear, inspectable main path |
| 6 | Proof Lab | Explain, change, and reality-check the work without generative AI |
| 7 | Deliver and reflect | Shipped artifacts, honest limits, and next questions |

Completion is not a streak or a checklist score. A sprint is complete when something useful exists and the learner can show the result, the decisions behind it, and the edges that remain open.

## Why FORGE exists

AI makes provisional assistance abundant. Finished work, judgment, and credible evidence of capability remain scarce.

FORGE is designed around that complement:

- **Artifact before activity.** The product optimizes for a useful outcome, not time spent inside the app.
- **Scope before ambition.** One audience and one finish line prevent a vague project from becoming an infinite backlog.
- **Proof without surveillance theater.** Evidence is inspectable and learner-declared. FORGE does not pretend to verify identity, mastery, or authorship.
- **Help withdraws before proof.** Day 6 protects a short no-generative-AI pass so the learner must explain and change the work directly.
- **Local first.** Sprint data stays in the browser unless the learner explicitly exports or shares it.
- **No attention traps.** There is no feed, leaderboard, score, streak, or notification pressure.

The initial wedge is university students in computing, product, design, research, and maker communities with an imminent reason to show work: an internship, hackathon, club project, capstone, independent study, or portfolio rebuild.

Read the full [product direction, game-theory analysis, and PMF plan](docs/forge-sprint-product-direction.md).

## What is implemented

- project-first homepage and fast idea intake;
- guided sprint setup with a concrete Day 7 finish line;
- four starting patterns: campus tool, portfolio case study, research explainer, and workflow automation;
- safe browser-local storage for multiple sprints;
- a focused daily workbench with notes, decisions, and inspectable evidence links;
- explicit Day 6 Proof Lab declarations and checks;
- Day 7 delivery, reflection, and open-edge capture;
- My Sprints, Templates, and exportable project proof;
- optional Labs containing the existing authored learning Worlds;
- strict parsing, bounded local data, stale-write protection, and browser tests across desktop and mobile.

The earlier learning-system work remains available at `/learn` and through `/labs`. It is an optional resource when a project exposes a real knowledge gap, not a required mode shift before the learner can build.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Product homepage and idea intake |
| `/build` | Start a sprint |
| `/build/new` | Scope the project and create its seven-day map |
| `/build/[id]` | Daily sprint workbench |
| `/sprints` | Browser-local project library |
| `/templates` | Reusable project patterns |
| `/proof/[id]` | Inspectable learner-declared project proof |
| `/labs` | Optional learning Labs |
| `/learn` | Preserved learning-planner and authored Worlds |

## Data and trust boundaries

Sprint records use versioned browser `localStorage`. The parser rejects malformed or unsupported data without silently overwriting it, and writes use revision checks to reduce stale-tab conflicts.

This MVP does **not** provide cloud sync, account recovery, public profiles, collaboration, verified credentials, automated authorship detection, or secure evidence custody. A proof page is a structured learner declaration, not a cryptographic or institutional certification. Evidence links are opened by the viewer and should be treated according to their original source.

The repository also contains staged identity, evidence, event, and Supabase foundations from the earlier Learning OS. Those systems are not required by the sprint MVP and do not imply that a live cloud service is connected.

## Architecture

FORGE is a Next.js modular monolith.

- `app/` owns routes, metadata, and the product visual layers.
- `src/components/forge-sprint/` owns the sprint homepage, setup, workbench, templates, library, Labs, and proof surfaces.
- `src/lib/forge-sprint/` owns the versioned domain model, validation, completion rules, strict parsing, and browser storage adapter.
- `src/components/forge/`, `src/worlds/`, and `src/forge/` contain the preserved authored learning experience.
- `tests/e2e/` exercises product, mobile, keyboard, visual-system, and legacy compatibility contracts.
- `docs/` contains the product thesis, architecture, operations, and explicit release boundaries.

## Run locally

Requirements:

- Node.js 22 or newer
- pnpm 11.9.0

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

No model credential is required for the sprint product or authored Labs. Existing optional model-backed planner and interpretation paths remain off by default.

## Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm eval
pnpm build
pnpm test:e2e
```

The GitHub quality workflow also verifies that dependency installation does not mutate the committed lockfile, builds the production artifact, and runs the browser release contract.

## Product-market-fit experiment

The MVP intentionally has no covert analytics. The first evidence should come from a consented 12–20 student pilot across two high-intent contexts.

The primary activation is a valid sprint plus the first saved move. The north-star outcome is a useful artifact shipped with an inspectable proof record. The important questions are whether learners finish narrower projects, can explain their decisions more clearly, voluntarily show the proof to someone who matters, and would be meaningfully disappointed to lose FORGE.

Do not add cloud sync, a public feed, scoring, or social mechanics until people repeatedly complete and share the core build-to-proof loop.

## Release boundary

A local build, branch, pull request, or test run is not a public deployment. The canonical public release record remains [docs/operations/CURRENT_RELEASE.md](docs/operations/CURRENT_RELEASE.md), and its unresolved provenance gates still apply.
