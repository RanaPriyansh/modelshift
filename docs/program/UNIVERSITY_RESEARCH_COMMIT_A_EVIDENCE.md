# University research Commit A evidence binding

**Record class:** unsigned local engineering evidence

**Recorded:** 2026-07-31

**Protocol:** `university-observation-protocol.phase-minus-one` `1.0.0`

**Protocol document digest:**
`sha256:f28a6e4396b949cfdcb8a371e5c6f882f2dd828dc79934b8ba3da17732764bd1`

**Claim ceiling:** this record binds exact local source, build, compiler,
packet, automated-check, and connected-Chrome observations. It is not a
trusted build attestation, independent equivalence review, artifact approval,
participant authorization, deployment, production operation, student
validation, learning evidence, or efficacy evidence.

## Candidate disposition

The first candidate commit,
`526bf55ebfc0f477f50921728b5d171b1ce9ce17`, was rejected before evidence
binding. Its multiline CSS-module selector list was absent from the compiled
development stylesheet, so all seven scenario regions were visible at once.
No passing build receipt from that commit is accepted as Candidate A evidence.

Candidate A is:

| Field | Exact value |
| --- | --- |
| Source commit | `9fb4d22142deec7c29f1c15a59d0dcc4b7d118c1` |
| Source tree | `9b3fd9d1beb924aa4018201971559ddd18b017e0` |
| Route | `/internal/university-semester-loop` |
| Artifact version | `1.1.0` |
| Build ID | `forge-source-v1-9fb4d22142deec7c29f1c15a59d0dcc4b7d118c1` |
| Local build artifact digest | `sha256:630f87b86f507e7bafec2e8417fb909a833da81db696e8fe031a4ee01885ea0c` |
| Artifact files | `1404` |
| Public static assets scanned | `73` |
| Public asset digest | `sha256:3e9e04785d6247fdce6012fb48d47c26f3f1ac75869beac3f9aab1d421fff5ba` |
| Public directory digest | `sha256:e0096e369f47666ca5a3f962b71b6f5199a17117ac5ce4a598d1b77dc42abac9` |
| Runtime configuration digest | `sha256:0348d8eb5ea74ad2d84ea08c00fb6d48bcd99bf09d613d9f14330ea67061c1a6` |

The build receipt reported a clean source state and the
`fresh_ephemeral_next_cache_v1` cache policy. The local production health
response returned the same full build-source SHA, `runtime_mode:
fallback_only`, disabled providers, disabled cloud accounts, and an unbound
release manifest. No deployment was attempted.

## Compiler and shared-packet identities

| Artifact | Exact local identity |
| --- | --- |
| Candidate compiler | `university-research-candidate-compiler.v1` |
| Compiler descriptor | `sha256:1d017c4a913fc1a87d4ef502d0f143b6231b01cdaef6e984fc5d26b72534181c` |
| Pack P | `sha256:986aea9801ff837ddffb843ff4a046fe0cd832ea96d69ac7dcd4311687225e53` |
| Pack Q | `sha256:2eba40adc6327828a6afbf3c7c9822baae5037611902166e2d1f3a8111d97ab7` |
| Pack P surface packet | `sha256:8d4ee7b1f403a67ba656f5f2017d9553788a5c2aa5d58d6794681587d14b4d94` |
| Pack Q surface packet | `sha256:72c1e93bc752c68f94a3acb3cabfbcdc0616ea3b66e6b0394496150f7800b566` |
| Renderer binding | `sha256:921a230df8b244a75f576bf3adf7772902ac98943e04f913d16054783fe22fa4` |
| Neutral artifact | `sha256:dc4adaaeb3b16773f26f3c244373549802b389e2413639414aa179acce7f23ec` |
| Moderator packet | `sha256:44cd3c50ec4964b7959ddd499e2a9213c5a2182e810bcd2df584839bdbcef3df` |

Fresh compilation confirmed that the compiler and shared packet independently
recomputed the same Pack P and Pack Q identities. These are deterministic
local identities, not signatures or authenticity claims.

Commit B does not alter the v1 artifact-preflight projector or its output
contract. That projector therefore retains the legacy
`candidate_pack_adapter_not_implemented` open-gate label,
`manifest_only_not_rendered` baseline status, and manifest-only authority
ceiling. The evidence-bound descriptor can identify Candidate A's compiler and
packets, but the pure v1 projector does not consume or verify the local build
or browser ledger. Renaming that gate or upgrading projector authority would
be a projector change and requires a new candidate/version rather than this
binding commit.

## Verification bound to Candidate A

Automated checks:

- primary Vitest: 135 files and 1,235 tests passed;
- evaluator Vitest: 2 files and 13 tests passed;
- TypeScript, ESLint with zero warnings, and `git diff --check` passed;
- the clean optimized build passed;
- the public boundary scan found no forbidden fixture marker in 73 static
  assets.

Connected Chrome observations:

- Pack P and Pack Q each exposed all seven native radio choices at 320 by 900
  CSS pixels;
- every choice displayed exactly its matching scenario and projection status;
- controls measured at least 44 CSS pixels high;
- no horizontal overflow was observed;
- native Arrow Right moved checked state and focus together;
- the local primary control changed only the exact fragment and focused its
  `tabindex="-1"` effect boundary;
- the observed candidate had no non-zero animation or transition duration at
  the active browser preference;
- at the desktop observation viewport, the surface stayed at its 1,280 CSS
  pixel maximum, all seven controls stayed on one row, all seven facts were
  present, and no horizontal overflow was observed;
- the exact local production build rendered the unavailable boundary even
  with the Pack Q fixture token configured, with zero candidate articles,
  scenario regions, or radios and no candidate token in the returned HTML.

The only connected-Chrome error was hydration noise caused by the installed
Dark Reader extension injecting `data-darkreader-proxy-injected` before React
hydration. No application-generated browser error was observed.

## Evidence still missing

macOS Screen Recording permission was not available, so no new screenshot is
accepted for Candidate A. The earlier screenshots predate the exact repaired
commit and cannot be promoted to this record.

The following remain open:

1. same-viewport candidate/substitute screenshot comparison and human
   salience/difficulty review;
2. forced-colors and manual assistive-technology review;
3. independently attributed equivalence review bound to the exact envelope;
4. named artifact approval and a separately approved synthetic-persona
   rehearsal;
5. participant, data-management, incident, withdrawal, and operator authority;
6. live-data, identity, tenant, persistence, rights, provider, and operations
   boundaries;
7. pushed-source, provider-bound build, deployment verification, and rollback
   authority.

`UV1-GATE-001`, `UV1-GATE-002`, and `UV1-GATE-003` remain open. Commit B
records this evidence about Candidate A; Commit B is not itself the observed
artifact.
