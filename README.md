# FORGE Semester Desk

FORGE is a private, local-first Semester Desk for university students.

It helps a student rebuild a difficult week from today. It keeps course facts, real capacity, recovery choices, active study, and later return in one clear loop.

## Current product

The web release supports this end-to-end flow:

1. Add a semester, one course, one course detail, and one work item.
2. Add more courses and course facts.
3. Mark facts as checked, changed, not confirmed, or needing review.
4. Record and resolve conflicts without hiding them.
5. State the time that is actually available.
6. Keep, move, reduce, or defer work through a visible recovery review.
7. Choose one next action.
8. Complete practice and an independent check.
9. Set a return time and check understanding again later.
10. Review completed learning actions.
11. Download or remove the local Semester Desk.

The product does not connect to a university system. It does not provide an online account, cloud sync, cloud backup, automatic reminders, or a model provider.

## Data boundary

The current application stores one device-local Semester Desk in browser `localStorage`.

It can store:

- a random local profile identifier;
- semester and course details;
- course conflicts and review states;
- available capacity and recovery decisions;
- scheduled returns; and
- answer-free completion evidence.

It does not persist raw practice notes or independent answers. It does not send local data to a server. A second browser or the iOS application does not receive this data.

Use **Download local JSON** before browser data is cleared. Use **Reset this device** to remove the local desk.

## Release routes

The production build contains only these product routes:

| Route | Purpose |
| --- | --- |
| `/` | Public Semester Desk introduction |
| `/how-forge-works` | Product method and learning loop |
| `/university` | University-student product boundary |
| `/privacy` | Current browser-local data behavior |
| `/terms` | Draft product-use terms |
| `/support` | Self-service product help |
| `/app` | Device-local Semester Desk |
| `/api/health` | Release identity and configuration status |

The build also emits `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, Open Graph images, the icon, and required Next.js framework routes.

All other route source is excluded from the production artifact. The release route policy returns `404` for retired paths.

## Local development

Requirements:

- Node.js 22.13.0 or newer. The repository uses Node.js 22.22.3.
- pnpm 11.9.0.

Install and start the application:

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open `http://127.0.0.1:3000`.

No environment variable is required for local product use. The example file contains only metadata, indexing, and release-evidence settings.

## Verification

Run the repository gates:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm test:e2e` runs the canonical Semester Desk browser journey on desktop and mobile Chromium projects. The journey includes the `320` CSS-pixel stress case.

`pnpm eval` is a retained ModelShift interpretation regression. It does not validate Semester Desk behavior, learning quality, or efficacy.

Run release verification only from one clean, exact commit. A dirty checkout intentionally produces an unverified build identity.

After `pnpm build`, run the exact production browser artifact:

```bash
FORGE_EXPECTED_RELEASE_SHA=<full-40-character-clean-git-sha> pnpm test:e2e:prod
```

These checks prove software behavior for the tested source. They do not prove learning efficacy, legal approval, production authority, or successful deployment.

## Deployment status

The current Semester Desk candidate is not deployed. The existing public alias still serves the retired product.

Use [Deployment](docs/DEPLOYMENT.md) for the current Vercel path and external gates. Use the [Current Public Release Record](docs/operations/CURRENT_RELEASE.md) as the canonical deployed-state record.

Do not use a Vercel CLI upload for the release candidate. The release verifier requires a Vercel Git deployment with provider-owned repository and source metadata.

## Product and design contracts

- [Semester Desk v2 native contract](docs/product/FORGE_SEMESTER_DESK_V2_NATIVE_CONTRACT.md)
- [FORGE design system](docs/design/FORGE_DESIGN_SYSTEM.md)
- [Visual direction decision](docs/design/FORGE_VISUAL_DIRECTION_DECISION.md)
- [Release operations runbook](docs/operations/RELEASE_OPERATIONS_RUNBOOK.md)

## Legal status

The `/terms` page is a draft. It requires legal review before public launch.

The current `/support` page is self-service only. The product does not claim a monitored support channel.

## License

Repository-authored code and materials use the [MIT License](LICENSE).
