# ADR-012: Transient course-source ingestion

**Status:** Accepted for fixture-only, review-required derivation

**Date:** 31 July 2026

**Decision owner:** Principal product and architecture task under explicit user implementation authority

**Claim ceiling:** bounded parser and integration behavior only; no general ICS compatibility, live student data, durable privacy, tenant isolation, institutional truth, accessibility, learning, production, or efficacy claim

## Context

ADR-010 introduced private course-source revisions and review candidates, but the internal university workspace constructed those derived records by hand. It therefore tested reconciliation and learner review without testing the untrusted-input edge that a real manual entry or calendar export would cross.

Moving directly to file uploads, connectors, or durable source copies would exceed the current authority. Adult research approval, real-coursework handling, identity, tenant/RLS enforcement, retention operations, deletion, incident response, and product demand remain open. The next reversible step is a pure transient adapter that can prove narrow derivation and failure semantics against synthetic input.

The calendar format is broad. RFC 5545 includes content-line folding, multiple component types, floating and zoned time, all-day values, recurrence, exception sets, embedded time-zone definitions, alarms, and extensibility. FORGE does not need to claim or implement all of that to test the learner-review job. The normative reference is the [RFC Editor copy of RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html).

## Decision

Add `src/forge/course-sources/ingest.ts` as a deterministic, side-effect-free boundary with two inputs:

1. bounded structured manual fields using the existing course-source fact vocabulary; and
2. bounded calendar text using the explicitly named `rfc5545-one-shot-review-subset.v1`.

Both produce a private source revision and review candidates only when the entire request is valid. Any error discards the revision, candidates, and projection digest.

### Shared invariants

- The request is copied through an accessor-free, ordinary-JSON boundary before Zod or ordinary property traversal.
- Scope, revision/candidate/claim IDs, coverage, observation/freshness times, facts, and locators use the ADR-010 contracts.
- The result retains SHA-256 provenance, derived facts, and exact locators; it never retains original calendar text or file bytes.
- Facts must fall inside caller-declared inspected coverage.
- Output is stable, ordered, deeply immutable, and review-required.
- Identity scope remains caller-asserted fixture state. Tenant isolation, rights enforcement, source authenticity, institutional completeness, durable storage, and publication authority remain unestablished.
- Persistence, event emission, external side effects, recommendation, and execution remain false.

### Calendar subset

The accepted subset is intentionally smaller than RFC 5545:

- one `VCALENDAR` object;
- bounded content lines with RFC-style CRLF folding; LF is tolerated with an explicit warning;
- one-shot top-level `VEVENT` or `VTODO` course components;
- bounded `UID`, `SUMMARY`, `DTSTART`, `DTEND`, `DUE`, `STATUS`, and recurrence-detection properties;
- a course commitment maps explicitly to `VEVENT` plus `DTSTART` and `DTEND`;
- a deadline maps explicitly to `VTODO/DUE` or `VEVENT/DTSTART|DTEND`;
- date-times must be UTC (`Z`) or local with an explicit runtime-supported `TZID`;
- a repeated local clock time resolves to the first occurrence, matching RFC 5545;
- source semantics come from caller-declared UID mappings, never title, category, description, or model inference.

The subset rejects rather than guesses:

- floating time;
- all-day `DATE` values;
- UTC offsets embedded in the date value;
- absent or unsupported time zones;
- nonexistent local clock times;
- recurrence and recurrence exceptions;
- cancelled mapped components;
- missing, duplicated, malformed, cross-kind, or inconsistent properties;
- inferred deadlines, commitment classes, consequence, course scope, or claim identity.

Embedded `VTIMEZONE` definitions are not interpreted. Runtime-supported IANA-style `TZID` handling is a candidate convenience, not a cross-runtime compatibility claim.

### Resource and privacy limits

The parser fixes:

- 256 KiB exact input-byte ceiling;
- 8,192 physical lines;
- 1 KiB per unfolded content line;
- 256 calendar components;
- 128 properties per course component;
- 128 mapped candidates;
- 4,096 copied JSON nodes and depth 12.

Control characters, bare carriage returns, excessive structures, accessors, non-plain prototypes, sparse arrays, and undeclared request properties fail closed. The parser performs no logging. Descriptions and product identifiers are ignored and absent from output. SHA-256 binds the exact transient text, including accepted LF-versus-CRLF differences.

## Architecture and authority

```text
transient manual fields ─┐
                         ├─ bounded ingestion ─ review candidates ─ ADR-010 reconciliation
transient calendar text ─┘          │
                                    └─ no raw retention, side effect, or recommendation
```

The parser is not a connector, upload service, calendar sync, planner, policy authority, or agent. It cannot decide whether an extraction is correct, whether a source is authentic or complete, which conflicting fact applies, or what the learner should do next.

## Internal fixture integration

The development-only university source-review fixture now derives its copied syllabus fields and exported-calendar deadline through this adapter. The UI remains a review workbench: no upload control, live source, browser storage, durable write, or public route was added.

This integration proves that derivation can feed the existing disagreement and policy-safety states. It does not prove that students can successfully import their own calendars or tolerate setup.

## Evaluation

Focused evidence covers:

- manual and calendar success;
- exact digest and locator provenance;
- raw-text absence;
- deterministic order, digest, and immutability;
- explicit Kolkata time conversion;
- repeated New York clock time and spring clock gap;
- floating, all-day, recurring, cancelled, malformed, wrong-component, missing-property, duplicate-UID/mapping, and undeclared-coverage rejection;
- byte, line, component, property, candidate, graph, and control-character limits;
- hostile accessor non-execution;
- no network or declared side-effect authority;
- source-review and University Today regression integration.

Full repository lint, typecheck, unit/evaluator, production build, and public-asset scan remain required before the packet is reviewable.

## Rejected alternatives

### General-purpose ICS library and compatibility claim

Rejected for this packet. A dependency could broaden syntax but would not resolve product semantics, source authority, recurrence review, time-zone compatibility, retention, or learner correction. The narrower contract makes unsupported cases visible.

### Infer fact type from title or category

Rejected because “exam,” “due,” or “lab” heuristics can silently misclassify arbitrary institutional text. The caller must explicitly map UID to fact kind and claim identity.

### Expand recurrence automatically

Rejected because recurrence sets, exceptions, overrides, cancellations, and time zones require a separately tested expansion contract. Importing only the first instance would create false coverage.

### Default floating or all-day values

Rejected because choosing a learner time zone or deadline instant changes meaning. These values require clarification.

### Store the original file for reprocessing

Rejected until private-object authority, encryption, retention, export, deletion, incident response, and recovery are approved. Reattachment semantics remain a later design decision.

### Add a public upload surface

Rejected until direct workflow evidence supports the wedge and real-data authority exists. The current internal fixture tests derivation without soliciting private student data.

## Reversal and supersession

The adapter and fixture integration can be removed without migration because they write no data. A later live ingestion ADR must explicitly supersede this decision and establish account authority, adult-only scope or child-safety controls, file/connector permissions, tenant/RLS isolation, encrypted storage or verified transient cleanup, rights operations, recurrence and time-zone behavior, observability/redaction, abuse limits, incident response, and rollback.
