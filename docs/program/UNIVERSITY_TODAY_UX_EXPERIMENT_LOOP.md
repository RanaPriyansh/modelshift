# University Today UX experiment loop

**Status:** preregistered research operating method
**Date:** 30 July 2026
**Surface under test:** internal `/internal/university-today` fixture only
**Claim ceiling:** method and candidate harness only; no student demand, usability, accessibility, learning, or efficacy result yet

## Why this exists

Karpathy's `autoresearch` keeps the evaluation harness fixed, changes a deliberately narrow surface, runs a comparable experiment, and keeps or discards the change based on one explicit metric. It does not make the result trustworthy merely because an agent produced many iterations.

FORGE adapts that method to UX without pretending people are a loss function:

- keep the fixture states, tasks, authority rules, and observation rubric fixed;
- change one hierarchy, copy, or interaction hypothesis at a time;
- run automated regression checks first;
- observe approved adult university participants on the same tasks;
- keep, narrow, repair, or discard the change from preregistered evidence;
- log qualitative failure modes instead of compressing them into a vanity score.

Source method: [karpathy/autoresearch](https://github.com/karpathy/autoresearch), inspected 30 July 2026. The original project optimizes a model under a fixed time budget and validation metric. This document is a careful product-research adaptation, not a feature or fork of that training system.

## Fixed harness

Every experiment uses the same four synthetic states:

1. reviewed connected copies, accepted-path action, and enough entered time;
2. conflicting, stale, and partial connected copies;
3. entered time between the fixture-authored effort bounds;
4. entered time below the fixture-authored low bound.

Every experiment is checked at:

- desktop;
- 320 CSS px;
- keyboard only;
- reduced motion;
- forced colors;
- production route without the development token;
- production public-asset boundary.

The projector, fixture facts, action path, authority ceiling, and test questions stay fixed during a UI experiment. Changing one of those creates a new baseline, not a comparable iteration.

## Human tasks

Use approved adult participants only while `UV1-GATE-003` remains open. Do not collect private coursework, accommodation, wellbeing, or account data.

Ask each participant to:

1. say what FORGE thinks should happen next;
2. explain why that item is shown;
3. identify what is known and not established about the connected source;
4. decide what they would do in the tight-window state;
5. decide what they would do in the no-room state;
6. predict what the visible control will do before activating it;
7. move from ready to source conflict using only the keyboard.

Do not teach the authority model before the task. Ask neutral follow-ups such as “What led you to that?” and “What do you think will happen next?”

## Decision evidence

Record these separately. Do not collapse them into one optimization number.

| Evidence | Pass signal | Stop or repair signal |
| --- | --- | --- |
| Primary-state comprehension | Participant names the ready, source-review, tight, or no-room state without moderator rescue. | Treats every state as a ready recommendation or cannot find the primary decision. |
| Action provenance | Says the action comes from an accepted learning path or equivalent. | Says the copied deadline or AI chose the activity. |
| Source calibration | Distinguishes reviewed transcription from institutional truth/completeness. | Treats the copy as official, complete, or policy-authorizing. |
| Capacity honesty | Notices that the activity is not silently shortened. | Assumes FORGE compressed the activity or guarantees it fits. |
| Control prediction | Predicts preview/review behavior and no automatic save/session start. | Expects submission, calendar change, session start, or durable save. |
| Recovery | Chooses source review for conflict and learner replanning for insufficient time. | Continues into the learning action despite the blocked state. |
| Access path | Completes state switching and reaches the primary control with keyboard at 320px. | Focus loss, hidden control, overlap, or horizontal scrolling blocks the task. |

## Iteration rule

One experiment may change only one of:

- information order;
- headline or explanatory copy;
- control label;
- grouping/divider treatment;
- spacing/type scale;
- state-selector interaction;
- context-rail placement.

Before the change, write:

```text
Hypothesis:
Single variable:
Expected improvement:
Risk to authority or comprehension:
Automated gates:
Human observation threshold:
Reversal:
```

After the change, record:

```text
Result:
Unexpected behavior:
Keep | narrow | repair | discard:
Evidence links:
Residual uncertainty:
```

No change is kept merely because it looks more polished, produces more clicks, or shortens time-on-task. Faster is worse when it increases false confidence.

## Initial hypotheses

| ID | Hypothesis | State | Next evidence |
| --- | --- | --- | --- |
| `UX-TODAY-H01` | A single large action plus a narrow context rail produces better action-provenance recall than a semester card grid. | Candidate baseline implemented | Compare against one low-fidelity grid alternative in moderated sessions, not in the public app. |
| `UX-TODAY-H02` | Showing declared minutes beside fixture-authored effort makes insufficient capacity legible without a progress bar. | Candidate baseline implemented | Observe tight and no-room interpretation. |
| `UX-TODAY-H03` | Replacing the learning preview with source review in the conflict state prevents unsafe continuation. | Candidate baseline implemented | Observe control prediction and recovery choice. |
| `UX-TODAY-H04` | A persistent authority footer improves calibration without overwhelming the first decision. | Open | Compare footer visible versus collapsed after the primary state is understood. |
| `UX-TODAY-H05` | “Preview activity” is clearer than “Start” because the internal fixture cannot begin or save a session. | Candidate baseline implemented | Observe prediction before activation. |

## Promotion gate

This loop can improve the internal prototype. It cannot promote it to `/app`.

Public-route consideration still requires:

- `UV1-GATE-001` observation/substitution evidence;
- `UV1-GATE-002` preregistered demand evidence;
- approved adult authority and data handling;
- repeated-use evidence rather than one-session preference;
- an accepted durable identity, tenant, storage, rights, and event/current-state design;
- complete-process manual accessibility and assistive-technology evidence;
- a separate shipping decision.
