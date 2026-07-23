# FORGE Current Public Release Record

**Canonical current-state locator:** this is the only normative current public-release record. Historical Wave 2–4 records remain evidence for their named source only.

## Recorded tuple

| Field | Recorded value | Verification boundary |
| --- | --- | --- |
| Candidate state | `DEPLOYMENT_BLOCKED` | Never `PRODUCTION_VERIFIED` or a readiness claim. |
| Deployed source | `35a1d2c5bd28c7b794b26414c6bdfe8f18097027` | Exact-source production deployment evidence. |
| Public alias | `https://modelshift.vercel.app` | Public target only; alias resolution is not a terminal decision. |
| Immutable deployment | `dpl_Er7rVecXt3iga56P4uPDoLnWt9V4` | `https://forge-learning-7a63ywsp5-ranapriyanshs-projects.vercel.app` (`READY`). |
| Provider-observed public asset digest | `aad49329533835e0ae319c56990f01afff52ebd35f98b130b44f2e56c1dcc3b1` | Vercel build-log terminal line for this exact deployment. |
| Manifest public asset digest | `b1f8d95f0d31ce1e365f56e1c189d0a4aea138ddff7491dd6d20accd956119c7` | Locally computed pre-build value; it is rejected as deployment proof. |
| Release-manifest binding | `LEGACY_SELF_REPORTED / REJECTED` | The earlier contract asserted a local digest before Vercel emitted its own output. |
| Rollback rehearsal | `NOT_EVALUATED` | No alias change or rehearsal was performed by this repair lane. |

This record is evidence about the named deployed source only. The commit that adds or changes this document is local review material; it is not deployed merely by existing in Git.

The no-promote repeat build of the same source emitted `83e1de1a3f73405f2cebd1cdd4c8120f374115c65350b3e386c5a5a912376b3c`, not the first deployment's `aad49329533835e0ae319c56990f01afff52ebd35f98b130b44f2e56c1dcc3b1`. This proves the pre-build `.next/static` value is deployment-specific/nonreproducible on Vercel; it is why the alias remains `DEPLOYMENT_BLOCKED` until a post-build provider receipt is collected and verified. This is not a terminal-release claim.

## What this candidate does and does not establish

The source contains four authored bounded Worlds and the fixture-only adult presentation route at `/paths/source-corroboration`. Engineering checks can establish only the exact software behavior they exercised.

It does **not** establish a minor operational release, verified guardian service, adult entitlement service, broad curriculum, homeschool operation/readiness, learning efficacy, retention, certification, durable evidence, live provider operation, manual assistive-technology coverage, or terminal production readiness.

## Required binding for a later candidate

`GET /api/health` now exposes one exact `release_manifest` only when all fields below agree. A local build may expose its normal build SHA and retained metadata, but `release_manifest` remains `unbound` with unknown provenance unless this complete candidate tuple is configured:

- `FORGE_RELEASE_CANDIDATE_STATE=DEPLOYED_CANDIDATE`
- exact `FORGE_RELEASE_SHA`, equal to the platform-owned `VERCEL_GIT_COMMIT_SHA`
- canonical UTC-millisecond `FORGE_BUILD_TIME`
- exact `FORGE_LOCKFILE_DIGEST`
- platform-owned `VERCEL_DEPLOYMENT_ID`, `VERCEL_URL`, and `VERCEL_PROJECT_ID` matching the checked-in FORGE project/immutable-host policy; `FORGE_RELEASE_DEPLOYMENT_ID` or `FORGE_RELEASE_IMMUTABLE_URL` cannot override them
- the checked-in public alias only; no caller-provided alias-resolution timestamp or alias override is accepted in the deployment artifact
- the fixed health declaration `public_asset: provider_receipt_required`; `FORGE_PUBLIC_ASSET_DIGEST` and its former absence-gate values are rejected, because Vercel has not emitted the deployment-specific static tree at manifest build time

Any malformed field, caller-supplied asset assertion, missing platform field, project/source-SHA drift, or caller alias receipt produces `unbound`. A remote `DEPLOYED_CANDIDATE` additionally requires a receipt collected in the same verifier run through the authenticated read-only Vercel API: exact deployment ID, project ID, source SHA, immutable URL, READY state, canonical provider build-log observation time, and the digest parsed from `Public build boundary verified across … public asset digest <sha256>.` The verifier compares that tuple with health and the checked-in target policy, then records its independently fetched `alias_verified_at`. A saved JSON receipt is external evidence only and is blocked, even if structurally valid; the collector/API path is authenticated transport evidence, not a cryptographic signature. Neither form proves every byte served at every remote edge.

The production binding path is a Vercel Git remote build/runtime with System Environment Variables exposed, because it needs the platform-owned deployment ID, URL, project ID, and commit SHA. A prebuilt deployment does not receive those system variables at build time unless it has separately configured custom identity; this repository does not treat caller `FORGE_*` identity as an equivalent fallback. The verifier produces the post-deploy `alias_verified_at` receipt only after fetching the alias; this local commit cannot manufacture that fact.

## Rollback rehearsal and decision procedure — not executed

This is a runnable decision checklist, not permission to change Vercel. It requires a separately authorized operator and never treats a documentation record as rollback evidence.

1. Freeze a signed/retained decision packet naming the current bound candidate, a prior READY rollback deployment ID, its immutable URL, exact source SHA, expected alias, and the independent approver. If any value is absent, stop as `NOT_EVALUATED`.
2. Run the read-only verifier against the current alias with its exact SHA, retained source digests, exact Vercel deployment ID, and a separately configured read-only Vercel receipt token. It must collect an authenticated provider receipt and pass the complete bound health-manifest, all ten canonical routes (four Worlds, `/paths/source-corroboration`, and shell routes), CSP, initial-asset secret scan, and candidate identity checks. The currently recorded candidate remains blocked under the retired pre-build digest contract.
3. Before any alias action, collect a read-only authenticated provider receipt for the proposed rollback deployment and compare its READY ID/URL/SHA/project tuple to the decision packet. The alias-only verifier cannot inspect a caller-provided immutable origin; after an authorized alias action, run it again against the checked-in alias. Do not continue on a human label, alias history, a saved receipt JSON, or a SHA-only health response.
4. The authorized operator records `proceed` or `hold`. `hold` is mandatory for any SHA, manifest, route, secret-scan, digest, readiness, or authority mismatch. This lane does not execute the provider alias action.
5. Only after a separately authorized provider alias change, re-run step 2 against the alias using the rollback tuple. Record the before/after alias resolution, verifier reports, decision time, and any failure. A failed post-change verifier requires the incident procedure; it never becomes `ROLLED_BACK` by assertion.

No automatic rollback, deploy, DNS change, Vercel mutation, or provider/model call is part of this procedure.
