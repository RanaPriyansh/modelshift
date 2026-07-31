# ADR-018: University research surfaces compile from exact raw scenarios and one shared packet

**Status:** accepted for local synthetic compilation and inspection only

**Date:** 2026-07-31

**Decision owner:** principal product and research task

**Claim ceiling:** deterministic local synthetic compilation and removable
development-surface behavior only; no rendered parity, independent
equivalence, artifact approval, rehearsal readiness, participant operation,
live student or course data, demand, usability, accessibility conformance,
learning, institutional authority, deployment, production, or efficacy claim

## Context

ADR-017 froze authored Pack P and Pack Q manifests, a strict neutral
substitute tree, a moderator packet, and mechanical comparison rules. It
deliberately left two implementation gaps:

1. its candidate adapter was a manifest declaration and did not prove that
   canonical P/Q facts were compiled through the existing semester-loop
   projector; and
2. its candidate and neutral content were not emitted through one exact local
   packet that both renderers could consume.

Implementation review also found a material control mismatch. The authored
scenario described navigation to a separate synthetic view, while the neutral
tree had no exact `next_job` control node. That left the expected control
effect and comparable visible content under-specified.

A route that merely displayed the authored expected state would not test the
current Course Source, Today, Recovery, Protected Study, or Semester Loop
boundaries. Two separately maintained view models could drift while retaining
matching manifest counts. A self-referential source commitment also cannot
truthfully identify and bind the exact source that contains its own accepted
SHA.

## Decision

Keep the protocol document and protocol version unchanged. Refreeze only the
synthetic research artifact content as version `1.1.0`, and add two pure local
compilation boundaries under
`src/forge/university-research-artifacts/**`.

### Artifact v1.1

Artifact v1.1:

- advances both P/Q scenario-pack artifact versions and the neutral substitute
  artifact version from `1.0.0` to `1.1.0`;
- adds `next_job` to the neutral tree's exact node order;
- makes each primary control either
  `navigate_to_local_synthetic_detail` or `remain_in_place`;
- maps a navigational control only to the same scenario's local effect-boundary
  fragment;
- fixes the renderer copybook for enum, boolean, timestamp, and identifier
  presentation; and
- includes the bounded job and primary-control text in the declared visible
  density limit.

The local fragment changes only document position. It does not save, send,
start a session, submit, record, create evidence, alter a path, perform an
institutional action, or cause an external effect. Where a scenario has no
control, the renderer presents the boundary as plain text.

This is an artifact implementation version, not a protocol amendment. The
exact Phase -1 question, task wording, timing, decision grammar, stop rules,
participant prohibition, protocol file, and protocol-document digest remain
unchanged. If that protocol text later needs a material repair, it requires
the amendment process in ADR-016 and cannot be silently folded into artifact
v1.1.

### Exact raw-input candidate compiler

`compileUniversityResearchCandidateScenario(packId, scenarioId)` is the only
candidate compilation entry point for this packet.

- Callers can select only an exact authored pack and scenario ID. They cannot
  supply facts, child projections, readiness flags, or expected outcomes.
- The canonical scenario record is the source of the synthetic facts.
- The compiler derives raw Course Source reconciliation, Today, Recovery, and
  World inputs and invokes the existing Semester Loop projector, which
  recomputes every child boundary.
- The authored expected status is consulted only after projection as a
  postcondition. It cannot shape a child request or bypass a projector.
- The compiler verifies exact scope, source/conflict state, deadline, declared
  capacity and effort, learner-owned path, accepted action, World binding,
  terminal state, and the absence of persistence, event, message, session, or
  external-effect authority.
- The raw request is not returned. A domain-separated raw-fixture digest,
  projection digest, compiler digest, scenario and pack digests, and final
  binding digest make the local compilation inspectable.
- Every successful result is deterministic and deeply frozen. Unknown,
  semantically drifting, invalid, status-mismatched, or authority-strengthened
  input fails closed.

This compiler proves only how frozen synthetic records traverse the current
pure projectors. It does not establish institutional truth, real source
coverage, a learner decision, persistent state, or a deployed runtime.

### Shared local surface packet

`compileUniversityResearchSurfacePacket(packId)` is the common comparison
content boundary for both local surface candidates.

It consumes the exact authored pack and neutral renderer declaration and emits
one digest-bound packet containing:

- seven locked ordinal navigation bindings;
- exact term/course, copied-source, deadline, capacity, path, World, and
  terminal fact strings;
- exact available choices;
- the single bounded next job and local-fragment control boundary;
- the complete no-effect table;
- the exact nine exposure tasks;
- terminal claim limits; and
- a measured per-scenario visible-character count under the authored ceiling.

The candidate may add the FORGE hierarchy and candidate state label that the
protocol intends to compare. The neutral renderer must retain its plain
worksheet hierarchy, ordinal `Example 1` through `Example 7` labels, and
absence of FORGE branding and candidate state names. Neither renderer may
re-author the shared facts, choices, bounded job, effects, tasks, or terminal
claims.

The shared packet establishes common local content provenance. It does not
establish equal DOM structure, visual salience, reading order, cognitive load,
keyboard burden, 320 CSS px behavior, forced-colors behavior, screen-reader
behavior, difficulty, timing, or human-perceived equivalence.

### Development and effect boundary

Both surfaces remain removable development-only fixtures behind exact
server-owned tokens. Production renders the unavailable boundary even if a
fixture token is configured. The surfaces accept no request body, real
coursework, credential, account, participant record, upload, connector, or
provider input.

Local fragment navigation is the maximum primary-control effect in this
packet. No control may navigate to a live World, source system, message,
calendar, account, public route, or external URL, and no state transfers
between fixture surfaces.

## Two-commit evidence freeze

Use a two-commit freeze to avoid a self-referential candidate identity:

1. **Commit A - artifact candidate.** Freeze artifact v1.1, the exact raw-input
   compiler, the shared surface packet, both local renderers, their gates, and
   their tests in one clean source commit.
2. Build and inspect the exact clean Commit A artifact. Bind every automated
   and browser observation to Commit A's full SHA, build identity, and
   compiler, packet, pack, renderer, and route receipts.
3. **Commit B - evidence binding.** Record Commit A's full SHA and exact
   receipts in the preflight descriptor and evidence ledger. Commit B may not
   change an authored fact, compiler, projector, packet, renderer, control,
   route behavior, or comparison copy.

Commit B is a binding record about the observed Commit A artifact. It is not
evidence that Commit B itself was the observed build. If Commit B changes
anything material outside the evidence binding, or if any later change alters
Commit A's surface behavior, the evidence is stale and a new candidate commit
and inspection cycle are required.

A local build receipt remains unsigned local engineering evidence. It does not
establish a hermetic or reproducible build, trusted builder, dependency
provenance, pushed source, deployment, provider artifact, public alias, or
production operation.

## Gates that remain open

This decision does not close any research or release gate. The following
remain required:

1. exact clean Commit A build and route receipts;
2. rendered inspection of candidate and substitute at desktop and 320 CSS px,
   including keyboard, focus, reduced motion, forced colors, overflow,
   reading order, density, salience, and difficulty;
3. screen-reader and other manual assistive-technology review where required;
4. an independently attributed equivalence review bound to the exact review
   envelope and Commit A identities;
5. named artifact approval and a separately approved synthetic-persona
   rehearsal;
6. every participant, data-management, incident, withdrawal, and operator
   authorization item before any participant contact or capture;
7. a separately approved live-data, identity, tenant, persistence, rights,
   provider, and operations boundary before real student or course use; and
8. a frozen pushed SHA, provider-bound build, deployment verification, and
   rollback authority before any production claim.

`UV1-GATE-001`, `UV1-GATE-002`, and `UV1-GATE-003` remain open. Local
screenshots or passing automated checks cannot be described as accessibility
conformance, student validation, learning evidence, artifact approval, or
deployment.

## Alternatives rejected

### Render the authored expected status directly

Rejected because it would let the answer key construct the candidate state and
bypass the existing child projectors the research surface is meant to inspect.

### Maintain separate candidate and neutral view models

Rejected because visible facts, choices, tasks, and effect boundaries could
drift independently while counts and semantic signatures still appeared to
match.

### Keep navigation to separate fixture routes

Rejected because route navigation adds transfer, history, focus, failure, and
salience differences that are not part of the fixed effect-prediction task.
The bounded local fragment makes the exact effect inspectable within one
synthetic scenario.

### Record the candidate SHA in the same commit it identifies

Rejected because changing the source-bound identity creates a new commit. The
two-commit evidence freeze makes that indirection explicit instead of
presenting a self-referential or stale SHA as runtime proof.

### Treat matched screenshots or automated checks as equivalence

Rejected because code and screenshots cannot determine equal comprehension,
access burden, salience, difficulty, emotional safety, or substitution value.
Those remain human research and review questions.

## Consequences, reversal, and supersession

The packet can now inspect whether exact authored synthetic facts survive the
current semester-loop projectors and reach both local comparison candidates
through one content packet. Failures can be localized to authored semantics,
raw compilation, projection, packet compilation, or renderer behavior.

The added compiler, packet, routes, components, and tests are removable and
write no data, so reversal requires no migration. Removing them does not
authorize a return to separately authored surfaces or a stronger candidate
claim.

A later decision may supersede this ADR only after it preserves the canonical
scenario source, raw projector recomputation, no-effect authority, explicit
artifact versioning, exact evidence binding, and all learner, human-review,
live-data, and release gates appropriate to the new scope.
