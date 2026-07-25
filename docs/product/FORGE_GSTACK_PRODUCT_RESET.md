# FORGE Product Reset — gstack Decision Record

**Status:** implementation candidate  
**Date:** 2026-07-26  
**Governing loop:** `GOAL → PATH → WORK → PROOF`

## Executive decision

**FORGE is the product.**

ModelShift is not a second product, parallel app, navigation destination, or umbrella brand. It is the historical name for one valuable protocol inside FORGE:

1. commit a prediction or causal model,
2. expose competing explanations,
3. run an authored or deterministic test,
4. inspect the consequence,
5. rebuild the principle,
6. remove assistance,
7. transfer into a changed problem,
8. record only the evidence that transfer can support.

The public name for this mechanism is **Forge Proof Lab**, or simply **Proof Lab**. Internal code and historical documents may retain ModelShift identifiers when renaming them would add risk without helping the learner.

> **Forge turns a real goal into a credible path, gives the learner the next useful piece of work, and shows what remains theirs after the help is gone.**

## Office-hours synthesis

### Demand reality

The useful demand signal is not “people want another education platform.” It is the repeated behaviour of ambitious learners assembling a path from ChatGPT, YouTube, search, courses, notes, and projects while remaining unsure about:

- what to do next,
- which sources deserve trust,
- whether progress is merely assisted completion,
- what they can still explain or perform independently.

No current evidence proves that a long intake, broad Learning OS framing, or many top-level surfaces are desired. Those are hypotheses.

### Status-quo competitor

```text
Goal
  ↓
Search / ChatGPT / YouTube / course catalog
  ↓
Too many resources and fluent explanations
  ↓
Passive consumption or assisted completion
  ↓
No trustworthy answer to “what can I do alone?”
```

FORGE wins only when it makes this stack materially clearer and more truthful.

### Desperate, specific user

The first user is a self-directed older teen or young adult with a meaningful goal, enough agency to work, and no credible route from ambition to independently demonstrated capability.

They do not need another generic tutor. They need a trustworthy next move and a way to distinguish assistance from ownership.

### Narrowest wedge

```text
ONE REAL GOAL
      ↓
ONE EDITABLE PATH
      ↓
ONE BOUNDED WORK SESSION
      ↓
ONE PROOF LAB
      ↓
ONE INDEPENDENT TRANSFER
      ↓
ONE NARROW EVIDENCE RECORD
```

This loop should become excellent before FORGE expands into a universal curriculum, mentor network, social layer, school operating system, or marketplace.

### Observation and surprise

The repository already demonstrates unusually strong authored contracts, safety boundaries, deterministic validators, and evidence discipline. The surprising weakness is presentation: the product asks the learner to configure the system before demonstrating value.

Age mode, starting point, success shape, depth, prior knowledge, desired outcome, time, constraints, and representation needs are useful controls. Showing all of them before the first result makes FORGE feel like intake bureaucracy rather than a capability engine.

The reset keeps those controls but moves them behind optional progressive disclosure.

### Future fit

As fluent explanations become abundant, the scarce outputs become:

- a credible sequence of work,
- source and claim boundaries,
- decisions about where AI may assist,
- independent transfer,
- evidence that does not overclaim.

FORGE is future-fit when it owns those outputs. The underlying ModelShift protocol matters because it measures the learner after assistance is withdrawn.

## Product architecture

### Public surface

The homepage must answer four questions quickly:

1. What is FORGE?
2. What can it do for me now?
3. How is it different from asking an AI?
4. What can I actually try?

The primary hierarchy is:

```text
1. One goal or question
2. One primary action: Shape my first move
3. Optional personalization
4. Four working paths
5. The Forge method
6. Trust and evidence boundaries
```

Studio and Trail remain reachable by direct URL for ongoing development, but they are removed from primary navigation until they deliver a complete learner outcome.

### Eventual authenticated surface

```text
Home          → one next action
My Plan       → editable path and dependencies
Study         → resources and active work
Proof Lab     → misconception, test, transfer
Project       → real artifact
Evidence      → bounded records and export
Explore       → optional adjacent paths
Settings      → identity, access, privacy, continuity
```

This decision does not pretend that the full authenticated system is already shipped.

### Naming contract

| Concept | Public name | Internal or historical name |
|---|---|---|
| Product | FORGE | FORGE |
| Core loop | Goal → Path → Work → Proof | capability pipeline |
| Deep-learning mechanism | Forge Proof Lab / Proof Lab | ModelShift protocol |
| Authored interactive unit | Working path | World |
| Outcome record | Evidence | EvidenceRecord / proof claim |
| Optional AI assistance | Bounded help | AIActionBoundary |

Public UI should prefer plain learner language. Internal contracts may keep precise engineering vocabulary.

## First-run contract

A learner can submit only a goal or question. FORGE supplies safe defaults:

```text
age mode        adult
starting point  curious
success shape   explain
study depth     standard
time             45 minutes
representations text + visual
source mode      curated
```

The learner may open **Personalize the path** before submission. At the explicit 320px accessibility floor, the disclosure opens automatically so the longest form is not hidden behind a second interaction on the smallest supported canvas.

Examples must demonstrate the category rather than generic prompt inspiration:

- understand why motion continues after a push,
- verify whether an AI claim has real support,
- compare mixtures using proportional reasoning.

Selecting an example fills the question and independent outcome but does not auto-submit.

A generated map remains inactive until the learner accepts it. Exploratory maps cannot activate unsupported lessons. Rejection and revision remain first-class actions.

### Failure states

| Failure | Behaviour | Persistence |
|---|---|---|
| planner timeout | clear retry plus working-path fallback | goal not saved |
| planner unavailable | clear fallback, no false success | goal not saved |
| unsupported topic | exploratory map with verification boundary | page-local only |
| restricted request | named refusal boundary | no route activated |
| child mode without grown-up confirmation | visible submission block | no session started |
| goal edited after a result | stale result is cleared | none |

## Design review

**Before reset: 5/10.** The visual system was distinctive and accessible, but first-run hierarchy was diluted by too many decisions, unfinished top-level routes, institutional vocabulary, and a long homepage.

**Target: 9/10.** The reset uses subtraction rather than a new theme:

- retain the existing FORGE palette, typography, spacing, and hard-edged components,
- make the question and action dominant,
- present examples as editorial rows rather than pills,
- collapse secondary controls into one accessible disclosure,
- reduce the homepage to hero, working paths, method, and trust,
- preserve 44px targets, 16px mobile form text, reduced motion, forced colours, keyboard navigation, and skip links.

A 10/10 requires observed usability sessions and visual review of the deployed preview.

## Engineering review

The reset deliberately reuses:

- `/api/forge/plan`,
- `ForgePlanContract`,
- planner safety and curated-source mode,
- `LearningMapPreview`,
- accept / revise / reject decisions,
- authored World routes,
- deterministic validators,
- local evidence records,
- the existing shell and design system,
- the existing Playwright QA framework.

No parallel planner, persistence layer, authentication system, or AI service is introduced.

```text
Learner goal
   │
   ├─ optional personalization
   ▼
POST /api/forge/plan
   │
   ├─ refusal ───────────────► named boundary
   ├─ exploratory plan ──────► unverified map; no activation
   └─ grounded plan ─────────► reviewed route + sources
                                  │
                                  ▼
                         learner decision gate
                     accept / revise / reject
                                  │
                                  ▼
                          authored working path
                                  │
                                  ▼
                      assistance-withdrawal proof
                                  │
                                  ▼
                         bounded evidence record
```

### State invariants

1. Editing the question clears any stale plan.
2. A timed-out request cannot overwrite a newer request.
3. An exploratory map cannot expose an active World link.
4. A grounded route cannot activate before learner acceptance.
5. Optional AI cannot change sources, correctness, policy, route, or evidence claims.
6. Child mode cannot start without local grown-up confirmation.
7. Personalization remains keyboard- and screen-reader-operable.
8. Removing a route from navigation does not delete or break the route.

## Security review

```text
UNTRUSTED
learner text and optional constraints
          │
          ▼
validated planner request
          │
          ├─ deterministic routing and authored source set
          └─ optional bounded model interpretation
                         │
                         ▼
TRUSTED POLICY BOUNDARY
route, sources, correctness, safety, evidence claims
```

Required protections:

- input remains schema-validated and length-bounded,
- planner requests retain an abort timeout,
- learner input is never inserted as HTML,
- external sources use `rel="noreferrer"`,
- model output cannot determine correctness or alter policy,
- no new credential, upload, webhook, admin, or storage surface is introduced,
- UI does not imply child-safety approval, verified consent, universal coverage, diagnosis, grades, credentials, or mastery,
- errors do not expose secrets, provider internals, or stack traces.

The reset does not materially expand the attack surface. Its main security benefit is reducing false capability claims.

## QA gates

### Product

- [ ] First viewport presents one question and one primary action.
- [ ] Personalization is optional and collapsed at standard desktop and mobile widths.
- [ ] The 320px accessibility floor exposes the full form.
- [ ] Examples populate but do not auto-submit.
- [ ] Grounded and exploratory contracts still work.
- [ ] Accept, revise, reject, and activation gates remain intact.
- [ ] Primary navigation contains Paths, Evidence, and Access.
- [ ] Studio and Trail remain directly reachable but are not marketed as finished.
- [ ] Public copy does not present ModelShift as a separate product.
- [ ] Proof Lab is a FORGE mechanism.

### Technical

- [ ] lint
- [ ] TypeScript typecheck
- [ ] unit and component tests
- [ ] deterministic evaluator suite
- [ ] production build
- [ ] desktop Playwright
- [ ] 390×844 Playwright
- [ ] explicit 320×800 contract
- [ ] no horizontal overflow
- [ ] 44px actionable targets
- [ ] 16px mobile form text
- [ ] keyboard and skip-link checks
- [ ] reduced-motion checks
- [ ] forced-colours checks
- [ ] no console or page errors
- [ ] dependency audit
- [ ] checks tied to the exact PR head SHA

## Release and rollback

1. Land on an isolated branch and draft PR.
2. Require repository checks on the exact head SHA.
3. Review the actual preview deployment.
4. Compare desktop and mobile screenshots with main.
5. Merge only when product copy, responsive hierarchy, tests, and preview agree.

The change is reversible because it does not migrate data or alter planner contracts. Rollback consists of reverting the homepage, shell navigation, metadata, CSS import, and focused tests.

## Explicit non-goals

- universal curriculum generation,
- open-ended autonomous lesson generation,
- mentor marketplace,
- social feed or peer network,
- badges, streaks, levels, or gamified mastery,
- unverified child accounts or consent infrastructure,
- school administration,
- credential claims,
- broad cloud continuity,
- renaming every internal ModelShift identifier,
- deleting historical ModelShift documentation,
- pretending unfinished routes are complete.

## Observation assignment

Watch at least five target learners use the deployed first-run flow without coaching. Record what they think FORGE does after five seconds, whether the next action is obvious, whether they open personalization before receiving value, whether “path,” “Proof Lab,” and “evidence” mean what FORGE intends, and whether proof without help changes their behaviour.

Do not ask whether they like the design. Observe what they do.

## Final product test

FORGE passes this reset only when a new learner can say:

> “I gave it a real goal. It gave me a path I could inspect. I did the work. Then the help disappeared, and I found out what I could actually do.”

That is the product. Everything else is infrastructure, expansion, or historical provenance.
