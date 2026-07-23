# ADR-009: Practical Multimodal Learning Paths

**Status:** Proposed

**Date:** 23 July 2026

**Decision owner:** Principal product and architecture review

**Requires:** product, learning, source/rights, accessibility, safety/privacy, educator, assessment, and operations review

## Context

FORGE cannot author and review every lesson before it becomes useful. A learner may prefer video, text, diagrams, simulation, discussion, practice, or making something. A generated answer alone cannot provide a trustworthy path, and a list of links is not a curriculum.

## Decision

Design FORGE around a question-to-map workflow.

For each learner goal, the system should produce an inspectable and editable candidate map of concepts, prerequisites, capabilities, practical work, and proof. It should then assemble appropriate reviewed internal resources and clearly labeled external candidates across multiple modes.

External resources, including YouTube videos, remain candidates until their identity, claims, source, age/accessibility properties, rights and tracking implications, review status, and lifecycle are known. AI may retrieve, summarize, compare, sequence, translate, or propose resources. It may not silently convert search rank, popularity, model preference, or generated material into reviewed curriculum.

Every substantial path should connect explanation to practice, a meaningful project or performance where appropriate, reconstruction, and unaided evidence. Learners may customize goals, depth, pace, sequence, and mode inside visible prerequisite, safety, and availability boundaries.

Every proof-bearing path preserves the FORGE compiler invariant in domain-appropriate form: the learner states an initial model or plan; FORGE shows exactly two uncertain plausible readings and their point of disagreement; a separating observation, test, execution, comparison, critique, or performance can distinguish them; the learner reconstructs before assistance is withdrawn.

The first implementation target is a closed, server-entitled, externally recruited 18+ reviewed-catalog pilot. External discovery begins fixture-only and disabled. Candidate, reviewed external, anchored learning object, and published-reviewed/assignable pathway maturity states remain visually and structurally distinct. Minor-facing open discovery, generated-video publication, high-stakes grading, and homeschool operation are separately deferred.

The capability graph is canonical. Resources are versioned, reviewed, replaceable attachments to capability nodes. A provider URL or video ID is a locator, not proof that the currently served content is identical to what a reviewer observed.

## Consequences

- FORGE needs a capability-map compiler rather than a course generator.
- Resource identity and review must support mutable external media and removals.
- Video requires caption/transcript and audio-description decisions, reviewed alternatives with construct-preserving/changing status, age and advertising review, and regional availability.
- Projects need artifact provenance, checkpoints, rubrics, feedback boundaries, and safeguarded human review where applicable.
- Recommendation quality, learning validity, cost, latency, privacy, and source lifecycle need independent evaluation.
- Unknown topics must remain exploratory until reviewed content and proof exist.
- Teacher, family, and teaching-assistant modes should amplify accountable people without granting AI hidden authority.
- Public “learn anything,” homeschool, teacher-replacement, mastery, and efficacy claims remain prohibited until separate gates pass.

## Alternatives considered

### Own an exhaustive lesson library first

Rejected as the only strategy. It cannot reach arbitrary legitimate learner goals quickly enough and would make breadth depend on centralized authoring capacity. FORGE will still author or license core packages where authority, access, stability, or pedagogy requires it.

### Generate a complete course on demand

Rejected. It creates false completeness, weak source identity, unstable prerequisites, unreviewed proof, and a misleading curriculum claim. Generation remains a proposal and gap-filling layer.

### Return a search or video feed

Rejected. Popularity and engagement do not establish learning fit, source authority, age suitability, access, or durability. The learner needs a finite route and active operations, not an unbounded feed.

### Keep all paths manually authored

Rejected as the long-term product boundary but retained for high-risk domains and early fixtures. AI may accelerate proposal and adaptation; named people and deterministic contracts retain consequential authority.

## Acceptance conditions

The ADR may move to `Accepted` only when reviewers agree that:

- the capability-map, resource observation/review, representation, project, and proof contracts preserve existing FORGE authority boundaries;
- candidate and reviewed states cannot be confused in schema, UI, event replay, or evidence;
- external-resource data flows, provider terms, age rules, access alternatives, rights, lifecycle, incident, kill switch, and rollback are specified;
- the adult-first audience and prohibited claims are explicit;
- total educator/reviewer labor and sustainable cost are part of the evaluation;
- Wave 6's W6-0 preflight, packet definitions, stop-ship tests, and exact predecessor gates are accepted **for dispatch**; implementation packet dispositions are later evidence and are not a prerequisite to this ADR.

Acceptance would authorize bounded implementation planning, not live provider access, publication, minors, research, deployment, or public efficacy claims.

## Reversal and supersession

The design is reversible because capability, resource, and evidence contracts remain provider-neutral. If external media creates unacceptable safety, rights, reliability, access, workload, or cost, FORGE can disable the adapter and retain internal or licensed routes without rewriting capability or evidence history.

Any later decision to expose open external discovery to minors, treat generated content as publishable without named review, or use resource engagement to rank learning routes requires a new ADR and must not silently amend this one.
