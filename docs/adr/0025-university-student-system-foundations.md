# ADR-025: Learner-declared degree and learning foundations

**Status:** accepted for local synthetic implementation

**Date:** 1 August 2026

**Decision owner:** principal product and architecture task

**Claim ceiling:** local inspection behavior only; no verified identity,
institutional truth, graduation eligibility, mastery, recommendation,
persistence, production, or learning-effect claim

## Context

Semester Desk shows one synthetic term and one learner-selected course in
detail. It does not yet represent the complete degree or the learner's
long-term learning continuity.

The next product foundation needs three separate views:

1. the learner-declared degree structure;
2. the learner-declared learning structure inside one course; and
3. one context that keeps those two structures together without flattening
   them into a score or global next action.

Live university data, account identity, persistence, and institutional
authority are not approved. The first implementation must therefore remain
pure, synthetic, deterministic, and removable.

## Decision

Add three canonical pure projectors:

- `src/forge/university-degree-map/**`;
- `src/forge/university-learning-map/**`; and
- `src/forge/university-student-context/**`.

Add development-only internal inspection surfaces for the degree map and
learning map. Keep the existing university command center as the directory for
these and the earlier bounded workspaces.

### Degree axis

The degree map can represent:

- opaque program, course, requirement, and source references;
- completed, in-progress, and planned learner declarations;
- course prerequisite references;
- required-course and minimum-credit requirements;
- completed, in-progress, planned, and total declared credit units;
- unmet requirement references; and
- missing source, duplicate, conflict, unknown-course, and cycle flags.

`ready_for_inspection` means only that the learner-supplied structure is
internally coherent. It does not mean the institution accepts the structure or
that the learner can graduate.

### Learning axis

The learning map can represent:

- learner-declared outcome references;
- concept and prerequisite references;
- bounded attempt references;
- bounded evidence references without captured content;
- help-used provenance with unknown effect;
- delayed-return due dates; and
- explicit unknowns.

The projector must validate real calendar dates. It must not infer mastery,
ability, diagnosis, learning effect, or the correct next concept.

### Student context

The student context accepts raw degree-map and learning-map requests. It does
not accept caller-supplied child projections.

The context:

- copies the complete outer graph through one bounded accessor-safe boundary;
- recomputes both canonical child projections;
- rejects an invalid child;
- preserves degree and learning axes separately;
- returns `review_required` when either valid child requires review; and
- returns `ready_for_inspection` only when both valid child declarations are
  internally coherent.

The context does not create a combined readiness, risk, priority, progress,
mastery, graduation, or next-action score.

The degree, learning, and student-context projection classes are
learner-declared inspection classes. Adult status and declaration ownership
remain self-attested and unverified. A server binding can establish only
authenticated account association and active-adult admission. It cannot
establish declaration ownership, source truth, or institutional authority.

### Authority vocabulary reset

The degree, learning, and student-context request and projection schemas now
use `v2`. The student-context binding type also uses `V2`.

The `v1` contracts are retired. No compatibility alias or silent conversion
exists. This reset prevents affirmative ownership labels from surviving as
trusted input or projection vocabulary.

## Status grammar

Each new projector uses only:

- `invalid`;
- `review_required`; or
- `ready_for_inspection`.

No projector has an approved, verified, eligible, recommended, mastered,
graduation-ready, persisted, synced, or production state.

## Input boundary

Every request must be bounded plain JSON before schema traversal. Accessors,
proxies, symbols, exotic prototypes, sparse arrays, cycles, aliases, unsafe
numbers, undeclared fields, and excessive depth or size fail closed.

This in-memory boundary is not a network request-body boundary. Any future
request-facing use needs a separate body-size, authentication, authorization,
abuse, and rate review.

## Effect boundary

These modules and internal surfaces add:

- no account or identity authority;
- no database table or migration;
- no local or session storage;
- no cookie or durable browser state;
- no connector, provider, retrieval, or model call;
- no event or evidence write;
- no calendar, message, or external action;
- no free-form student content; and
- no public navigation or production fixture exposure.

Internal routes require exact development environment tokens. Production must
import and render only an unavailable shell.

## User interface

The internal surfaces use the existing FORGE visual system. They must:

- show source and authority limits before detailed facts;
- keep all rows inspectable without a default selection;
- show learning concepts in stable reference order without implying a study
  sequence;
- use explicit labels instead of color alone;
- preserve list semantics when visual list markers are removed;
- use the accessible accent token for small labels;
- support keyboard focus and 320 CSS pixel reflow;
- respect reduced motion and forced colors; and
- perform no automatic network or storage effect.

The command-center order is alphabetical. It is not a recommendation or
priority.

User-initiated navigation through explicit internal shell or directory links
is the only permitted network effect. No surface writes storage or calls a
provider, model, message, event, or external system.

The three route shells disable automatic link prefetch. The production build
scans public and server artifacts for fixture markers and complete development
surface lexical sets.

## Alternatives rejected

### Add degree data to Semester Desk

Rejected. Semester Desk owns one term and one course inspection. A degree map
has different scope, source, and authority rules.

### Convert requirement gaps into recommendations

Rejected. A missing requirement or prerequisite is a declared fact for review.
It is not permission to select a course or plan.

### Treat attempts as mastery

Rejected. An attempt reference and a delayed return do not establish learning.

### Add persistence now

Rejected. Persistence requires accepted identity, ownership, conflict,
retention, export, correction, deletion, replay, and release decisions.

## Consequences

FORGE gains a coherent code foundation for degree and course learning
continuity. The foundation remains inspectable and testable without collecting
student data.

The next integration work can connect approved source ingestion and identity
to these contracts. That work must not upgrade the current claim ceiling by
implication.
