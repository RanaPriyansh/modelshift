# University recovery UX experiment loop

**Status:** preregistered research operating method
**Date:** 31 July 2026
**Surface under test:** internal `/internal/university-recovery` fixture only
**Claim ceiling:** method and candidate harness only; no student demand, usability, accessibility, recovery, learning, or efficacy result yet

## Method decision

Karpathy's `autoresearch` fixes the training preparation and evaluation, changes one bounded file, runs under a fixed time budget, compares one validation metric, then keeps or discards the experiment. FORGE borrows the disciplined loop, not the machine-learning metric.

The UX adaptation is:

1. keep the four recovery states, facts, authority rules, student tasks, and regression gates fixed;
2. change one hierarchy, copy, or interaction variable;
3. run deterministic and rendered regression checks;
4. observe approved adult students on the same tasks;
5. keep, narrow, repair, or discard the change;
6. retain contradictory observations instead of compressing people into one score.

Source method: [karpathy/autoresearch](https://github.com/karpathy/autoresearch), inspected 31 July 2026. Its README describes a small single-GPU training setup where an agent changes one training file, runs for a fixed five-minute budget, evaluates validation bits per byte, and keeps or discards the result. This document is a product-research adaptation, not a claim that student experience has one loss function.

## Reference review

Two current product references informed the candidate baseline:

| Reference | Useful pattern observed | Boundary for FORGE |
| --- | --- | --- |
| [MyStudyLife](https://mystudylife.com/), inspected 31 July 2026 | Student-specific calendar, tasks, reminders, rotating schedules, and one-place organization | Marketing centers productivity, control, reminders, grades, Pomodoro, and broad dashboarding. FORGE recovery must instead make source uncertainty, learning preservation, and learner choice visible. |
| [Sunsama](https://www.sunsama.com/), inspected 31 July 2026 | Guided daily planning, explicit timeboxing, realistic workload language, and task plus calendar context | It is a professional productivity product. FORGE borrows the calm guided reset, not work analytics, auto-scheduling, guilt reduction claims, or an endless backlog. |

These are qualitative design references, not independent evidence of outcomes, adoption, student demand, or recovery efficacy.

## Fixed harness

Every comparable experiment uses the same four synthetic states:

1. required work and protected buffer fit; one learner-deferrable item is outside the window;
2. only the low required estimate fits and one learning-essential negotiable item needs choice;
3. a consequential copied deadline is overdue and a bounded human question is prepared but not sent;
4. copied deadlines conflict, so capacity and all recovery lanes are withheld.

Every experiment is checked at:

- desktop;
- 320 CSS px;
- keyboard only;
- reduced motion;
- forced colors;
- no horizontal scrolling;
- console errors;
- production route without the development token;
- production public-asset boundary.

Changing fixture facts, projection rules, authority, or student tasks creates a new baseline. It is not a comparable surface iteration.

## Participant tasks

Use approved students aged 18 or older while `UV1-GATE-003` remains open. Do not collect real coursework, accommodation, wellbeing, account, or human-contact data.

Ask each participant to:

1. explain what changed and what FORGE is showing;
2. identify which work is protected and who classified it;
3. explain why the buffer is not available for work;
4. identify how the lanes are ordered and whether that means priority;
5. decide what remains open in the choice-needed state;
6. explain what will happen to the prepared human question;
7. identify why no lanes are visible in the source-review state;
8. switch across all four states using only the keyboard at 320 CSS px.

Do not explain the authority model first. Use neutral follow-ups: “What led you to that?”, “Who made that choice?”, and “What do you think happens next?”

## Evidence kept separate

| Evidence | Pass signal | Repair or stop signal |
| --- | --- | --- |
| Recovery comprehension | Participant describes a reset from current capacity, not a complete semester plan. | Treats the fixture as an autonomous schedule or permanent record. |
| Classification ownership | Says required/negotiable/deferrable came from the learner entry. | Says AI or the copied deadline classified the work. |
| Capacity honesty | Identifies workable minutes, effort range, and protected buffer. | Assumes buffer is unused capacity or effort was compressed. |
| Source calibration | Distinguishes reviewed copy from university truth and sees conflict as blocking. | Treats the deadline as official/complete or wants the system to choose a conflict. |
| Order calibration | Recognizes deadline order and does not infer student ability or hidden priority. | Reads lane order or count as a score, urgency guarantee, or judgment. |
| Human-help prediction | Predicts that the question is prepared but not sent. | Expects an email, extension, approval, or contacted instructor. |
| Emotional safety | Describes the view as a manageable reset without encountering guilt, debt, or ranking language. | Reports shame, surveillance, or pressure caused by the interface copy or hierarchy. |
| Access path | Completes state switching and identifies all primary content at 320px with keyboard. | Focus loss, overlap, off-screen content, or horizontal scrolling blocks the task. |

## One-variable iteration record

Before a change:

```text
Hypothesis:
Single variable:
Expected comprehension change:
Risk to authority, learning, or emotional safety:
Automated gates:
Human observation threshold:
Reversal:
```

After a change:

```text
Result:
Contradictory observations:
Keep | narrow | repair | discard:
Evidence links:
Residual uncertainty:
```

Do not keep a change because it looks more polished, increases clicks, or shortens time. Faster is worse if it creates false confidence or hides a trade-off.

## Candidate baseline hypotheses

| ID | Hypothesis | Baseline state | Next evidence |
| --- | --- | --- | --- |
| `UX-RECOVERY-H01` | “Rebuild from what fits now” frames recovery as re-entry rather than debt. | Candidate implemented | Compare with a literal “Recovery draft” heading in moderated observation. |
| `UX-RECOVERY-H02` | Workable minutes, protected effort range, and buffer are clearer than a utilization progress bar. | Candidate implemented | Ask participants to reconstruct the capacity calculation without prompting. |
| `UX-RECOVERY-H03` | Three deadline-ordered lanes make learner classification ownership clearer than an automatically ranked task list. | Candidate implemented | Ask who placed each item and what lane order means. |
| `UX-RECOVERY-H04` | A prepared-not-sent question supports help-seeking without implying contact or approval. | Candidate implemented | Ask participants to predict the next external effect. |
| `UX-RECOVERY-H05` | Withholding all lanes during source conflict prevents unsafe planning without feeling like data loss. | Candidate implemented | Observe whether participants choose source review and still understand why work is absent. |
| `UX-RECOVERY-H06` | A visible “No backlog score” boundary prevents gamified or judgmental interpretation. | Open | Compare persistent boundary text with an authority-footer-only variant. |

## Promotion gate

This loop can refine an internal candidate. It cannot promote the route, create a planner, or validate the university wedge.

Public or durable consideration still requires:

- `UV1-GATE-001` observation and substitution evidence;
- `UV1-GATE-002` preregistered demand evidence;
- approved adult identity and data authority;
- repeated recovery use across several weeks;
- durable owner-scoped storage, export, correction, deletion, backup, and restore;
- accepted edit, accept, reject, undo, history, and responsible-human contracts;
- complete-process assistive-technology and accessibility evidence;
- a separate shipping decision.
