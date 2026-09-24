# Rendering Standard: The Donut Pattern (Cache Components)

Reference: [Next.js 16 Cache Components / donut pattern](https://www.buildmvpfast.com/blog/nextjs-16-caching-cache-components-donut-pattern-2026), [Next.js `cacheComponents` docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents).

## Problem

Two related failure modes:

1. **SSR/client mismatch** — a value computed on the server (from headers, cookies, or non-deterministic logic) is rendered into HTML, then recomputed differently on the client during hydration. React throws a hydration mismatch, or silently reconciles and repaints, causing flicker.
2. **Browser extension DOM interference** — extensions (password managers, grammar checkers, dark-mode injectors, ad blockers) mutate the DOM _before_ React hydrates. If the whole page hydrates as one tree, that mutation can trigger a mismatch warning anywhere, and the tempting fix is to blanket-suppress it with `suppressHydrationWarning` on `<html>`/`<body>` — which also hides _real_ mismatches.

Both problems share a root cause: **too much of the page is one hydration unit.** The donut pattern fixes this by structurally separating what's static from what's dynamic, instead of suppressing the symptom.

## What this looks like in colyglot

- **Theme choice** (`next-themes`) is a classic divergence: the persisted theme is only known on the client. The theme class applies on an isolated leaf with a scoped `suppressHydrationWarning` — never blanket on `<html>`/`<body>` (Rule 5).
- **Dashboard due badges / streak** read Postgres through the repositories — request-time data that belongs in its own `<Suspense>` hole with a dimension-matched skeleton, while the page chrome around it stays static.
- **Study session** (swipe deck, TTS playback, mic recording) is a client-only interactive island: pointer events, `speechSynthesis`, and `MediaRecorder` have no meaningful SSR. It gets its own `next/dynamic(..., { ssr: false })` or `<Suspense>` leaf so none of that leaks into the shell.

## The pattern

- **Dough (static shell)** — layout chrome, navigation, headings, empty-state copy. Prerendered once, cached, served instantly. It never depends on `headers()`, `cookies()`, `Date.now()`, `Math.random()`, or client-only APIs.
- **Hole (dynamic island)** — anything that legitimately depends on the request or the client: database-backed lists and counts, the theme toggle, the swipe-deck session, recorder/TTS controls, third-party scripts. Each hole is wrapped in its own `<Suspense>` boundary (or `next/dynamic` with `ssr: false`) so it streams and hydrates independently, and a hydration mismatch inside one hole can't cascade to the rest of the page.

## Rules

1. Enable `cacheComponents: true` in `apps/web/next.config.ts` (Node runtime only — no `edge` route segments). This is turned on with Story 1.1; the remaining rules apply regardless of the flag. With it on, Next prerenders the static shell and streams holes in around it.
2. Data that can be cached (reference content, seeded deck/card reads that don't depend on the user) should be fetched through functions wrapped with the `"use cache"` directive and tagged with `cacheTag`/`cacheLife` — not refetched per request. Per-user scheduling state (due queues, schedules, logs) is not cacheable; it renders inside its `<Suspense>` hole.
3. Anything reading `headers()`/`cookies()`, or otherwise non-deterministic, must not be threaded as a prop into components that also render statically. Either:
   - move the decision to the client (e.g. `matchMedia` / `useEffect` instead of server UA sniffing), or
   - isolate it behind its own `<Suspense>` boundary so only that island is dynamic.
4. Client-only/interactive islands (the swipe deck, recorder, TTS speaker, theme toggle) each get their own `next/dynamic(..., { ssr: false })` or `<Suspense>` leaf, with a fallback that matches the shell's dimensions.
5. `suppressHydrationWarning` is scoped to the specific leaf that legitimately diverges (e.g. a theme-dependent attribute), never applied blanket to `<html>`/`<body>`. If the root layout seems to need it, that's a signal something dynamic is leaking into the static shell — fix the leak, don't widen the suppression.
6. `Suspense` `fallback` must match the static shell's layout dimensions (skeleton, not spinner-that-shifts-layout) to avoid CLS during the swap.
7. When adding a new page or component, state which tier it belongs to — static shell, cached, or dynamic hole — in the PR description if it's not obvious from the code.

## New component checklist

Run through this before writing a new page or component, or extending an existing one. These are hard build errors once `cacheComponents` is on, not lint warnings — checking up front is cheaper than a build-breaking cascade later.

1. **Pick the tier first.** Static shell, cached, or dynamic hole (see Rule #7)? Decide before writing the component, not after the build fails.
2. **New `[param]` route segment?** It needs `generateStaticParams`, full stop. Without it the segment becomes fully per-request dynamic, and _any_ client hook reading routing context anywhere in the shared layout (`usePathname`, `useSelectedLayoutSegment`, etc.) gets dragged into "uncached data accessed outside `<Suspense>`" build errors — the whole layout tree pays for one missing export. This will apply to `app/decks/[id]/` and friends.
3. **Caching a data function?** Wrap it in `"use cache"` (file-level, literal first line — before all imports, or the build rejects it) and call `cacheLife("hours")` as the first statement.
4. **No non-deterministic values in the initial render** — `new Date()`, `Math.random()`, `headers()`, `cookies()` — in _either_ Server or Client Components. This isn't just a server-side rule: a Client Component calling `new Date()` during render without a `<Suspense>` boundary above it fails the build too. If you need "now," compute it in an effect/event handler or thread it in as a parameter — which is why the SRS engine and streak derivation take `now` explicitly (see the Coding Standard's "Deterministic Time").
5. **Route segment config is incompatible with `cacheComponents`.** Don't add `export const dynamic`, `revalidate`, or `runtime` to new pages/routes — express caching via `"use cache"` + `cacheTag`/`cacheLife` on the data functions instead.
6. **Client-only/interactive island?** Give it its own `next/dynamic(..., { ssr: false })` or `<Suspense>` leaf per Rule #4, with a fallback matching the shell's dimensions (Rule #6).
7. Run `bun run build` (Turbopack + Cache Components) before opening a PR.
