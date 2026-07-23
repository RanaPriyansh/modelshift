# FORGE Current Public Release Record

**Canonical current-state locator:** this is the only normative current public-release record. Historical Wave 2–4 records remain evidence for their named source only.

## Recorded tuple

| Field | Recorded value | Verification boundary |
| --- | --- | --- |
| Candidate state | `DEPLOYMENT_BLOCKED` | The app is public and operational, but this CLI-source deployment has no provider-owned Git source/repository tuple. Never `PRODUCTION_VERIFIED` or a readiness claim. |
| Deployed source | `04eab4263658725d7a228c67682c40fc469757b1` | GitHub `main`, Vercel metadata, and public `/api/health` identified this exact SHA at deployment time. |
| Public alias | `https://modelshift.vercel.app` | Public target only; alias resolution is not a terminal decision. |
| Immutable deployment | `dpl_ET6nUWvjeVMEdacWJgCbxVsCT1qn` | `https://forge-learning-r5lgrxkg0-ranapriyanshs-projects.vercel.app` |
| Deployment creation | `2026-07-23T17:48:40.677Z` | Provider deployment metadata; public health exposes `build_time: unknown` and that absence is not filled by caller metadata. |
| Lock digest | `12f19d4483c15fec5463c7114ddb496b61bcd850f5822fbb49bd3d2d93f3323b` | Public health matches the checked-in dependency lock. |
| Content-manifest digest | `5f0124bd6ffc1365880279318cc8161e251eaa27da1181e29a928b9e5af74836` | Public health matches the checked-in content package manifest. |
| Evaluator-baseline digest | `9bb3f7e7cfd7a3dac351a06757f8b0b5f704024a39dc0f7fa4cd951e1c317b35` | Public health matches the checked-in evaluator baseline. |
| Database migration identity | `not_configured` | The public candidate has no configured database authority. |
| Manifest public-asset state | `provider_receipt_required` | Health does not predict or self-attest the provider-emitted asset tree. |
| Platform-emitted public-asset digest | `02aef5b03c6a2fa016e202b23d1541ad712a295b17e15805d093efa239d2790b` | Observed in the authenticated Vercel event stream for this exact deployment. |
| Provider source authority | `BLOCKED_CLI_SOURCE` | Vercel reports `source: cli`; authenticated deployment metadata has `gitSource: null` and `gitRepo: null`. Caller-settable Git metadata cannot replace those fields. |
| Release verification | `207 PASS / 8 FAIL` | The eight failures are the provider receipt schema/authority/tuple/time/asset checks and the dependent manifest/state bindings. All retained route, health, CSP, header, script, secret-scan, and source checks passed. |
| Rollback rehearsal | `NOT_EVALUATED` | No alias change or rehearsal was performed by this repair lane. |

This record is evidence about the named deployed source only. The commit that adds or changes this document is local review material; it is not deployed merely by existing in Git.

## What this candidate does and does not establish

The source contains four authored bounded Worlds, the fixture-only adult presentation route at `/paths/source-corroboration`, frontend route/accessibility repairs, and the fail-closed `/pilot` review shell. The pilot route is present but unavailable under the default production environment; its reviewed fixture markers were absent from all 42 public static assets. Engineering checks can establish only the exact software behavior they exercised.

It does **not** establish a minor operational release, verified guardian service, adult entitlement service, broad curriculum, homeschool operation/readiness, learning efficacy, retention, certification, durable evidence, live provider operation, manual assistive-technology coverage, or terminal production readiness.

## Current deployment-blocking finding

The corrected manifest now requires a post-build provider receipt and no longer predicts the deployment-specific `.next/static` tree. The remote build emitted the exact canonical marker and digest `02aef5b...`, but the authenticated deployment record says the source is `cli` and exposes no provider-owned `gitSource` or `gitRepo`. The verifier correctly refuses to derive repository, ref, or commit authority from caller-settable metadata.

Public verification therefore returned `DEPLOYMENT_BLOCKED` with 207 passes and eight failures: `provider_receipt.schema`, `provider_receipt.authority`, `provider_receipt.tuple`, `provider_receipt.build_time_order`, `provider_receipt.alias_time_order`, `provider_receipt.public_asset`, `health.release_manifest.binding`, and `release_identity.state_bound`.

The app remains public because the exact source health, same-origin routes, headers, CSP, initial scripts, secret scan, and browser checks passed. Public production Chromium passed 5/5 general checks plus 1/1 default pilot denial; runtime error/fatal logs for the exact deployment were empty at inspection time. That operational evidence must not be promoted into a provider-authenticated verified-release claim.

## Required binding for a later candidate

The current public deployment contains the corrected receipt contract but cannot satisfy it because it was uploaded through the CLI rather than built from a provider-connected Git source. A later candidate must preserve fail-closed source/platform checks and supply this complete tuple:

- `FORGE_RELEASE_CANDIDATE_STATE=DEPLOYED_CANDIDATE`
- platform-owned exact `VERCEL_GIT_COMMIT_SHA`; caller `FORGE_RELEASE_SHA` is ignored for a bound candidate
- `FORGE_BUILD_TIME`, if present, is diagnostic metadata only
- exact `FORGE_LOCKFILE_DIGEST`
- no claim that a locally precomputed `.next/static` digest is the platform-emitted digest
- platform-owned `VERCEL_DEPLOYMENT_ID`, `VERCEL_URL`, and `VERCEL_PROJECT_ID` matching the checked-in FORGE project/immutable-host policy; `FORGE_RELEASE_DEPLOYMENT_ID` or `FORGE_RELEASE_IMMUTABLE_URL` cannot override them
- the checked-in public alias only; no caller-provided alias-resolution timestamp or alias override is accepted in the deployment artifact
- a same-process authenticated provider receipt bound to the exact production deployment ID, project ID, provider Git source/repository identity, source SHA, immutable URL, provider creation/log timestamps, and platform-emitted public-asset digest

Any malformed field, missing platform field, project/source-SHA drift, caller alias receipt, preview target, CLI/local source, or receipt/deployment mismatch must remain blocked. The accepted verifier requires the manifest alias to match its checked-in target, the immutable URL and project ID to pass policy, the provider-owned GitHub repository ID/ref/SHA and repository fields to match, the production deployment creation/log/alias timestamps to be ordered, and the exact emitted digest marker to come from the authenticated provider event stream. Plain receipt JSON cannot recreate the process-local capability and cannot promote a candidate.

The production binding path remains a Vercel Git remote build/runtime with System Environment Variables exposed, because it needs the platform-owned deployment ID, URL, project ID, commit SHA, Git source, and repository record. The current deployment was initiated by the Vercel CLI and built remotely; its bound health manifest and exact SHA are necessary but insufficient because provider Git provenance is absent. This repository does not treat caller `FORGE_*` identity or deployment `meta` as an equivalent fallback. The verifier produces the post-deploy `alias_verified_at` receipt only after fetching the alias; a separate authenticated post-build provider observation must produce the asset receipt. Neither the deployment artifact nor this documentation can manufacture either fact.

The attempted Vercel Git connection and documented Git-source deployment API both failed while the public GitHub repository itself exposed the requested `main` SHA. The next operator action is to install or authorize the Vercel GitHub App for `RanaPriyansh/modelshift`, connect it to project `forge-learning-os`, and create one fresh production deployment from `main`. Repeating CLI uploads cannot close this gate.

## Rollback rehearsal and decision procedure — not executed

This is a runnable decision checklist, not permission to change Vercel. It requires a separately authorized operator and never treats a documentation record as rollback evidence.

1. Freeze a signed/retained decision packet naming the current bound candidate, a prior READY rollback deployment ID, its immutable URL, exact source SHA, expected alias, and the independent approver. If any value is absent, stop as `NOT_EVALUATED`.
2. Run the read-only verifier against the current alias with its exact SHA, retained source digests, exact production Vercel deployment ID, and a Vercel API token named through `--vercel-token-env`. The verifier creates the receipt capability in-process; saved receipt JSON cannot replace it. It must pass the complete bound health-manifest, all canonical routes, CSP, initial-asset secret scan, and candidate identity checks. The currently recorded CLI-source candidate cannot pass this Git-source gate.
3. Collect the proposed rollback deployment's provider metadata/receipt separately and compare its READY ID/URL/SHA/project tuple with the decision packet. The alias verifier remains pinned to the checked-in public target. Do not continue on a human label, alias history, saved receipt JSON, or SHA-only health.
4. The authorized operator records `proceed` or `hold`. `hold` is mandatory for any SHA, manifest, route, secret-scan, digest, readiness, or authority mismatch. This lane does not execute the provider alias action.
5. Only after a separately authorized provider alias change, re-run step 2 against the alias using the rollback tuple. Record the before/after alias resolution, verifier reports, decision time, and any failure. A failed post-change verifier requires the incident procedure; it never becomes `ROLLED_BACK` by assertion.

No automatic rollback, deploy, DNS change, Vercel mutation, or provider/model call is part of this procedure.
