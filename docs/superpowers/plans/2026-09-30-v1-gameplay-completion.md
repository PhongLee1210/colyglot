# v1 Gameplay Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every remaining GAME_PLAY.md criterion — Regions (Homestead+Market), shop & animals, mastery plaques, first-graduation@15d, per-answer juice beats, countdown-to-graduation glow, music layering, sky reskin + streak wreath, and calibration persistence.

**Architecture:** Five phases (A: data foundations, B: regions, C: shop/animals, D: juice, E: plaques/verification). All new game rules live client-safe under `apps/web/lib/game/*`; all writes go through `lib/db/repositories` + server actions; schema changes ship as one Drizzle migration (`0006`). Three shipped behaviors intentionally change (see Global Constraints #2–#4).

**Tech Stack:** Bun, Turborepo, Next.js 16 App Router, React 19, Drizzle + Supabase Postgres, Three.js/R3F, Zustand, WebAudio.

## Global Constraints

- Source of truth is `GAME_PLAY.md` (Vietnamese). Numbers below are its starting values: Market unlock `1.200 vàng + 25 cây cổ thụ`, beds `6/12`, house `300/900/2.500`, fence/deco `60–400`, chicken `500`, cat `700`, streak tiers `3/7/30` (+10/20/30%), first graduation `15d once`, graduation `21d`, wilt ratio band `1→3`, mastery `80%`.
- **D1 — `cards.graduatedAt` marker replaces pure Forest derivation** (`interval ≥ 21 AND no plot`). A 15-day first graduation is impossible to derive purely; the marker is still set by the single SM-2 crossing rule in `applyFarmReviewHooks`. Migration backfills it from the current derivation so no existing tree is lost.
- **D2 — Server-authoritative grading.** `gradeCardAction(cardId, sessionId, {correct, elapsedMs, hesitated})` derives the grade server-side via the same pure `gradeFromResponse`, using the tier from the DB `intervalDaysBefore`. `review_logs` persists `elapsedMs`/`hesitated` (§3.2/§10.4 calibration).
- **D3 — Per-answer gold FX are panel-local** (coins fly to a session tally chip inside the harvest panel), NOT camera flights to the 3D farm — keeps the accepted camera deviation recorded in `docs/superpowers/tasks/2026-09-30-gameplay-alignment.md`.
- Client-safe layers (`lib/game/**`) never import from `lib/db`; dependency direction `apps → packages`; shared constants stay in `@colyglot/srs`.
- Schema lives only in `apps/web/lib/db/schema.ts`; migrations generated with `bun run db:generate` (hand-append backfill SQL), applied with `bun run db:migrate` (from `apps/web`).
- Verification after every task: `bun run lint && bun run typecheck && bun run test` (from repo root); `bun run build` after phases A/C/E; `bun run test:e2e` (in `apps/web`, serialized after `test`) after phases B and E.
- Never modify generated files (`.next/`, `next-env.d.ts`). Never commit secrets. Commit per task, message style: `feat(web): …` / `test(web): …`.

---

### Task A1: Migration `0006` — graduation marker, region key, calibration columns

**Files:**

- Modify: `apps/web/lib/db/schema.ts` (`cards`, `farmBeds`, `reviewLogs` tables + types)
- Create: `apps/web/drizzle/0006_*.sql` (via `bun run db:generate`, then hand-append backfills)

**Interfaces:**

- Produces: `cards.graduatedAt: timestamp | null`; `farmBeds.regionKey: text` (default `"homestead"`); `reviewLogs.elapsedMs: integer | null`; `reviewLogs.hesitated: boolean` (default `false`); `FarmStats.firstGraduation?: boolean` (jsonb — no migration needed).

- [ ] **Step 1: Add columns to `schema.ts`**

```ts
// cards table — after createdAt:
graduatedAt: timestamp("graduated_at", { withTimezone: true }),
// farmBeds table — after kind:
regionKey: text("region_key").notNull().default("homestead"),
// reviewLogs table — after intervalDaysBefore:
elapsedMs: integer("elapsed_ms"),
hesitated: boolean("hesitated").notNull().default(false),
```

Extend `FarmStats` in `apps/web/lib/game/types.ts`:

```ts
export type FarmStats = {
  planted: number;
  harvested: number;
  goldEarned: number;
  /** Set once the world's first tree graduated (15d exception used up). */
  firstGraduation?: boolean;
};
```

- [ ] **Step 2: Generate + backfill migration**

```bash
cd apps/web && bun run db:generate
```

Append to the generated `0006_*.sql`:

```sql
--> statement-breakpoint
-- Backfill D1: cards that already graduated under the old derivation.
UPDATE cards SET graduated_at = now()
WHERE EXISTS (SELECT 1 FROM card_schedules s WHERE s.card_id = cards.id AND s.interval_days >= 21)
  AND NOT EXISTS (SELECT 1 FROM farm_plots p WHERE p.card_id = cards.id);
--> statement-breakpoint
UPDATE farm_worlds w SET stats = jsonb_set(stats, '{firstGraduation}', 'true'::jsonb)
WHERE EXISTS (
  SELECT 1 FROM cards c
  JOIN card_schedules s ON s.card_id = c.id AND s.interval_days >= 21
  JOIN decks d ON d.id = c.deck_id AND d.user_id = w.user_id
  WHERE c.graduated_at IS NOT NULL
);
```

- [ ] **Step 3: Apply and verify**

```bash
bun run db:migrate && bun run test
```

Expected: migration applies; all existing tests pass (they don't assert the new columns yet).

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(web): migration 0006 graduation marker, region key, calibration columns"`

---

### Task A2: Server-authoritative grading + calibration persistence

**Files:**

- Modify: `apps/web/lib/db/repositories/study.ts:42` (`AppendReviewLogInput`), `apps/web/lib/actions/study.ts:48` (`gradeCardAction`)
- Modify: `apps/web/components/farm/harvest-session.tsx` (`sendGrade`), `apps/web/components/farm/nursery-session.tsx` (`answer`)
- Test: `apps/web/lib/db/__tests__/farm-ops.test.ts` (append to existing suite)

**Interfaces:**

- Produces: `type GradeOutcome = { correct: boolean; elapsedMs: number; hesitated: boolean }`;
  `gradeCardAction(cardId: string, sessionId: string, outcome: GradeOutcome): Promise<ActionResult<GradeResult>>` (GradeResult unchanged).
- Consumes: `gradeFromResponse`, `challengeTier` from `@/lib/game/core/challenge`.

- [ ] **Step 1: Write failing integration test** — grade a card via the new signature; assert the row carries metrics and the grade was derived server-side (a >6s "correct" yields HARD=2 even if a tampered client would have sent PERFECT).

```ts
test("gradeCardAction derives grade server-side and logs calibration metrics", async () => {
  const { userId, cardId, sessionId } = await seedCardForGrading(); // helper: plant one card, open session, upsert schedule with intervalDays 16 (mature tier)
  const slow = await gradeCardActionRaw(cardId, sessionId, {
    correct: true,
    elapsedMs: 7_000,
    hesitated: false,
  });
  expect(slow.ok && slow.data.goldPreview.multiplier).toBe(0.75); // HARD
  const [log] = await listReviewLogsByCard(userId, cardId);
  expect(log?.elapsedMs).toBe(7_000);
  expect(log?.hesitated).toBe(false);
  expect(log?.grade).toBe(2);
});
```

- [ ] **Step 2: Run** `bun test apps/web/lib/db/__tests__/farm-ops.test.ts` — expect FAIL (signature mismatch).

- [ ] **Step 3: Implement** — `AppendReviewLogInput` gains `elapsedMs?: number; hesitated?: boolean;`; `gradeCardAction` computes:

```ts
const tier = challengeTier(intervalDaysBefore);
const grade = gradeFromResponse({
  correct: outcome.correct,
  elapsedMs: outcome.elapsedMs,
  hesitated: outcome.hesitated,
  tier,
});
```

and passes `elapsedMs: Math.max(0, Math.round(outcome.elapsedMs))`, `hesitated: outcome.hesitated` to `appendReviewLog`. Both session components send `{ correct, elapsedMs, hesitated }` instead of the client-computed grade (they may still use the local grade for nothing — delete local computation; `challenge` no longer needed for grading in `answer()`, only for `picked === challenge.answer`).

- [ ] **Step 4: Verify** — targeted test passes; full `bun run lint && bun run typecheck && bun run test` green.
- [ ] **Step 5: Commit** — `feat(web): server-derived grades with persisted response metrics`

---

### Task A3: First graduation @15d + marker-based Forest/demotion

**Files:**

- Modify: `apps/web/lib/game/core/economy.ts` (constant + helper), `apps/web/lib/db/repositories/farm.ts:292` (forest query), `farm.ts:595` (`applyFarmReviewHooks`), `apps/web/lib/game/core/core.test.ts`
- Test: `apps/web/lib/db/__tests__/farm-ops.test.ts`

**Interfaces:**

- Produces: `FIRST_GRADUATION_INTERVAL_DAYS = 15`; `graduationThreshold(firstGraduationUsed: boolean): number` (15 once, then 21).
- Forest = `cards.graduatedAt IS NOT NULL` (ordered by `cardSchedules.intervalDays desc`); demotion trigger = `grade === FORGOT && graduatedAt !== null && !plot`; marker cleared only when actually replanted (greenhouse-full fallback keeps the tree visible in the Forest).

- [ ] **Step 1: Failing unit tests** in `core.test.ts`:

```ts
test("first graduation threshold is 15 exactly once", () => {
  expect(graduationThreshold(false)).toBe(15);
  expect(graduationThreshold(true)).toBe(21);
});
```

and integration tests in `farm-ops.test.ts`: (a) world with no graduation → card reaching 15d frees plot + `graduatedAt` set + `stats.firstGraduation === true` + appears in `snapshot.forest`; (b) second card at 15d does NOT graduate, at 21d does; (c) FORGOT on a graduated card (any interval) demotes: replanted + marker null + gone from forest.

- [ ] **Step 2: Implement.** In `applyFarmReviewHooks`: select `cards.graduatedAt`; wrap the plot-free/marker writes and the world-stats flip in one `getDb().transaction`; demotion branch condition becomes `graduatedAt && !plot` (drop the `intervalDaysBefore >= 21` check); on successful replant add `update cards set graduatedAt = null`. In `loadFarmWorldDetail`, forest `where` becomes `isNotNull(cards.graduatedAt)` (keep the `isNull(farmPlots.id)` leftJoin guard).

- [ ] **Step 3: Verify** — `bun run test` green (the existing graduation/demotion tests from 9c159d3 must be updated to the marker semantics — they are the spec now).
- [ ] **Step 4: Commit** — `feat(web): first graduation at 15d once, marker-based forest`

---

### Task B4: Region registry (client-safe)

**Files:**

- Create: `apps/web/lib/game/content/regions.ts`
- Test: `apps/web/lib/game/core/core.test.ts` (or new `regions.test.ts` next to it)

**Interfaces:**

- Produces:

```ts
export type RegionKey = "homestead" | "market";
export type RegionDef = {
  key: RegionKey;
  name: string;
  icon: string;
  blurb: string;
  unlockGold: number;
  unlockTrees: number;
  startPlots: number;
  packKeys: string[];
  bedName: string;
};
export const REGIONS: readonly RegionDef[]; // homestead first
export function getRegion(key: RegionKey): RegionDef;
export function regionOfPack(packKey: string): RegionDef | undefined;
```

homestead: `{unlockGold: 0, unlockTrees: 0, startPlots: 6, packKeys: ["greetings"], bedName: "Homestead Garden"}`; market: `{unlockGold: 1200, unlockTrees: 25, startPlots: 12, packKeys: ["food"], bedName: "Market Garden"}`.

- [ ] **Step 1: Failing test** — `regionOfPack("food")?.key === "market"`; `getRegion("homestead").startPlots === 6`; every `LANG_PACKS["zh-vi"].packs[].key` maps to exactly one region.
- [ ] **Step 2: Implement registry; re-export from `content/index.ts`.**
- [ ] **Step 3: Verify + commit** — `feat(web): region registry`

---

### Task B5: `unlockRegion` repo + action + snapshot region status

**Files:**

- Modify: `apps/web/lib/db/repositories/farm.ts` (`startFarmWorld` stamps `regionKey`, new `unlockRegion`, `loadFarmWorldDetail` maps `bed.regionKey` + builds `regions`), `apps/web/lib/game/types.ts` (`BedView.regionKey`, `RegionStatus`, snapshot field), `apps/web/lib/actions/farm.ts` (new action)
- Test: `apps/web/lib/db/__tests__/farm-ops.test.ts`

**Interfaces:**

- Produces:

```ts
export type RegionStatus = {
  key: RegionKey;
  unlocked: boolean;
  goldGateMet: boolean;
  treesGateMet: boolean;
  mastered: boolean;
  masteryPct: number; // 0–100
};
// snapshot.regions: RegionStatus[] (REGIONS order)
export async function unlockRegion(
  userId: string,
  langKey: string,
  regionKey: RegionKey
): Promise<
  | FarmWorldSnapshot
  | "insufficient-gold"
  | "trees-gate"
  | "already-unlocked"
  | undefined
>;
export async function unlockRegionAction(
  langKey: string,
  regionKey: RegionKey
): Promise<ActionResult<FarmWorldSnapshot>>;
```

Unlock is one transaction: atomic gold guard `gold >= unlockGold` (like `expandFarmBed`), forest count check `>= unlockTrees` (count via the same forest query), insert deck + `farmBeds` row (`plotCount: startPlots`, `position: max+1`, `regionKey`). `startFarmWorld` stamps `regionKey: "homestead"` on the garden bed (legacy import rows too).

- [ ] **Step 1: Failing integration tests** — reject when gold < 1200 (`"insufficient-gold"`), when forest < 25 (`"trees-gate"`), when already unlocked; success deducts gold, creates a 12-plot market bed, snapshot `regions[1].unlocked === true`; homestead rows read `unlocked: true` always.
- [ ] **Step 2: Implement; wire `unlockRegionAction` mirroring `switchWorldAction`'s snapshot return.**
- [ ] **Step 3: Verify + commit** — `feat(web): market region unlock with dual gates`

---

### Task B6: Seeds tab region gating + region bed targeting

**Files:**

- Create: `apps/web/lib/game/core/planting.ts` (`pickPlantingBed`)
- Modify: `apps/web/components/farm/hud/seeds-tab.tsx`, `apps/web/lib/game/store/reducers.ts` (plant uses chosen bed — `applyPlant` already takes bedId), `apps/web/lib/game/core/coach.ts` (hint mentions locked region)
- Test: `apps/web/lib/game/core/core.test.ts`

**Interfaces:**

- Produces: `pickPlantingBed(beds: BedView[], regionKey: RegionKey): BedView | undefined` — first garden bed of the region with a free slot, else any garden bed of the region (for the "bed full" message), else undefined.

Seeds tab renders packs grouped under their region heading; locked region → locked card showing `🔒 1.200 💰 + 25 🌲 (have N)` with an armed unlock button (two-tap like bed-rail expand); planting targets `pickPlantingBed` (bed-0-only logic deleted).

- [ ] **Step 1: Failing unit test** — market bed preferred for food pack even when position > 0; greenhouse beds never chosen; full region → undefined.
- [ ] **Step 2: Implement; unlock button calls `unlockRegionAction` → `hydrate(result.data)` + `router.refresh()`.**
- [ ] **Step 3: Verify** — lint/typecheck/test + `bun run test:e2e` (loop spec must still pass; seeds flow unchanged for the default homestead bed).
- [ ] **Step 4: Commit** — `feat(web): region-gated seed bank`

---

### Task C7: Shop catalog + `buyItemAction`

**Files:**

- Create: `apps/web/lib/game/store/catalog.ts` (note: `lib/game/store/` is zustand state today — catalog is pure data, still fine client-safe; keep in `lib/game/core/shop.ts` instead to avoid confusion)
- Modify: `apps/web/lib/game/core/shop.ts` (new), `apps/web/lib/db/repositories/farm.ts` (`purchaseItem`), `apps/web/lib/actions/farm.ts` (`buyItemAction`), `apps/web/lib/game/store/hud-store.ts` (`PanelTabId += "shop"`), `apps/web/components/farm/hud/tabs.ts`, `hud/panel-content.tsx`, new `hud/shop-tab.tsx`, `apps/web/lib/game/store/reducers.ts` (`applyPurchase`)
- Test: `apps/web/lib/db/__tests__/farm-ops.test.ts`, `apps/web/lib/game/core/core.test.ts`

**Interfaces:**

- Produces:

```ts
// lib/game/core/shop.ts
export type ShopCategory = "house" | "deco" | "animal";
export type ShopItem = {
  key: string;
  name: string;
  icon: string;
  blurb: string;
  price: number;
  category: ShopCategory;
  houseTier?: number;
};
export const SHOP_ITEMS: readonly ShopItem[];
export function findShopItem(key: string): ShopItem | undefined;
export function houseTierOwned(items: readonly { itemKey: string }[]): number; // 0 = shed
// repo
export async function purchaseItem(
  userId: string,
  langKey: string,
  itemKey: string
): Promise<
  { gold: number } | "insufficient" | "owned" | "locked-tier" | undefined
>;
export async function buyItemAction(
  itemKey: string
): Promise<ActionResult<{ gold: number }>>;
```

Catalog (§6.3): `house_1` 300, `house_2` 900, `house_3` 2500 (houseTier 1/2/3, sequential); `fence_stone` 60, `path_stone` 120, `lamp_post` 240 (deco); `chicken` 500, `cat` 700 (animal). Purchase rules: house tier N requires owning N−1 (`"locked-tier"`); everything is one-per-world (`"owned"` on conflict); atomic gold guard. Shop tab replaces the "wonders" teaser position with a live tab `{id: "shop", icon: "🛒", label: "Shop"}`.

- [ ] **Step 1: Failing tests** — unit (`houseTierOwned`, `findShopItem`) + integration (insufficient gold; happy path deducts + writes `farmItems`; second buy → `"owned"`; `house_2` before `house_1` → `"locked-tier"`).
- [ ] **Step 2: Implement catalog, repo, action, store id, tab entry, `ShopTab` UI (category sections, owned state, gold balance, busy/disabled), `applyPurchase(snapshot, gold)` reducer.**
- [ ] **Step 3: Verify + commit** — `feat(web): farm shop with house tiers, deco, animals`

---

### Task C8: 3D rendering of owned items

**Files:**

- Create: `apps/web/lib/game/3d/shop-layout.ts` (pure: itemKey → placements)
- Modify: `apps/web/components/farm/farm-3d/buildings-3d.tsx` (house tiers, stone fence, plaque stones), `decorations-3d.tsx` (path upgrade, lamps, wreath banner), `world.tsx` (pass `items`)
- Test: `apps/web/lib/game/core/core.test.ts` for the pure layout fn

**Interfaces:**

- Consumes: `snapshot.items` (`{itemKey, qty}[]`), `houseTierOwned`.
- Produces: `houseMeshesFor(tier)` scale/color params; `lampPlacements(farm)`, `plaquePlacements(farm, regionKey)` as pure data.

House: tier 0 = existing Shed; 1 = taller box + porch; 2 = two-body cottage + chimney; 3 = villa (wings + banner roof). Stone fence: replace wood posts' material on the front edge with `materials.stone`-like gray instanced posts (reuse `fencePerimeter`). Lamps: 3 posts along the gate path with emissive spheres. Wreath: banner plane at the gate. Plaques handled in E14.

- [ ] **Step 1: Failing unit test** — `houseMeshesFor(2)` returns expected box list length; `lampPlacements` returns 3 entries inside farm bounds.
- [ ] **Step 2: Implement; `Buildings3D`/`Decorations3D` accept `items: string[]`.**
- [ ] **Step 3: Verify + commit** — `feat(web): render owned shop items in 3D`

---

### Task C9: Animals + utilities (chicken, cat)

**Files:**

- Create: `apps/web/lib/game/core/animals.ts` (pure targets), `apps/web/components/farm/farm-3d/animals-3d.tsx` (primitive-built meshes)
- Modify: `apps/web/lib/db/repositories/farm.ts` (plot rows select `cardSchedules.lapses`), `apps/web/lib/game/types.ts` (`PlotView.schedule.lapses`), `world.tsx`
- Test: `apps/web/lib/game/core/core.test.ts`

**Interfaces:**

- Produces:

```ts
export function chickenTarget(
  beds: BedView[]
): { bedId: string; slotIndex: number } | null; // min dueAt among scheduled plots
export function catTarget(beds: BedView[]): string | null; // bedId with max Σ lapses
```

Chicken: white sphere body + red comb + orange beak, idle bob (useFrame), perched beside the target plot, plus a passive golden ring under that plot. Cat: gray flattened sphere + ear cones, sleep-breathing scale, beside the target bed's sign. Rendered only when `items` contains `chicken`/`cat`.

- [ ] **Step 1: Failing unit tests** — chicken picks min `dueAt` (not null-schedule plots); cat picks max total lapses; empty beds → null.
- [ ] **Step 2: Implement + wire into `world.tsx` (`<Animals3D beds={snapshot.beds} farm={farm} items={…} />`).**
- [ ] **Step 3: Verify + commit** — `feat(web): chicken and cat companions with utilities`

---

### Task D10: §8.1 per-answer beats (180/400/600ms) + slide-in

**Files:**

- Modify: `apps/web/components/farm/harvest-session.tsx`, `apps/web/app/globals.css` (keyframes `prompt-pop`, `slide-up-in`, `tally-bump`), `apps/web/components/farm/harvest/challenge-prompt.tsx`
- Test: `apps/web/e2e/*.spec.ts` (data-testid assertions), manual timing check

**Interfaces:**

- Produces: session gold tally chip in the panel header (`data-testid="session-gold"`, display-only sum of `preview.total`s); `PanelCoinFly` internal component (WAAPI 🪙 from the picked button rect to the chip at 180ms, 420ms flight); prompt pulse (1.0→1.14→1.0, 260ms) at 400ms; tally bump at 600ms; next card slides in (`slide-up-in` 150ms) keyed by `cardId`. All under `motion-reduce` guards. The claim stays authoritative — the tally is honest because it sums the same previews.

- [ ] **Step 1: Implement FX + keyframes; add `data-testid` hooks.**
- [ ] **Step 2: Verify** — `bun run test:e2e` (existing 18 + shop/region additions from B/C still green); manual: tap-correct shows coin→tally→bump before the 900ms advance.
- [ ] **Step 3: Commit** — `feat(web): per-answer gold flight, prompt pulse, slide-in`

---

### Task D11: Countdown-to-graduation glow (§9.3)

**Files:**

- Modify: `apps/web/lib/game/core/crops.ts` (`nearGraduation`), `apps/web/components/farm/farm-3d/crops-3d.tsx` (🌟 badge + stronger sway for near-graduation ready crops), `hud/crop-labels.tsx` (chip line "1 more → 🌲"), `hud/plot-info-card.tsx`
- Test: `apps/web/lib/game/core/core.test.ts`

**Interfaces:**

- Produces: `nearGraduation(schedule: CropSchedule, intervalDays: number): boolean` — true when `14 <= intervalDays < 21` (import `GRADUATION_INTERVAL_DAYS` from economy; `MATURE_MIN_INTERVAL_DAYS` from challenge). Since `CropSchedule` already carries `intervalDays`, signature: `nearGraduation(schedule: CropSchedule): boolean | false for null`.

- [ ] **Step 1: Failing unit tests** — boundaries 13/14/20/21.
- [ ] **Step 2: Implement badge + label + info-card line.**
- [ ] **Step 3: Verify + commit** — `feat(web): countdown-to-graduation glow`

---

### Task D12: Music layer on 5-correct runs (§9.2)

**Files:**

- Modify: `apps/web/lib/game/store/fx-store.ts` (`correctRun`, `noteResult(correct)`), `apps/web/lib/game/music.ts` or new `apps/web/lib/game/audio/layer.ts` (WebAudio triad pad), `apps/web/components/farm/game-music.tsx`, `harvest-session.tsx` (feed `noteResult`)
- Test: `apps/web/lib/game/store/` unit test (fx-store run counting)

**Interfaces:**

- Produces: `useFxStore.correctRun: number`; `noteResult(correct: boolean): void`; `startLayer()/stopLayer()` in `audio/layer.ts` (3 sine oscillators C4/E4/G4, gain ramp 0↔0.04 over 400ms, lazily created AudioContext, honors music mute + volume from `music-store`).

- [ ] **Step 1: Failing store test** — 5 corrects → run 5; one wrong → 0.
- [ ] **Step 2: Implement; `harvest-session.answer()` calls `noteResult(correct)` on every commit (not on undo).**
- [ ] **Step 3: Verify + commit** — `feat(web): music layer on 5-correct runs`

---

### Task D13: Sky reskin @30d-ever + streak wreath @7d-ever (§6.4)

**Files:**

- Modify: `apps/web/lib/streak.ts` (`longestStreak`), `apps/web/lib/db/repositories/farm.ts` (load sweep-day keys once; derive `goldenSky`, grant `streak_wreath` idempotently), `apps/web/lib/game/types.ts` (`snapshot.world.goldenSky`), `apps/web/components/farm/farm-game.tsx` (golden theme override), `apps/web/lib/__tests__/streak.test.ts`
- Test: streak unit tests + farm-ops integration (30-day history → `goldenSky === true` + wreath item row exists; a later gap does NOT revoke).

**Interfaces:**

- Produces: `longestStreak(dayKeys: Iterable<string>): number`; golden palette `GOLDEN_SKY: FarmTheme["sky"]`-compatible override in `farm-game.tsx` (`sky: ["#f6c78a", "#fdeec7"]`, warm fog color). Ever-based: breaking a streak never revokes (§6.4 "đứt chuỗi không lấy đi gì cả" — the sky is a view earned by history).

- [ ] **Step 1: Failing tests.** — [ ] **Step 2: Implement.** — [ ] **Step 3: Verify + commit** — `feat(web): golden sky at 30-day best streak, wreath at 7`

---

### Task E14: Region mastery plaques (§7)

**Files:**

- Create: `apps/web/lib/game/core/mastery.ts` (pure calc), Modify: `farm.ts` (fill `RegionStatus.mastered/masteryPct`, idempotent `plaque_<region>` grant), `buildings-3d.tsx` (plaque stone at the region bed sign), `hud/progress-tab.tsx` (per-region mastery bars + unlock gates)
- Test: `core.test.ts` (mastery math) + farm-ops (grant idempotent, 80% boundary)

**Interfaces:**

- Produces: `regionMastery(regionWords: readonly string[], forestHanzi: Iterable<string>): { pct: number; mastered: boolean }` — `pct = |∩| / |regionWords| * 100`, `mastered = pct >= 80 && regionWords.length > 0`.

- [ ] **Step 1: Failing tests.** — [ ] **Step 2: Implement (forest hanzi already in `snapshot.forest`).** — [ ] **Step 3: Verify + commit** — `feat(web): region mastery plaques`

---

### Task E15: Full verification + task doc

**Files:**

- Create: `docs/superpowers/tasks/2026-09-30-v1-completion.md`

- [ ] `bun run lint && bun run typecheck && bun run test && bun run build` from root — all green.
- [ ] `cd apps/web && bun run test:e2e` — all green (existing 18 + new assertions).
- [ ] Write task doc: delivered scope, honest deviations (camera flights, synthesized music layer, dog/cow + outfits out of v1, Harbour/Quarter out of v1), §11 playtest table mapping (what is automatable vs manual).
- [ ] Commit — `docs: v1 gameplay completion task record`

---

## Self-Review

- **Spec coverage:** §5.3 regions (B4–B6) · §6.3 shop/animals (C7–C9) · §6.4 wreath/sky (D13) · §7 plaques (E14) · §8.1 beats (D10) · §9.2 music (D12) · §9.3 glow (D11) · §10.2 first-graduation (A3) · §10.4 calibration (A2). Already-shipped criteria (ladder, grading, gold, streak bonuses, wilt, ceremonies) untouched except where D1/D2 require.
- **Placeholders:** none — every step names files and ships real code or SQL.
- **Type consistency:** `RegionStatus`, `GradeOutcome`, `ShopItem`, `pickPlantingBed`, `chickenTarget/catTarget`, `longestStreak`, `nearGraduation`, `graduationThreshold` are defined once and consumed downstream with matching signatures.
