# AGENTS.md

## Project Overview

Colyglot is a language-learning tool: translate words/phrases while reading and learn them via flashcards with spaced repetition.

## Tech Stack

- **Runtime/package manager**: Bun
- **Monorepo**: Turborepo (`apps/*`, `packages/*` workspaces)
- **Framework**: Next.js 16 (App Router, Turbopack), React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Lint**: ESLint (flat config, `eslint-config-next`)

## Repo Structure

```
apps/web/       # Next.js app (package name: "web")
packages/       # shared packages (none yet)
turbo.json       # task pipeline (build, dev, lint, start)
```

## Common Development Commands

```bash
bun install              # install all workspace dependencies

bun run dev               # turbo run dev   — start Next.js dev server (Turbopack)
bun run build             # turbo run build — production build
bun run lint               # turbo run lint  — eslint across workspaces
bun run start               # turbo run start — serve production build
```

## Conventions

- Import alias: `@/*` maps to `apps/web/*`
- New shared code goes in `packages/*` once more than one app/package needs it — don't create packages speculatively
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
- Preserve the config-driven, Markdown-based, no-database architecture unless asked otherwise.
- Ask before destructive operations (force-push, deleting content, resetting env files).

## Doc Index

The only place that links to `docs/*`. Individual docs are self-contained (no cross-links).

| Document           | Path                                                                             | Scope                                                                                              |
| ------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Coding Standard    | [docs/engineering/CODING-STANDARD.md](docs/engineering/CODING-STANDARD.md)       | Conventions, comments, constants/enums, logging                                                    |
| Rendering Standard | [docs/engineering/RENDERING-STANDARD.md](docs/engineering/RENDERING-STANDARD.md) | Donut pattern, SSR/hydration, browser-extension isolation                                          |
| Story Board        | [docs/stories/index.html](docs/stories/index.html)                               | Visual foundation spec: epics, stories, tasks, UX flows, wireframes (static HTML, open in browser) |
