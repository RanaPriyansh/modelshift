# ADR-024: Synthetic-only Phase -1 data-operations plan

**Status:** accepted for pure synthetic planning and tabletop validation only

**Date:** 1 August 2026

**Decision owner:** principal product, research, and architecture task under
explicit user implementation authority

**Claim ceiling:** deterministic local plan validation only; no approved
capture schema, operator identity, adult eligibility, consent, participant
operation, participant-data capture, persistence, export, event emission,
research result, deployment, production, or gate closure

## Context

ADR-016 and the Phase -1 protocol freeze the research question, comparator
grammar, all-starters denominator, roles, evidence dimensions, decisions, and
stop rules. The current readiness projector correctly proves only
caller-asserted synthetic plan coherence.

It does not define the operational data system Section 13 requires before
participant contact:

- an exact structured capture allowlist and prohibited-field set;
- adult-verification, consent, withdrawal, retention/deletion, access,
  linkage, incident, compensation, rights, and audit plans;
- an immutable four-cell allocation and occupied-cell rule;
- synthetic stop/withdrawal/deletion/restart transitions; or
- evidence that any accountable person approved those plans.

The repository must not jump from protocol constants to a database, participant
form, authentication flow, recruitment tool, or real operator identity. Those
would create a data and human-operation boundary that no approval currently
authorizes.

There is also an open principal target decision: Protocol `1.0.0` freezes the
older Semester Loop candidate, while ADR-023 names Semester Desk as the final
product-shape candidate. A data-operations contract must remain target-agnostic
until that material protocol decision is recorded.

## Decision

Add a separate pure
`src/forge/university-research-data-operations/**` projector.

The projector may validate one server-authored synthetic plan containing:

1. exact digest-shaped references for the protocol, capture schema, artifact
   manifest, retention plan, stop matrix, and rights plan;
2. the closed capture-field allowlist required for coded synthetic rehearsal;
3. the closed prohibited-field vocabulary;
4. six distinct opaque fixture role references;
5. the exact four counterbalance cells and no-response-based-reassignment rule;
6. requested, non-authorizing plan states for age verification, consent,
   withdrawal, retention/deletion, access, linkage, incident, compensation,
   export/correction/deletion, and audit operation; and
7. authority values that permanently deny participant operation, participant
   data capture, persistence, export, event emission, send, or claim upgrade.

Its complete status grammar is:

- `invalid`;
- `requirements_requested`; or
- `synthetic_data_operations_plan_coherent`.

It has no `approved`, `authorized`, `eligible`, `consented`,
`participant_ready`, `rehearsal_ready`, or production state.

## Input boundary

The projector must detach and validate a bounded, accessor-free plain-JSON
graph before schema traversal. Proxies, accessors, symbols, exotic prototypes,
sparse or extended arrays, cycles, aliases, unsafe numbers, excessive
depth/nodes/keys/string bytes, unrecognized fields, and authority-strengthening
values fail closed.

This in-memory boundary is not a request-body resource limit. The module is not
request-exposed. Any future serialized input requires a separately reviewed
outer body-size, parse, enumeration, authentication, authorization, abuse, and
rate boundary.

## Capture and prohibited fields

The allowlist may identify only opaque synthetic study/persona references,
allocation/condition/pack/scenario/task/artifact references, closed result and
misconception codes, missingness, barriers, contradictions, exposure/stop
states, bounded integer timing, and fixture operator-role references.

The prohibited vocabulary covers direct or indirect identity and raw content,
including names, contact data, date of birth, identity documents, student or
institution IDs, real coursework, credentials, accommodation, disability,
wellbeing, instructor or third-party data, raw quotes, free-form notes,
transcripts, screenshots, audio, video, telemetry, network/device
fingerprints, and arbitrary metadata.

Passing the projector does not approve even the allowlisted fields for a real
person. It proves only that the synthetic plan names a closed proposal.

## Synthetic transition boundary

The separate tabletop template may exercise:

- missing or withdrawn consent;
- uncertain or minor age;
- allocation issued and occupied;
- exposure started and stopped;
- prohibited-data incident;
- deletion requested, pending, failed, and verified;
- correction by supersession;
- study pause and restart still blocked; and
- all-starters bookkeeping with explicit `not_exposed` and missingness.

Those transitions are not represented or executed by this projector. They use
invented references only, write nothing, and are tabletop defects/evidence
about the proposed operations—not participant records, research results, or
runtime transition evidence. The projector validates only the static closed
vocabulary, requested plan declarations, role separation, allocation rules,
stop-rule literals, and permanently false authority needed before that manual
synthetic walkthrough.

An occupied counterbalance cell is never silently freed by withdrawal or stop.
No deletion transition may erase the minimum approved denominator tombstone.
No restart becomes valid without later distinct principal and research/data
authority.

## Effect and authority boundary

The module adds:

- no route or participant UI;
- no database table, migration, storage adapter, cookie, local/session storage,
  IndexedDB, cache, or service worker;
- no account, authentication, operator directory, role grant, recruitment,
  contact, consent collection, payment, upload, clipboard, export, email,
  message, connector, provider, model, or telemetry;
- no audit event presented as authoritative; and
- no participant, institution, demand, accessibility, learning, efficacy,
  deployment, or production claim.

Opaque fixture role references do not identify people. Digest-shaped plan
references do not establish authorship, approval, authenticity, availability,
or operation.

## Relationship to the protocol

This ADR does not modify the byte-bound Protocol `1.0.0`, choose the research
target, or satisfy Section 13. It prepares one inspectable proposal for the
research/data approver.

Any approved schema or process change must later bind a new exact digest into
the authorization envelope. Participant contact remains blocked until the
principal and research/data approver record every Section 13 item and issue the
final written run authorization.

## Alternatives rejected

### Reuse product account, event, or evidence storage

Rejected. Existing product patterns are not research identity, consent,
retention, withdrawal, or data-processing authority.

### Create participant tables now

Rejected. A schema migration would prematurely choose storage, identity,
linkage, access, retention, deletion, and incident semantics before approval.

### Treat opaque references as authorization

Rejected. Caller-authored strings and digests cannot establish accountable
people, age, consent, approval, or access rights.

### Capture free-form notes for flexibility

Rejected. Unbounded text creates direct and third-party data risk and defeats
the current no-quote/no-free-form boundary.

### Infer approval from a coherent plan

Rejected. Code may identify missing or internally coherent declarations. Only
the accountable authorities may approve participant operation.

## Consequences and reversal

The program gains a testable, fail-closed static vocabulary for the proposed
research data boundary without creating a store or human-operation path.
Reviewers can locate declaration omissions and authority upgrades before any
irreversible infrastructure is built. Tabletop lifecycle behavior remains a
separate manual synthetic template; this module does not validate its records
or transitions.

The module is removable without migration because it writes nothing. Removing
it does not weaken the protocol's participant prohibition or authorize a
different capture system.
