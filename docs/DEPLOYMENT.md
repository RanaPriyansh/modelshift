# ModelShift Deployment Runbook

## Current release

As of 2026-07-22 01:49 IST, the fallback-only release is public and the source repository is public.

| Field | Verified value |
| --- | --- |
| Public app | [https://modelshift.vercel.app](https://modelshift.vercel.app) |
| Immutable deployment | [https://modelshift-pc1226bk4-ranapriyanshs-projects.vercel.app](https://modelshift-pc1226bk4-ranapriyanshs-projects.vercel.app) |
| Vercel deployment | `dpl_5VP3qbCwVokeCJjRpwp5ywwdumTp` |
| Vercel project | `modelshift` / `prj_SnTYtzLicYKYlHvXCNwq9J7ehQZB` |
| Vercel team | `ranapriyanshs-projects` / `team_lr0E9GlEDc3XYJP7xrx8po2W` |
| Public source | [https://github.com/RanaPriyansh/modelshift](https://github.com/RanaPriyansh/modelshift) |
| Application runtime commit | `8bd952d` (later evaluator/documentation commits do not change the deployed app runtime) |
| Runtime mode | missing-key authored fallback; live GPT not run or claimed |
| Production E2E | 6 passed, 4 intentional duplicate-project skips, 0 failed |
| Deployment protection | off; canonical URL returns the app without login |

The project was deployed through authenticated Vercel connector authority. The local folder is intentionally not linked through `.vercel/project.json`; that absence does not describe the remote project state.

No `OPENAI_API_KEY` was available locally or configured for this release. The public deployment therefore uses the authored neutral fallback and must not be presented as a verified live GPT-5.6 deployment.

## Release prerequisites

- Node.js 22 or newer;
- pnpm 11.9.0 or compatible;
- a public GitHub repository or another Vercel-accessible source;
- authenticated Vercel project authority;
- an eligible OpenAI API project and server-side key for live interpretation;
- a configured spending limit in the OpenAI project; and
- one frozen release commit with passing local validation.

## Environment variables

| Name | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Required for live interpretation; optional for fallback-only operation | Server only | OpenAI Responses API authentication |
| `OPENAI_MODEL` | Optional | Server only | Defaults to `gpt-5.6-sol` |
| `OPENAI_INTERPRETATION_DISABLED` | Optional | Server only | Set to `true` to force authored neutral fallback |
| `PLAYWRIGHT_BASE_URL` | Required only when running production E2E locally/CI | Test process | Targets the deployed origin |

Never create `NEXT_PUBLIC_OPENAI_API_KEY` or any other client-exposed copy of the key. Use `OPENAI_INTERPRETATION_DISABLED` for the authored-fallback switch shown in `.env.example`.

Vercel environment changes apply to new deployments, so redeploy after adding or changing variables.

## Local release gate

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm eval
pnpm eval:live  # credentialed gate; exits 2 before network when the key is absent
pnpm build
pnpm test:e2e
```

Record the output and candidate SHA:

```bash
git status --short
git rev-parse HEAD
```

The working tree should contain no unintended changes. Do not claim a live model pass from `pnpm eval`; that runner is offline. Only a successful, credentialed `pnpm eval:live` result can close the model-behavior gate.

## Publishing the source repository

The public repository was created without overwriting an existing remote. The reproducible GitHub CLI path is:

```bash
gh auth status
gh repo view RanaPriyansh/modelshift
gh repo create RanaPriyansh/modelshift --public --source=. --remote=origin --push
```

If the repository already exists, inspect it and add the remote explicitly rather than recreating or force-pushing. Confirm that `LICENSE`, `README.md`, and the final commit are visible publicly.

## Creating or updating the Vercel project

Use either the authenticated Vercel connector or the Vercel CLI. For the CLI path:

```bash
npx --no-install vercel link
npx --no-install vercel env add OPENAI_API_KEY production
npx --no-install vercel env add OPENAI_MODEL production
npx --no-install vercel --prod
```

Select the ModelShift project and the repository root. Next.js should be detected without a custom build command. Do not add deployment protection or a login requirement for the judging URL.

If live credentials are unavailable, deploy the deterministic product only if the release notes and UI continue to identify fallback honestly. A public fallback deployment does not close the live GPT release gate.

## Production verification

After deployment, record the immutable deployment URL, preferred public production URL, Vercel project, GitHub repository, and deployed SHA. Then verify in an incognito context:

1. the landing mystery loads without authentication or deployment protection;
2. no horizontal overflow or console error appears at 1440×900 and 390×844;
3. the complete missing-key or forced-fallback journey reaches the evidence card;
4. a live credentialed explanation returns `source: "model"` for at least one validated case;
5. a forced timeout reaches the same neutral journey;
6. proof mode contains no AI, hint, or replay controls;
7. a transfer answer submits once;
8. no client script or network response exposes the API key; and
9. the footer and result retain the nonclaims and `Later: not tested yet` language.

Run the production browser suite against the real origin:

```bash
PLAYWRIGHT_BASE_URL=https://your-production-domain pnpm test:e2e:prod
```

Test from a second network or device where available. Preserve screenshots and command output for the submission package.

## Live-model smoke input

Use a natural explanation that the authored corpus covers:

```text
It slows because the engine is no longer pushing it.
```

The expected safe behavior is either:

- a validated model result with verbatim evidence and a compatible authored probe; or
- a clearly labeled neutral fallback.

Do not require one particular stochastic output, and do not record a fallback as if it were live personalization.

## Rollback

If production breaks, promote the last known-good immutable Vercel deployment rather than rewriting history. If the OpenAI path is unstable, set `OPENAI_INTERPRETATION_DISABLED=true`, redeploy, and label the fallback state honestly while the live-model issue is repaired. Never remove the proof lock, deterministic checking, or fallback journey to preserve a demo.

## Remaining release gates

- Add a server-only eligible `OPENAI_API_KEY`, redeploy, and run `pnpm eval:live` plus one real-model browser smoke before claiming live adaptation.
- Record and publish the under-three-minute YouTube demo.
- Invoke `/feedback` from the principal Codex task and record the returned session ID.
- Complete the account-owned Devpost submission before the official deadline.
