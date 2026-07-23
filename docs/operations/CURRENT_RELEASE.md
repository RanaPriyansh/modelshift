# FORGE Current Public Release Record

**Canonical current-state locator:** this is the only normative current public-release record. Historical Wave 2–4 records remain evidence for their named source only.

## Recorded tuple

| Field | Recorded value | Verification boundary |
| --- | --- | --- |
| Candidate state | `DEPLOYED_CANDIDATE` | Never `PRODUCTION_VERIFIED` or a readiness claim. |
| Deployed source | `cdc4bf5a2ceef7b4431832e5eb1e9e75f241d32c` | Public `/api/health` identified this exact SHA. |
| Public alias | `https://modelshift.vercel.app` | Public target only; alias resolution is not a terminal decision. |
| Immutable deployment | `dpl_EdtJDSaDS4bwN1anLUi2rqNqLi4E` | `https://forge-learning-aie8l0ycz-ranapriyanshs-projects.vercel.app` |
| Build time | `UNKNOWN` | The deployed health payload has no accepted canonical build time. |
| Lock, content, evaluator, and public-asset digests | `UNKNOWN` | No deployed digest binding was retained for this tuple. |
| Release-manifest binding | `UNBOUND` | The deployment predates the manifest/health contract in this repository. |
| Rollback rehearsal | `NOT_EVALUATED` | No alias change or rehearsal was performed by this repair lane. |

This record is evidence about the named deployed source only. The commit that adds or changes this document is local review material; it is not deployed merely by existing in Git.

## What this candidate does and does not establish

The source contains four authored bounded Worlds and the fixture-only adult presentation route at `/paths/source-corroboration`. Engineering checks can establish only the exact software behavior they exercised.

It does **not** establish a minor operational release, verified guardian service, adult entitlement service, broad curriculum, homeschool operation/readiness, learning efficacy, retention, certification, durable evidence, live provider operation, manual assistive-technology coverage, or terminal production readiness.

## Required binding for a later candidate

`GET /api/health` now exposes one exact `release_manifest` only when all fields below agree. A local build may expose its normal build SHA and retained metadata, but `release_manifest` remains `unbound` with unknown provenance unless this complete candidate tuple is configured:

- `FORGE_RELEASE_CANDIDATE_STATE=DEPLOYED_CANDIDATE`
- exact `FORGE_RELEASE_SHA`, equal to the platform-owned `VERCEL_GIT_COMMIT_SHA`
- canonical UTC-millisecond `FORGE_BUILD_TIME`
- exact `FORGE_LOCKFILE_DIGEST`
- `FORGE_PUBLIC_ASSET_DIGEST` from the emitted `.next/static` tree, matching a separately retained caller/verifier digest; the exact absence gate `FORGE_PUBLIC_ASSET_DIGEST_STATUS=absent_with_gate` and `FORGE_PUBLIC_ASSET_DIGEST_GATE=public_asset_digest_required_before_promotion` is permitted only to report a known blocker
- platform-owned `VERCEL_DEPLOYMENT_ID`, `VERCEL_URL`, and `VERCEL_PROJECT_ID` matching the checked-in FORGE project/immutable-host policy; `FORGE_RELEASE_DEPLOYMENT_ID` or `FORGE_RELEASE_IMMUTABLE_URL` cannot override them
- the checked-in public alias only; no caller-provided alias-resolution timestamp or alias override is accepted in the deployment artifact

Any malformed field, duplicate asset declaration, missing platform field, project/source-SHA drift, or caller alias receipt produces `unbound`; the read-only verifier blocks a remote `DEPLOYED_CANDIDATE` result unless the manifest alias exactly matches its target, the immutable URL and project ID pass the checked-in FORGE Vercel policy, the manifest build time is no later than the verifier's post-fetch alias receipt, and the recorded public-asset digest matches retained verifier input. That comparison binds the manifest's asserted build input to retained expectation; it is not byte-for-byte proof of every remotely served asset. A gated absent asset digest is blocked and never yields `DEPLOYED_CANDIDATE`.

The production binding path is a Vercel Git remote build/runtime with System Environment Variables exposed, because it needs the platform-owned deployment ID, URL, project ID, and commit SHA. A prebuilt deployment does not receive those system variables at build time unless it has separately configured custom identity; this repository does not treat caller `FORGE_*` identity as an equivalent fallback. The verifier produces the post-deploy `alias_verified_at` receipt only after fetching the alias; this local commit cannot manufacture that fact.

## Rollback rehearsal and decision procedure — not executed

This is a runnable decision checklist, not permission to change Vercel. It requires a separately authorized operator and never treats a documentation record as rollback evidence.

1. Freeze a signed/retained decision packet naming the current bound candidate, a prior READY rollback deployment ID, its immutable URL, exact source SHA, expected alias, and the independent approver. If any value is absent, stop as `NOT_EVALUATED`.
2. Run the read-only verifier against the current alias with its exact SHA, retained source digests, and independently retained public-asset digest. It must pass the complete bound health-manifest, all ten canonical routes (four Worlds, `/paths/source-corroboration`, and shell routes), CSP, initial-asset secret scan, and candidate identity checks. The currently recorded candidate cannot pass this new gate until it is replaced by a deployment that publishes the binding.
3. Run the same read-only verifier against the proposed rollback immutable URL with its own exact source/digests. Confirm the provider reports READY, the URL/ID/SHA match the decision packet, and its manifest is bound. Do not continue on a human label, alias history, or a SHA-only health response.
4. The authorized operator records `proceed` or `hold`. `hold` is mandatory for any SHA, manifest, route, secret-scan, digest, readiness, or authority mismatch. This lane does not execute the provider alias action.
5. Only after a separately authorized provider alias change, re-run step 2 against the alias using the rollback tuple. Record the before/after alias resolution, verifier reports, decision time, and any failure. A failed post-change verifier requires the incident procedure; it never becomes `ROLLED_BACK` by assertion.

No automatic rollback, deploy, DNS change, Vercel mutation, or provider/model call is part of this procedure.
