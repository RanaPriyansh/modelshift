# FORGE Page Inventory and Requirements

Status: Canonical product map and design scope.

Date: 2026-08-01.

Source revision: `684f5a898fa2ece3a1e4a61c1a51f0716b535400`.

This record maps every canonical product route to a design family.

It also records compatibility routes and role-gated surfaces.

## 1. Navigation model

### 1.1 Public

Primary items:

- Paths.
- How FORGE Works.
- Evidence and Trust.
- Start learning.

Secondary items:

- Pricing.
- Sign in.
- Theme.

### 1.2 Web application

Primary items:

- Today.
- Paths.
- Projects.
- Evidence.
- Account.

Secondary destinations:

- Goals.
- Returns.
- Library.
- Settings.

Returns appear on Today when a task is due.

### 1.3 iOS

Use four native tabs:

- Today.
- Paths.
- Projects.
- Evidence.

Place Library, Returns, and Settings inside contextual routes and the account menu.

Do not place an action in the tab bar.

## 2. Public site

| ID | Route | Design family | Dominant action | Required design states |
| --- | --- | --- | --- | --- |
| `PUB-01` | `/` | Scenic goal entry | Start one goal | Ready, draft saved, storage failure |
| `PUB-02` | `/start` | Progressive goal clarification | Review goal interpretation | Entry, clarification, preview, accept, revise, reject |
| `PUB-03` | `/paths` | Reviewed path directory | Inspect a path | Ready, filter, no result, unavailable |
| `PUB-04` | `/paths/[slug]` | Path detail | Start or personalize | Reviewed, candidate, gap, withdrawn |
| `PUB-05` | `/how-forge-works` | Method narrative | Shape a goal | Ready |
| `PUB-06` | `/modelshift` | Method and guest lab | Open one reviewed lab | Ready, unavailable, age policy |
| `PUB-07` | `/trust` | Trust hub | Inspect a contract | Ready |
| `PUB-08` | `/trust/evidence` | Evidence contract | Inspect examples | Ready |
| `PUB-09` | `/coverage` | Availability map | Inspect released work | Ready, candidate, unavailable |
| `PUB-10` | `/pricing` | Honest availability | Explore current access | Free local access, not offered |
| `PUB-11` | `/sign-in` | Optional continuity | Sign in or stay local | Signed out, authenticating, failure, recovery |

### 2.1 Public home requirements

Use a full-width landscape.

Use one short promise.

Use one natural-language goal input.

Use one primary action.

Show the learning loop after the first viewport.

Show exact current product scope.

Do not place an application screenshot inside the hero.

### 2.2 Start requirements

Ask for one goal first.

Ask no more than three first-session questions.

Show a 3 to 7 milestone preview.

Name reviewed, candidate, and gap states.

Require Accept, Revise, Reject, or Save as draft.

Do not activate a path from silence or navigation.

### 2.3 Path directory requirements

Group paths by desired outcome.

Do not present a shelf of content as a learning path.

Show review state, version, prerequisites, effort, project, proof, return, and limitations.

Use filters only when useful.

### 2.4 Trust requirements

Separate evidence, sources, AI, privacy, safety, and accessibility.

Use examples with exact claim limits.

Do not use trust badges without source records.

## 3. Web application

| ID | Route | Design family | Dominant action | Required design states |
| --- | --- | --- | --- | --- |
| `APP-01` | `/app` | Today | Start or resume next action | Loading, empty, ready, blocked, offline, complete |
| `APP-02` | `/app/goals` | Goal collection | Inspect or edit one goal | Draft, clarifying, active, paused, retired |
| `APP-03` | `/app/paths` | Path collection | Open one path | Proposed, accepted, active, paused, completed |
| `APP-04` | `/app/paths/[recordId]` | Path detail | Start next valid activity | Ready, blocked, stale, superseded |
| `APP-05` | `/app/study` | Action brief | Start a session | Ready, unavailable, policy blocked |
| `APP-06` | `/app/study/[sessionId]` | Focus session | Perform one operation | Ready, active, paused, submitted, invalid |
| `APP-07` | `/app/projects` | Project collection | Inspect one project | Empty, proposed, active, critique, closed |
| `APP-08` | `/app/projects/[projectId]` | Project workspace | Perform current project stage | Planned, active, critique, revision, defence |
| `APP-09` | `/app/evidence` | Evidence ledger | Inspect one record | Empty, ready, partial, contaminated |
| `APP-10` | `/app/evidence/[evidenceId]` | Evidence detail | Inspect, challenge, export, or delete | Ready, challenged, superseded, invalidated |
| `APP-11` | `/app/returns` | Return queue | Open one due return | Empty, upcoming, due, expired, completed |
| `APP-12` | `/app/returns/[returnId]` | Protected return | Submit delayed work | Ready, active, expired, submitted, invalid |
| `APP-13` | `/app/library` | Reviewed resource ledger | Inspect one source | Ready, external, fallback, withdrawn |
| `APP-14` | `/app/settings` | Account and data controls | Change one setting | Guest, authenticated, sync state, deletion state |

### 3.1 Today requirements

Show one next action.

Show why it is next.

Show expected time.

Show assistance mode.

Show source state.

Show a manual alternative.

Show a stopping point.

Do not show a dense dashboard.

### 3.2 Path requirements

Show target outcome and milestone rationale.

Show exact version and review state.

Show project, proof, and return.

Show limitations and gaps.

Separate activity completion from evidence.

### 3.3 Study requirements

State the learner operation.

State the support that is available.

State the support that is not available.

Preserve a local draft during recoverable failure.

Provide Save and exit.

### 3.4 Project requirements

Show the brief, constraints, stages, artifacts, critique, provenance, and defence.

Keep AI and source use visible.

Do not make an output equal to capability evidence.

### 3.5 Evidence requirements

Show the exact claim.

Show conditions, support, access accommodations, reviewer, versions, and limits.

Show correction history.

Provide Inspect provenance, Challenge, Export, and Delete where eligible.

### 3.6 Return requirements

Hide prior instructional content during the protected return.

Keep accessibility support.

State the due window and attempt rule.

Do not infer retention from an expired task.

## 4. Focus mode

| ID | Route | Purpose | Dominant action |
| --- | --- | --- | --- |
| `FOCUS-01` | `/focus/activity/[sessionId]` | Concentrated ordinary activity | Perform the current operation |
| `FOCUS-02` | `/focus/modelshift/[sessionId]` | ModelShift protocol | Commit, investigate, reconstruct, or prove |
| `FOCUS-03` | `/learn/[world]` | Bounded guest World | Perform the current operation |

Focus mode keeps:

- Exit.
- Save state.
- Source or idealization access.
- Safety information.
- Accessibility controls.
- Error recovery.

Focus mode removes broad application navigation.

## 5. iOS application

The iOS application uses native Apple structure.

It uses the same product states as the web application.

| ID | Screen | Parent | Dominant action |
| --- | --- | --- | --- |
| `IOS-01` | Welcome | Entry | Enter one goal |
| `IOS-02` | Clarify goal | Entry | Answer one useful question |
| `IOS-03` | Path preview | Entry | Accept, revise, reject, or save |
| `IOS-04` | Today | Today tab | Start or resume one action |
| `IOS-05` | Path collection | Paths tab | Open one path |
| `IOS-06` | Path detail | Paths tab | Start the next valid action |
| `IOS-07` | Action brief | Today or path | Start attempt |
| `IOS-08` | Attempt | Focus | Commit learner work |
| `IOS-09` | Repair | Focus | Use one bounded scaffold |
| `IOS-10` | Proof | Focus | Submit independent work |
| `IOS-11` | Evidence collection | Evidence tab | Open one record |
| `IOS-12` | Evidence detail | Evidence tab | Inspect provenance |
| `IOS-13` | Return queue | Today | Open one due return |
| `IOS-14` | Protected return | Focus | Submit delayed work |
| `IOS-15` | Project collection | Projects tab | Open one project |
| `IOS-16` | Project workspace | Projects tab | Perform the current stage |
| `IOS-17` | Library | Account route | Inspect one source |
| `IOS-18` | Settings and data | Account route | Change one setting |

### 5.1 Native requirements

Use `NavigationStack`.

Use a native tab bar.

Use native sheets, alerts, search, text fields, and toggles.

Use Dynamic Type.

Define a clear VoiceOver order.

Support Reduce Motion.

Preserve local drafts without a network connection.

Do not use decorative Liquid Glass inside dense work.

## 6. Shared state matrix

All data-backed page families support:

- Loading.
- Ready.
- Empty.
- Offline.
- Stale.
- Partial.
- Unavailable.
- Permission denied.
- Expired.
- Withdrawn.
- Superseded.
- Malformed.
- Error.
- Retrying.
- Safe fallback.

Each state needs text, shape, and action.

Color alone is not sufficient.

## 7. Compatibility routes

These routes need redirects or compatibility behavior after destination parity exists.

| Current route | Destination |
| --- | --- |
| `/login` | `/sign-in` |
| `/account` | `/app/settings` |
| `/evidence` | `/trust/evidence` or `/app/evidence` |
| `/trail` | `/app/paths` and `/app/returns` |
| `/studio` | `/author` |
| `/pathways` | `/coverage` |
| `/how-it-works` | `/how-forge-works` |
| `/app/path` | `/app/paths` |
| `/home` | `/app` or `/` by identity state |

Do not remove a compatibility route before deep-link, policy, and evidence parity is tested.

## 8. Role-gated surfaces

These surfaces are part of the product.

They are not part of the first learner-facing design wave.

| Route family | Surface |
| --- | --- |
| `/author` | Author workspace |
| `/author/drafts/[draftId]` | Draft and source plan |
| `/author/review/[packageId]` | Review history |
| `/admin/review` | Publication decisions |
| `/internal/pilot` | Entitled cohort inspection |
| `/internal/coverage` | Internal release map |

Role-gated surfaces use the same tokens and evidence language.

They need a separate workflow design review.

## 9. Current implementation conflicts

The current code has these design conflicts:

1. The application now labels Today as `Today`.
2. The application no longer includes Explore in primary navigation.
3. The application has both `/app/path` and `/app/paths`.
4. The public code has both `/how-it-works` and `/how-forge-works`.
5. The global font stack still uses Inter, Georgia, and Avenir fallbacks.
6. Several legacy routes remain visible.
7. iOS has a display study but no native application source.
8. The Paper file has a partial foundation cover and no complete component set.

These conflicts do not block Phase 0.

They become tracked design and implementation work.

## 10. Design delivery sequence

Wave 1:

- Foundations.
- Public header and footer.
- Application shell.
- iOS native shell.
- Shared semantic components.

Wave 2:

- Public home.
- Start.
- Paths.
- Path detail.
- Today.
- Study brief.
- Attempt.
- Repair.
- Proof.
- Return.

Wave 3:

- Trust.
- Evidence.
- Projects.
- Library.
- Settings.
- Empty, offline, error, and permission states.

Wave 4:

- Remaining route variants.
- Role-gated author and operations workflows.
- Representative learner review.

## 11. Local atlas coverage

The local design atlas contains:

- Six representative public-site frames.
- Six representative web application frames.
- Six representative iOS frames.
- Eight shared failure and recovery states.

The representative frames establish shared layouts and state language.

They do not replace final designs for every route variant.

Exact rendered evidence is in `docs/design/FORGE_COMPLETE_DESIGN_ATLAS_FIDELITY_LEDGER.md`.
