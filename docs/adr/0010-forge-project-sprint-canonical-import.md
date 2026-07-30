# ADR-0010: FORGE Project Sprint canonical import proposal

- Status: Proposed for principal review
- Date: 2026-07-30
- Product: FORGE Learning OS
- Module: FORGE Project Sprint
- Decision class: Cross-lane project and evidence mapping
- Runtime authority: None

## Context

FORGE Project Sprint currently owns a bounded, browser-local seven-day work record under
`forge.project-sprints:v1`. The canonical FORGE architecture separately owns reviewed project
packages and attempts under `src/forge/projects/**`, and learner-readable device evidence under
`src/lib/forge-evidence/**`.

These records are not interchangeable:

- a Sprint is learner-owned planning and work history;
- a canonical project package requires reviewed capability, project, safety, artifact, critique,
  proof, and delayed-return bindings;
- a canonical project attempt requires artifact digests, contribution provenance, milestone
  records, critique, revision, individual defence, and unfamiliar transfer;
- a canonical evidence record requires an authorized observation, exact proof conditions,
  assistance provenance, and a bounded disposition.

A Sprint title, completion state, evidence link, or self-declared protected pass cannot create any
of those authorities by itself.

## Decision

Introduce a versioned, pure mapping proposal:

`forge-sprint-canonical-import-proposal.v1`

The proposal may translate one validated Sprint snapshot into a learner-visible candidate for a
future canonical project import. It may not write either store, allocate canonical project or
evidence identities, assign a reviewed project package, or upgrade a Sprint claim.

The mapping is:

- one-way from a validated Sprint snapshot to a proposal;
- deterministic for the same mapping version and source snapshot;
- explicit about missing authority and provenance;
- previewed field by field;
- activated only by a separate learner confirmation;
- incapable of background synchronization;
- incapable of producing a canonical evidence event or claim.

The first version remains an S0 design and fixture surface. Canonical writes remain blocked until
the reviewed project/event contracts, adult identity and tenancy, explicit import action, RLS,
correction, export, deletion, and rollback gates are accepted.

## Architecture summary

```text
validated browser-local Sprint v1
  -> pure mapping proposal v1
  -> learner preview of fields, omissions, contamination, and blockers
  -> explicit learner confirmation
  -> future canonical import command (blocked)
  -> canonical project service assigns identities and appends events
  -> evidence projector derives only what accepted events permit
```

There is no reverse sync and no recurring reconciliation loop. A later Sprint edit creates a new
proposal that supersedes the prior proposal; it never rewrites imported canonical history.

## Proposed contract

```ts
type ForgeSprintCanonicalImportProposalV1 = Readonly<{
  schemaVersion: "forge-sprint-canonical-import-proposal.v1";
  mappingVersion: "1.0.0";
  authority: "learner-proposal-only";
  syncMode: "manual-confirmed-import";
  source: Readonly<{
    kind: "forge-project-sprint";
    storageSchemaVersion: 1;
    sprintId: string;
    createdAt: string;
    updatedAt: string;
  }>;
  idempotencyKey: string;
  projectCandidate: Readonly<{
    title: string;
    practicalBrief: string;
    intendedAudience: string;
    startingPoint: string;
    sourceStatus: "active" | "completed";
    stages: readonly Readonly<{
      sourceDay: number;
      status: "not-started" | "completed";
      completedAt: string | null;
      learnerWorkNotes: string;
      learnerChangeRecord: string;
    }>[];
    artifactCandidates: readonly Readonly<{
      sourceEvidenceLinkId: string;
      label: string;
      url: string;
      sourceDay: number;
      canonicalArtifactId: null;
      contentDigest: null;
      provenanceStatus: "incomplete";
    }>[];
    shippedItemCandidates: readonly string[];
    reflection: string;
    openQuestions: readonly string[];
  }>;
  proofCandidate: Readonly<{
    sprintStatus: "not_started" | "self_declared" | "contaminated";
    aiUse: "not_declared" | "learner_declares_no_ai" | "ai_used_or_unsure";
    canonicalEvidenceEligible: false;
    proposedDisposition: "not_evaluated" | "contaminated";
    limitation: string;
  }>;
  blockers: readonly ForgeSprintCanonicalImportBlockerV1[];
  requiredConfirmations: readonly (
    | "source-snapshot-reviewed"
    | "field-mapping-reviewed"
    | "provenance-gaps-understood"
    | "no-evidence-upgrade-understood"
    | "explicit-import-requested"
  )[];
}>;
```

`idempotencyKey` is the canonical encoding of:

```text
forge-sprint-import:v1:<sprintId>:<updatedAt>
```

The future server command must reject reuse of the same key for different canonical bytes. A new
`updatedAt` creates a new proposal and a new key.

## Field mapping

| Sprint v1 source | Proposal v1 destination | Canonical meaning |
| --- | --- | --- |
| `id`, `createdAt`, `updatedAt` | `source` and `idempotencyKey` | Source lineage only; not a canonical project identity |
| `title` | `projectCandidate.title` | Learner wording |
| `finishLine` | `projectCandidate.practicalBrief` | Candidate brief; not a reviewed project package |
| `audience` | `projectCandidate.intendedAudience` | Descriptive audience; no contact or sharing authority |
| `startingPoint` | `projectCandidate.startingPoint` | Learner context; no prerequisite evidence |
| `days[].workNotes` | `stages[].learnerWorkNotes` | Learner-owned process record |
| `days[].change` | `stages[].learnerChangeRecord` | Candidate revision rationale; not a canonical revision record |
| `days[].evidenceLinks` | `artifactCandidates[]` | Inspectable pointers only; no artifact digest or verified provenance |
| `whatShipped` | `shippedItemCandidates[]` | Learner declaration; no completion or authorship authority |
| `reflection`, `openQuestions` | same named proposal fields | Learner-owned context; never evidence of capability |
| `proofLab` | `proofCandidate` | Limitation-preserving candidate only |

No version maps Sprint data directly to `PracticalProjectPackageV1`,
`PracticalProjectAttemptV1`, `ProjectCompletionEventV1`, `EvidenceEntry`, or an event-journal
payload.

## Closed blocker vocabulary

The proposal reports blockers from this closed v1 set:

- `reviewed-project-package-missing`
- `target-capability-binding-missing`
- `learner-identity-authority-missing`
- `artifact-content-digest-missing`
- `artifact-creator-provenance-missing`
- `contribution-provenance-missing`
- `critique-record-missing`
- `revision-record-missing`
- `individual-defence-missing`
- `unfamiliar-transfer-missing`
- `proof-authority-missing`
- `learner-confirmation-missing`
- `source-sprint-incomplete`
- `source-proof-contaminated`

Unknown blocker codes fail validation. A later mapping version may add codes but cannot reinterpret
stored v1 codes.

## Proof and evidence rules

1. `not_started` maps to `not_evaluated`.
2. `self_declared` still maps to `not_evaluated`. The learner's declaration is preserved, but it
   is not independent validator or identity authority.
3. `contaminated` maps to `contaminated`.
4. A URL is an inspectable pointer, not proof that its content exists, belongs to the learner, is
   safe, or supports a capability.
5. Completion of seven Sprint days is process history, not a project completion event.
6. No mapper function imports, calls, or writes `src/lib/forge-evidence/store.ts`.
7. Only a later accepted canonical project service may append project events. Only the evidence
   projector may derive an evidence record from accepted events.

## Tool and side-effect boundary

| Operation | Class | V1 authority |
| --- | --- | --- |
| Read and validate one local Sprint snapshot | S0/S1 local read | Learner-visible action |
| Build and render the proposal | S0 pure | Automatic after validation |
| Export the proposal | S1 local reversible | Explicit learner action |
| Confirm a future import | S1 approval record | Explicit learner action |
| Write a canonical private project/event | S2 private durable | Blocked |
| Share with another person | S3 interpersonal | Absent |
| Publish an artifact or evidence claim | S4 public/institutional | Absent |

## State and memory design

- The Sprint store remains the only Sprint source.
- The proposal is derived and disposable.
- A downloaded proposal is a learner-controlled export, not canonical state.
- A future confirmed import appends a canonical import event and stores the exact mapping version,
  source snapshot digest, idempotency key, and learner approval.
- The importer never stores raw unrelated browser state.
- Corrections and reimports append superseding events; they do not alter prior source snapshots or
  evidence.

## Context budget

The mapping uses no model and no conversational context. It accepts one validated Sprint with:

- at most seven stages;
- at most eight links per stage;
- the existing Sprint field limits;
- no fetched URL content;
- no account, chat, browsing, or unrelated evidence history.

## Failure modes

| Failure | Required behavior |
| --- | --- |
| Malformed or incoherent Sprint | Fail closed and preserve the original bytes |
| Unknown Sprint or mapping version | Refuse mapping; offer export only |
| Duplicate idempotency key with different bytes | Refuse and surface reconciliation |
| Sprint changes after preview | Invalidate confirmation and rebuild the proposal |
| Missing link or unavailable URL | Preserve pointer with an unavailable status; do not fetch silently |
| AI use uncertain | Preserve contamination; never coerce a clean declaration |
| Canonical service unavailable | Keep the Sprint and proposal local; no partial write |
| Partial canonical transaction | Roll back the transaction; no evidence projection |
| Project package later withdrawn | Preserve import history and hold project/evidence eligibility |
| Learner declines import | Discard the proposal without changing either store |

## Evaluation plan

Before implementation may advance:

- schema tests for every field limit and blocker code;
- golden deterministic mapping fixture;
- malformed, unknown-version, duplicate, and changed-after-preview tests;
- incomplete, self-declared, and contaminated proof fixtures;
- idempotency same-input/same-output and changed-input/new-key tests;
- structural test proving the mapper has no evidence-store, network, Supabase, provider, or event
  writer import;
- browser tests for preview, explicit confirmation, cancellation, export, and recovery;
- two-account/RLS and event-replay tests before any S2 implementation;
- learner comprehension review that distinguishes project history, artifact provenance, and
  capability evidence.

## First implementation issues

1. Add the strict proposal schema and pure mapper under `src/forge/projects/import-proposals.ts`.
2. Add fixtures and golden replay tests without any storage writer.
3. Add a learner-visible preview route behind an explicit local action.
4. Add proposal export and cancellation.
5. Stop. Do not implement canonical writes until the event aggregate, identity, RLS, correction,
   and rollback decisions are independently accepted.

## Consequences

The design preserves useful Sprint work without creating a second evidence ledger. It also makes
the current gap visible: Project Sprint records are valuable process history, but they do not yet
meet the canonical project's provenance, review, proof, or authority contract.
