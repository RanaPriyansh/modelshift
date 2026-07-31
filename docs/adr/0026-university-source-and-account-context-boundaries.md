# ADR-026: University source and account-context boundaries

**Status:** accepted for local and server-disabled foundation implementation

**Date:** 1 August 2026

**Decision owner:** principal product and architecture task

**Claim ceiling:** exact inspection bindings only; no institutional truth,
tenant authority, durable storage, recommendation, tutoring, mastery,
production identity, or learning-effect claim

## Context

ADR-025 adds separate learner-declared degree and learning axes. It does not
bind those declarations to a reviewed copied source or an authenticated adult
account.

FORGE already has two relevant boundaries:

- course-source reconciliation can represent learner-confirmed or corrected
  copied facts without claiming source authenticity; and
- the server identity reader can admit only an authenticated, active adult
  account when cloud authority is available.

Neither boundary can be connected by visual proximity, caller-supplied status,
or a browser identity claim. Cloud authentication remains structurally
disabled. University persistence, export, correction, deletion, backup
reconciliation, and tenant rules remain undecided.

The next safe implementation must establish exact composition seams without
enabling those blocked operations.

## Decision

Add two independent integration boundaries:

1. a pure university source-map context projector; and
2. a server-only university account-context adapter.

Do not add a route, database migration, browser store, provider call, model
call, event write, or production feature flag in this slice.

### Source-map context

The source-map context accepts:

- one raw university student-context request;
- one raw course-source reconciliation request; and
- strict caller-supplied bindings for the exact course, degree source,
  source revision, source digest, concept, candidate, and claim identifiers.

The projector:

- copies the complete request through one bounded, accessor-free,
  proxy-rejecting, alias-rejecting boundary;
- limits each string to 4,096 UTF-16 code units and the exact serialized
  request to 512 KiB;
- recomputes the canonical student-context projection;
- recomputes canonical course-source reconciliation;
- verifies every bound identifier against the detached raw requests and the
  canonical projections;
- rejects normalization, course, revision, digest, candidate, claim, or
  concept drift;
- exposes separate degree-source and learning-source inspection records;
- deduplicates degree-source records by exact course, source, revision, and
  digest identity;
- lists every unbound concept and course-source candidate; and
- excludes copied source labels and complete copied facts.

The highest source-map state is `bound_review_candidate`. This state means only
that the declared identifiers match one internally coherent copied-source
candidate. It does not mean that the source is authentic, complete, current
beyond its declared window, institutionally accepted, or safe for automated
action.

Unresolved, stale, partial, duplicate, conflicting, rejected, missing, or
unbound source candidates remain `review_required`. An unbound learning
concept also requires review. Invalid structure or an exact binding mismatch
returns `invalid`.

The source-map output contains only the identifiers, digests, fact kind, and
review metadata required for inspection. It contains no owner identifier,
tenant identifier, source label, or complete copied fact. The output remains
private internal metadata. No route or interface can disclose it in this
slice.

The projection class is learner-declared inspection. Account identity remains
unestablished, and adult status remains self-attested and unverified.

### Account-context adapter

The account-context adapter accepts raw degree and learning requests. It does
not accept:

- a context binding;
- an account or tenant identifier;
- an adult-status claim;
- an entitlement;
- a persistence request; or
- any caller-supplied projection or status.

The server adapter:

- reads the existing module-owned authenticated active-adult identity
  boundary;
- returns `unavailable` when that boundary has no usable identity;
- derives one stable opaque binding with versioned, domain-separated
  HMAC-SHA-256 and a module-owned server key provider;
- returns `unavailable` when the binding key is absent or invalid;
- recomputes the canonical university student context; and
- returns only `invalid` or `bound_for_inspection` for an admitted identity.

The authority-bearing adapter accepts one request parameter. It exposes no
reader option, dependency override, key provider, or caller-selected
authority seam. The module-owned key provider returns no key in this slice.

The derived binding is a pseudonymous correlation value. It is not a tenant,
institutional enrollment, entitlement, consent, or durable-record identifier.
The adapter does not use or expose the account email or raw account UUID. The
binding key never enters request data, output, logs, client code, or a general
application table. A value with at least 32 bytes satisfies only the runtime
length boundary. Key secrecy, entropy, rotation, and environment separation
remain provider responsibilities.

Cloud authentication is structurally disabled in the current product.
Therefore, the default production behavior remains `unavailable`.

## Separate authority dimensions

The two boundaries must not merge these dimensions:

- authenticated account identity;
- adult account admission;
- opaque student-context correlation;
- caller-asserted course-source scope;
- source-copy extraction and learner decision;
- source authenticity;
- institutional completeness;
- degree and learning declarations;
- persistence and rights operations;
- recommendation, tutoring, and protected learning action.

A valid value in one dimension does not upgrade another.

## Persistence decision

Do not persist these contexts in this slice.

The smallest future durable shape is one owner-scoped student-context
aggregate. Each accepted change would append one complete raw request revision.
Readers would recompute the degree, learning, and combined projections.

Each revision must record:

- every raw request schema version;
- every projector version used for the accepted disposition;
- a canonical complete-document digest; and
- the replay disposition.

An unsupported historical schema or projector version must fail closed. A
migration must not silently reinterpret earlier learner declarations.

That future work requires a separate decision and evidence for:

- authenticated adult enrollment and entitlement;
- owner and tenant rules;
- retention;
- export;
- correction history;
- deletion;
- backup deletion reconciliation;
- idempotency and revision conflicts;
- row-level security and two-account isolation;
- migration repair or rollback; and
- approved production database identity.

The existing learning-program tables and World event journal do not match this
editable learner-declaration aggregate.

## Effect boundary

This slice adds:

- no public or internal interface;
- no browser state;
- no request handler;
- no local or cloud write;
- no database object;
- no connector or retrieval operation;
- no provider or model request;
- no event or evidence write;
- no recommendation or selected next action;
- no generated explanation or assignment answer; and
- no mastery, graduation, efficacy, or production claim.

## Alternatives rejected

### Accept a browser-supplied account binding

Rejected. A caller value cannot establish authenticated adult identity.

### Treat a matching source digest as source truth

Rejected. A digest establishes byte identity only. It does not establish
authenticity, completeness, rights, or institutional acceptance.

### Connect Lesson Studio now

Rejected. Source-map inspection does not authorize generated explanations,
provider spend, protected assessment assistance, or publication.

### Reuse the World event journal

Rejected. The journal has a fixed learning-run vocabulary and immutable
evidence semantics. Editable degree declarations require different ownership,
correction, export, and deletion rules.

### Add cloud persistence before account activation

Rejected. A local migration and an environment variable cannot establish
identity, tenant isolation, rights operations, backup reconciliation, or
production database authority.

## Consequences

FORGE gains exact seams for copied-source inspection and future authenticated
adult ownership without enabling either as production authority.

The next safe work can inspect these seams, define the future aggregate and
rights contract, or activate separately approved identity infrastructure. It
cannot infer permission to persist learner data or call a tutor.
