# W5-D curriculum graph boundary

This slice is a pure, deterministic, content-addressed contract package. It accepts an authored curriculum graph, a content-addressed graph policy, and explicit authority-port snapshots. It does not import a registry, call source replay, fetch a source, read learner data, generate a lesson, select a route, mutate a route, publish a World, or write to a database.

The graph is deliberately not a curriculum-sufficiency, homeschool-readiness, accreditation, attendance, grade, transcript, learner-model, recommendation, ranking, or scheduling system. Its stable outputs retain the non-claims `does-not-establish-curriculum-sufficiency` and `does-not-establish-homeschool-readiness` even when validation fails.

Graph identity is the SHA-256 digest of canonical JSON with code-unit ordering. Semantic sets are normalized before hashing; prerequisites and explanatory text retain stable record IDs. A graph policy is independently content-addressed. An ID and version are never enough to authorize changed content.

This pure boundary accepts only `CallerAssertedReleasedWorldAuthorityV1`. Exact matches project as `caller-asserted-release` with `authorityTrust: "caller-asserted-unverified"`; they never project an authenticated or registry-backed release, and every routable route remains `null`. The record must exactly match the node's World/package/runtime/validator/task/source/provenance/proposed-route binding, publication policy, reviewed entitlement areas, reviewed age modes, and reviewed curriculum depth modes. Graph authors cannot broaden a World by adding an area, age mode, or depth mode. A separately reviewed future adapter must derive trusted release authority from the accepted registry; this module exposes no caller-constructible trusted marker.

The current four retained World bindings are represented as legacy metadata truth only. Raw exact matches remain explicitly caller-asserted while their separate source projection is `legacy-incomplete` with `source-authority.not-established`. Legacy metadata is never sufficient for a new publication candidate.

Bound-source nodes name an immutable source package ID/version/digest. The graph additionally stores one minimum evaluation instant for each source package. A caller supplies exactly one matching evaluation at or after that floor; an earlier, missing, extra, or ambiguous package evaluation fails closed. A later append-only correction, expiry, or withdrawal invalidates its exact bound node regardless of any caller-asserted release lifecycle, without changing the graph package digest. The supplied evaluation must expose the exact required source items, claims, rights records, product uses, and review scopes. Access review claims and each alternative source reference must resolve to that exact accepted package/item/claim evaluation; missing, unknown, cross-package, or synthetic claims fail closed. This graph validates the port but does not manufacture, replay, or authenticate it.

`review-candidate-complete` remains a source-review state, not publication. The only caller-asserted authority builder is private to the unit test file and is not exported by production code. A future registry/source adapter must derive trusted authority from the accepted registry and source replay contracts; it must not convert this raw port into a trusted release.

Coverage projection always contains the exact nine Packet C areas in canonical order. It groups multiple gaps in one area without changing that shape, preserves candidates separately from gaps, and does not double-count computing source corroboration as civic/media coverage. This slice does not derive trusted `released`; caller-asserted exact matches expose only a non-blank authored proposed route and `routableRoute: null`, while a missing exact authored binding fails closed into the review-candidate list. Capability explanation returns authored prerequisite, alternative, access, source, World, policy, and caller-asserted binding facts only; it accepts no learner profile or evidence and makes no selection for a person. A future trusted adapter remains required before any route is routable.

## Focused adversarial map

| Cases | Focused test |
| --- | --- |
| 1–2 canonical permutations and same-ID payload mutation | `1. canonicalizes semantic sets...` |
| 3 policy mutation | `2. makes policy content-addressed...` |
| 4 duplicate identities and 15 raw forbidden fields | `3...` and `13...` |
| 5 missing/self/two-node/long/disconnected cycles and 6 alternative cycles | `4. finds missing...` |
| 7 exact World/validator/task/source/route/package/runtime binding | `5...` and `6...` |
| 8 candidate/gap non-routing, 11 gap preservation, 12 canonical nine areas | `7...` and `15...` |
| 9 unavailable release | `6...` |
| 10 reviewed entitlement grant | `14...` |
| 13 access coverage and 14 construct-changing evidence | `8...` and `16...` |
| 16 deterministic explanation | `9...` |
| 17 four retained caller-asserted matches with legacy source truth | `5...` |
| 18 Argument & Evidence candidate | `15...` |
| 19 correction/expiry/withdrawal invalidation | `11...` and `17...` |
| 20 non-claims | `12...` |
| 21 complete source review without publication | `10...` |
| 22 legacy metadata cannot publish anew | `12...` |
| 23 cloned object identities | `13...` |
| 24 multiple gaps in one area | `15...` |
| Additional reviewed age/depth grants | `14...` |
| Additional temporal evaluation floor and offset-equivalence | `17...` |
| Additional exact access/alternative source-claim binding | `18...` |
