# University semester overview UX experiment

**Status:** preregistered internal fixture loop

**Date:** 31 July 2026

**Surface under test:** internal
`/internal/university-semester-overview`

**Claim ceiling:** method and candidate harness only; no student demand,
learning, accessibility, institutional, recommendation, efficacy, or
production result

## Atomic research question

> When four current courses have different bounded states, can an adult student
> accurately inspect every course and the separate term Recovery boundary
> without treating course-ID order as priority, the screen as a
> recommendation, or `ready_for_inspection` as semester readiness?

This is the missing “all-current-courses shallow” half of the declared
university product test. It does not choose what a student should do.

## Fixed harness

Following the useful fixed-loop constraint in
[Karpathy's autoresearch](https://github.com/karpathy/autoresearch), preserve
the fixture, questions, state taxonomy, viewport checks, and authority
boundaries while changing one presentation variable at a time. A person is not
one optimization metric: scan accuracy, term/course separation, order
interpretation, trust calibration, learner control, access barriers, and harm
remain separate observations.

Every comparable run keeps:

- one synthetic adult owner, tenant, term, `asOf`, term label, and time zone;
- four synthetic courses inside the exact same Recovery envelope;
- one separately exposed canonical Recovery projection plus the canonical
  Recovery recomputation inside every direct semester-loop child;
- one direct canonical semester-loop projection per course;
- course-ID order explicitly labelled as not priority;
- no summed course-local capacity;
- no selected course, global next action, recommendation, score, progress,
  ranking, or workload estimate;
- no live learner, account, coursework, provider, model, retrieval, database,
  browser storage, session start, evidence write, schedule, or message;
- four closed scenarios: mixed term, term source review, capacity choice, and
  World changed; and
- the same desktop, exact 320 CSS pixel, keyboard, focus, reduced-motion,
  forced-colors, overflow, console, production-denial, and public-asset gates.

Changing the course count, raw child inputs, canonical projector, state
taxonomy, order basis, or authority boundary creates a new baseline.

## Student job

> Show me the bounded state of every current course without hiding uncertainty
> or pretending to know which course I should choose.

The default mixed-term fixture preserves this hierarchy:

1. synthetic and no-effect boundary;
2. exact term context;
3. all-current-courses shallow-inspection statement;
4. separate term Recovery status;
5. one continuous course ledger in course-ID order;
6. each course's exact Today and semester-loop status;
7. one plain explanation of each canonical boundary;
8. no-global-action statement; and
9. authority ceiling.

## Fixed mixed-term ledger

| Course | Today | Semester loop | Bounded explanation |
| --- | --- | --- | --- |
| CS102: Evidence and computation | `ready` | `protected_study_ready` | One accepted action can be inspected; nothing starts here. |
| MATH110: Discrete structures | `learner_choice_required` | `learner_choice_required` | Only the low authored effort bound fits. |
| HIST204: Modern history | `capacity_conflict` | `recovery_required` | The accepted action does not fit the declared window. |
| BIO120: Cell systems | `complete` | `path_complete` | This action is complete; the course is not. |

The exact rendered order follows course ID. It is not a pedagogical,
chronological, urgency, difficulty, workload, or recommendation order.

## Fixed comparison states

| State | Exact system behavior | Visible boundary |
| --- | --- | --- |
| Mixed term | Term Recovery produces a draft; four direct course loops remain distinct | Inspect all rows without choosing one |
| Term source review | One connected-source conflict stops term Recovery; direct Today states remain visible | Review copied context before treating the term Recovery draft as usable |
| Capacity choice | Term Recovery requires learner choice | No course is selected and no trade-off is applied |
| World changed | One direct course loop reports `world_review_required` | No similar World is substituted |

The scenario picker is a research-harness control, not a course selector.

## Participant operation remains blocked

The questions, thresholds, and observation fields below are preregistered
instrument design only. They do not authorize contact, exposure, observation,
notes, quotation, telemetry, recording, identifiers, or capture of a person's
wording. While `UV1-GATE-003` is open, the operating state remains
`SYNTHETIC_PLANNING_ONLY` under ADR-016 and
`UNIVERSITY_PHASE_MINUS_ONE_PROTOCOL.md`.

No participant operation may begin until the exact candidate and substitute
artifacts, approved adult population, recruitment and consent language,
capture schema, retention/deletion rules, compensation, access support, named
operators, incident procedure, withdrawal procedure, and approving authority
are recorded. Any permitted future capture must use only that approved schema.

If participant operation is separately authorized, the Phase -1 stop
checklist overrides completion targets. Stop exposure immediately for
withdrawal or material distress; minor or uncertain age; prohibited real,
third-party, coursework, credential, accommodation, disability, wellbeing, or
instructor-contact data; unapproved capture; wrong artifact, allocation,
script, or timebox; any live or external effect; operator interference;
privacy, security, safeguarding, or consent incident; repeated authority
confusion; attempted real-world action; unverifiable artifact/allocation
records; a post-starter material amendment; or an unavailable required
operator or data process. Apply the all-starters denominator and approved
incident, withdrawal, deletion, and restart process. Do not improvise around a
stop.

## Fixed comprehension questions

Only after the participant gate above is separately approved, use a fixed
25-second inspection and ask:

1. How many current courses does this fixture inspect?
2. Which course can inspect a Protected Study boundary?
3. Which course requires a learner capacity choice?
4. Does the first course have higher priority than the fourth?
5. Does `ready_for_inspection` mean the semester is ready or feasible?
6. What does the term Recovery status say that the course rows do not?
7. Did FORGE select a course or a global next action?
8. Does any source copy count as official or institutionally complete?
9. Does anything save, start, send, schedule, or create evidence?

Record each answer as correct, incorrect, or uncertain and keep the
participant's own wording. Also record time to name all course boundaries,
row-order reversals, attempts to find a priority/score/CTA, mistaken
whole-semester readiness, backtracking, focus loss, access barriers, and
distress or judgment language.

## Hypotheses

| ID | One variable changed | Expected evidence | Keep condition |
| --- | --- | --- | --- |
| `H01` | Lead with “Every course. No false priority.” | Course order is less often interpreted as ranking | Zero participants call the first row the recommended or most urgent course |
| `H02` | Put the term boundary before the course ledger | Recovery and course status stay distinct | At least 80% answer question 6 without merging the axes |
| `H03` | Use one continuous ruled ledger instead of cards | The screen reads as inspection rather than a dashboard | At least 80% identify all four rows without inventing a score or progress model |
| `H04` | Show both Today and semester-loop status columns | Students can see exact child state and bounded next-job state separately | At least 80% correctly explain one row where the two labels differ |
| `H05` | Put “course ID, not priority” in both the boundary and ledger footer | Order interpretation remains calibrated after scrolling | Zero participants infer urgency from row position |
| `H06` | Expose no course CTA | The surface does not imply selection authority | Zero participants report that FORGE chose or started a course |

## Separate evidence and stop signals

| Dimension | Keep signal | Repair or stop signal |
| --- | --- | --- |
| Course scan | Names every visible course and exact bounded state | Misses a row or merges two course states |
| Term/course separation | Explains Recovery as term-wide and Today/loop as course-bound | Calls one course state the complete term plan |
| Order calibration | Says course-ID order is not priority | Treats first, colored, or ready row as recommended |
| Readiness boundary | Says inspectable is not ready or feasible | Calls the semester ready, on track, caught up, or complete |
| Source authority | Calls facts learner-connected copies | Treats the ledger as official LMS or university truth |
| Learner control | Predicts inspection only | Expects course selection, replan, scheduling, or path mutation |
| External effects | Predicts no save, event, message, provider, or persistence | Expects durable progress or university contact |
| Access | Operates scenarios/reset at desktop and 320px | Focus, clipping, target size, reflow, or announcement blocks the task |
| Emotional safety | Describes bounded states without shame or rank | Reads the surface as learner ability, failure, punishment, or permanent deficit |

Do not average these dimensions into one score. Authority confusion, harmful
ranking, or access failure can veto a visually successful change.

## Visual target

`docs/design/university-semester-overview-concept.png` is the implementation
input. It preserves the established light Vanishing Instrument system:

- warm paper surface and near-black ink;
- deep cyan for exact inspectable state;
- amber for choice or recovery, always paired with text;
- editorial display type, monospace labels, and thin ruled structure;
- one continuous course ledger rather than nested cards;
- no illustration, chat, dashboard chrome, or decorative score; and
- desktop hierarchy that becomes one semantic vertical reading order at
  320 CSS pixels.

The generated concept is not implementation or accessibility evidence.

## Automated and rendered gates

- exact aggregate plain-JSON boundary before child traversal;
- one separately exposed Recovery projection and exact per-course canonical
  semester-loop recomputation, including each child Recovery recomputation;
- exact term, course-set, label, and source binding;
- direct child digest/status equality;
- invalid-child, missing/extra/duplicate/swapped course, World drift, and
  source mismatch refusal;
- no raw child request, World, source IDs, path IDs, child projection, digest,
  or command in the client fixture;
- deep-frozen deterministic projection across course-input permutation;
- no capacity aggregation, recommendation, selection, global action, score,
  progress, session, persistence, event, message, evidence, or external effect;
- native scenario radio/reset behavior and focus continuity;
- semantic table/list headers that remain intelligible as stacked labelled rows;
- desktop and exact 320 CSS pixel reading order, 44 CSS pixel targets, and no
  horizontal overflow;
- reduced motion, forced colors, console review, exact production denial, and
  public-static-asset scan.

Automation is implementation evidence, not participant comprehension,
assistive-technology evidence, WCAG conformance, learning evidence, or
efficacy.

## One-variable iteration record

Before a change:

```text
Hypothesis:
One hierarchy, copy, or interaction variable:
Expected comprehension change:
Risk to priority, readiness, authority, access, or emotional safety:
Automated gates:
Adult observation threshold:
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

## Promotion gate

This loop can refine only an internal synthetic candidate. A live semester
workspace requires approved adult identity and data authority, complete
course-set authority, owner-scoped persistence, tenant isolation, edit/undo
and conflict semantics, trusted source and institution boundaries, learner
choice, responsible-human routing, session/evidence continuity,
export/correction/deletion, incident operations, manual assistive-technology
review, direct participant evidence, and a separate release decision.
