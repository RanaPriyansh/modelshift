# ADR-027: University declaration revision and rights prerequisites

**Status:** accepted for architecture definition and pure local document-contract implementation only

**Date:** 1 August 2026

**Decision owner:** principal product and architecture task

**Claim ceiling:** pure local declaration-document inspection only. No durable
learner record, verified owner, entitlement, participant operation,
recommendation, tutoring, mastery, production identity, or learning-effect
claim exists.

## Context

ADR-025 defines learner-declared degree and learning requests. It keeps their
projections separate and effect-free. ADR-026 defines a server-only account
context adapter. The adapter can create an inspection correlation only when
separate cloud identity and server-key authority exist.

The current adapter is unavailable by default. Cloud authentication is
structurally disabled. Its opaque HMAC binding is not a durable owner,
tenant, enrollment, entitlement, consent, or learner-record identifier.

The current system has no authorised database, retention period, export,
correction, deletion, backup, recovery, tenant, or row-level security rule
for learner declarations. The synthetic research operation plan also cannot
authorise participant contact, data collection, account creation, or product
operation.

FORGE needs a narrow durable-data architecture before it can safely accept a
future adult learner declaration. The architecture must preserve a learner's
complete declaration history. It must not make a projection, source match,
or account correlation into durable truth.

This ADR accepts one pure local document contract and canonicalizer. The
contract creates only process-local inspection results. It creates no route,
database object, account relation, or stored record.

## Decision

Authorize one pure local contract named UniversityDeclarationDocument. The
contract accepts only exact degree-map v2 and learning-map v2 raw requests.
It validates the learning-course and degree-map course linkage. It recomputes
both canonical child projections.

Both raw child requests carry self-attested, unverified adult status. This
status does not establish active-adult admission or entitlement. The document
result must keep `adultEntitlementEstablished` false.

The document contains only:

- the exact accepted degree-map v2 raw request
- the exact accepted learning-map v2 raw request
- exact degree-map and learning-map request schema versions
- exact degree-map and learning-map projector versions
- one exact canonicalizer version
- one domain-separated complete-document digest

The canonicalizer must apply one fixed domain tag before it computes the
complete-document digest. The canonicalizer must cover both complete raw
requests and every document version. It must not derive the digest from a
projection, display order, source digest, or text formatting.

The document accepts no owner, tenant, account binding, time, revision,
predecessor, idempotency, projection, or status field. It accepts no unknown
outer field. The process-local result may expose an inspection status and
bounded review issues outside the document. It must not serialize that result
into the document.

The contract and canonicalizer perform no storage, network, event, provider,
identity, or external action. They must not import an account reader, key
provider, database client, connector, event writer, or model client.

Define one planned future owner-scoped aggregate named
UniversityStudentDeclaration.

The aggregate represents an editable learner-declared degree and learning
document. It is not an institutional record. It is not an enrollment record.
It does not establish source authenticity, degree completion, graduation,
mastery, or the correct next action.

The future aggregate must use complete raw revisions. A future accepted change
must append a complete declaration revision. It must not mutate a prior
revision. It must not store a patch as the only declaration representation.

This ADR authorizes architecture definition and this one pure local contract.
It does not authorize the future aggregate, an account relation, or a durable
write. A separate authority decision must approve every durable operation.

## Architecture summary

The authorised local architecture is:

~~~text
Raw degree and learning declarations
        |
UniversityDeclarationDocument canonicalizer
        |
Pure degree and learning projection recomputation
        |
Process-local inspection result outside the document
~~~

The separately existing account-context adapter remains unavailable by
default. The document contract does not call that adapter.

The planned and unauthorised durable architecture is:

~~~text
Approved adult owner and tenant authority
        |
Future declaration-write gate
        |
UniversityStudentDeclaration aggregate
        |
Complete raw declaration revision sequence
        |
Pure versioned recomputation for inspection
~~~

The planned write gate is not implemented. The current account-context
adapter cannot act as the write gate. A stored opaque correlation cannot
substitute for an approved owner relation.

## Aggregate boundary

This section defines a planned future aggregate only. It does not add fields
to UniversityDeclarationDocument. It does not authorize a revision request,
aggregate record, account relation, or durable write.

The future aggregate contains one logical learner-declaration history inside
one approved owner and tenant scope. The exact aggregate cardinality remains
an ownership and product-rule decision. The current architecture does not
establish an owner or a tenant.

Each future revision must contain the complete bounded raw degree-map request
and complete bounded raw learning-map request. Each request must use an exact
supported request schema version. The future writer must reject partial update
payloads and caller-supplied projections.

The future writer must recompute the degree-map, learning-map, and
student-context projections from the complete raw revision. It must not accept
a caller-supplied status, digest, issue, readiness state, priority, mastery,
recommendation, or next action.

The future writer may retain only the raw declaration document and required
revision metadata. Readers must recompute derived projections. A reader must
not treat a stored derived projection as current truth.

### Planned future revision record

Each future accepted revision must record these logical fields after separate
durable authority exists. None of these fields belong in the pure local
UniversityDeclarationDocument:

- an opaque aggregate identifier generated by the approved server boundary
- an opaque revision identifier generated by the approved server boundary
- a server-derived opaque owner identifier outside the raw declaration
- an approved tenant identifier outside the raw declaration
- a server-generated accepted time
- the complete raw degree-map request
- the complete raw learning-map request
- every raw request schema version
- every degree, learning, and student-context projector version used
- the exact document canonicalizer version used
- one canonical complete-document digest
- one replay disposition
- one expected-predecessor reference or explicit create precondition
- one scoped idempotency identifier
- an optional superseded revision identifier for a correction

The canonical complete-document digest must cover the complete accepted raw
declaration document and its raw schema versions. It must use one documented
canonical serialization. It must not use display order, a source digest,
caller text formatting, or a derived projection as a substitute.

The document digest must not contain a raw account identifier, email,
credential, server time, generated revision identifier, tenant identifier, or
idempotency identifier. Those values have separate roles and must not change
the declaration-document identity.

The replay disposition must identify the exact accepted inspection result. It
must include the projection status and bounded issue references required for
replay. It must not include a recommendation, diagnosis, mastery conclusion,
or selected next action.

The revision record must not contain raw source copies, source credentials,
provider output, model prompts, model responses, browser state, free-form
notes, or contact data. A future data decision must separately approve any
new data category.

### Revision, idempotency, and conflict rules

A future create request must have an explicit create precondition. A future
update or correction request must have an expected current revision reference.
The write gate must reject a mismatch. It must not silently use last-writer
wins behavior.

The future idempotency identifier must have scope under the approved aggregate
and owner boundary. A repeat with the same identifier and complete-document
digest must return the earlier accepted result. A repeat with the same
identifier and a different digest must fail closed.

A correction must append a complete new revision. The new revision must name
the revision that it supersedes. A correction must not overwrite, erase, or
reinterpret the earlier raw declaration.

Correction by supersession preserves declaration history only. It does not
decide correction rights, legal retention, export content, deletion behavior,
or backup reconciliation.

### Version and replay rules

The future aggregate contract must identify every raw schema, projector, and
canonicalizer by exact version. A replay must use the recorded versions. A
future migration must not silently convert an earlier declaration into a new
schema or projector result.

An unsupported historical schema, canonicalizer, or projector version must
fail closed. The system must return a bounded review or migration-required
result. It must not write a replacement revision without an approved explicit
correction operation.

The future writer must validate the full bounded declaration before it checks
owner scope or creates revision state. It must not call an external provider,
retrieve sources, infer data, or write an event while it validates a revision.

## Separate authority dimensions

The future architecture must keep these dimensions separate:

- authenticated account identity
- adult admission and entitlement
- declaration ownership
- tenant membership
- opaque inspection correlation
- learner-declared source scope
- source authenticity and institutional acceptance
- durable record authority
- retention, export, correction, and deletion rights
- backup deletion reconciliation
- recommendation, tutoring, and protected learning action
- participant research operation

Evidence in one dimension does not upgrade another dimension. In particular,
a valid account-context HMAC does not establish a durable owner. A coherent
declaration does not establish an entitlement. A correction request does not
establish a deletion right.

## Rights prerequisites

Do not create the aggregate until a separate approved decision supplies all
of these controls:

- authenticated active-adult admission and entitlement rules
- an owner mapping that keeps raw account identifiers out of declarations
- tenant membership and tenant-isolation rules
- a declared retention period and legal hold rules, if applicable
- access, export, and correction rules
- deletion and backup-deletion reconciliation rules
- revision conflict and idempotency handling
- row-level security with two-account isolation tests
- production database identity, migration, repair, and rollback rules
- access logging and operator access rules
- release authority for an adult university product boundary

The future write gate must reject unknown, inactive, under-age, unentitled,
or cross-tenant requests. It must reject every request when its required
authority source is unavailable.

No current module provides these controls. No current declaration value may
claim that these controls are present.

## Boundary and non-goals

This ADR defines no public or internal user interface. It defines no browser
or server request handler. It defines no database schema, database migration,
or local storage adapter.

This ADR does not activate cloud authentication. It does not load a binding
key. It does not create an account owner relation. It does not connect a
course source, university system, learning platform, calendar, or message
system.

This ADR does not authorise tutoring, generated explanations, assessment
assistance, recommendations, scheduling, provider spend, retrieval, model
calls, events, analytics, or evidence writes.

This ADR does not authorise participant recruitment, consent collection,
research data collection, research contact, or research analysis. ADR-024
remains a synthetic operation plan only.

## Tool and side-effect boundary

| Component or operation | Current side effect | Authority in this ADR |
| --- | --- | --- |
| This ADR | None | Accepted architecture and contract definition |
| UniversityDeclarationDocument canonicalizer | In-memory computation only | Authorized pure local implementation |
| Existing account identity reader | Server read when separately enabled | No activation or write authority |
| Existing account binding adapter | In-memory HMAC computation | Default result remains unavailable |
| Future declaration writer | Durable write | Prohibited |
| Research operation | Participant or data effect | Prohibited |
| Provider, model, or retrieval call | External request | Prohibited |
| Event, evidence, or analytics write | Durable or external effect | Prohibited |

No tool registry, model prompt, connector, or agent loop belongs to this
slice. The local contract must use deterministic validation. Any future
declaration acceptance must use explicit gates before a generative system.

## State and memory design

The local contract creates only a process-local document and inspection
result. It creates no durable state. The current system has no declaration
store. The inspection result remains process-local and removable.

The planned persistent state is one aggregate with complete raw revisions and
their required metadata. That state is not created by this ADR. A future
owner relation, tenant relation, and rights record must remain outside the
raw declaration document.

Do not use model memory, agent memory, vector storage, prompt history, or
retrieval cache as declaration state. Do not use an event journal as a
replacement for the aggregate.

A future accepted revision is the declaration-history record. A future
operator audit record must remain separate from declaration content. It must
record approved access and effect attempts without copying raw declarations
or account contact data.

## Context budget

This slice has no model context and no provider context. It has no tool-input
budget beyond the existing bounded pure declaration requests.

UniversityDeclarationDocument accepts only the complete bounded degree-map v2
and learning-map v2 raw requests. It records only exact child schema,
child-projector, and canonicalizer versions. It computes the digest. It
accepts no owner, tenant, account binding, time, revision, predecessor,
idempotency, projection, or status input.

Do not include an email, raw account identifier, source copy, provider output,
free-form notes, browser history, model transcript, or unbounded context in a
local document request.

Any request-facing implementation needs a separate request-size,
authentication, authorization, abuse, and rate review. The current in-memory
bounded-copy boundary does not provide those controls.

## Failure modes

| Local contract failure | Required behavior |
| --- | --- |
| Degree or learning request is not exact v2 | Return invalid and create no document |
| Invalid child declaration or unknown field | Return invalid and create no document |
| Learning course is absent from the degree map | Return invalid and create no document |
| Owner, tenant, binding, time, revision, predecessor, or idempotency input | Return invalid and create no document |
| Caller-supplied projection or status | Return invalid and create no document |
| Canonicalizer or projector version is unsupported | Fail closed and create no document |
| Valid child needs review | Return process-local review status outside the document |
| Attempted storage, network, event, identity, provider, or external action | Do not expose that operation from the contract |

The local contract must not use a browser fallback, anonymous record, inferred
owner, deferred write, or background action.

The following failures apply only to the planned future writer. The writer
remains unauthorized:

| Planned future writer failure | Required future behavior |
| --- | --- |
| No approved owner or tenant authority | Reject the write before persistence |
| No active-adult entitlement | Reject the write before persistence |
| Expected-predecessor mismatch | Return a conflict and create no revision |
| Reused idempotency identifier with different digest | Return invalid and create no revision |
| Cross-tenant or cross-owner access | Deny access and record no declaration effect |
| Rights operation without approved policy | Block the operation |
| Provider, event, or participant operation request | Block the operation |

## Evaluation plan

The local contract is authorized for implementation. Its tests must use fixed
in-memory fixtures. They must confirm that ADR-025 and ADR-026 claim ceilings
remain unchanged.

Test canonical digest stability, domain separation, bounded-copy rejection,
unknown-field rejection, hostile getter rejection, proxy rejection,
schema-version rejection, course-linkage rejection, and deterministic child
projection recomputation.

Test that the document retains only raw child requests, exact versions, and
the digest. Test that every prohibited owner, tenant, account-binding, time,
revision, predecessor, idempotency, projection, and status field fails closed.
Test that inspection status and bounded issues remain outside the document.

After separate durable-write authority, test idempotency, predecessor
conflicts, correction supersession, two-account isolation, cross-tenant
denial, export, deletion, backup reconciliation, migration repair, rollback,
and recovery. Do not run those operation tests until the required authority
exists.

No evaluation may infer learner benefit, learning effect, graduation outcome,
or product readiness from architecture or fixture tests.

## First implementation issues

1. Define UniversityDeclarationDocument with exact degree-map v2 and
   learning-map v2 inputs.
2. Define one domain-separated canonical serializer and digest function.
3. Recompute both child projections and validate course linkage.
4. Return process-local inspection status outside the document.
5. Add fixture-only contract tests with no storage or network effect.
6. Stop before a database, migration, identity activation, or write adapter.
7. Open a separate authority decision before any durable implementation.

The pure contract must reuse the existing degree and learning raw request
boundaries. It must not introduce a compatibility alias or silently accept a
retired schema. It must not add a second local declaration contract.

## Alternatives rejected

### Add a database table now

Rejected. A table cannot establish adult entitlement, owner scope, tenant
isolation, retention, export, correction, deletion, backup reconciliation, or
production database authority.

### Reuse the World event journal

Rejected. The journal has immutable learning-run and evidence semantics.
Editable learner declarations need complete revisions, correction
supersession, rights operations, and a different ownership model.

### Treat the account-context HMAC as a durable owner

Rejected. ADR-026 defines the HMAC as an inspection correlation only. It does
not establish owner, enrollment, tenant, consent, or durable-record rights.

### Store only derived projections

Rejected. A projection cannot preserve the complete learner declaration or
support exact versioned recomputation. It also risks treating a derived status
as durable truth.

### Use patch updates or last-writer-wins updates

Rejected. A patch hides complete declaration state. Last-writer-wins behavior
can silently lose a learner correction.

### Use browser storage as a provisional declaration store

Rejected. Browser storage cannot establish ownership, rights, retention,
export, deletion, backup, conflict, or recovery behavior.

### Activate cloud identity with configuration

Rejected. A configuration value cannot supply approved entitlement, owner,
tenant, rights, or release authority.

### Use ADR-024 as participant or product authority

Rejected. ADR-024 permits only a synthetic research operation plan. It does
not permit participant or learner-data operation.

### Add a tutor, model, or retrieval system at this boundary

Rejected. Declaration revision is a deterministic data-boundary problem. It
does not authorise generated content, provider cost, or protected learning
action.

## Consequences

FORGE has a precise future declaration-history boundary. The boundary prevents
the current system from making a durable record from a source match, a browser
value, or an inspection correlation.

This ADR does not advance live learner behavior. It reduces future architecture
risk. The next permitted code is UniversityDeclarationDocument and its pure
canonicalizer with fixture tests.

No current work may create an aggregate, write a revision, activate identity,
or operate on participant data by implication from this ADR.
