# ModelShift Deployment Runbook

## Current state

As of the 2026-07-22 documentation snapshot:

- no Git remote is configured;
- no ModelShift Vercel project is linked in `.vercel/project.json`;
- no public production URL has been deployed or tested;
- no `OPENAI_API_KEY` is available locally; and
- the neutral missing-key journey is the only real route mode currently verified.

The optimized local production build and Playwright journey pass. That evidence targets `next start` on localhost and must not be described as a public Vercel smoke.

The local application may be built and deployed without an OpenAI key, but that deployment will use the authored neutral fallback. It must not be presented as a verified live GPT-5.6 deployment.

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
pnpm build
pnpm test:e2e
```

Record the output and candidate SHA:

```bash
git status --short
git rev-parse HEAD
```

The working tree should contain no unintended changes. Do not claim a live model pass from `pnpm eval`; the current runner is offline.

## Publish the source repository

Before creating anything, verify that the intended repository name is available and that no unrelated remote will be overwritten. A typical GitHub CLI path is:

```bash
gh auth status
gh repo view RanaPriyansh/modelshift
gh repo create RanaPriyansh/modelshift --public --source=. --remote=origin --push
```

If the repository already exists, inspect it and add the remote explicitly rather than recreating or force-pushing. Confirm that `LICENSE`, `README.md`, and the final commit are visible publicly.

## Create the Vercel project

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

## Release record to add

Before submission, replace this current-state section with verified values:

| Field | Required evidence |
| --- | --- |
| Public app URL | no-login incognito smoke |
| Immutable deployment URL | Vercel deployment record |
| Vercel project | project/team identifier |
| Public repository URL | unauthenticated repository view |
| Release SHA | same SHA in GitHub and deployment |
| Runtime model | successful `gpt-5.6-sol` smoke or explicit fallback-only status |
| Environment | server-only key confirmed without exposing its value |
| Production E2E | desktop/mobile/fallback/timeout/proof results |
| Deployment protection | confirmed off |
| Verification time | timestamp and timezone |
