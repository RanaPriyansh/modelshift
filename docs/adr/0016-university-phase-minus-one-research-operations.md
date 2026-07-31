# ADR-016: University Phase -1 research operations preflight

**Status:** accepted for synthetic operations planning only

**Date:** 2026-07-31

**Decision owner:** principal product and research task

**Claim ceiling:** caller-asserted synthetic plan coherence only; no artifact
approval, pack equivalence, rehearsal readiness,
participant enrollment, participant-data capture, demand, usability,
accessibility, learning, institutional-authority, production, or efficacy
claim

## Context

The university-first work now has removable internal fixtures for copied-source
review, one-action Today, falling-behind recovery, protected-study explanation,
and one transient semester-loop composition. Their automated and rendered
checks can establish bounded engineering behavior. They cannot establish that
adult university students understand the surfaces, would substitute them for
an existing workflow, or benefit from repeated use.

`UV1-GATE-001` therefore requires an approved Phase -1 observation and
substitution protocol before the university wedge can be treated as validated.
`UV1-GATE-002` separately requires a later demand gate. `UV1-GATE-003` keeps
real coursework and participant operations closed until research,
data-management, incident, and withdrawal authority exist.

A loose set of interviews would not close the first gate. Operators could
change the comparison, exclude difficult sessions, coach participants, combine
incomparable observations into one score, or reinterpret a weak result after
seeing it. Participant operations also cannot begin merely because a protocol
document exists.

## Decision

Adopt `UNIVERSITY_PHASE_MINUS_ONE_PROTOCOL.md` as the preregistered operations
contract for Phase -1, subject to later named approval. Runtime preflight binds
the exact protocol-document digest plus canonical exposure-task,
post-comparison-question, neutral-prompt, and stop-checklist digests; matching
an ID and version alone is insufficient.

Add a removable `src/forge/university-research-operations/**` projector and
development-only `/internal/university-research-readiness` operator workspace.
The projector accepts raw protocol inputs, copies them through a bounded
accessor-free plain-JSON boundary, and derives only:

- `draft_invalid`;
- `approval_required`;
- `operator_gap`;
- `substitute_mismatch`; or
- `synthetic_plan_coherent`.

It has no rehearsal-ready or `participant_ready` state. Caller-supplied
artifact and plan digests, opaque
operator references, and declared approval references remain fixture
assertions; they do not establish artifact, identity, approval, or run
authority. The internal route requires the exact server-owned development
token
`FORGE_UNIVERSITY_RESEARCH_READINESS_FIXTURE=forge-university-research-readiness.v1`.
Production always renders the unavailable shell, including when that token is
present. Production scans public and server build artifacts for server fixture
markers and the complete server-owned scenario-label set. Route and gate names
remain forbidden only in public client assets.

The protocol fixes:

1. one research question and one exact candidate baseline;
2. a neutral matched substitute that uses the same synthetic information,
   scenario structure, tasks, timebox, and effect boundaries without FORGE
   branding or computed hierarchy;
3. two reviewed, isomorphic synthetic scenario packs and a four-cell
   counterbalancing schedule;
4. five to ten approved adults, all aged 18 or older, only after participant,
   data, incident, and withdrawal authority is documented;
5. an all-starters denominator that retains withdrawals, technical stops,
   operator stops, incomplete sessions, and protocol deviations;
6. one moderator script, neutral prompts, fixed task order, and no teaching of
   the authority model before a task;
7. separate comprehension, authority-calibration, control-prediction,
   substitution, access-barrier, time/error, emotional-safety, and
   contradictory-observation dimensions;
8. no composite score, hidden weighting, participant ranking, or post-hoc
   primary metric;
9. the outcome grammar `accept | narrow | repair | reject`;
10. named principal, research/data approver, operator, observer, incident
    owner, and adjudicator responsibilities;
11. material amendments that close the current cohort and create a new
    non-poolable protocol version;
12. participant-level and study-level stop rules that override completion
    targets.

## Current authority

This decision authorizes documentation, pure preflight projection, the gated
internal operator workspace, and inspection of a caller-asserted synthetic
plan only. It does not establish a real matched-substitute artifact, P/Q pack
equivalence, or rehearsal readiness.
It does not authorize:

- recruitment, screening, scheduling, enrollment, consent collection, or
  participant contact;
- observation of a person as a research participant;
- recording, notes, transcripts, telemetry, screenshots, audio, video, or
  participant identifiers;
- real course material, account, credential, institution, accommodation,
  disability, wellbeing, instructor-contact, or graded-work data;
- a public route, production fixture, live connector, provider, persistence,
  message, session, evidence, or external effect;
- pooling earlier informal feedback into the Phase -1 denominator;
- closure of `UV1-GATE-001`, `UV1-GATE-002`, or `UV1-GATE-003`.

Before the first participant may be enrolled, the principal must record an
exact candidate SHA and artifact digests, the matched-substitute and scenario
pack digests, named operators, the approved participant population, the exact
capture schema and retention/deletion rules, incident and withdrawal
procedures, recruitment language, and the approving authority. Missing any
one item leaves participant operation blocked.

## Production-mode browser evidence boundary

Browser evidence for this packet may be collected against a locally served
production-mode build only when the harness binds every observation to one
exact artifact:

1. the build records a source marker from the clean, full Git SHA at build
   time; a release SHA supplied only when the server starts cannot substitute
   for that marker;
2. one create-only post-build receipt records the same clean source SHA and Git
   tree, the build ID, the immutable production `.next` digest and file count,
   emitted static-asset identity, the full `public` directory identity, copied
   runtime-configuration identity, and the fresh-ephemeral `.next/cache`
   policy; declared development, diagnostic, trace, receipt, and runtime-cache
   paths are not part of the immutable set;
3. the harness validates that receipt against the unchanged clean checkout and
   expected full SHA before copying the built artifact into an isolated runtime
   snapshot;
4. the copied snapshot seals the measured immutable paths against ordinary
   test writes, exposes only a fresh ephemeral cache location, self-checks
   runtime and compiled-source health identity before and after browser
   execution, and checks its receipt, build ID, artifact digest, file count,
   runtime configuration, static assets, and `public` directory before server
   startup and again after browser and server shutdown; and
5. any source, receipt, marker, or artifact identity drift invalidates the run
   rather than producing browser evidence.

A passing run is therefore evidence only that the recorded local artifact
exhibited the checked production-mode behavior, including that the internal
research route remained unavailable. It is not evidence that the artifact was
deployed, that a provider built or served it, or that a public alias resolves
to it. The receipt is local and unsigned. The build is not established as
hermetic or reproducible, and the boundary supplies no signed build
attestation, trusted-builder identity, dependency provenance, remote artifact
identity, or protection against compromise outside the measured snapshot.

## Why a matched substitute

The substitute is not a deliberately poor control and not the participant's
unbounded personal workflow. It is a fixed neutral worksheet containing the
same synthetic facts and available next-job choices as the candidate. It has
the same timebox and task prompts, performs no side effect, and makes no
institutional or durability claim.

This comparison asks whether FORGE's composed hierarchy and authority language
help or harm interpretation relative to a credible low-complexity alternative.
It does not test the entire market, compare against a live university system,
or establish durable substitution.

## Consequences

The program gains an auditable way to prepare a later operator rehearsal and,
only after separate approval, collect a small bounded set of comparable adult
observations. Difficult sessions remain visible through the all-starters
denominator. Safety and authority failures cannot be averaged away.

The protocol is deliberately unable to prove prevalence, willingness to pay,
repeated use, learning, recovery efficacy, institutional fit, accessibility
conformance, or production readiness. Phase 1 demand work remains separate.

## Alternatives rejected

### Begin with informal student interviews

Rejected as gate evidence because prompts, artifacts, exclusions, and
interpretation would not be fixed. Informal conversations may inform a later
protocol amendment but cannot be pooled into Phase -1.

### Compare only against no tool

Rejected because a blank control would make any organized interface look
useful. The fixed neutral worksheet is a credible substitute for organizing
the same synthetic facts.

### Use each participant's current workflow as the comparator

Rejected for this preflight because workflows, course data, institutional
systems, and privacy exposure would vary and real data is not authorized.
Current-workflow observation requires its own approved protocol.

### Optimize one combined usability score

Rejected because faster completion can coexist with false institutional trust,
loss of learner control, distress, or incorrect effect prediction. Those
dimensions remain separate and may veto advancement.

### Recruit while approvals are pending

Rejected because recruitment and screening are participant operations. A
future approval is not retroactive authority.

## Reversal and supersession

This ADR and its protocol can be withdrawn without migration because they add
no runtime, data, or participant record. Any material protocol change requires
a new version under the amendment rules. Participant operation requires a
separate recorded approval; public or durable product operation requires a
later product and release decision.
