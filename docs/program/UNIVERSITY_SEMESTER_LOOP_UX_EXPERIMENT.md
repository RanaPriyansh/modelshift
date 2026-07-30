# University semester-loop UX experiment

**Status:** preregistered internal fixture loop

**Date:** 2026-07-31

**Surface under test:** internal `/internal/university-semester-loop` fixture
only

**Claim ceiling:** candidate method and engineering harness only; no student
demand, live-data, learning, recovery, accessibility, institutional-authority,
production, or efficacy result

## Research question

Can an adult university student look at one coherent, synthetic semester
envelope and correctly identify which bounded job comes next, why it is blocked
or ready, and what FORGE has not done?

The loop tests composition comprehension. It does not test whether the
underlying Today, Recovery, or Protected Study contract is effective in real
student use.

## Fixed experiment method

Borrow the useful constraint from
[Karpathy's autoresearch](https://github.com/karpathy/autoresearch): hold the
harness and evaluation questions fixed, change one bounded variable, then keep,
narrow, repair, or discard it. This is a UX research adaptation, not a claim
that people reduce to one validation loss.

Keep separate:

- correct state and reason identification;
- authority and source calibration;
- learner-control comprehension;
- time to first correct explanation;
- navigation errors and backtracking;
- emotional-safety observations;
- access barriers;
- contradictory participant accounts.

Do not aggregate them into one optimization score.

## Fixed harness

Every comparable run uses:

- one synthetic adult owner and tenant;
- one synthetic university term and course;
- one exact `asOf` instant and time zone;
- the same raw Today reconciliation request and reviewed deadline in Recovery;
- the same raw Today request inside Protected Study;
- one exact supplied source-corroboration World package;
- no account, network, provider, model, database, browser storage, session,
  evidence, event, or external write;
- seven fixed states: ready, source review, capacity break, tight window, World
  changed, path complete, and path blocked;
- desktop, exactly 320 CSS pixels, keyboard, reduced-motion, forced-colors,
  console, production denial, and public-asset boundary checks.

Changing the fixture envelope, child contracts, state precedence, authority
ceiling, or participant tasks establishes a new baseline.

## Participant job

> When my semester changes, show me whether I should review a copied source,
> rebuild from current capacity, make a learner choice, review the learning
> activity, or inspect the protected-study brief, without pretending that
> anything was saved or done for me.

While `UV1-GATE-003` remains open, use only approved participants aged 18 or
older and synthetic content. Collect no real coursework, account,
accommodation, wellbeing, disability, instructor-contact, or institution
credential data.

## Fixed scenarios

| Scenario | Expected status | Participant should explain |
| --- | --- | --- |
| Ready | `protected_study_ready` | The reviewed copied source, accepted action, declared capacity, and exact World currently align; the next control opens a separate preview brief and starts nothing. |
| Source review | `source_review_required` | A copied-source conflict or uncertainty blocks the composed loop before capacity or World readiness can authorize action. |
| Capacity break | `recovery_required` | The declared window cannot contain the action; the next bounded job is a separate transient recovery draft. |
| Tight window | `learner_choice_required` | Only the low effort estimate fits, so FORGE cannot decide whether the learner should proceed. |
| World changed | `world_review_required` | The supplied World no longer exactly matches the accepted path binding; no substitute opens. |
| Path complete | `path_complete` | The accepted action is already complete; the fixture does not choose another action or claim course completion. |
| Path blocked | `path_blocked` | The accepted action is blocked; the fixture does not bypass it, infer a repair, or open the World. |

## Fixed participant tasks

Ask each participant to:

1. identify the current state and the single reason it is shown;
2. name which facts came from learner-authored fixture declarations;
3. explain whether the copied deadline is university truth;
4. explain whether FORGE selected or changed the accepted learning path;
5. predict what the primary control will open;
6. state whether any capacity, decision, source, session, evidence, or progress
   will transfer or be saved;
7. switch through all seven states using only the keyboard;
8. identify what must be repaired in source-review, capacity-break,
   tight-window, World-changed, complete, and blocked states.

Use neutral follow-ups only: “What led you to that?”, “Who made that choice?”,
and “What do you expect to happen next?”

## Evidence table

| Evidence | Keep signal | Repair or stop signal |
| --- | --- | --- |
| Loop comprehension | Participant identifies one bounded next job and its reason. | Treats the surface as an autonomous semester planner or generic task dashboard. |
| Source calibration | Distinguishes a reviewed learner copy from institutional truth and completeness. | Treats the copied deadline as verified, official, or exhaustive. |
| Capacity calibration | Says available minutes and effort are fixture-authored and tight requires choice. | Assumes capacity was inferred or the system compressed work. |
| Path ownership | Says the action came from an existing learner-accepted reviewed path. | Says the loop chose, ranked, activated, or completed the path. |
| World integrity | Predicts exact binding review and no silent substitution. | Expects a similar activity to open after version or source drift. |
| Effect prediction | Predicts navigation to a separate fixture only, with no transfer or save. | Expects a session, message, progress record, evidence, or external action. |
| Terminal-state calibration | Distinguishes one action complete/blocked from course or semester completion/failure. | Reads terminal action state as a learner score or course outcome. |
| Emotional safety | Describes an understandable next boundary without guilt, surveillance, or hidden ranking. | Reports debt, pressure, judgment, or loss of control caused by the hierarchy or copy. |
| Access path | Completes all tasks at 320px with keyboard and perceives state changes. | Focus loss, overlap, horizontal scrolling, or motion blocks a task. |

## One-variable iteration record

Before each change:

```text
Hypothesis:
Single surface variable:
Expected comprehension change:
Risk to authority, learning, autonomy, or emotional safety:
Automated gates:
Human observation threshold:
Reversal:
```

After each change:

```text
Result:
Contradictory observations:
Keep | narrow | repair | discard:
Evidence links:
Residual uncertainty:
```

Do not keep a change because it looks polished, increases clicks, or makes the
route faster. Speed is a regression when it hides source uncertainty, a learner
choice, a terminal path state, or a missing authority.

## Candidate hypotheses

| ID | One variable | Expected evidence | Keep condition |
| --- | --- | --- | --- |
| `UX-LOOP-H01` | Lead with one next-boundary statement rather than three child-product cards. | Participants describe one coherent loop without treating the surface as a dashboard. | At least 80% identify the current next job and reason without facilitator repair. |
| `UX-LOOP-H02` | Show the exact source, capacity, path, and World checks as one readable sequence. | Participants can locate the blocking object without assuming a score. | No participant describes the sequence as an AI ranking. |
| `UX-LOOP-H03` | Use seven native-radio fixture states in a horizontal or wrapping research rail. | Keyboard users can compare refusal and terminal states without losing context. | All states are reachable and announced at 320px without horizontal scrolling. |
| `UX-LOOP-H04` | Keep the primary control specific to the next bounded job. | Participants accurately predict source review, recovery, or protected-study navigation. | Zero false predictions of save, send, session start, or state transfer. |
| `UX-LOOP-H05` | Place the transient/authority boundary beside the primary control. | Fewer durable or institutional interpretations survive first inspection. | No participant calls the view a saved semester plan or university record. |
| `UX-LOOP-H06` | Give complete and blocked actions their own calm terminal states. | Participants do not confuse action state with learner worth or semester outcome. | Zero course-completion, course-failure, or ability-score interpretations. |

## Automated regression evidence

Automation may establish only implementation behavior:

- all seven exact projections render;
- native radios traverse all states by keyboard;
- each state exposes only its permitted route, if any;
- ready links to the protected-study internal fixture, not directly to a World;
- source review links only to the source-review fixture;
- capacity break links only to Recovery;
- tight, World-changed, complete, and blocked states expose no unsafe launch;
- no state transfers or saves fixture data;
- exactly 320 CSS pixels has no horizontal overflow;
- reduced-motion and forced-colors adaptations are present;
- no console error occurs in tested paths;
- production renders only the unavailable shell even when the fixture token is
  present;
- fixture markers are absent from public production assets.

Automation does not establish participant comprehension, complete-process
accessibility conformance, demand, learning, recovery efficacy, or production
readiness.

## Promotion gate

This experiment can refine an internal fixture. It cannot validate the wedge,
replace the learner home, ingest live data, or create a durable coordinator.

Public or durable consideration still requires:

- `UV1-GATE-001` approved observation and substitution evidence;
- `UV1-GATE-002` preregistered demand evidence;
- `UV1-GATE-003` approved adult identity, data, incident, and withdrawal
  authority;
- repeated-use evidence across several weeks;
- owner-scoped persistence, enforced tenant isolation, export, correction,
  deletion, backup, restore, and rollback;
- accepted edit, accept, reject, undo, source review, World review, path state,
  session, and responsible-human contracts;
- complete-process assistive-technology and accessibility evidence;
- a separate production shipping decision.
