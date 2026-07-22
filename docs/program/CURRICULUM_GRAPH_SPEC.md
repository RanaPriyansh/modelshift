# FORGE Curriculum Graph — Implementation Specification

**Status:** principal-owned implementation authority for the second W5-D slice; no graph package, capability, World, pathway, or homeschool claim is accepted by this document

**Depends on:** accepted ADR-007 source-authority contracts, ADR-008, the exact released World registry, and the Packet C nine-area vocabulary

## 1. North Star

The graph answers a narrow public-truth question:

> Which exact capabilities have a released and available reviewed World, which are only review candidates, which prerequisites or accessible alternatives are reviewed, and where does FORGE still have an explicit gap?

It is not a lesson recommender, grade-level sequence, completion record, learner model, schedule, transcript, or claim that FORGE supplies a sufficient education. Its first useful result is an honest nine-area map in which absence remains visible rather than being filled by generated content.

## 2. Product boundary

The first slice is a pure deterministic library under `src/forge/curriculum/**`. It consumes explicit immutable inputs and returns a validated graph plus read-only availability and explanation projections. It performs no fetch, generation, publication, database write, learner-state read, provider call, or route mutation.

The graph may:

- validate exact capability, prerequisite, alternative, source, policy, and World bindings;
- derive `released`, `review-candidate`, or `identified-gap` from those inputs;
- expose why a capability is unavailable or why a prerequisite exists;
- produce exactly one status entry for each of the nine entitlement areas;
- enumerate deterministic options without selecting one for a learner.

The graph may not:

- mark a node released from an authored status field;
- route a review candidate or gap as a lesson;
- infer ability, readiness, mastery, retention, grade level, age, disability, motivation, risk, or preferred learning style;
- compute ranks, scores, hidden weights, engagement optimization, or a “best next step”;
- treat one capability as broad area coverage unless the reviewed node explicitly names every area;
- convert a source-review candidate into publication authority;
- claim curriculum sufficiency, balance, accreditation, legal compliance, attendance, or homeschool readiness.

## 3. Exact implementation ownership

The worker owns only:

```text
src/forge/curriculum/contracts.ts
src/forge/curriculum/canonical.ts
src/forge/curriculum/validate.ts
src/forge/curriculum/project.ts
src/forge/curriculum/fixtures.ts
src/forge/curriculum/index.ts
src/forge/curriculum/curriculum-graph.test.ts
docs/design/W5_D_CURRICULUM_GRAPH_BOUNDARY.md
```

It may make one minimal read-only adapter under `src/forge/pathways/**` only after the pure contracts pass independent review. It must not edit `src/forge/worlds.ts`, `src/forge/registry.server.ts`, a World package, public UI, SQL, auth, providers, release manifests, or principal program documents.

## 4. Closed vocabulary

### 4.1 Entitlement areas

Use Packet C's exact values and import them from its canonical contract rather than redefining them:

1. `language-literacy`
2. `mathematics`
3. `science`
4. `history-source-reasoning`
5. `computing-ai`
6. `arts-design`
7. `practical-life`
8. `civic-media`
9. `health-movement`

### 4.2 Capability positions

```text
foundation
chosen-frontier
project-application
relationship
return-proof
```

These describe reviewed curriculum purpose, not learner status. A node may name more than one position only when each is explicitly reviewed.

### 4.3 Availability

```text
released
review-candidate
identified-gap
```

`released` is derived. `review-candidate` and `identified-gap` are non-routable.

### 4.4 Depth modes

```text
encounter
working-model
independent-transfer
return-proof
```

Depth is a task-design condition. It is never converted to a grade, percentage, or learner label.

### 4.5 Access effect

```text
construct-preserving
construct-changing
```

An access route must say which input/action/representation it replaces and why its effect classification is reviewed. Construct-changing routes use a distinct evidence condition and cannot silently satisfy the original requirement.

## 5. Immutable graph package

The root schema is `CurriculumGraphPackageV1`:

```ts
type CurriculumGraphPackageV1 = {
  schemaVersion: "1.0";
  id: `curriculum-graph.${string}`;
  version: string;
  digest: `sha256:${string}`;
  policyRef: { id: string; version: string; digest: `sha256:${string}` };
  sourceAuthorityRefs: readonly {
    packageId: string;
    packageVersion: string;
    packageDigest: `sha256:${string}`;
    evaluatedAsOf: string;
  }[];
  nodes: readonly CurriculumNodeV1[];
  gaps: readonly CurriculumGapV1[];
};
```

The digest covers the entire canonical payload except `digest`. Identity strings alone are never sufficient. The validator must freshly compute the graph digest and policy digest and reject a mismatch before evaluating coverage. `sourceAuthorityRefs` is a canonical semantic set: it may be empty for a legacy-only graph and must contain every exact bound source package referenced by any node without allowing one evaluation to authorize another package.

Canonicalization uses the repository's canonical JSON rules and an explicit code-unit comparator. Arrays that are mathematical sets are sorted before hashing: entitlement areas, positions, age modes, depth modes, source refs, evidence event types, untested claim codes, access-route IDs, and alternative capability IDs. Prerequisite edges and explanatory text remain records with stable IDs and are sorted by those IDs. An array is treated as ordered only if the schema names the ordering as semantic.

## 6. Capability node

Each node is one immutable version of one continuing `capability.*` identity:

```ts
type CurriculumNodeV1 = {
  id: `curriculum-node.${string}`;
  capabilityId: `capability.${string}`;
  capabilityVersion: string;
  title: string;
  construct: {
    code: string;
    statement: string;
    learnerFacingPurpose: string;
    exclusions: readonly string[];
  };
  entitlementAreas: readonly PathwayEntitlementArea[];
  positions: readonly CapabilityPosition[];
  prerequisites: readonly PrerequisiteEdgeV1[];
  alternatives: readonly AlternativeBindingV1[];
  supportedAgeModes: readonly LearnerAgeMode[];
  supportedDepthModes: readonly DepthMode[];
  accessRoutes: readonly AccessRouteV1[];
  evidenceRequirement: EvidenceRequirementV1;
  sourceRequirement: SourceRequirementV1;
  worldBinding: WorldBindingV1 | null;
  proposedAvailability: "review-candidate" | "identified-gap";
  limitationCodes: readonly string[];
};
```

`proposedAvailability` deliberately cannot contain `released`. A matching release authority input is the only way to derive release.

Node validation rejects:

- duplicate node IDs or duplicate `(capabilityId, capabilityVersion)` pairs;
- two current versions of the same capability in one graph;
- titles or explanations used as identity;
- empty construct statements, purposes, exclusions, or limitation codes;
- duplicate entitlement areas or unsupported area strings;
- a gap with a World binding;
- a review candidate without the exact proposed World, source-provenance, validator, and policy references needed for review;
- any raw learner response, provider output, prompt, key, score, inferred trait, or recommendation weight field.

## 7. Prerequisite edges

```ts
type PrerequisiteEdgeV1 = {
  id: `curriculum-edge.${string}`;
  capabilityId: `capability.${string}`;
  capabilityVersion: string;
  rationaleCode: string;
  explanation: string;
  evidenceCondition: {
    requiredClaimCode: string;
    acceptedEvidenceTier: EvidenceTier;
    acceptedTaskFamilies: readonly string[];
    remainsUntestedCodes: readonly string[];
  };
  alternativeBindingIds: readonly string[];
};
```

An edge means a reviewed construct dependency, not “people usually take this first.” The target node must exist at the exact version. Self-edges, missing targets, cycles, cross-version ambiguity, duplicate edges, empty rationale, and prerequisites justified only by age/grade/seat time fail closed.

Cycle detection must return a stable cycle path based on canonical node ordering. Tests must cover direct self-cycle, two-node cycle, longer cycle, disconnected cycles, and a valid diamond.

An evidence condition describes what a future pathway evaluator would need. The graph does not read a learner ledger and does not decide that the condition has been met.

## 8. Reviewed alternatives

```ts
type AlternativeBindingV1 = {
  id: `curriculum-alternative.${string}`;
  kind: "prerequisite-equivalent" | "construct-route";
  capabilityId: `capability.${string}`;
  capabilityVersion: string;
  appliesToEdgeIds: readonly string[];
  equivalence: "reviewed-equivalent" | "different-construct";
  limitationCodes: readonly string[];
  sourceClaimIds: readonly string[];
};
```

Only `reviewed-equivalent` may satisfy a named prerequisite in a later pathway service. `different-construct` is visible as another legitimate route, not a weaker substitute. Both require exact source claims and cannot be invented by graph traversal.

Alternatives must point to existing exact-version nodes, cannot point back to the same node/version, and cannot create an implicit cycle when treated as prerequisite equivalence.

## 9. Access routes

```ts
type AccessRouteV1 = {
  id: `access-route.${string}`;
  effect: "construct-preserving" | "construct-changing";
  replaces: readonly ("visual" | "audio" | "drag" | "speech" | "fine-motor" | "timed" | "network" | "material")[];
  representationCodes: readonly string[];
  interactionCodes: readonly string[];
  evidenceConditionCode: string;
  reviewClaimIds: readonly string[];
  limitationCodes: readonly string[];
};
```

Every supported age/depth combination must have at least one usable route. A node that lacks such a route cannot be released for that combination. The graph records declared reviewed access; it does not claim that a schema-valid route has passed an assistive-technology session.

## 10. Evidence requirement

```ts
type EvidenceRequirementV1 = {
  capabilityId: string;
  capabilityVersion: string;
  claimCode: string;
  validatorRef: { id: string; version: string };
  taskFamilyIds: readonly string[];
  acceptedEventTypes: readonly ("evidence.recorded" | "evidence.return_recorded")[];
  minimumEvidenceTier: EvidenceTier;
  supportPolicyRef: { id: string; version: string };
  accessPolicyRef: { id: string; version: string };
  remainsUntestedCodes: readonly string[];
};
```

It must match the exact retained World binding before release. The graph cannot weaken proof isolation, convert `not_demonstrated` to partial capability, or remove remains-untested claims.

## 11. Source requirement and legacy truth

```ts
type SourceRequirementV1 =
  | {
      mode: "bound-source-authority";
      sourcePackageRef: { id: string; version: string; digest: string };
      requiredItemIds: readonly string[];
      requiredClaimIds: readonly string[];
      requiredRightsIds: readonly string[];
      requiredProductUses: readonly string[];
      requiredReviewScopes: readonly string[];
    }
  | {
      mode: "legacy-metadata-only";
      sourceItemIds: readonly string[];
      limitationCode: "source-authority.not-established";
      permittedForNewPublication: false;
    };
```

For `bound-source-authority`, the source-authority replay result supplied to graph validation must match the exact package reference and evaluation time. A complete source review candidate still establishes no external authenticity, durable storage, accountable human identity, rights clearance, or publication. Release requires a separate accepted publication authority input; the graph must not infer that authority from source completeness.

`legacy-metadata-only` exists to report the current released system truth. The four current Worlds are already released and available, but their runtime source bindings explicitly say that ADR-007 authority is incomplete. The graph must not retroactively call those routes unavailable without a package lifecycle decision, and it must not call their source metadata reviewed authority. Their derived node may therefore be `released` while separately projecting `sourceAuthorityStatus: "legacy-incomplete"` and the fixed limitation. A new publication candidate cannot use this mode to satisfy an ADR-007 publication gate.

## 12. World binding and release authority port

```ts
type WorldBindingV1 = {
  worldId: string;
  contentVersion: string;
  packageIntegrityHash: string;
  runtimeBindingDigest: string;
  runtimeProtocolVersion: string;
  validatorRef: { id: string; version: string };
  capabilityId: string;
  taskFamilyIds: readonly string[];
  sourceIds: readonly string[];
  sourceProvenanceStatus: "bound" | "legacy-metadata-only" | "mixed";
  route: string;
};

type ReleasedWorldAuthorityV1 = WorldBindingV1 & {
  releaseStatus: "released";
  availabilityStatus: "available";
  releaseEventRef: string;
  reviewedEntitlementAreas: readonly PathwayEntitlementArea[];
  publicationPolicyRef: { id: string; version: string; digest: string };
};
```

The adapter from the built-in registry creates `ReleasedWorldAuthorityV1`; graph fixtures cannot. The separate authority port must also name the exact reviewed entitlement areas; graph authorship alone cannot make one released capability satisfy an unreviewed area. A node derives `released` only when every scalar and semantic-set World binding and the node's entitlement-area set equal one released authority record. Package, runtime, validator, capability, task-family, source ID, source-provenance status, route, entitlement, policy, release, or availability mismatch derives `review-candidate` with exact issue codes. No nearest match or title fallback is permitted.

Release availability and source-authority quality are separate projection fields. An exact current released record with legacy source metadata derives `{ availability: "released", sourceAuthorityStatus: "legacy-incomplete" }`. An exact bound record still derives only `{ availability: "released", sourceAuthorityStatus: "bound-review-candidate" }` until a separate publication authority input establishes the publication act. The graph never turns structural source completeness into publication authority.

An `identified-gap` can never be upgraded merely because a registry World has a matching capability title.

## 13. Gap records

```ts
type CurriculumGapV1 = {
  id: `curriculum-gap.${string}`;
  entitlementArea: PathwayEntitlementArea;
  constructNeeded: string;
  reasonCode: string;
  learnerFacingText: string;
  nextReviewGateCodes: readonly string[];
  prohibitedClaims: readonly string[];
};
```

Every area without a released node has at least one gap. An area may have multiple named construct gaps; gap identity, not entitlement area, is unique. Candidate nodes do not erase their area's gaps; the public projection may say a candidate exists, but status remains `identified-gap` until release authority matches.

## 14. Deterministic projections

The pure package exports three projections:

### `validateCurriculumGraph(input)`

Returns the canonical graph digest, stable ordered issues, stable cycle paths, per-node derived availability, and invalidated node IDs. Any root identity, policy, source-authority, or canonicalization failure invalidates every node.

### `projectNineAreaCoverage(validatedGraph)`

Returns exactly nine entries in Packet C order. Each entry contains:

- released capability IDs and exact World routes, if any;
- non-routable review-candidate IDs;
- named gaps and next gate codes;
- the fixed limitation that area presence does not establish sufficiency or homeschool readiness.

More than one released capability may exist in an area, but no function silently chooses one. The existing public availability adapter may continue to require one while its UI contract is unchanged.

### `explainCapabilityAvailability(validatedGraph, capabilityId)`

Returns exact prerequisite, alternative, source, World, policy, access, and release reasons. It accepts no learner profile or evidence. It never returns `recommended`, `best`, a numeric score, or a next action selected for a person.

## 15. First authored fixture

The canonical test fixture spans all nine areas without manufacturing breadth:

| Area | Exact first state |
| --- | --- |
| Language & literacy | `identified-gap`; Argument & Evidence may appear as `review-candidate` only after its package exists |
| Mathematics | derive `released` only for `capability.proportional-reasoning.compare-and-scale` from the exact current Ratio World binding; expose legacy-incomplete source authority |
| Science | derive `released` only for `capability.force-motion.zero-net-force` from the exact current Force & Motion binding; expose legacy-incomplete source authority |
| History & source reasoning | derive `released` only for `capability.historical-literacy.observation-inference` from the exact current Primary Source binding; expose legacy-incomplete source authority |
| Computing & AI | derive `released` only for `capability.ai-literacy.source-corroboration` from the exact current AI & Learning binding; expose legacy-incomplete source authority |
| Arts & design | `identified-gap` |
| Practical life | `identified-gap` |
| Civic & media | `identified-gap`; do not double-count Source Corroboration without a separately reviewed entitlement mapping |
| Health & movement | `identified-gap` |

This fixture is an acceptance oracle, not a coverage target. It must change only when an exact reviewed World/package mapping changes.

## 16. Required adversarial tests

At minimum, focused tests must prove:

1. graph digest is stable under permutations of every semantic set;
2. payload mutation under the same ID/version changes the digest and fails an old reference;
3. policy mutation under the same ID/version fails;
4. duplicate IDs, current capability versions, edges, alternatives, access routes, and gaps fail;
5. missing/self/two-node/long/disconnected cycles fail with stable paths;
6. alternative-equivalence cycles fail;
7. a missing exact node, source ID/provenance status, policy, World, validator, task family, route, package hash, or runtime digest never derives release;
8. `review-candidate` and `identified-gap` never produce a routable route;
9. a release with unavailable status is not released in the graph;
10. a capability cannot silently satisfy an unreviewed entitlement area;
11. a candidate does not erase a gap;
12. nine-area projection always has exactly the canonical nine ordered entries;
13. access gaps for an age/depth pair prevent release for that pair;
14. construct-changing access emits a distinct evidence condition;
15. graph input rejects learner text, model output, scores, rankings, grade level, seat time, and hidden-weight fields;
16. explanation output contains only authored deterministic reasons and no recommendation language;
17. all four current released bindings derive release only at their exact retained identities while retaining `legacy-incomplete` source authority;
18. the proposed Argument & Evidence binding remains non-routable until separately released;
19. source correction/expiry/withdrawal invalidates only exact dependent nodes without rewriting the graph package or authorizing unrelated source packages;
20. all invalid outputs retain the curriculum-sufficiency and homeschool-readiness non-claims.
21. source review-candidate completeness alone cannot derive publication or release;
22. `legacy-metadata-only` cannot satisfy a new publication candidate even though an already released registry record remains truthfully visible.
23. cloned object identities fail for nodes, edges, alternatives, access routes, gaps, release authorities, and source evaluations;
24. multiple gaps may remain visible in one entitlement area while the projection still returns exactly nine area entries.

## 17. Acceptance and handoff

A worker handoff is reviewable only with:

- one clean commit from the assigned accepted base;
- exact changed-file list and no ownership deviations;
- focused test command/count/skips, `pnpm typecheck`, `pnpm lint`, and `git diff --check`;
- a known exact graph digest fixture;
- direct regression names for every adversarial case above;
- explicit confirmation of no provider/network/database/deploy/publication action;
- explicit statement that the output is a local contract candidate, not released curriculum or homeschool readiness.

Independent review must reproduce at least one exact released binding, one stale-binding rejection, one cycle, one policy mutation, one candidate/gap projection, and the nine-area oracle. Only the principal may integrate the slice. Registry/pathway presentation remains a later, separately reviewed adapter.
