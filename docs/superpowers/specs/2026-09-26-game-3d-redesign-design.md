# Colyglot Game/3D Redesign — Design Spec

**Date:** 2026-09-26
**Status:** Draft, pending user review
**Supersedes/extends:** `DESIGN.md` (this spec does not replace DESIGN.md — it extends its Paper & Ink system into a 3D game shell; DESIGN.md's tokens, typography, and DOM component rules remain the source of truth for anything not called out here)

## Intent

Current UI (Paper & Ink) reads as calm, content-first, minimal — correct for a productivity tool, but the user wants Colyglot to feel like _playing a game_ while learning, not filling out flashcard admin. Goal: turn the app into a persistent 3D world (Duolingo-style path/map of decks) built from real WebGL (`react-three-fiber`), while keeping the underlying learning mechanics (SRS grading, deck/card CRUD) and the existing Paper & Ink palette/typography as the literal source material for that world — a "papercraft" extension of the current aesthetic, not a replacement of it.

**Scope: full shell.** Every route gets a 3D presence (either a full interactive scene or an ambient backdrop) — no route is untouched, no separate "legacy" visual mode.

**Out of scope (explicitly ruled out during brainstorming):**

- No RPG companion/mascot/pet system — genre is map/path, not collectible-creature.
- No hearts/lives gating mechanic — sessions aren't blocked by a lives system.
- No new color palette — the 3D world's materials derive from the existing CSS custom properties, not a new game palette.
- No 3D-modeling asset pipeline — all geometry is procedural (primitives), no external art budget assumed.

## Architecture

**Persistent global Canvas.** One `<Canvas>` (react-three-fiber) mounts once in `app/layout.tsx` as a fixed full-viewport layer behind all DOM content. It is never unmounted between route navigations — this is the deliberate, highest-risk/highest-payoff choice from the three architectures considered (per-route Canvas and DOM-island alternatives were rejected for weaker world continuity).

- **SceneRegistry** (Zustand store): maps the active route to a scene descriptor (`dashboard-map`, `study-card`, `completion-burst`, `ambient-backdrop`, etc.). Route change swaps _content_ inside the persistent Canvas — camera target, visible object group, lighting rig — without tearing down the WebGL renderer/context.
- Each page component registers its 3D content declaratively: `<Scene id="dashboard-map">…</Scene>`, portaled into the Canvas via `createPortal`, so page components stay readable without importing Three.js internals directly (per web3d-integration-patterns Pattern 2: React-first, declarative, one state store — chosen over the imperative Three.js+GSAP pattern and over a physics-driven pattern, since this app has no drag/physics interactions).
- `frameloop="demand"` — the Canvas only re-renders on interaction or state change, not every frame, per the performance guidance in web3d-integration-patterns.

**Fallback path (required, not optional).** A capability check (WebGL support, `prefers-reduced-motion`, a coarse low-end heuristic) swaps the entire Canvas for a static illustrated PNG/SVG backdrop per scene; the DOM layer on top is unchanged either way. `onContextLost` / `onContextRestored` (WebGL context loss, a real risk for a long-lived single context) trigger the same fallback rather than a blank canvas.

## Screens

| Screen                                                   | Route                  | Canvas treatment                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard                                                | `/`                    | **Full 3D scene** — world map: path/road across papercraft terrain, decks as island/level nodes (locked/unlocked/mastered states), streak as a lit beacon/campfire landmark. XP bar + streak count stay DOM HUD, pinned under header (same slot the streak indicator uses today). Tap node → camera pan (≤600ms ease-out, not a forced flythrough) → route push to Deck Detail. |
| Onboarding                                               | `/onboarding`          | **Full 3D scene**, first-run only — brief "world reveal" (fog lifting / path drawing in), then settles into the real Dashboard scene.                                                                                                                                                                                                                                           |
| Study                                                    | `/decks/[id]/study`    | **Full 3D scene**, flagship moment — card is a real 3D mesh (papercraft card), flips in 3D space (replaces CSS `rotate-y-180`). Grade triggers a particle response: success sparkle/confetti, "Again" a paper-crumple shake. Progress bar/counter stay DOM HUD, same position as today.                                                                                         |
| Completion                                               | `/decks/[id]/complete` | **Full 3D scene** — celebration burst, star/medal object flies into the XP bar, streak flame `pop-in` in 3D. Stats text + primary/secondary buttons stay DOM overlay, same copy rules as DESIGN.md Voice & Content.                                                                                                                                                             |
| Deck Detail                                              | `/decks/[id]`          | **Ambient backdrop** — card list/add/edit/bulk-import stays the existing `Cell`/sheet DOM pattern unchanged (data management, not a game moment); backdrop is a static, non-interactive zoomed view of that deck's island. Pinned **Study now** CTA restyled as a "Play" button, same position/behavior.                                                                        |
| Tags, Me, Settings, Subscription, Deck Export, Not Found | various                | **Ambient backdrop** — plain DOM list/detail UI (`Cell`, `CellGroup`, forms) unchanged structurally; Canvas behind renders a dimmed/blurred ambient world so navigation never feels like a jarring cut to a different app. No interactive 3D, no mascot.                                                                                                                        |
| Auth                                                     | `/sign-in`             | **Ambient backdrop** — today's ghost 學-watermark idea reimagined as a subtle floating-hanzi/paper-parallax scene behind the sign-in card. Low motion, first-impression polish, not a game beat.                                                                                                                                                                                |

**XP/level surfacing:** XP bar lives in the Dashboard HUD (replaces today's plain streak line). Per-deck level/star-tier badge shows on that deck's map node _and_ on the Deck Detail header — one badge component, two placements.

## Visual identity

- **Palette:** no new colors. A JS token map mirrors the existing CSS custom properties 1:1 — `--bg` → terrain base, `--accent` → beacon flame / streak fire, `--primary` → unlocked-path glow, `--success`/`--danger`/`--warning` → grade particle colors, `--surface`/`--line` → node/card materials. Dark mode swaps the whole map to a night palette the same way `[data-theme="dark"]` already swaps DOM tokens.
- **Geometry:** procedural low-poly (extruded shapes, boxes, cones from Three/drei primitives) with flat-shaded `MeshStandardMaterial` and a thin outline — no external 3D assets, no modeling pipeline.
- **Typography in 3D:** hanzi/text labels render via drei's `<Html>` (real DOM text billboarded over the 3D node), not 3D text geometry — preserves `font-hanzi`, screen-reader access, and avoids a font-to-3D-geometry pipeline.

## Data model

New table `deckProgress`: `deck_id, user_id, xp, level, updated_at` (ownership verified through `deck_id` → `decks.user_id`, same pattern as every other repository per AGENTS.md's hard constraint). Upserted inside the existing grading server action, at the same point it already writes `reviewLogs` — an added write, not a new user-facing flow. `level = floor(xp / 100) + 1` (placeholder curve, tunable). Completion-screen stars/medal are computed from session accuracy at render time, not persisted.

## Motion rules (extends DESIGN.md's Motion section)

- Camera pans: ≤600ms ease-out (longer than the existing 300ms UI cap — camera travel reads differently from a sheet/dialog).
- Particle bursts: ≤800ms then settle.
- Card flip: keeps the existing ~350ms budget, now driven by mesh rotation instead of CSS `rotate-y-180`.
- `prefers-reduced-motion` collapses all of the above globally — same global switch DESIGN.md already defines, no new opt-out mechanism.

## Performance & accessibility

- `frameloop="demand"` on the Canvas — render only on interaction/state change.
- Capability + reduced-motion + low-end heuristic gate: real WebGL scene vs static illustrated fallback, decided once per session and re-checked on `onContextLost`.
- Cleanup: scene swap disposes unused geometries/materials on route change (per web3d-integration-patterns' memory-leak pitfall) — nothing accumulates across a session's navigation.

## Testing

- Unit tests: SceneRegistry swap logic and XP/level math as pure functions (same style as `packages/srs`).
- E2E (Playwright): existing specs keep testing DOM behavior/copy/state; gated behind a capability flag so CI doesn't require real WebGL.
- Visual/render correctness: manual QA only, not automated — no visual-regression tooling in scope.

## Tech stack additions

`three`, `@react-three/fiber`, `@react-three/drei`, `zustand`. No GSAP, no Framer Motion, no physics engine (Cannon) — deliberately excluded: DOM motion stays the existing CSS keyframe system, camera/intro sequences use a `useFrame` lerp instead of a timeline library, and there are no drag/physics interactions in this design. Per AGENTS.md, these are genuinely new shared needs (3D rendering, cross-page 3D state) — not speculative.

## Risks (accepted, not deferred)

- **Persistent-Canvas-across-navigation is the unproven part of this design.** Next.js App Router navigation + a WebGL context that must survive it is the single biggest technical risk in this spec — mitigated by the fallback path and `onContextLost` handling, but not eliminated. This was a deliberate choice (highest immersion) over the safer per-route-Canvas alternative.
- **Bundle weight / low-end mobile performance** for a mobile-first app taking on real WebGL — mitigated by `frameloop="demand"`, procedural (not asset-heavy) geometry, and the capability-gated fallback, but first real device testing may surface surprises.
