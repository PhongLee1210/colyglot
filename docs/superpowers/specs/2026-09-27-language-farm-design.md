# Language Farm — Design Spec

Date: 2026-09-27
Status: Approved (section-by-section review in session)
Supersedes: the UI layer described in `docs/superpowers/specs/2026-09-26-game-3d-redesign-design.md` (the 3D island is retired; the SRS data layer it rode on is kept).

## 1. Summary

Colyglot's web app becomes a **farm-game platform** in the spirit of
`time.aigame3d.com` ("Xuyên Không"): a title screen where the player chooses a
**language world**, and a 2D farm where **spaced repetition is the growth
clock**. The player plants words as crops, harvests them by reviewing (SM-2),
earns gold, and advances the farm's visual tier as their vocabulary matures.

Decisions locked with the product owner:

| Decision   | Choice                                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| Stack      | Keep Next.js 16 + React 19 + Drizzle/Supabase + `@colyglot/srs`; adopt Xuyên Không's _concepts_, not its vanilla-JS stack  |
| Visuals    | 2D procedural SVG farm (mobile-first); R3F/Three island retired                                                            |
| Simulation | SRS-driven: `card_schedules.dueAt` IS the crop timer; grades are yield quality; nursery handles first exposure             |
| Content    | Curated seed packs (HSK/CEFR-ordered) + player-created words; launch languages: `zh→vi`, `en→vi`                           |
| Authority  | **Server-authoritative economy** (normalized tables + typed server actions); optimistic UI for click-feel; no offline play |

## 2. Concept mapping (the heart)

| Farm concept     | Colyglot truth                                                                          |
| ---------------- | --------------------------------------------------------------------------------------- |
| Language world   | One farm per `(user, langKey)` e.g. `zh-vi`                                             |
| Bed              | A `decks` row (legacy decks import as beds automatically)                               |
| Plot / crop      | `farm_plots` slot holding a `cards` row                                                 |
| Growth clock     | `card_schedules.dueAt` — SM-2 decides regrow time; crops are perennial (never consumed) |
| Ready to harvest | `isDue()` — due queue scoped to the world's language pair                               |
| Harvest          | Re-skinned study session over existing `gradeCardAction` (SRS path untouched)           |
| Yield quality    | Grade: FORGOT = pest eats most + crop resets (lapse); PERFECT = bonus                   |
| Yield size       | `baseGold` scales with pre-review interval — mature memories pay more                   |
| Pests / urgency  | `overdueRatio() >= 1` from `@colyglot/srs`                                              |
| Nursery          | New-word intro flow; the first grade IS the first SM-2 review                           |
| Seeds            | Curated packs in a content registry + custom words (Phase 2 polish)                     |
| Gold sinks       | Bed expansion (Phase 1); research/buildings/wonders (Phase 2)                           |
| Tiers            | 9 visual tiers per language (village → galactic), driven by wonders (Phase 2)           |

**Product principle: learning is never paywalled by the economy.** Planting
seeds (creating cards) is always free. Gold buys structure/cosmetics, never
knowledge.

## 3. Economy (Phase 1 scope)

- `STARTING_GOLD = 40`, `START_PLOTS = 6`, `PLOTS_PER_EXPAND = 3`.
- `expandBedCost(plotCount) = EXPAND_BASE_COST * (expansionsSoFar + 1)` →
  20, 40, 60 … where
  `expansionsSoFar = (plotCount - START_PLOTS) / PLOTS_PER_EXPAND`.
- `baseHarvestGold(intervalDaysBefore) = 2 + min(max(intervalDaysBefore, 0), 60)`
- Grade multipliers: FORGOT 0.25, HARD 0.75, GOOD 1, EASY 1.25, PERFECT 1.5.
- `harvestGold = max(1, round(base * multiplier))` — computed **server-side**
  in `claimHarvest` from `review_logs.interval_days_before`.
- XP: unchanged — `gradeCardAction` awards deck XP via `XP_BY_GRADE`.
- Civ points, research, workshop recipes (collocation crafting), orders,
  wonders: Phase 2. PWA/audio/achievements/en→vi: Phase 3.

## 4. Data model

Additions to `apps/web/lib/db/schema.ts` (single source of truth), one
migration:

```
farm_worlds        id uuid pk, user_id text, lang_key text, tier int default 0,
                   gold int default 40, unlocked_techs jsonb string[] default [],
                   buildings jsonb Record<string, number> default {},
                   stats jsonb FarmStats default, wonder_progress jsonb default {},
                   created_at/updated_at — UNIQUE(user_id, lang_key), INDEX(user_id)
farm_beds          id uuid pk, world_id → farm_worlds cascade, deck_id → decks cascade,
                   plot_count int default 6, position int
                   — UNIQUE(world_id, position), UNIQUE(deck_id)
farm_plots         id uuid pk, bed_id → farm_beds cascade, slot_index int,
                   card_id → cards cascade (nullable), planted_at, variant int default 0
                   — UNIQUE(bed_id, slot_index), UNIQUE(card_id)
farm_items         id uuid pk, world_id cascade, item_key text, qty int default 0
                   — UNIQUE(world_id, item_key)
farm_harvest_claims session_id uuid pk → study_sessions cascade,
                   world_id → farm_worlds cascade, gold_awarded int, created_at
review_logs        + interval_days_before int NOT NULL default 0 (pre-review memory strength)
```

Orders are derived daily (deterministic) — no table. Farm stats jsonb:
`{ planted, harvested, goldEarned }`.

## 5. Server surface

New `lib/db/repositories/farm.ts` (server-only, every fn takes `userId`):

- `startFarmWorld(userId, { langKey, sourceLang, targetLang, worldName })` —
  idempotent; creates world + one garden deck/bed; imports existing
  same-language decks as beds (plot_count = `max(START_PLOTS, ceil(cards/2))`,
  planting oldest cards into slots) in one transaction.
- `listFarmWorlds(userId)` → overview (world + due counts per language).
- `loadFarmWorldDetail(userId, langKey)` → `FarmWorldSnapshot` (world, beds
  with plots joined to cards + schedules, items, dueCount, freshCount,
  summed deck XP/level).
- `plantSeeds(userId, langKey, bedId, words)` — creates cards (duplicate
  hanzi → skipped list), assigns first empty slots; errors when bed full.
- `expandFarmBed(userId, bedId, addTo, cost)` — atomic plot_count bump +
  `gold >= cost` guard.
- `claimSessionHarvest(userId, sessionId, langKey)` — idempotent (insert-once
  `farm_harvest_claims`), filters the session's `review_logs` to the world's
  language pair, awards gold + stats atomically.

`lib/db/repositories/study.ts` additions: `getDueQueueForLang(userId,
sourceLang, targetLang, limit)`, `countDueForLang(...)`.

`lib/actions/farm.ts` — thin, typed `ActionResult`, session-scoped:
`startWorldAction`, `plantSeedsAction`, `expandBedAction`,
`claimHarvestAction`.

`gradeCardAction` (existing) records `intervalDaysBefore` on each review log.
SRS math (`@colyglot/srs`) is **not modified**.

## 6. Content registry

`apps/web/lib/game/content/` — data-driven, framework-free (port of Xuyên
Không's `registerEra`/`validateData` idea):

```ts
type LanguagePack = {
  key;
  sourceLang;
  targetLang;
  name;
  flag;
  tiers: FarmTier[9]; // name, subtitle, theme {sky, ground, plot, plotBorder, accent}
  packs: SeedPack[];
}; // { key, name, icon, words: SeedWord[] }
```

- `registerLanguage(pack)`, `LANG_PACKS`, `validateContent(packs): string[]`
  (duplicate keys, empty words, bad tier counts; run in dev boot + tests).
- `zh.ts` ships first: 2 packs × 12 words (Greetings, Food) with pinyin,
  Vietnamese translation, one example each; collocations seeded for Phase 2.
- `en.ts` arrives in Phase 3. Unregistered languages render as "coming soon".

## 7. Art system

- `lib/game/art/palette.ts` — `hexToRgb`, `rgbToHex`, `shade(hex, amount)`,
  `mix(a, b, t)` (ported concept from Xuyên Không's `XK.Art`).
- `components/farm/art/*` — plot soil tile, crop growth stages
  (`fresh | growing | ready | urgent` derived via `cropStage(schedule, now)`
  using `overdueRatio`), themed by the current tier's palette. Emoji as item
  icons. No image assets.
- Mobile-first: topbar + scrollable bed grid + bottom action bar
  (Seeds / Nursery / Harvest).

## 8. UI shape

- `/` (no query) → **Title screen**: world cards from the registry (existing
  worlds show tier/gold/due/streak; unstarted languages show "Start";
  unregistered ones "Coming soon"), Play → `startWorldAction` then
  `/?lang=<key>`.
- `/?lang=zh-vi` → server loads snapshot → client game: TopBar (language,
  tier name, 💰 gold, level + XP bar, 🔥 streak), FarmScene (beds + plots),
  panels/modals: Seeds (pack catalog + plant), Nursery (fresh-card intro →
  first grade), Harvest (full-screen flip-card session re-using
  `startStudySessionAction`/`gradeCardAction`/`finishSessionAction`, then
  `claimHarvestAction` → yield celebration).
- Zustand `farm-store` holds the snapshot; actions apply **optimistic**
  mutations and reconcile from server results; `router.refresh()` re-syncs
  from server truth.
- `speak-button` (TTS) is reused inside Nursery/Harvest.

## 9. Route retirement

- Removed: `app/decks/**`, `app/onboarding/`, `components/game/**` (R3F),
  `components/dashboard/**`, `components/decks/**`, `components/study/**`,
  `lib/three/**`, `lib/missions.ts`, `e2e/study.spec.ts`.
- Kept: `/sign-in`, `/auth/**`, `/api/cards/[id]/recording`, `/dev/ui`,
  `components/ui/**`, `lib/streak.ts`, `lib/xp.ts`, all repositories/actions
  for SRS. `layout.tsx` drops `GameCanvasMount`.
- Git history preserves the retired code; deletion is explicit `git rm`.

## 10. Testing

- **Unit** (bun test): economy math, `cropStage`, palette utils,
  `validateContent` (valid zh pack + invalid fixtures), store optimistic
  helpers.
- **Integration** (DATABASE_URL, following `user-isolation.test.ts`
  conventions): farm repos — world start idempotency + legacy import,
  two-user isolation, plant/expand (insufficient gold), claim idempotency +
  cross-language filtering + `interval_days_before = 0` legacy rows.
- **E2E** (Playwright): title → start world → plant from pack → nursery one
  word → harvest the remaining fresh card → claim → gold increases.
- Every phase ships with lint + typecheck + unit + integration green
  (AGENTS.md validation hierarchy).

## 11. Phasing

- **Phase 1 — Vertical slice (this plan)**: schema + repos + actions,
  content registry (zh-vi, 2 packs, 9 tier definitions), title screen, farm
  view + beds/plots art, seeds panel + planting, nursery, harvest session +
  claim + celebration, gold/XP topbar, legacy deck import, route retirement,
  e2e.
- **Phase 2 — Economy depth**: workshop (collocation recipes), civ points +
  research tree, daily orders, wonders + tier-up ceremony + theme evolution,
  custom-seed creation UI.
- **Phase 3 — Breadth & polish**: en→vi pack, PWA (manifest + SW asset
  cache), procedural WebAudio, achievements/events, speaking studio
  (recordings).

## 12. Out of scope (explicit)

Multiplayer/social neighbors, hearts/lives, offline play, cosmetic economy
beyond structure, 3D anything, new SRS features.
