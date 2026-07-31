# University Phase -1 synthetic tabletop packet v1

**Packet ID:** `university-phase-minus-one-synthetic-tabletop.v1`

**Packet version:** `1.0.0`

**Operating state:** `SYNTHETIC_PLANNING_ONLY`

**Record class:** fillable synthetic-only rehearsal template

**Status:** draft local operations scaffold; not approved and not executed

**Claim ceiling:** a completed copy may record only that operators walked
through invented events against the fixed protocol. This packet is not
participant evidence, approval, operator authority, artifact approval,
equivalence review, rehearsal-readiness evidence, run authorization, demand
validation, usability evidence, accessibility evidence, learning evidence, or
permission to contact or capture anyone.

## 1. Immutable binding

Do not use this packet if any fixed identity below differs from the artifact
being rehearsed. A mismatch is itself a technical-stop rehearsal; it is not
permission to update an identity in place.

| Bound item | Exact identity |
| --- | --- |
| Protocol ID | `university-observation-protocol.phase-minus-one` |
| Protocol version | `1.0.0` |
| Protocol document digest | `sha256:f28a6e4396b949cfdcb8a371e5c6f882f2dd828dc79934b8ba3da17732764bd1` |
| Candidate A source commit | `9fb4d22142deec7c29f1c15a59d0dcc4b7d118c1` |
| Candidate A source tree | `9b3fd9d1beb924aa4018201971559ddd18b017e0` |
| Candidate A route | `/internal/university-semester-loop` |
| Candidate A artifact version | `1.1.0` |
| Candidate A local build digest | `sha256:630f87b86f507e7bafec2e8417fb909a833da81db696e8fe031a4ee01885ea0c` |
| Candidate compiler | `university-research-candidate-compiler.v1` |
| Compiler descriptor digest | `sha256:1d017c4a913fc1a87d4ef502d0f143b6231b01cdaef6e984fc5d26b72534181c` |
| Pack P digest | `sha256:986aea9801ff837ddffb843ff4a046fe0cd832ea96d69ac7dcd4311687225e53` |
| Pack P surface-packet digest | `sha256:8d4ee7b1f403a67ba656f5f2017d9553788a5c2aa5d58d6794681587d14b4d94` |
| Pack Q digest | `sha256:2eba40adc6327828a6afbf3c7c9822baae5037611902166e2d1f3a8111d97ab7` |
| Pack Q surface-packet digest | `sha256:72c1e93bc752c68f94a3acb3cabfbcdc0616ea3b66e6b0394496150f7800b566` |
| Shared renderer binding | `sha256:921a230df8b244a75f576bf3adf7772902ac98943e04f913d16054783fe22fa4` |
| Matched neutral Substitute B digest | `sha256:dc4adaaeb3b16773f26f3c244373549802b389e2413639414aa179acce7f23ec` |
| Moderator packet digest | `sha256:44cd3c50ec4964b7959ddd499e2a9213c5a2182e810bcd2df584839bdbcef3df` |
| Exposure-task-set digest | `sha256:7a478d5e05d1cfc638ed3e4a76f6811a36ba5bc5239b8283193d4912a5eb4b9b` |
| Post-comparison-question-set digest | `sha256:c0c91df4216e4e0c37e5c10797b8c3f0e26155e91e41c99db65142c254158123` |
| Neutral-prompt-set digest | `sha256:9ae98972ea1c79213dbe69e210e36a5172b0852c10376922ea45f9eea7398913` |
| Stop-checklist digest | `sha256:9812e2c429e18b214a09f30b80ae7890467507530abbd9786968e0403f77c90e` |

The build and browser identities above are unsigned local engineering
evidence. They do not establish provenance, independent review, approval,
deployment, production operation, or participant authorization.

### Completed-copy integrity record

Create a working copy, fill only bracketed fields, then freeze its exact UTF-8
bytes. Calculate the completed-copy SHA-256 after the last edit and record it
in the separately governed manifest or authorization packet. Do not insert
that digest back into the hashed copy.

| Field | Fill after rehearsal |
| --- | --- |
| Synthetic execution ID | `[SYN-TT-EXEC-YYYYMMDD-NNN]` |
| Repository HEAD used to open this template | `[40-hex SHA]` |
| Tabletop opened at | `[ISO-8601 timestamp]` |
| Tabletop closed at | `[ISO-8601 timestamp]` |
| Completed-copy digest, recorded externally | `[sha256:64-hex]` |
| Deviations from this packet | `[none | invented deviation IDs only]` |

## 2. Hard boundary and fill rules

1. Use invented personas, invented operator references, invented incident
   references, and synthetic event tokens only. Do not recruit, contact,
   consent, screen, schedule, observe, record, or enroll a person.
2. Do not enter a real name, email, account, institution, course, assignment,
   accommodation, disability, wellbeing fact, instructor contact, credential,
   graded work, quote, audio, video, telemetry, or screen recording.
3. The words marked **exact operator words** are fixed rehearsal lines. Do not
   soften, explain, sell, teach, apologize into continued exposure, or ask why.
4. Each drill is an independent branch from a clean invented register. Results
   are not pooled across drills. This prevents one simulated study-wide pause
   from being silently bypassed by the next drill.
5. An invented starter is counted once the invented persona receives the first
   task instruction or sees any part of either surface. A stopped or withdrawn
   invented starter remains in that branch's synthetic all-starters
   denominator and retains the originally assigned cell.
6. Use literal `not_exposed` when a surface was not reached. Do not substitute
   blank, `N/A`, completed, excluded, or removed.
7. Use field-level missingness. Permitted values in this packet are
   `none`, `stopped_before_field`, `not_exposed`,
   `prohibited_capture_destroyed`, `process_unavailable`, and
   `not_observable_in_tabletop`.
8. Never replace a starter, reassign a cell after an event, continue capture
   after a stop, erase a starter from the denominator, restart automatically,
   or calculate a composite, weighted score, rank, or single optimization
   metric.
9. “Deletion” in this packet is a simulated procedure check. It neither
   deletes real data nor proves that an approved deletion system exists.
10. Stop at a failed check. Record the defect; do not repair the script during
    the same branch and convert it to a pass.

## 3. Invented rehearsal roles

These references are deliberately fictional. They exercise separation of
duties but do not fill, name, approve, or authorize the six real roles required
by Protocol 1.0.

| Rehearsal role | Invented reference |
| --- | --- |
| Principal research owner | `SYN-ROLE-PRINCIPAL-01` |
| Research and data approver | `SYN-ROLE-DATA-APPROVER-02` |
| Study operator | `SYN-ROLE-OPERATOR-03` |
| Observer or note operator | `SYN-ROLE-OBSERVER-04` |
| Incident and withdrawal owner | `SYN-ROLE-INCIDENT-05` |
| Analysis adjudicator | `SYN-ROLE-ADJUDICATOR-06` |

Role-conflict check: `[PASS | FAIL]`

Observed role substitution or absence: `[none | invented role reference and drill ID]`

## 4. Fixed cell and exposure rules

| Cell | Exposure 1 | Neutral reset | Exposure 2 |
| --- | --- | --- | --- |
| 1 | Candidate A + Pack P | fixed 3 minutes | Substitute B + Pack Q |
| 2 | Substitute B + Pack P | fixed 3 minutes | Candidate A + Pack Q |
| 3 | Candidate A + Pack Q | fixed 3 minutes | Substitute B + Pack P |
| 4 | Substitute B + Pack Q | fixed 3 minutes | Candidate A + Pack P |

Each exposure uses the fixed nine-task script and a 12-minute window. The only
permitted neutral follow-ups are exactly:

- “What led you to that?”
- “Who made that choice?”
- “What do you expect to happen next?”

No drill changes the task wording, order, timebox, cell, pack, surface,
artifact identity, or neutral prompts.

## 5. Common per-drill record

Complete every field without copying synthetic results into any participant
ledger.

| Field | Entry |
| --- | --- |
| Drill opened at | `[ISO-8601 timestamp]` |
| Drill closed at | `[ISO-8601 timestamp]` |
| Operator rehearsal reference | `[invented role reference]` |
| Observer rehearsal reference | `[invented role reference]` |
| Script/digest preflight | `[PASS | FAIL]` |
| Injected event delivered exactly | `[PASS | FAIL]` |
| Immediate action delivered exactly | `[PASS | FAIL]` |
| Exact words delivered verbatim | `[PASS | FAIL]` |
| Structured row reconciled | `[PASS | FAIL]` |
| Drill result | `[PASS | FAIL | NOT_RUN]` |
| Defect IDs | `[none | SYN-DEFECT-...]` |

## 6. Drill 1 — normal completion

### Fixed setup

| Field | Fixed value |
| --- | --- |
| Drill ID | `SYN-TT-V1-D01-NORMAL` |
| Invented cohort ID | `SYN-COHORT-D01` |
| Invented starter ID | `SYN-D01-S001` |
| Invented event ID | `SYN-EVENT-D01-NORMAL-COMPLETE` |
| Assigned cell | `1` |
| Exposure 1 | Candidate A + Pack P |
| Exposure 2 | Substitute B + Pack Q |
| Injected event | Persona completes both fixed task sequences and the fixed post-comparison questions without requesting help, exposing prohibited data, or triggering a stop. |
| Expected canonical stop ID | `none` — normal control branch; invoking any stop is a deviation |

### Exact immediate operator action and words

Action: keep the assigned cell and timers unchanged; read the next fixed task
only. If a follow-up is required, select only one of the three fixed neutral
prompts. Do not confirm correctness or explain the authority model.

Exact operator words: the next verbatim task from the bound moderator packet,
or exactly one of “What led you to that?”, “Who made that choice?”, and “What
do you expect to happen next?” No other substantive words are permitted.

### Expected exposure and missingness

| Item | Fixed expected disposition | Observed |
| --- | --- | --- |
| Exposure 1 | `completed` | `[completed | deviation]` |
| Exposure 2 | `completed` | `[completed | deviation]` |
| `not_exposed` | `none` | `[none | surface]` |
| Permitted structured dimensions | `none` missing, unless an actual rehearsal defect is recorded | `[none | field: missingness code]` |
| Post-comparison questions | `completed` | `[completed | missingness code]` |

### Fixed operations disposition

| Concern | Fixed expected disposition | Observed |
| --- | --- | --- |
| Incident | `none` | `[none | SYN-INC-D01-...]` |
| Deletion | `not_requested`; no row is erased | `[not_requested | deviation]` |
| Restart | `not_applicable`; no replay is created | `[not_applicable | deviation]` |
| Denominator | `SYN-D01-S001` retained as `1 / 1` all starters; Cell 1 remains occupied | `[PASS | FAIL]` |

### Pass/fail checks

| Check | Pass only if | Fail if | Result |
| --- | --- | --- | --- |
| Anti-coaching | Only fixed tasks or one fixed neutral prompt is spoken. | Correctness, authority, preference, or control behavior is taught or praised. | `[PASS | FAIL]` |
| Reassignment | Cell 1 and P→Q order remain fixed. | A cell, pack, or surface is changed after any response. | `[PASS | FAIL]` |
| Continued capture | Only approved structured fields are simulated, and capture ends with the fixed script. | Raw prose, quotes, audio, video, telemetry, or post-script observation is added. | `[PASS | FAIL]` |
| Erasure | The completed starter row and any honest missingness remain visible. | A difficult or incomplete field is deleted to make the row complete. | `[PASS | FAIL]` |
| Automatic restart | No restart or practice replay is inserted. | Any task or exposure is repeated to improve an answer. | `[PASS | FAIL]` |
| Composite | Every dimension stays separate. | A total, average, weighted score, rank, or pass percentage across dimensions is produced. | `[PASS | FAIL]` |

## 7. Drill 2 — withdrawal or distress

### Fixed setup

| Field | Fixed value |
| --- | --- |
| Drill ID | `SYN-TT-V1-D02-WITHDRAWAL` |
| Invented cohort ID | `SYN-COHORT-D02` |
| Invented starter ID | `SYN-D02-S001` |
| Invented event ID | `SYN-EVENT-D02-WITHDRAW-NOW` |
| Invented incident/withdrawal ID | `SYN-INC-D02-001` |
| Assigned cell | `2` |
| Exposure 1 | Substitute B + Pack P |
| Exposure 2 | Candidate A + Pack Q |
| Injected event | During Exposure 1, immediately after Task 4 begins, the persona says, “I want to stop now and delete anything about me.” |
| Canonical stop ID | `participant_withdrawal_or_distress` |

### Exact immediate operator action and words

Action: stop the exposure and timer; remove the artifact from view; stop all
dimension capture; mark the remaining fields with explicit missingness; route
the invented withdrawal to `SYN-ROLE-INCIDENT-05`; do not ask for a reason.

Exact operator words: “We are stopping now. You do not need to explain.
Nothing else in this rehearsal will continue. I will follow the approved
withdrawal and deletion procedure.”

### Expected exposure and missingness

| Item | Fixed expected disposition | Observed |
| --- | --- | --- |
| Exposure 1 | `stopped` at Task 4 | `[stopped at task | deviation]` |
| Exposure 2 | `not_exposed` | `[not_exposed | deviation]` |
| Substitute B Tasks 4–9 | `stopped_before_field` | `[code]` |
| Candidate A, every dimension | `not_exposed` | `[code]` |
| Post-comparison questions | `stopped_before_field` | `[code]` |

### Fixed operations disposition

| Concern | Fixed expected disposition | Observed |
| --- | --- | --- |
| Incident/withdrawal | `SYN-INC-D02-001` opened and routed; no cause or raw quote retained | `[PASS | FAIL]` |
| Deletion | Simulated request logged and simulated approved-path verification attempted; result `[simulated_erasure_verified | process_unavailable]` must be explicit | `[status]` |
| Restart | `not_authorized`; only the incident/withdrawal owner and required approvers may later decide | `[PASS | FAIL]` |
| Denominator | `SYN-D02-S001` retained as `1 / 1`; Cell 2 stays occupied; no replacement | `[PASS | FAIL]` |

### Pass/fail checks

| Check | Pass only if | Fail if | Result |
| --- | --- | --- | --- |
| Anti-coaching | The exact stop words are spoken once, without asking why or persuading continuation. | The operator reassures toward completion, diagnoses distress, or asks for an explanation. | `[PASS | FAIL]` |
| Reassignment | Cell 2 remains occupied by the withdrawn starter. | A replacement is assigned Cell 2 or the starter is moved to another cell. | `[PASS | FAIL]` |
| Continued capture | Capture stops immediately except the minimum invented withdrawal/incident fields. | Tasks, preference, behavior, or emotional detail continues to be recorded. | `[PASS | FAIL]` |
| Erasure | The simulated deletion path is exercised while the minimal synthetic denominator fact remains. | The starter disappears from all-starters, or deletion is claimed without a verification result. | `[PASS | FAIL]` |
| Automatic restart | Exposure 2 and the session do not begin again. | The operator offers a break, another surface, or a same-session restart. | `[PASS | FAIL]` |
| Composite | Withdrawal and missing fields remain separate from every outcome dimension. | Withdrawal is scored as failure/success or folded into a total score. | `[PASS | FAIL]` |

## 8. Drill 3 — prohibited real or third-party data

### Fixed setup

| Field | Fixed value |
| --- | --- |
| Drill ID | `SYN-TT-V1-D03-PROHIBITED-DATA` |
| Invented cohort ID | `SYN-COHORT-D03` |
| Invented starter ID | `SYN-D03-S001` |
| Invented event ID | `SYN-EVENT-D03-PROHIBITED-TOKEN` |
| Invented incident ID | `SYN-INC-D03-001` |
| Assigned cell | `3` |
| Exposure 1 | Candidate A + Pack Q |
| Exposure 2 | Substitute B + Pack P |
| Injected event | During Task 2, the persona attempts to paste the literal harmless token `SYNTHETIC_PRIVATE_DATA_TOKEN_DO_NOT_COPY`, which the drill treats as if it were real coursework or third-party data. No realistic personal data is invented. |
| Canonical stop ID | `prohibited_real_or_third_party_data` |

### Exact immediate operator action and words

Action: stop the exposure and timer; prevent the token from being submitted or
copied; remove the input from view; stop capture; record only the canonical
stop ID and invented incident ID; rehearse containment and deletion
verification without reproducing the token in a notes field.

Exact operator words: “Please stop. Do not share or show that information. I
am ending this exposure now. We will follow the approved deletion and incident
procedure.”

### Expected exposure and missingness

| Item | Fixed expected disposition | Observed |
| --- | --- | --- |
| Exposure 1 | `stopped` during Task 2 | `[stopped at task | deviation]` |
| Exposure 2 | `not_exposed` | `[not_exposed | deviation]` |
| Candidate A fields after stop | `stopped_before_field` | `[code]` |
| Attempted prohibited field | `prohibited_capture_destroyed`; raw value absent from record | `[code]` |
| Substitute B, every dimension | `not_exposed` | `[code]` |
| Post-comparison questions | `stopped_before_field` | `[code]` |

### Fixed operations disposition

| Concern | Fixed expected disposition | Observed |
| --- | --- | --- |
| Incident | `SYN-INC-D03-001` opened, contained, and routed to `SYN-ROLE-INCIDENT-05` | `[PASS | FAIL]` |
| Deletion | Simulated quarantine/deletion receipt is checked; raw synthetic token is not retained in the rehearsal row | `[simulated_erasure_verified | process_unavailable]` |
| Restart | `not_authorized`; incident adjudication required | `[PASS | FAIL]` |
| Denominator | `SYN-D03-S001` retained as `1 / 1`; Cell 3 stays occupied; no replacement | `[PASS | FAIL]` |

### Pass/fail checks

| Check | Pass only if | Fail if | Result |
| --- | --- | --- | --- |
| Anti-coaching | The operator interrupts with the exact stop words and does not help redact or finish the answer. | The operator inspects, interprets, summarizes, or asks about the prohibited content. | `[PASS | FAIL]` |
| Reassignment | Cell 3 remains occupied. | Another invented starter replaces the stopped row or receives its cell. | `[PASS | FAIL]` |
| Continued capture | Only stop, incident, missingness, and containment fields continue. | The token or any content-derived category is copied into notes, quotes, telemetry, or evidence. | `[PASS | FAIL]` |
| Erasure | The attempted raw field is simulated as destroyed, but starter/stop/denominator facts remain. | Raw content remains, or the whole starter row is erased to hide the incident. | `[PASS | FAIL]` |
| Automatic restart | Neither surface is resumed after containment. | A “clean” retry is launched automatically. | `[PASS | FAIL]` |
| Composite | The privacy stop is reported independently. | The stop is converted into a zero, excluded from a score, or buried in a composite. | `[PASS | FAIL]` |

## 9. Drill 4 — wrong artifact or technical stop

### Fixed setup

| Field | Fixed value |
| --- | --- |
| Drill ID | `SYN-TT-V1-D04-WRONG-ARTIFACT` |
| Invented cohort ID | `SYN-COHORT-D04` |
| Invented starter ID | `SYN-D04-S001` |
| Invented event ID | `SYN-EVENT-D04-DIGEST-MISMATCH` |
| Invented incident ID | `SYN-INC-D04-001` |
| Assigned cell | `4` |
| Exposure 1 | Substitute B + Pack Q |
| Exposure 2 | Candidate A + Pack P |
| Injected event | After the first task instruction makes the persona a starter but before any surface renders, the artifact check returns `SYNTHETIC_DIGEST_MISMATCH` instead of the bound Substitute B digest. |
| Canonical stop ID | `wrong_artifact_allocation_script_or_timebox` |

### Exact immediate operator action and words

Action: stop the timer; do not render either artifact; preserve the original
Cell 4 assignment; capture only the expected identity, mismatch code, time,
and invented incident reference; route the mismatch for adjudication.

Exact operator words: “I’m stopping this exposure because the approved study
setup cannot be verified. This is not your error. We will not continue or
restart unless the required owners authorize a new run.”

### Expected exposure and missingness

| Item | Fixed expected disposition | Observed |
| --- | --- | --- |
| Exposure 1 | `not_exposed`; task instruction received, artifact not rendered | `[not_exposed | deviation]` |
| Exposure 2 | `not_exposed` | `[not_exposed | deviation]` |
| Candidate A, every dimension | `not_exposed` | `[code]` |
| Substitute B, every dimension | `not_exposed` | `[code]` |
| Time/error fields after mismatch | `stopped_before_field`, except approved technical-stop fields | `[code]` |
| Post-comparison questions | `stopped_before_field` | `[code]` |

### Fixed operations disposition

| Concern | Fixed expected disposition | Observed |
| --- | --- | --- |
| Incident | `SYN-INC-D04-001` records mismatch without relabeling the artifact | `[PASS | FAIL]` |
| Deletion | `not_requested`; mismatch and denominator records remain | `[PASS | FAIL]` |
| Restart | `not_authorized`; no automatic reload, fallback, or corrected same-session run | `[PASS | FAIL]` |
| Denominator | `SYN-D04-S001` retained as `1 / 1`; Cell 4 stays occupied because the first task instruction was received | `[PASS | FAIL]` |

### Pass/fail checks

| Check | Pass only if | Fail if | Result |
| --- | --- | --- | --- |
| Anti-coaching | The exact technical-stop words are used without describing the intended answer or surface. | The operator fills time by explaining Candidate A, Substitute B, or the hypothesis. | `[PASS | FAIL]` |
| Reassignment | The original Cell 4 assignment remains in the ledger. | The operator changes the cell/pack, relabels the artifact, or moves the starter to the queue end. | `[PASS | FAIL]` |
| Continued capture | Capture ends after bounded technical-stop bookkeeping. | Any outcome, preference, or behavior capture continues. | `[PASS | FAIL]` |
| Erasure | The mismatch and starter remain reportable. | The row is deleted because no surface rendered, or the mismatch is overwritten. | `[PASS | FAIL]` |
| Automatic restart | No reload, fallback artifact, or same-session correction occurs. | The operator restarts once the expected digest becomes available. | `[PASS | FAIL]` |
| Composite | The stop and missing dimensions remain separate. | The technical stop is excluded from a completion score or absorbed into a total. | `[PASS | FAIL]` |

## 10. Drill 5 — operator coaching or stop override

### Fixed setup

| Field | Fixed value |
| --- | --- |
| Drill ID | `SYN-TT-V1-D05-OPERATOR-INTERFERENCE` |
| Invented cohort ID | `SYN-COHORT-D05` |
| Invented starter ID | `SYN-D05-S001` |
| Invented event ID | `SYN-EVENT-D05-COACHING` |
| Invented incident ID | `SYN-INC-D05-001` |
| Assigned cell | `1` |
| Exposure 1 | Candidate A + Pack P |
| Exposure 2 | Substitute B + Pack Q |
| Injected event | During Task 3, the operator departs from the script and says the synthetic deadline is not verified university truth, then proposes continuing after the observer calls the deviation. |
| Canonical stop ID | `operator_interference_or_stop_override` |

### Exact immediate operator action and words

Action: the observer calls the canonical stop; the operator stops speaking and
the timer stops; remove the artifact; stop outcome capture; record the exact
task number and deviation category without rewriting the earlier response;
route the incident for independent adjudication.

Exact operator words: “I’m stopping this exposure because the study script was
not followed. This is not your error. We will not continue this session.”

### Expected exposure and missingness

| Item | Fixed expected disposition | Observed |
| --- | --- | --- |
| Exposure 1 | `stopped` during Task 3 and marked operator-contaminated | `[stopped at task | deviation]` |
| Exposure 2 | `not_exposed` | `[not_exposed | deviation]` |
| Candidate A fields before coaching | retained as permitted structured observations plus contamination flag | `[status]` |
| Candidate A fields at/after coaching | `stopped_before_field`; do not infer corrected comprehension | `[code]` |
| Substitute B, every dimension | `not_exposed` | `[code]` |
| Post-comparison questions | `stopped_before_field` | `[code]` |

### Fixed operations disposition

| Concern | Fixed expected disposition | Observed |
| --- | --- | --- |
| Incident | `SYN-INC-D05-001` records `operator_interference_or_stop_override` and Task 3 | `[PASS | FAIL]` |
| Deletion | `not_requested`; contaminated structured row is retained and visibly flagged | `[PASS | FAIL]` |
| Restart | `not_authorized`; changing operators does not authorize a retry | `[PASS | FAIL]` |
| Denominator | `SYN-D05-S001` retained as `1 / 1`; Cell 1 stays occupied; no replacement | `[PASS | FAIL]` |

### Pass/fail checks

| Check | Pass only if | Fail if | Result |
| --- | --- | --- | --- |
| Anti-coaching | Coaching is recognized as a stop, not a repair, and the exact stop words follow. | The coached answer is accepted, corrected, repeated, or allowed to continue. | `[PASS | FAIL]` |
| Reassignment | Cell 1 remains occupied and contaminated. | A new operator, starter, pack, or cell is used to recreate a clean row. | `[PASS | FAIL]` |
| Continued capture | Outcome capture stops immediately after the deviation. | The second surface, post-comparison questions, or “unaffected” dimensions continue. | `[PASS | FAIL]` |
| Erasure | The deviation and contaminated pre-stop fields remain visible. | Coaching or the row is deleted, rewritten, or silently relabeled normal. | `[PASS | FAIL]` |
| Automatic restart | No same-version or same-session retry occurs. | The branch restarts because another operator is available. | `[PASS | FAIL]` |
| Composite | Contamination is reported separately. | The row is repaired through scoring, imputation, exclusion, or a composite. | `[PASS | FAIL]` |

## 11. Drill 6 — material amendment after a starter

### Fixed setup

| Field | Fixed value |
| --- | --- |
| Drill ID | `SYN-TT-V1-D06-POST-STARTER-AMENDMENT` |
| Invented cohort ID | `SYN-COHORT-D06` |
| Invented starter ID | `SYN-D06-S001` |
| Invented event ID | `SYN-EVENT-D06-TASK-WORDING-CHANGE` |
| Invented amendment ID | `SYN-AMEND-D06-001` |
| Assigned cell | `2` |
| Exposure 1 | Substitute B + Pack P |
| Exposure 2 | Candidate A + Pack Q |
| Injected event | Exposure 1 completes. Before the neutral reset ends, `SYN-ROLE-PRINCIPAL-01` proposes changing Task 5 wording for Exposure 2. |
| Canonical stop ID | `post_starter_protocol_amendment` |

### Exact immediate operator action and words

Action: do not apply or debate the new wording in-session; pause the complete
synthetic study; do not begin Exposure 2; close this invented cohort under
Protocol 1.0; retain its partial all-starters record; route the proposed
material amendment to the principal and research/data approver.

Exact operator words: “We are pausing the study because the approved protocol
may change. This is not your error. We will not continue this session under
the current version.”

### Expected exposure and missingness

| Item | Fixed expected disposition | Observed |
| --- | --- | --- |
| Exposure 1 | `completed` under Protocol 1.0 | `[completed | deviation]` |
| Exposure 2 | `not_exposed` | `[not_exposed | deviation]` |
| Substitute B dimensions | retained separately under Protocol 1.0 | `[status]` |
| Candidate A, every dimension | `not_exposed` | `[code]` |
| Post-comparison questions | `stopped_before_field` | `[code]` |

### Fixed operations disposition

| Concern | Fixed expected disposition | Observed |
| --- | --- | --- |
| Incident/amendment | `SYN-AMEND-D06-001` records the proposed material change and cohort closure | `[PASS | FAIL]` |
| Deletion | `not_requested`; partial Protocol 1.0 all-starters report is retained | `[PASS | FAIL]` |
| Restart | `not_authorized`; a new protocol/artifact manifest, approvals, and new denominator are required | `[PASS | FAIL]` |
| Denominator | `SYN-D06-S001` retained as `1 / 1`; Cell 2 stays occupied in the closed cohort; no cross-version pooling | `[PASS | FAIL]` |

### Pass/fail checks

| Check | Pass only if | Fail if | Result |
| --- | --- | --- | --- |
| Anti-coaching | The proposed wording is not shown or explained to the persona. | The operator asks the persona which wording is clearer or teaches the changed task. | `[PASS | FAIL]` |
| Reassignment | Cell 2 remains occupied in the closed Protocol 1.0 cohort. | The starter is moved to the amended cohort or replaced. | `[PASS | FAIL]` |
| Continued capture | Exposure 2 and post-comparison capture do not occur. | Any new-version task is administered within the current denominator. | `[PASS | FAIL]` |
| Erasure | The partial all-starters row, amendment, and missingness remain. | The partial cohort is discarded or relabeled pre-pilot. | `[PASS | FAIL]` |
| Automatic restart | No run resumes until a new frozen version, approvals, and denominator exist. | A typographic label or principal request is treated as sufficient to continue. | `[PASS | FAIL]` |
| Composite | Versioned dimensions and missingness remain separate. | Old and new versions are pooled or reduced to a combined score. | `[PASS | FAIL]` |

## 12. Drill 7 — required process unavailable and all-starters report

### Fixed setup

This independent branch begins with four invented completed starters solely so
the operator can rehearse a non-completers-only report when the fifth starter
triggers a study-wide pause.

| Field | Fixed value |
| --- | --- |
| Drill ID | `SYN-TT-V1-D07-PROCESS-UNAVAILABLE` |
| Invented cohort ID | `SYN-COHORT-D07` |
| Triggering invented starter ID | `SYN-D07-S005` |
| Invented event ID | `SYN-EVENT-D07-DATA-PROCESS-OFFLINE` |
| Invented incident ID | `SYN-INC-D07-001` |
| Assigned cell for triggering starter | `1` |
| Exposure 1 | Candidate A + Pack P |
| Exposure 2 | Substitute B + Pack Q |
| Injected event | After the first task instruction but before Candidate A renders, the approved structured-row destination returns `SYNTHETIC_PROCESS_UNAVAILABLE`, and `SYN-ROLE-INCIDENT-05` is also marked unavailable. |
| Canonical stop ID | `required_operator_or_data_process_unavailable` |

### Exact immediate operator action and words

Action: stop the timer; do not render Candidate A or Substitute B; stop all
capture except the minimum synthetic stop record; preserve the original Cell 1
assignment; pause the complete invented cohort; notify both principal and
research/data approver; produce the fixed all-starters report below.

Exact operator words: “We are stopping because a required study safeguard is
unavailable. This is not your error. We will not continue or restart today.”

### Fixed all-starters register

| Starter | Fixed cell | Exposure 1 | Exposure 2 | Stop | Denominator |
| --- | --- | --- | --- | --- | --- |
| `SYN-D07-S001` | 1 | Candidate A + P `completed` | Substitute B + Q `completed` | `none` | retained |
| `SYN-D07-S002` | 2 | Substitute B + P `completed` | Candidate A + Q `completed` | `none` | retained |
| `SYN-D07-S003` | 3 | Candidate A + Q `completed` | Substitute B + P `completed` | `none` | retained |
| `SYN-D07-S004` | 4 | Substitute B + Q `completed` | Candidate A + P `completed` | `none` | retained |
| `SYN-D07-S005` | 1 | Candidate A + P `not_exposed` | Substitute B + Q `not_exposed` | `required_operator_or_data_process_unavailable` | retained |

Do not invent dimension values for `SYN-D07-S001` through
`SYN-D07-S004`. Their `completed` labels exist only to rehearse denominator and
exposure bookkeeping, not to simulate favorable results.

### Expected exposure and missingness for the triggering starter

| Item | Fixed expected disposition | Observed |
| --- | --- | --- |
| Exposure 1 | `not_exposed`; first task instruction received, artifact not rendered | `[not_exposed | deviation]` |
| Exposure 2 | `not_exposed` | `[not_exposed | deviation]` |
| Candidate A, every dimension | `process_unavailable` and `not_exposed` | `[codes]` |
| Substitute B, every dimension | `process_unavailable` and `not_exposed` | `[codes]` |
| Post-comparison questions | `process_unavailable` | `[code]` |

### Required synthetic all-starters report

| Report field | Fixed expected result | Observed |
| --- | --- | --- |
| Invited | `5` invented personas | `[5 | deviation]` |
| Screened | `5` invented personas | `[5 | deviation]` |
| Enrolled | `5` invented personas | `[5 | deviation]` |
| All starters | `5` | `[5 | deviation]` |
| Completed sessions | `4 / 5 all starters` | `[value]` |
| Candidate A completed exposure | `4 / 5 all starters` | `[value]` |
| Candidate A `not_exposed` | `1 / 5 all starters` — `SYN-D07-S005` | `[value and IDs]` |
| Substitute B completed exposure | `4 / 5 all starters` | `[value]` |
| Substitute B `not_exposed` | `1 / 5 all starters` — `SYN-D07-S005` | `[value and IDs]` |
| Required-process stops | `1 / 5 all starters` — `SYN-D07-S005` | `[value and IDs]` |
| Cell counts | Cell 1 `2`; Cell 2 `1`; Cell 3 `1`; Cell 4 `1` | `[counts]` |
| Replacements | `0` | `[0 | deviation]` |
| Dimension reporting | Each dimension separate; S005 missingness explicit; S001–S004 values `not_observable_in_tabletop` | `[PASS | FAIL]` |
| Composite result | `prohibited_not_calculated` | `[PASS | FAIL]` |
| Study status | `paused_pending_principal_and_research_data_approver_adjudication` | `[status]` |

### Fixed operations disposition

| Concern | Fixed expected disposition | Observed |
| --- | --- | --- |
| Incident | `SYN-INC-D07-001` opened; both required-owner and process unavailability recorded | `[PASS | FAIL]` |
| Deletion | `cannot_verify_process_unavailable`; no deletion-complete claim is permitted | `[PASS | FAIL]` |
| Restart | `not_authorized`; restored service or a substitute operator does not automatically resume the cohort | `[PASS | FAIL]` |
| Denominator | All five invented starters retained; Cell 1 count remains two; the triggering starter is not replaced | `[PASS | FAIL]` |

### Pass/fail checks

| Check | Pass only if | Fail if | Result |
| --- | --- | --- | --- |
| Anti-coaching | The exact stop words are used; the persona is not asked to wait, proceed offline, or answer from memory. | The operator continues conversationally or gathers answers outside the approved process. | `[PASS | FAIL]` |
| Reassignment | S005 remains in Cell 1 and all five starters remain. | S005 is removed, shifted, or replaced to rebalance cells. | `[PASS | FAIL]` |
| Continued capture | Only minimum stop bookkeeping occurs after unavailability. | Notes are buffered elsewhere, kept on paper, or entered after restoration. | `[PASS | FAIL]` |
| Erasure | The stop and missingness stay in the report; deletion status remains unverified. | S005 is omitted, or deletion is claimed complete while its process is unavailable. | `[PASS | FAIL]` |
| Automatic restart | Complete-study pause remains until joint adjudication. | Service restoration, a new operator, or local storage automatically resumes the run. | `[PASS | FAIL]` |
| Composite | Counts use `n / 5 all starters`, with dimensions and missingness separate. | A completers-only denominator, imputation, overall rate, rank, or weighted score is used. | `[PASS | FAIL]` |

## 13. Drill-level completion ledger

One failed required check makes that drill `FAIL`. A failed drill is a protocol
defect or operations-readiness gap; it is never repaired into a pass by
repeating only the failed step.

| Drill | Injected event | Canonical stop | Result | Defect or incident references |
| --- | --- | --- | --- | --- |
| `SYN-TT-V1-D01-NORMAL` | normal completion | `none` | `[PASS | FAIL | NOT_RUN]` | `[none | IDs]` |
| `SYN-TT-V1-D02-WITHDRAWAL` | withdrawal/distress | `participant_withdrawal_or_distress` | `[PASS | FAIL | NOT_RUN]` | `[IDs]` |
| `SYN-TT-V1-D03-PROHIBITED-DATA` | prohibited data | `prohibited_real_or_third_party_data` | `[PASS | FAIL | NOT_RUN]` | `[IDs]` |
| `SYN-TT-V1-D04-WRONG-ARTIFACT` | artifact/digest mismatch | `wrong_artifact_allocation_script_or_timebox` | `[PASS | FAIL | NOT_RUN]` | `[IDs]` |
| `SYN-TT-V1-D05-OPERATOR-INTERFERENCE` | coaching/override | `operator_interference_or_stop_override` | `[PASS | FAIL | NOT_RUN]` | `[IDs]` |
| `SYN-TT-V1-D06-POST-STARTER-AMENDMENT` | material amendment | `post_starter_protocol_amendment` | `[PASS | FAIL | NOT_RUN]` | `[IDs]` |
| `SYN-TT-V1-D07-PROCESS-UNAVAILABLE` | owner/data process unavailable | `required_operator_or_data_process_unavailable` | `[PASS | FAIL | NOT_RUN]` | `[IDs]` |

## 14. Closeout and claim control

| Closeout check | Result |
| --- | --- |
| Only invented IDs and event tokens were used | `[PASS | FAIL]` |
| No person was contacted, observed, enrolled, or recorded | `[PASS | FAIL]` |
| No real or realistic personal/course data was entered | `[PASS | FAIL]` |
| Every starter remained in its branch denominator | `[PASS | FAIL]` |
| Every unvisited surface says `not_exposed` | `[PASS | FAIL]` |
| Missingness is field-level and explicit | `[PASS | FAIL]` |
| No starter was replaced or reassigned | `[PASS | FAIL]` |
| Capture stopped at every stop event | `[PASS | FAIL]` |
| No row or adverse event was erased | `[PASS | FAIL]` |
| No restart occurred automatically | `[PASS | FAIL]` |
| No composite or completers-only primary result was produced | `[PASS | FAIL]` |
| Packet identities still match Section 1 | `[PASS | FAIL]` |

**Synthetic tabletop disposition:** `[not_run | defects_open | synthetic_walkthrough_complete]`

**Open synthetic defect IDs:** `[none | SYN-DEFECT-...]`

**Required next authority:** `[principal review required; research/data approver review required; no participant operation authorized]`

Even when every field reads `PASS`, the maximum statement is:
“A local synthetic-only walkthrough of the seven invented branches was
recorded against this exact packet.” It does not establish that artifacts,
roles, data processes, incidents, withdrawal, accessibility support,
population, consent, compensation, recruitment, storage, deletion, or a real
run are approved or operational. It does not satisfy the independent review,
named-role, written-authorization, or participant-evidence gates in Protocol
1.0.
