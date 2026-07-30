# ADR-014: University protected-study fixture projection

**Status:** accepted for removable internal research only

**Date:** 2026-07-31

## Context

ADR-011 can show one action from an existing learner-accepted path when copied
course context is reviewed and learner-fixture capacity fits. The previous
internal Today surface linked directly to the World route. That jump did not
explain what the learning runtime protects, and it did not verify the accepted
path's World reference against a complete World package.

The first exact-binding test found real fixture drift: the Today fixture named
`world.source-corroboration` version `1.0.1` but bound it to the retained
Argument and Evidence fixture source rather than the two sources in the
released source-corroboration package. A genuine device study session would
refuse that mismatch. The fixture now binds the actual ordered World source
IDs.

The shared World runtime already enforces the important learning boundary:

1. semantic stages begin with encounter and learner commitment;
2. instructional support must come from the released action and support
   catalogs;
3. instructional support, model actions, and replay are rejected during proof;
4. proof claims require AI to be off;
5. deterministic validators, not models, determine the bounded result;
6. access accommodations must preserve the construct and not change answers;
7. the emitted browser receipt is honour-based, not persisted, non-durable, and
   carries what remains untested.

The university layer should explain and verify that contract. It must not
invent "learn", "explain", "practice", or "assess" modes that the exact World
does not enforce.

## Decision

Add a removable `src/forge/university-protected-study/**` projector and
development-only `/internal/university-protected-study` research surface.

The projector:

- copies the complete request through a bounded, accessor-free plain-JSON
  boundary before validation;
- recomputes the supplied Today request instead of trusting a caller-provided
  ready flag;
- requires Today status `ready`, including reviewed copied-source context,
  learner-fixture capacity fit, and an existing accepted reviewed path action;
- validates the full supplied World package schema and cross-object
  invariants;
- requires exact World ID, version, route, activity protocol, and ordered
  source IDs from the accepted path;
- requires a released, available package with a shared-runtime binding;
- derives the displayed learning sequence, support policy, proof boundary,
  validator, accommodations, source-provenance state, receipt authority, and
  limitations only from that validated package;
- exposes preview, not session-start, authority;
- creates no recommendation, assignment answer, policy interpretation,
  learner-intent claim, persistence, evidence claim, event, or external side
  effect.

The internal surface has four fixed states:

1. exact ready brief;
2. source-blocked Today request;
3. changed World version;
4. paused World.

The ready state may link to the exact reviewed public World route. The link is
explicitly a preview. It carries no fixture course state, starts no
learner-owned session, and records no course completion.

## Authority ceiling

The output is a `fixture_only_protected_study_brief`.

- identity and scope are caller-asserted fixture values;
- course facts remain learner-connected copies, not institutional truth;
- World facts come from a validated supplied package snapshot, not from a live
  registry authority or deployment attestation;
- learner intent is not established;
- preview is allowed, while session start, persistence, evidence claims,
  recommendation, assignment answering, and external side effects are false;
- the source-corroboration runtime's legacy source metadata remains
  `incomplete`;
- its receipt remains honour-based and non-durable;
- no learning efficacy, accessibility conformance, demand, production, or live
  student claim is created.

## Alternatives rejected

### Add an AI study-mode selector

Rejected because labels such as explain, quiz, assess, and complete would
suggest distinct enforceable policies that the accepted World binding does not
declare. Product language cannot create runtime authority.

### Start a device study session from the internal fixture

Rejected because Today is synthetic and has no matching learner-owned device
continuity record. Creating one would turn a removable research surface into a
persistence and evidence mutation.

### Trust the Today projection supplied by the caller

Rejected because a strengthened or stale projection could bypass current source
and capacity checks. The protected-study projector recomputes Today from its
request.

### Match only World ID and route

Rejected because versions, protocols, and source sets are part of the accepted
path identity. Substitution must fail closed.

## Consequences

The Today ready action now opens the separate protected-study brief. Tight and
insufficient capacity still open recovery, and copied-source conflicts still
open source review. No state crosses those internal links.

This packet does not make arbitrary university material runnable. A future
course-specific learning packet still needs reviewed content provenance,
rights, exact capability and proof design, a released World package, and a
separate authority decision before real student data or durable sessions.
