# AGENTS.md

## Project Overview

Colyglot is a vibrant language-learning adventure—an app where playful practice and creative challenges make mastering new tongues both fun and memorable. Whether you're tackling tricky vocabulary, unlocking levels, or connecting with fellow learners, Colyglot turns every lesson into a joyful, interactive experience designed to spark curiosity and sustain your learning journey.

## Tech Stack

- **Runtime/package manager**: Bun
- **Monorepo**: Turborepo (`apps/*`, `packages/*` workspaces)
- **Framework**: Next.js 16 (App Router, Turbopack), React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase Postgres, accessed via Drizzle ORM — schema in `apps/web/lib/db/schema.ts`, migrations in `apps/web/drizzle/`
- **Lint**: ESLint (flat config via `@colyglot/eslint-config`)

## Repo Structure

```
apps/web/                # Next.js app (package name: "web")
  components/            # farm game UI (components/farm) + UI primitives (components/ui)
  e2e/                   # Playwright E2E specs (bun run test:e2e in apps/web)
  lib/actions/           # server actions (typed ActionResult contracts)
  lib/db/                # Drizzle schema + server-only repositories
  lib/db/repositories/   # the only sanctioned data-access surface
  lib/queries/           # server-only page/view data loaders
  lib/storage/           # take storage adapter (Supabase Storage, private takes bucket — server-only)
  lib/game/              # client-safe farm content registry, core economy, art, store
  drizzle/               # committed SQL migrations
packages/srs/            # @colyglot/srs — pure SM-2 engine + queue priority (canonical shared constants)
packages/eslint-config/  # @colyglot/eslint-config — shared lint rules (base + next)
packages/typescript-config/ # @colyglot/typescript-config — shared tsconfigs (base + web + bun)
docs/                    # engineering standards + story board
turbo.json               # task pipeline + package boundary rules (turbo boundaries)
```

## Common Development Commands

```bash
bun install               # install all workspace dependencies

bun run dev               # turbo run dev    — start Next.js dev server (Turbopack)
bun run build             # turbo run build  — production build
bun run lint              # turbo run lint   — eslint across workspaces
bun run typecheck         # turbo run typecheck — tsc --noEmit across workspaces
bun run test              # turbo run test   — bun test (unit + DB integration)
bun run start             # turbo run start  — serve production build
bun run boundaries        # turbo boundaries — enforce package dependency direction
```

Database scripts (run from `apps/web`, require `DATABASE_URL` in `.env`):

```bash
bun run db:generate       # generate a migration from schema.ts changes
bun run db:migrate        # apply migrations to Supabase
bun run db:studio         # open Drizzle Studio
```

## Conventions

- Import alias: `@/*` maps to `apps/web/*`
- Dependency direction (enforced by `bun run boundaries`): `apps → packages` only; pure packages never import app code; when `@colyglot/core` exists it may depend only on `@colyglot/srs`
- Client-safe layers (`lib/game`) never import from `lib/db` — the direction is always server → pure
- Shared constants (`ReviewGrade`, `DEFAULT_EASE_FACTOR`) are canonical in `@colyglot/srs` — never redeclare them locally
- Shared tool versions (`typescript`, `eslint`, `@types/bun`) are pinned once in the root `catalog` — reference with `"catalog:"`, never hardcode versions per workspace
- New shared code goes in `packages/*` once more than one app/package needs it — don't create packages speculatively
- `test` and `test:e2e` both run against the shared dev database (integration tests truncate tables; E2E resets its user) — `test:e2e` therefore `dependsOn: ["test"]`; any new DB-touching task must join this serialization in `turbo.json`
- CI runs `bun run ci` on every PR and push to main (`.github/workflows/ci.yml`) using dev-database secrets; prod migrations run via `bun run db:migrate` (`.github/workflows/migrate-prod.yml`, manual trigger, `PROD_DATABASE_URL` secret)
- Keep `turbo.json` task `outputs`/`cache` settings in sync when adding build-producing scripts to a package

### Validation Hierarchy

When developing features, always ensure:

- **Level 1: Unit tests** — Must pass
- **Level 2: Integration tests** — Must pass (if applicable)
- **Level 3: End-to-end tests** — Must pass for multi-component changes
- Skipping levels = **Not Complete**

## RTK Usage (logs & test tracking)

```bash
rtk log --tail 50              # print logs for a session
rtk run -- bun run test        # run and track tests
```

## Hard Constraints

- NEVER skip verification (lint + typecheck + test) before declaring work done.
- NEVER mark work complete with failing checks.
- NEVER modify generated files (`.next/`, `next-env.d.ts`).
- The schema lives in exactly one file (`apps/web/lib/db/schema.ts`) — no duplicate model definitions anywhere.
- Ask before destructive operations (force-push, deleting content, resetting env files).

## Code Indexing & Editing with Serena

Serena indexes the codebase for fast symbol lookup and precise edits:

- **Find symbols**: `find_symbol()` locates classes, functions, types by name or pattern
- **Symbol overview**: `get_symbols_overview()` lists all symbols in a file
- **Find implementations**: `find_implementations()` traces where symbols are used
- **Track edits**: `write_memory()` documents structural changes for future context
- **Get diagnostics**: `get_diagnostics_for_file()` identifies type errors, unused code

## Doc Index

The only place that links to `docs/*`.

| Document           | Path                                     | Scope           |
| ------------------ | ---------------------------------------- | --------------- |
| Design Spec        | [DESIGN.md](DESIGN.md)                   | UI, flow, UX    |
| Coding Standard    | [docs/engineering/CODING-STANDARD.md]    | Code rules      |
| Rendering Standard | [docs/engineering/RENDERING-STANDARD.md] | Rendering rules |
