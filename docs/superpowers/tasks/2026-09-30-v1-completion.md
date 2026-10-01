# Task 7: V1 Gameplay Completion (Regions, Shop, Mementos, Juice)

**Date**: 2026-10-01
**Depends On**: Task 6 ✅ (GAME_PLAY alignment + graduation & Forest)
**Plan**: `docs/superpowers/plans/2026-09-30-v1-gameplay-completion.md`
**Source of truth**: `GAME_PLAY.md` (Vietnamese gameplay design doc)

---

## Scope delivered (15 tasks, 4 phases)

### Phase A — Foundations

1. **Migration 0006** (`1b97e9e`) — `cards.graduated_at` (marker, backfilled
   from interval ≥ 21), `farm_beds.region_key` default `homestead`,
   `review_logs.elapsed_ms`/`hesitated` (calibration persistence), `ui_lang`
   carried for the parallel i18n work.
2. **Server-authoritative grading (§3.1)** (`c2c4e8e`) —
   `gradeCardAction(cardId, sessionId, {correct, elapsedMs, hesitated})`;
   `deriveGrade(intervalDaysBefore, outcome)` in core/challenge.ts derives
   PERFECT/EASY/GOOD/FORGOT from raw facts; the tier comes from the DB,
   never the client. Metrics persist in `appendReviewLog`.
3. **First graduation @15d, marker Forest (§10.2, §5.1)** (`4cf8ee8`) —
   `graduationThreshold()` + `FIRST_GRADUATION_INTERVAL_DAYS = 15`; the
   crossing flips `stats.firstGraduation` in the same transaction (no window
   where two trees slip through at 15). Forest membership = the marker, not
   a derived interval filter. Demotion on FORGOT checks the marker at any
   interval; the greenhouse catches demotions when no plot is free.

### Phase B — Regions (§5.3)

4. **Region registry** (`a8886a7`) — client-safe
   `lib/game/content/regions.ts`: REGIONS (homestead 👋 0/0/6 plots,
   market 🍜 1200 gold/25 trees/12 plots), `regionOfPack`, `masteryOf`
   (80% threshold).
5. **Market unlock** (`a8886a7`) — dual gates, tree gate reported first
   (trees cannot be bought); `unlockRegion` repo + action; snapshot carries
   `regions: RegionStatus[]`; `BedView.regionKey`.
6. **Region-gated seed bank** (`63edf65`) — seeds tab groups packs by
   region, locked regions show the unlock card (armed two-tap), planting
   targets the region's own bed via `pickPlantingBed`.

### Phase C — Shop & animals (§6.3)

7. **Shop** (`ba2b5b2`) — catalog: fence_stone 60, path_stone 120,
   lamp_post 240, chicken 500, cat 700, house 1/2/3 = 300/900/2500 (strict
   order). Atomic `purchaseItem` (gold guard, tier gate, one-per-world),
   `buyItemAction`, Shop tab in the HUD panel.
8. **Owned items in 3D** (`5b560e8`) — pure geometry in
   `lib/game/3d/shop-layout.ts` (unit-tested): house ladder replaces the
   shed (body grows, chimney at tier 2, wings at tier 3), stone front
   fence, lamp lanterns on the gate line, streak-wreath banner over the
   path.
9. **Animals with utilities** (`d82a595`) — `chickenTarget` (earliest
   dueAt: the bird pecks beside the next-ripe crop under a pulsing gold
   ring), `catTarget` (bed with most total lapses: the cat sleeps by the
   weak spot). `PlotView.schedule.lapses` plumbed from `cardSchedules`.

### Phase D — Juice & milestones

10. **Per-answer beats (§8.1)** (`0366d50`) — scheduled from answer time:
    coins lift off at 180ms (WAAPI, reduced-motion aware), prompt pulse at
    400ms, session tally bump at 600ms; next card slides in (`stagger-in`
    keyed by cardId). The grade lands first so beats use the server's gold;
    the 900ms hold still covers full pacing.
11. **Graduation countdown glow (§6.2)** (`e85b485`) — `nearGraduation`
    lights at interval 14–20d: 🌟 badge (outranking ✨/🐛), breathing warm
    instance-color tint, amber crop label with "Nd → 🌳", plot-card
    countdown line.
12. **Music layer on 5-correct runs (§8.3)** (`d1bb25a`) — fx-store
    `correctRun`; a WebAudio C-add9 pad (1.6s attack / 2.2s release)
    swells in at 5 correct, releases on a miss (only after the undo window
    closes in harvest) and honors music volume/mute.
13. **Streak mementos (§6.4)** (`56609e1`) — `longestStreak` over
    `farm_sweep_days` history: 7d-ever grants `streak_wreath` (banner at
    the gate), 30d-ever turns fog + hemisphere + sun golden. Mementos
    honor history — a broken streak never takes them away.

### Phase E — Mastery & close-out

14. **Region mastery plaques (§7)** (`cf104c9`) — `grantMasteryPlaques`
    lands `plaque_<region>` exactly once at 80% mastery, surfaced in the
    same snapshot it was earned; stone stele + gold star beside the bed
    sign; progress tab gains a Regions section (mastery bars, lock state,
    trophy).
15. **Parallel-session handoff** (`2b9412e`) — the i18n multi-language UI
    settings work (en/vi dictionaries, `ui_lang` persistence, language
    picker, localized chrome, `ui-language` e2e) committed on request.

---

## Verification (Validation Hierarchy — all green)

| Level                 | Command             | Result                      |
| --------------------- | ------------------- | --------------------------- |
| Lint                  | `bun run lint`      | 2/2 tasks pass              |
| Types                 | `bun run typecheck` | 2/2 tasks pass              |
| Unit + DB integration | `bun run test`      | 252 pass, 0 fail (39 files) |
| Production build      | `bun run build`     | success                     |
| E2E (Playwright)      | `bun run test:e2e`  | 19 passed                   |

New integration coverage: wreath grant at 7d-ever (once), plaque grant on
homestead mastery (once), first-graduation-at-15, marker demotion,
greenhouse overflow, region dual gates, shop atomicity/tier order.

## Deviations from plan

- **D3 accepted**: per-answer gold FX are panel-local (coins → tally chip),
  not camera flights — choreography is preserved without camera rework.
- The graduation glow window is fixed 14–20d; it does not special-case the
  first-tree 15d threshold (the glow is anticipation, either way the star
  appears one review before the earliest crossing).
- E2E specs expect English HUD labels by default and pass; the Vietnamese
  UI language is user-selectable (i18n) and covered by `ui-language.spec.ts`.
