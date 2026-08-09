# ADR-017: University research artifacts use canonical packs and mechanical-only preflight

**Status:** accepted for synthetic artifact authoring and local inspection only

**Date:** 2026-07-31

**Decision owner:** principal product and research task

**Claim ceiling:** immutable local synthetic artifact identity and bounded
mechanical comparison only; no candidate render binding, rendered parity,
independent equivalence, artifact approval, rehearsal readiness, participant
operation, demand, usability, accessibility conformance, learning,
institutional authority, production, or efficacy claim

## Context

ADR-016 and the exact Phase -1 protocol established a research-operations
preflight but deliberately used placeholder substitute and P/Q plan hashes.
Those hashes proved only that a caller declared a comparison plan. They did
not identify authored scenario facts, a credible neutral substitute, or the
content an independent reviewer would inspect.

The protocol requires two synthetic packs with the same seven semantic states
and difficulty but different invented labels, absolute times, deadlines, and
identifiers. Candidate A and Substitute B must expose the same facts, choices,
tasks, timebox, and effect boundaries. Substitute B must be keyboard
traversable at 320 CSS pixels without branding, candidate status names,
computed hierarchy, AI advice, scoring, ranking, persistence, or external
action.

Code can establish canonical identity and detect declared structural drift. It
cannot determine that invented labels exclude every real entity, that two
rendered surfaces have equal salience or access burden, that the packs have
equivalent difficulty, or that an independent reviewer approved them.

## Decision

Add a separate pure
`src/forge/university-research-artifacts/**` preflight. Do not widen or promote
the existing research-operations v1 authority. The new layer:

1. authors exact Pack P and Pack Q values with seven ordered scenarios:
   `ready`, `source-review`, `capacity-break`, `tight-window`,
   `world-changed`, `path-complete`, and `path-blocked`;
2. records for every scenario the synthetic term and course, copied-source
   boundary, deadline and relative timing, learner-declared capacity,
   fixture-authored effort range, accepted action, exact World binding,
   terminal action state, available choices, single bounded next job, expected
   control effect, answer key, and explicit no-effect boundaries;
3. preserves the locked seven research-information IDs while making their
   full coverage explicit: `term` binds term plus course and `effects` binds
   terminal state plus all effect boundaries;
4. authors Substitute B as a strict content tree for a versioned local
   renderer, not arbitrary HTML, Markdown, CSS, JavaScript, URLs, remote
   assets, or event handlers; its seven native-radio navigation options bind
   the neutral labels `Example 1` through `Example 7` to the internal scenario
   IDs, and the renderer descriptor forbids exposing those IDs as labels;
5. binds Substitute B to the locally computed full-content P and Q digests;
6. authors the exact nine exposure tasks, three comparison questions, three
   neutral prompts, thirteen stop IDs, 12-minute exposure, three-minute reset,
   and no-coaching/no-capture boundaries as one moderator packet;
7. declares all four candidate/substitute pack pairings while marking
   candidate binding `declared_not_runtime_verified` and substitute binding
   `manifest_bound_not_rendered`; and
8. creates an immutable independent-review request and checklist, whose status
   is exactly `requested`.

Candidate and substitute facts have one canonical scenario-record origin.
They must not be separately authored. The current candidate adapter is a
manifest contract only; it does not yet compile P/Q through the existing
semester-loop projector or prove that the route rendered those facts.
Likewise, the readiness comparator's information and task parity is one
shared declared manifest, not two independently compiled or rendered
surfaces.

## Mechanical comparison

The projector separately derives:

- exact scenario order;
- exact equality to the frozen authored Pack P and Pack Q manifests, plus the
  Pack P semantic oracle, so symmetric P/Q corruption and unreviewed lexical
  substitutions cannot pass;
- global uniqueness of pack, scenario, fact, World, choice, and substitute-node
  references, with only one exact within-scenario World alias permitted;
- distinct permitted P/Q lexical variants;
- semantic-signature identity after removing only synthetic identifiers, term
  and course labels, and absolute times/deadlines;
- distinct raw pack identities;
- the substitute's closed neutral surface, access, density, and delivery
  declaration;
- exact frozen v1 visible copy with ASCII-only defense against confusable
  branding or advice cues, including the seven locked ordinal navigation
  labels;
- a conservative per-scenario declared-manifest character estimate that
  includes all navigation labels;
- exact candidate-adapter and renderer-descriptor bindings;
- exact substitute-to-pack digest bindings; and
- declaration of all four surface-pack pairings.

The semantic signature retains state, source authority, relative deadline,
capacity relation, path ownership, World state, terminal state, choice order,
next job, reason, effect boundaries, answer key, and structural difficulty
counts. A matching signature is a mechanical result, not a human equivalence
decision.

The maximum projector state is
`mechanical_parity_passed_review_required`. The projector never emits
`equivalent`, `approved`, `validated`, `rehearsal_ready`, or a participant
state. Candidate and substitute render parity remain `not_rendered`.

## Canonical identities

Every digest hashes canonical JSON inside a distinct domain envelope. Domains
separate scenario, scenario-pack, candidate fixture, candidate adapter,
semantic signature, information item, renderer binding, substitute template,
substitute manifest, moderator packet, review checklist, review envelope, and
projection identities. A material fact, choice, task, control, layout
contract, timebox, boundary, or pairing change therefore changes its
dependent identities.

A digest establishes local canonical identity only. It does not establish
authenticity, accountable authorship, real-entity exclusion, institutional
truth, artifact approval, independent review, deployment, or durable
operation.

On a mismatch, the projection preserves the caller-supplied renderer and
review-checklist digests separately from the locally expected descriptor
digests. The substitute-manifest and review-envelope identities continue to
hash the supplied values, so a failed ledger never combines an expected child
identity with an artifact derived from different supplied bytes.

## Input and authority boundary

Before schema evaluation, the projector copies a bounded plain-JSON graph
through own enumerable data descriptors. It rejects proxies, accessors,
symbols, exotic prototypes, sparse or extended arrays, cycles, aliases,
prototype-pollution keys, unsupported values, unsafe numbers, excessive
depth/nodes/string bytes, excessive container keys, oversized property names,
aggregate key bytes, non-normalized text, control characters, bidi controls,
line separators, and Unicode default-ignorable characters. It uses no clock,
randomness, network, storage, logging, event, model, or provider.

The current route supplies this manifest only from a bounded server-authored
fixture; it accepts no request body. Before this projector is reused on any
request-controlled serialized input, an outer body-size limit and bounded
parse/enumeration evidence are mandatory. The in-memory copier applies cheap
UTF-16 lower-bound checks before UTF-8 measurement, but JavaScript own-key and
symbol enumeration still materializes the runtime's key list before its
post-enumeration count can be checked; the projector alone is therefore not a
request-body resource boundary.

The projection permanently records:

- caller-asserted synthetic input only;
- local canonical digest authority only;
- caller-asserted, unverified candidate build identity;
- locally recomputed manifest-only candidate-adapter and renderer identities;
- no artifact-approval, reviewer-identity, real-entity-exclusion, or
  pack-equivalence authority;
- manifest-only candidate parity and mechanical-only substitute neutrality;
- no rehearsal readiness, enrollment, capture, persistence, publish, send,
  external effect, claim upgrade, or gate closure.

## Operator inspection

The existing development-only readiness workspace may display the bounded
projection as an evidence ledger. It shows full untruncated identities,
mechanical checks, scenario-level signatures, and all six open gates. It adds
no route, action, export, copy control, focus target, persistence, or
participant workflow. A protocol-stop fixture shows artifact facts as not
evaluated; a comparator-drift fixture shows a mismatch rather than a false
failure count.

Production continues to render only the unavailable research-readiness shell.
The build scans public and server artifacts for fixture markers and the
complete server-owned scenario-label set.
The exact protocol document remains byte-identical; this ADR resolves artifact
format and digest ambiguities without amending the preregistered question,
tasks, timing, decision grammar, or authorization boundary.

## Consequences

Phase -1 now has inspectable authored synthetic pack, substitute, moderator,
and review-envelope candidates instead of placeholder hashes. Deterministic
tests can fail closed on hidden semantic drift and stale bindings.

The following remain open and are not implied by this decision:

1. implement and verify the candidate P/Q adapter;
2. render both surfaces from the same exact pack records;
3. inspect desktop, 320 CSS px, keyboard, reduced-motion, forced-colors,
   density, salience, and difficulty parity;
4. obtain an independently attributed equivalence review bound to the exact
   review-envelope digest;
5. obtain artifact approval and run the separately approved synthetic-persona
   rehearsal; and
6. satisfy every Phase -1 authorization item before any participant contact or
   capture.

`UV1-GATE-001`, `UV1-GATE-002`, and `UV1-GATE-003` remain open.

## Alternatives rejected

### Keep hashing placeholder plan objects

Rejected because a digest of `planned_not_authored` metadata cannot identify
the facts or surface an independent reviewer must inspect.

### Author Candidate A and Substitute B separately

Rejected because copied facts can drift while superficial counts still match.
Both surfaces must consume one canonical scenario record.

### Treat signature equality as pack equivalence

Rejected because normalization can compare declared structure but cannot judge
rendered cues, reading load, access burden, timing difficulty, neutrality, or
human salience.

### Add review approval to the artifact projector

Rejected because a pure caller-input projector has no accountable reviewer
identity or approval authority. A future review record must be separately
attributed and bound to the exact immutable review envelope.
