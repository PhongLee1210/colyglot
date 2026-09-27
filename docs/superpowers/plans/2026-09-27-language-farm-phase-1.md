# Language Farm — Phase 1 (Vertical Slice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the farm-game vertical slice: choose a language world on the title screen, plant curated zh→vi seed words as crops, learn them in the nursery, harvest them via SM-2 review sessions, claim server-computed gold, and watch gold/XP/streak in the farm topbar.

**Architecture:** Next.js 16 server components load a `FarmWorldSnapshot` from new Drizzle repositories (server-authoritative economy); a zustand store holds the snapshot client-side with optimistic mutations reconciled by server-action results; procedural SVG/Tailwind render the 2D farm themed by the current tier palette from a data-driven content registry. The existing SRS path (`gradeCardAction`, `@colyglot/srs`, `card_schedules`) is not modified — the farm reads `dueAt` as the crop clock.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Drizzle ORM + Supabase Postgres, zustand, `@colyglot/srs`, bun test, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-27-language-farm-design.md`

## Global Constraints

- Package manager/runner: **Bun**. Repo root: `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`. In `apps/web`: `bun test <path>`, `bun run db:generate`, `bun run test:e2e`.
- The DB schema lives ONLY in `apps/web/lib/db/schema.ts` — no duplicate model definitions anywhere.
- Repositories in `apps/web/lib/db/repositories/` are the only sanctioned data-access surface; every function takes `userId`.
- Server actions: `"use server"`, session-scoped via `requireUserId()`, return `ActionResult<T>` = `{ ok: true; data: T } | { ok: false; error: string }` from `@/lib/actions/types`.
- Import alias `@/*` maps to `apps/web/*`.
- The SRS engine (`packages/srs`) and `gradeCardAction`'s scheduling math must not change; only the `intervalDaysBefore` log field is added.
- Learning is never gated by gold: planting seeds (creating cards) is free; gold only buys bed expansion in Phase 1.
- UI copy is English; word content is zh→vi. Emoji glyphs that ARE the UI icon (🌱 🌿 ✨ 🐛 💰 🔥 🌰 🧑‍🌾 🧺 👋 🍜 🇨🇳) are product copy and allowed.
- Conventional commits matching repo history: `feat(web): ...`, `feat(db): ...`, `test(db): ...`, `chore: ...`.
- NEVER modify generated files (`.next/`, `next-env.d.ts`). Committed migrations in `apps/web/drizzle/` ARE committed artifacts.
- Every task ends green: run its tests before committing. Integration tests need `DATABASE_URL` in `apps/web/.env` (bun auto-loads `.env`; they self-skip without it).
- E2E runs against a production build via Playwright's `webServer` (`bun run start --port 3117`), mobile viewport 430×932, `reducedMotion: reduce`. Build before e2e.

---

### Task 1: Schema — farm tables + `interval_days_before`

**Files:**

- Modify: `apps/web/lib/db/schema.ts`
- Generated: `apps/web/drizzle/0003_*.sql` (via `bun run db:generate`)
- Test: `apps/web/lib/db/__tests__/schema.test.ts`

**Interfaces:**

- Consumes: existing `decks`, `cards`, `studySessions` tables.
- Produces (used by Tasks 6–9): tables `farmWorlds`, `farmBeds`, `farmPlots`, `farmItems`, `farmHarvestClaims`; column `reviewLogs.intervalDaysBefore`; types `FarmStats`, `FarmWorld`, `FarmBed`, `FarmPlot`, `FarmItem`, `FarmHarvestClaim`.

- [ ] **Step 1: Add farm tables to schema.ts**

In `apps/web/lib/db/schema.ts`, after the `deckProgress` table and before the bottom `export type` block, insert:

```ts
export type FarmStats = {
  planted: number;
  harvested: number;
  goldEarned: number;
};

const DEFAULT_FARM_STATS: FarmStats = {
  planted: 0,
  harvested: 0,
  goldEarned: 0,
};

export const farmWorlds = pgTable(
  "farm_worlds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    langKey: text("lang_key").notNull(),
    tier: integer("tier").notNull().default(0),
    gold: integer("gold").notNull().default(40),
    unlockedTechs: jsonb("unlocked_techs")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    buildings: jsonb("buildings")
      .$type<Record<string, number>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    stats: jsonb("stats")
      .$type<FarmStats>()
      .notNull()
      .default(DEFAULT_FARM_STATS),
    wonderProgress: jsonb("wonder_progress")
      .$type<Record<string, number>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One farm per user per language pair.
    unique("farm_worlds_user_lang_key").on(table.userId, table.langKey),
    index("farm_worlds_user_id_idx").on(table.userId),
  ]
);

export const farmBeds = pgTable(
  "farm_beds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    worldId: uuid("world_id")
      .notNull()
      .references(() => farmWorlds.id, { onDelete: "cascade" }),
    deckId: uuid("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    plotCount: integer("plot_count").notNull().default(6),
    position: integer("position").notNull(),
  },
  (table) => [
    unique("farm_beds_world_position_key").on(table.worldId, table.position),
    // A deck can be a bed of at most one world.
    unique("farm_beds_deck_id_key").on(table.deckId),
  ]
);

export const farmPlots = pgTable(
  "farm_plots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bedId: uuid("bed_id")
      .notNull()
      .references(() => farmBeds.id, { onDelete: "cascade" }),
    slotIndex: integer("slot_index").notNull(),
    cardId: uuid("card_id").references(() => cards.id, {
      onDelete: "cascade",
    }),
    plantedAt: timestamp("planted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    variant: integer("variant").notNull().default(0),
  },
  (table) => [
    unique("farm_plots_bed_slot_key").on(table.bedId, table.slotIndex),
    // One card lives in at most one plot (Postgres allows multiple NULLs).
    unique("farm_plots_card_id_key").on(table.cardId),
  ]
);

export const farmItems = pgTable(
  "farm_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    worldId: uuid("world_id")
      .notNull()
      .references(() => farmWorlds.id, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull(),
    qty: integer("qty").notNull().default(0),
  },
  (table) => [
    unique("farm_items_world_item_key").on(table.worldId, table.itemKey),
  ]
);

export const farmHarvestClaims = pgTable(
  "farm_harvest_claims",
  {
    sessionId: uuid("session_id")
      .primaryKey()
      .references(() => studySessions.id, { onDelete: "cascade" }),
    worldId: uuid("world_id")
      .notNull()
      .references(() => farmWorlds.id, { onDelete: "cascade" }),
    goldAwarded: integer("gold_awarded").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("farm_harvest_claims_world_id_idx").on(table.worldId)]
);
```

In the `reviewLogs` column list, after `grade:`, add:

```ts
    // Memory strength at harvest time (pre-review interval); 0 for legacy rows.
    intervalDaysBefore: integer("interval_days_before").notNull().default(0),
```

Append to the bottom type block:

```ts
export type FarmWorld = typeof farmWorlds.$inferSelect;
export type FarmBed = typeof farmBeds.$inferSelect;
export type FarmPlot = typeof farmPlots.$inferSelect;
export type FarmItem = typeof farmItems.$inferSelect;
export type FarmHarvestClaim = typeof farmHarvestClaims.$inferSelect;
```

- [ ] **Step 2: Generate the migration**

From `apps/web`:

```bash
bun run db:generate
```

Expected: a new `apps/web/drizzle/0003_*.sql` containing `CREATE TABLE "farm_worlds"`, `"farm_beds"`, `"farm_plots"`, `"farm_items"`, `"farm_harvest_claims"`, and `ALTER TABLE "review_logs" ADD COLUMN "interval_days_before"`.

- [ ] **Step 3: Extend the schema test**

In `apps/web/lib/db/__tests__/schema.test.ts` add (keep existing tests; add these imports to the existing import block):

```ts
import { farmHarvestClaims, farmWorlds } from "../schema";

test("farm defaults", () => {
  expect(farmWorlds.gold.default).toBe(40);
  expect(farmWorlds.tier.default).toBe(0);
  expect(farmHarvestClaims.sessionId.primaryKey).toBeTruthy();
});
```

- [ ] **Step 4: Run tests**

```bash
bun test lib/db/__tests__/schema.test.ts
```

Expected: PASS (all tests, old and new).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/db/schema.ts apps/web/lib/db/__tests__/schema.test.ts apps/web/drizzle/
git commit -m "feat(db): farm world/bed/plot/item tables and review interval snapshot"
```

---

### Task 2: Content registry + zh→vi pack

**Files:**

- Create: `apps/web/lib/game/content/types.ts`
- Create: `apps/web/lib/game/content/registry.ts`
- Create: `apps/web/lib/game/content/zh.ts`
- Create: `apps/web/lib/game/content/index.ts`
- Test: `apps/web/lib/game/content/content.test.ts`

**Interfaces:**

- Consumes: type-only imports of `CardExample`, `CardCollocation` from `@/lib/db/schema` (erased at compile — module stays client-safe).
- Produces (used by Tasks 6, 9, 11, 12): `type LanguagePack`, `type SeedWord`, `type SeedPack`, `type FarmTier`, `type FarmTheme`; `LANG_PACKS: Record<string, LanguagePack>`; `registerLanguage(pack)`, `validateContent(packs): string[]`, `langsFromKey(langKey): { sourceLang; targetLang } | null`. The registered zh pack lives at `LANG_PACKS["zh-vi"]` with `pack.packs` keys `"greetings"` and `"food"`, 12 words each.

- [ ] **Step 1: Write `types.ts`**

```ts
import type { CardCollocation, CardExample } from "@/lib/db/schema";

export type FarmTheme = {
  sky: [string, string];
  ground: [string, string];
  plot: string;
  plotBorder: string;
  accent: string;
};

export type FarmTier = {
  key: string;
  name: string;
  subtitle: string;
  theme: FarmTheme;
};

export type SeedWord = {
  hanzi: string;
  pinyin: string;
  translation: string;
  examples: CardExample[];
  collocations: CardCollocation[];
};

export type SeedPack = {
  key: string;
  name: string;
  icon: string;
  words: SeedWord[];
};

export type LanguagePack = {
  key: string;
  sourceLang: string;
  targetLang: string;
  name: string;
  flag: string;
  tiers: FarmTier[];
  packs: SeedPack[];
};
```

- [ ] **Step 2: Write `registry.ts`**

```ts
import type { LanguagePack } from "./types";

export const TIER_COUNT = 9;

export const LANG_PACKS: Record<string, LanguagePack> = {};

export function registerLanguage(pack: LanguagePack): LanguagePack {
  LANG_PACKS[pack.key] = pack;
  return pack;
}

export function langsFromKey(
  langKey: string
): { sourceLang: string; targetLang: string } | null {
  const match = /^([a-z]{2})-([a-z]{2})$/.exec(langKey);
  return match ? { sourceLang: match[1], targetLang: match[2] } : null;
}

// Port of Xuyên Không's validateData idea: every content error is caught at
// test time, never in gameplay.
export function validateContent(packs: LanguagePack[]): string[] {
  const errors: string[] = [];
  for (const pack of packs) {
    if (!langsFromKey(pack.key)) {
      errors.push(`${pack.key}: lang key must look like "zh-vi"`);
    }
    if (pack.tiers.length !== TIER_COUNT) {
      errors.push(
        `${pack.key}: must define ${TIER_COUNT} tiers, got ${pack.tiers.length}`
      );
    }
    const hanzi = new Set<string>();
    const packKeys = new Set<string>();
    for (const seedPack of pack.packs) {
      if (packKeys.has(seedPack.key)) {
        errors.push(`${pack.key}: duplicate pack key ${seedPack.key}`);
      }
      packKeys.add(seedPack.key);
      for (const word of seedPack.words) {
        if (
          !word.hanzi.trim() ||
          !word.pinyin.trim() ||
          !word.translation.trim()
        ) {
          errors.push(
            `${pack.key}/${seedPack.key}: empty field on ${word.hanzi}`
          );
        }
        if (hanzi.has(word.hanzi)) {
          errors.push(`${pack.key}: duplicate hanzi ${word.hanzi}`);
        }
        hanzi.add(word.hanzi);
      }
    }
  }
  return errors;
}
```

````

- [ ] **Step 3: Write `zh.ts`**

```ts
import { registerLanguage } from "./registry";
import type { LanguagePack } from "./types";

const w = (
  hanzi: string,
  pinyin: string,
  translation: string,
  example: [string, string, string],
  collocations: { phrase: string; pinyin: string; translation: string }[] = []
) => ({
  hanzi,
  pinyin,
  translation,
  examples: [
    { hanzi: example[0], pinyin: example[1], translation: example[2] },
  ],
  collocations,
});

export const zh: LanguagePack = {
  key: "zh-vi",
  sourceLang: "zh",
  targetLang: "vi",
  name: "中文 · Việt",
  flag: "🇨🇳",
  tiers: [
    { key: "t0", name: "First Sprouts", subtitle: "Your first words take root",
      theme: { sky: ["#aee3f5", "#e8f7e0"], ground: ["#8fbf6a", "#6b9c4c"], plot: "#8a5a33", plotBorder: "#5d3a1e", accent: "#e07b2a" } },
    { key: "t1", name: "Growing Garden", subtitle: "The garden fills with life",
      theme: { sky: ["#9fd8ef", "#f4eccb"], ground: ["#7fb35c", "#5a8a41"], plot: "#8a5a33", plotBorder: "#5d3a1e", accent: "#d95f2b" } },
    { key: "t2", name: "Village Bloom", subtitle: "A village grows around your words",
      theme: { sky: ["#f3c98b", "#fbe9c8"], ground: ["#94b25f", "#6f8a44"], plot: "#96603a", plotBorder: "#66401f", accent: "#c94f30" } },
    { key: "t3", name: "Stone Town", subtitle: "Stone walls and busy markets",
      theme: { sky: ["#b9cfe4", "#e9e2d0"], ground: ["#8a9a6a", "#65734c"], plot: "#8d6b4a", plotBorder: "#5e4630", accent: "#b8543a" } },
    { key: "t4", name: "Trade Harbor", subtitle: "Ships carry your words far away",
      theme: { sky: ["#8ec9e8", "#f2e4c4"], ground: ["#7ba86a", "#568049"], plot: "#7d5233", plotBorder: "#53351d", accent: "#2f7fa3" } },
    { key: "t5", name: "Industrial Farm", subtitle: "Steam and steel, harvests at scale",
      theme: { sky: ["#c9c3b4", "#e8dcc0"], ground: ["#8f8f6d", "#6a6a4e"], plot: "#6f5136", plotBorder: "#49341f", accent: "#a3622c" } },
    { key: "t6", name: "Modern Metropolis", subtitle: "City lights, endless vocabulary",
      theme: { sky: ["#a8c4dd", "#dfe7ea"], ground: ["#7d9977", "#59725a"], plot: "#6e5a45", plotBorder: "#483a2b", accent: "#3a8fb5" } },
    { key: "t7", name: "Neon Future", subtitle: "Words glow in the night city",
      theme: { sky: ["#3b2f63", "#7a4f8f"], ground: ["#3f4f6a", "#2a3550"], plot: "#4a3d5c", plotBorder: "#2e2440", accent: "#e04f9f" } },
    { key: "t8", name: "Star Colony", subtitle: "Your vocabulary reaches the stars",
      theme: { sky: ["#1a103f", "#4a2a6a"], ground: ["#5c4a7a", "#3d3055"], plot: "#5a3f70", plotBorder: "#39254d", accent: "#5fd4d0" } },
  ],
  packs: [
    {
      key: "greetings",
      name: "Greetings",
      icon: "👋",
      words: [
        w("你好", "nǐ hǎo", "xin chào", ["你好！", "Nǐ hǎo!", "Xin chào!"]),
        w("谢谢", "xiè xie", "cảm ơn", ["谢谢！", "Xiè xie!", "Cảm ơn!"]),
        w("再见", "zài jiàn", "tạm biệt", ["再见！", "Zài jiàn!", "Tạm biệt!"]),
        w("对不起", "duì bu qǐ", "xin lỗi", ["对不起，我迟到了。", "Duìbuqǐ, wǒ chídàole.", "Xin lỗi, tôi đến trễ."]),
        w("请", "qǐng", "mời, xin", ["请坐。", "Qǐng zuò.", "Mời ngồi."]),
        w("是", "shì", "là, vâng", ["我是学生。", "Wǒ shì xuéshēng.", "Tôi là học sinh."]),
        w("不", "bù", "không", ["我不是老师。", "Wǒ bù shì lǎoshī.", "Tôi không phải giáo viên."]),
        w("我", "wǒ", "tôi", ["我很高兴。", "Wǒ hěn gāoxìng.", "Tôi rất vui."]),
        w("你", "nǐ", "bạn", ["你好吗？", "Nǐ hǎoma?", "Bạn có khỏe không?"]),
        w("他", "tā", "anh ấy, ông ấy", ["他是我的朋友。", "Tā shì wǒ de péngyǒu.", "Anh ấy là bạn của tôi."]),
        w("很", "hěn", "rất", ["今天很热。", "Jīntiān hěn rè.", "Hôm nay rất nóng."]),
        w("吗", "ma", "không? (phần hỏi)", ["你是越南人吗？", "Nǐ shì Yuènánrén ma?", "Bạn là người Việt phải không?"]),
      ],
    },
    {
      key: "food",
      name: "Food & Drink",
      icon: "🍜",
      words: [
        w("吃", "chī", "ăn", ["我要吃饭。", "Wǒ yào chīfàn.", "Tôi muốn ăn cơm."],
          [{ phrase: "吃饭", pinyin: "chī fàn", translation: "ăn cơm" }]),
        w("喝", "hē", "uống", ["你想喝什么？", "Nǐ xiǎng hē shénme?", "Bạn muốn uống gì?"],
          [{ phrase: "喝水", pinyin: "hē shuǐ", translation: "uống nước" }]),
        w("水", "shuǐ", "nước", ["请给我水。", "Qǐng gěi wǒ shuǐ.", "Cho tôi nước."]),
        w("米饭", "mǐ fàn", "cơm", ["我喜欢米饭。", "Wǒ xǐhuān mǐfàn.", "Tôi thích cơm."]),
        w("面条", "miàn tiáo", "mì, bún", ["这碗面条很好吃。", "Zhè wǎn miàntiáo hěn hǎochī.", "Bát mì này rất ngon."]),
        w("茶", "chá", "trà", ["我要一杯茶。", "Wǒ yào yì bēi chá.", "Tôi muốn một tách trà."]),
        w("咖啡", "kā fēi", "cà phê", ["早上我喝咖啡。", "Zǎoshang wǒ hē kāfēi.", "Buổi sáng tôi uống cà phê."]),
        w("苹果", "píng guǒ", "táo", ["这个苹果很甜。", "Zhège píngguǒ hěn tián.", "Quả táo này rất ngọt."],
          [{ phrase: "吃苹果", pinyin: "chī píngguǒ", translation: "ăn táo" }]),
        w("鱼", "yú", "cá", ["我不吃鱼。", "Wǒ bù chī yú.", "Tôi không ăn cá."]),
        w("鸡肉", "jī ròu", "thịt gà", ["我要鸡肉面。", "Wǒ yào jīròu miàn.", "Tôi muốn mì gà."]),
        w("鸡蛋", "jī dàn", "trứng", ["早餐吃两个鸡蛋。", "Zǎocān chī liǎng gè jīdàn.", "Bữa sáng ăn hai quả trứng."]),
        w("水果", "shuǐ guǒ", "trái cây", ["她喜欢水果。", "Tā xǐhuān shuǐguǒ.", "Cô ấy thích trái cây."]),
      ],
    },
  ],
};

registerLanguage(zh);
````

- [ ] **Step 4: Write `index.ts`**

```ts
import { zh } from "./zh";

export {
  LANG_PACKS,
  langsFromKey,
  registerLanguage,
  validateContent,
} from "./registry";
export type {
  FarmTheme,
  FarmTier,
  LanguagePack,
  SeedPack,
  SeedWord,
} from "./types";

// Importing this module registers every built-in language pack exactly once.
void zh;
```

- [ ] **Step 5: Write the failing test** (`content.test.ts`)

```ts
import { describe, expect, test } from "bun:test";

import { LANG_PACKS, langsFromKey, validateContent } from "./registry";
import { zh } from "./zh";
import type { LanguagePack } from "./types";

describe("content registry", () => {
  test("zh pack passes validation", () => {
    expect(validateContent([zh])).toEqual([]);
  });

  test("zh pack is registered under its key with 2 packs of 12 words", () => {
    expect(LANG_PACKS["zh-vi"]).toBe(zh);
    expect(zh.packs).toHaveLength(2);
    expect(zh.packs.every((pack) => pack.words.length === 12)).toBe(true);
  });

  test("flags structural errors", () => {
    const bad: LanguagePack = {
      ...zh,
      key: "xx-vi",
      tiers: zh.tiers.slice(0, 3),
      packs: [
        {
          key: "dup",
          name: "A",
          icon: "x",
          words: zh.packs[0].words.slice(0, 2),
        },
        { key: "dup", name: "B", icon: "y", words: [zh.packs[0].words[0]] },
      ],
    };
    const errors = validateContent([bad]);
    expect(errors.some((e) => e.includes("must define 9 tiers"))).toBe(true);
    expect(errors.some((e) => e.includes("duplicate pack key"))).toBe(true);
    expect(errors.some((e) => e.includes("duplicate hanzi"))).toBe(true);
  });

  test("langsFromKey parses and rejects", () => {
    expect(langsFromKey("zh-vi")).toEqual({
      sourceLang: "zh",
      targetLang: "vi",
    });
    expect(langsFromKey("zhvi")).toBeNull();
  });
});
```

- [ ] **Step 6: Run tests**

```bash
bun test lib/game/content/content.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/game/content/
git commit -m "feat(web): language pack registry with zh-vi seed content"
```

---

### Task 3: Economy + crop-stage core

**Files:**

- Create: `apps/web/lib/game/core/economy.ts`
- Create: `apps/web/lib/game/core/crops.ts`
- Test: `apps/web/lib/game/core/core.test.ts`

**Interfaces:**

- Consumes: `ReviewGrade`, `overdueRatio` from `@colyglot/srs`.
- Produces (used by Tasks 7, 9, 12): `STARTING_GOLD = 40`, `START_PLOTS = 6`, `PLOTS_PER_EXPAND = 3`, `EXPAND_BASE_COST = 20`, `expandBedCost(plotCount): number`, `baseHarvestGold(intervalDaysBefore): number`, `harvestGold(intervalDaysBefore, grade): number`; `type CropStage = "fresh" | "growing" | "ready" | "urgent"`, `cropStage(schedule, now): CropStage`, `formatWait(dueAt, now): string`.

- [ ] **Step 1: Write the failing test** (`core.test.ts`)

```ts
import { describe, expect, test } from "bun:test";

import { ReviewGrade } from "@colyglot/srs";

import { baseHarvestGold, expandBedCost, harvestGold } from "./economy";
import { cropStage, formatWait } from "./crops";

const DAY = 24 * 60 * 60 * 1000;

describe("economy", () => {
  test("base gold scales with pre-review interval, capped at 60 days", () => {
    expect(baseHarvestGold(0)).toBe(2);
    expect(baseHarvestGold(1)).toBe(3);
    expect(baseHarvestGold(6)).toBe(8);
    expect(baseHarvestGold(30)).toBe(32);
    expect(baseHarvestGold(60)).toBe(62);
    expect(baseHarvestGold(100)).toBe(62);
    expect(baseHarvestGold(-5)).toBe(2);
  });

  test("grade multipliers reward strong recall", () => {
    expect(harvestGold(6, ReviewGrade.GOOD)).toBe(8);
    expect(harvestGold(30, ReviewGrade.FORGOT)).toBe(8);
    expect(harvestGold(0, ReviewGrade.EASY)).toBe(3);
    expect(harvestGold(1, ReviewGrade.PERFECT)).toBe(5);
    expect(harvestGold(6, ReviewGrade.HARD)).toBe(6);
  });

  test("expansion cost steps 20 / 40 / 60", () => {
    expect(expandBedCost(6)).toBe(20);
    expect(expandBedCost(9)).toBe(40);
    expect(expandBedCost(12)).toBe(60);
  });
});

describe("cropStage", () => {
  const now = new Date("2026-09-27T12:00:00Z");

  test("no schedule means fresh seedling", () => {
    expect(cropStage(null, now)).toBe("fresh");
  });

  test("future due date means growing", () => {
    expect(
      cropStage({ dueAt: new Date(now.getTime() + DAY), intervalDays: 1 }, now)
    ).toBe("growing");
  });

  test("recently due means ready", () => {
    expect(
      cropStage(
        { dueAt: new Date(now.getTime() - DAY / 2), intervalDays: 10 },
        now
      )
    ).toBe("ready");
  });

  test("overdue by a full interval means urgent", () => {
    expect(
      cropStage(
        { dueAt: new Date(now.getTime() - 15 * DAY), intervalDays: 10 },
        now
      )
    ).toBe("urgent");
  });
});

describe("formatWait", () => {
  const now = new Date("2026-09-27T12:00:00Z");

  test("renders human countdown", () => {
    expect(formatWait(new Date(now.getTime() + 90 * 60 * 1000), now)).toBe(
      "1h 30m"
    );
    expect(formatWait(new Date(now.getTime() + 45 * 60 * 1000), now)).toBe(
      "45m"
    );
    expect(formatWait(new Date(now.getTime() + 3 * DAY), now)).toBe("3d");
    expect(formatWait(new Date(now.getTime() - 1000), now)).toBe("now");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test lib/game/core/core.test.ts
```

Expected: FAIL — cannot resolve `./economy` / `./crops`.

- [ ] **Step 3: Write `economy.ts`**

```ts
import { ReviewGrade } from "@colyglot/srs";

export const STARTING_GOLD = 40;
export const START_PLOTS = 6;
export const PLOTS_PER_EXPAND = 3;
export const EXPAND_BASE_COST = 20;
export const BASE_GOLD_CAP_DAYS = 60;

export function expansionsSoFar(plotCount: number): number {
  return Math.floor((plotCount - START_PLOTS) / PLOTS_PER_EXPAND);
}

// Cost of the NEXT expansion from a bed with `plotCount` plots: 20, 40, 60 …
export function expandBedCost(plotCount: number): number {
  return EXPAND_BASE_COST * (expansionsSoFar(plotCount) + 1);
}

// Mature memories pay more: the pre-review interval IS memory strength.
export function baseHarvestGold(intervalDaysBefore: number): number {
  const clamped = Math.min(Math.max(intervalDaysBefore, 0), BASE_GOLD_CAP_DAYS);
  return 2 + clamped;
}

export const GRADE_GOLD_MULTIPLIER: Record<ReviewGrade, number> = {
  [ReviewGrade.FORGOT]: 0.25,
  [ReviewGrade.HARD]: 0.75,
  [ReviewGrade.GOOD]: 1,
  [ReviewGrade.EASY]: 1.25,
  [ReviewGrade.PERFECT]: 1.5,
};

export function harvestGold(
  intervalDaysBefore: number,
  grade: ReviewGrade
): number {
  return Math.max(
    1,
    Math.round(
      baseHarvestGold(intervalDaysBefore) * GRADE_GOLD_MULTIPLIER[grade]
    )
  );
}
```

- [ ] **Step 4: Write `crops.ts`**

```ts
import { overdueRatio } from "@colyglot/srs";

export type CropStage = "fresh" | "growing" | "ready" | "urgent";

export type CropSchedule = { dueAt: Date; intervalDays: number } | null;

// The SM-2 schedule drives the farm's visual state; nothing is stored twice.
export function cropStage(schedule: CropSchedule, now: Date): CropStage {
  if (!schedule) return "fresh";
  if (schedule.dueAt.getTime() > now.getTime()) return "growing";
  const ratio = overdueRatio(
    {
      id: "crop",
      createdAt: now,
      schedule: { dueAt: schedule.dueAt, intervalDays: schedule.intervalDays },
    },
    now
  );
  return ratio !== null && ratio >= 1 ? "urgent" : "ready";
}

export function formatWait(dueAt: Date, now: Date): string {
  const ms = dueAt.getTime() - now.getTime();
  if (ms <= 60 * 1000) return "now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d`;
}
```

- [ ] **Step 5: Run tests**

```bash
bun test lib/game/core/core.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/game/core/
git commit -m "feat(web): farm economy and crop stage core"
```

---

### Task 4: Palette utils

**Files:**

- Create: `apps/web/lib/game/art/palette.ts`
- Test: `apps/web/lib/game/art/palette.test.ts`

**Interfaces:**

- Produces (used by Task 11 plot art): `hexToRgb(hex): [number, number, number]`, `rgbToHex(rgb): string`, `shade(hex, amount): string`, `mix(hexA, hexB, t): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";

import { hexToRgb, mix, rgbToHex, shade } from "./palette";

describe("palette", () => {
  test("hex parsing handles 3 and 6 digit forms", () => {
    expect(hexToRgb("abc")).toEqual([170, 187, 204]);
    expect(hexToRgb("#808080")).toEqual([128, 128, 128]);
  });

  test("round trip", () => {
    expect(rgbToHex(hexToRgb("#7a5a33"))).toBe("#7a5a33");
  });

  test("shade darkens with negative, lightens with positive", () => {
    expect(shade("#808080", 0.5)).toBe("#c0c0c0");
    expect(shade("#808080", -0.5)).toBe("#404040");
    expect(shade("#ffffff", 1)).toBe("#ffffff");
    expect(shade("#000000", -1)).toBe("#000000");
  });

  test("mix interpolates", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#ff0000", "#0000ff", 0)).toBe("#ff0000");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test lib/game/art/palette.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `palette.ts`** (concept ported from Xuyên Không's `XK.Art` color helpers)

```ts
export function hexToRgb(hex: string): [number, number, number] {
  let value = hex.replace("#", "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" + [r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("")
  );
}

// amount < 0 darkens toward black, > 0 lightens toward white.
export function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  return rgbToHex(
    rgb.map((channel) =>
      amount < 0 ? channel * (1 + amount) : channel + (255 - channel) * amount
    ) as [number, number, number]
  );
}

export function mix(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(
    [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as [number, number, number]
  );
}
```

- [ ] **Step 4: Run tests**

```bash
bun test lib/game/art/palette.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/game/art/palette.ts apps/web/lib/game/art/palette.test.ts
git commit -m "feat(web): theme palette math for procedural farm art"
```

---

### Task 5: Language-scoped study queries

**Files:**

- Modify: `apps/web/lib/db/repositories/study.ts`
- Test: `apps/web/lib/db/__tests__/lang-queue.test.ts` (new)

**Interfaces:**

- Consumes: existing `DueQueueItem`, `dueCondition()`, tables, `Card` type.
- Produces (used by Tasks 6, 9): `getDueQueueForLang(userId, sourceLang, targetLang, limit?): Promise<DueQueueItem[]>`; `countDueForLang(userId, sourceLang, targetLang): Promise<number>` (includes fresh/unscheduled cards — same semantics as `getDueQueue`); `countFreshForLang(userId, sourceLang, targetLang): Promise<number>`; `listFreshForLang(userId, sourceLang, targetLang, limit): Promise<Card[]>` (unscheduled only, oldest first).

- [ ] **Step 1: Write the failing integration test**

```ts
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

import { createCard, createDeck } from "../repositories/content";
import {
  countDueForLang,
  countFreshForLang,
  getDueQueueForLang,
  listFreshForLang,
} from "../repositories/study";

const databaseUrl = process.env.DATABASE_URL ?? "";
const describeIntegration = databaseUrl ? describe : describe.skip;

const USER = "lang-queue-user";
const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../../drizzle", import.meta.url)
);

describeIntegration("language-scoped study queries", () => {
  let rawClient: ReturnType<typeof postgres>;

  beforeAll(async () => {
    rawClient = postgres(databaseUrl, {
      max: 1,
      prepare: false,
      onnotice: () => {},
    });
    await migrate(drizzle(rawClient), { migrationsFolder: MIGRATIONS_FOLDER });
  });

  afterAll(async () => {
    await rawClient?.end();
  });

  beforeEach(async () => {
    await rawClient`truncate table decks, cards, card_schedules, study_sessions, review_logs, card_recordings, deck_progress, farm_worlds cascade`;
  });

  test("queues are scoped to the language pair", async () => {
    const zhDeck = await createDeck(USER, {
      name: "zh deck",
      sourceLang: "zh",
      targetLang: "vi",
    });
    const enDeck = await createDeck(USER, {
      name: "en deck",
      sourceLang: "en",
      targetLang: "vi",
    });
    const zhCard = await createCard(USER, {
      deckId: zhDeck.id,
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      translation: "xin chào",
      examples: [],
      collocations: [],
    });
    await createCard(USER, {
      deckId: enDeck.id,
      hanzi: "hello",
      pinyin: "hello",
      translation: "xin chào",
      examples: [],
      collocations: [],
    });

    const queue = await getDueQueueForLang(USER, "zh", "vi");
    expect(queue).toHaveLength(1);
    expect(queue[0].card.id).toBe(zhCard!.id);
    expect(await countDueForLang(USER, "zh", "vi")).toBe(1);
    expect(await countDueForLang(USER, "en", "vi")).toBe(1);

    const fresh = await listFreshForLang(USER, "zh", "vi", 10);
    expect(fresh.map((card) => card.hanzi)).toEqual(["你好"]);
    expect(await countFreshForLang(USER, "zh", "vi")).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test lib/db/__tests__/lang-queue.test.ts
```

Expected: FAIL — exports not found in `repositories/study`.

- [ ] **Step 3: Implement in `repositories/study.ts`**

Add `isNull` to the existing `drizzle-orm` import if missing, then add after `getDueQueue`:

```ts
function langCondition(sourceLang: string, targetLang: string) {
  return and(
    eq(decks.sourceLang, sourceLang),
    eq(decks.targetLang, targetLang)
  );
}

export async function getDueQueueForLang(
  userId: string,
  sourceLang: string,
  targetLang: string,
  limit: number = DEFAULT_DUE_QUEUE_LIMIT
): Promise<DueQueueItem[]> {
  return getDb()
    .select({ card: cards, schedule: cardSchedules })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .leftJoin(cardSchedules, eq(cardSchedules.cardId, cards.id))
    .where(
      and(
        eq(decks.userId, userId),
        langCondition(sourceLang, targetLang),
        dueCondition()
      )
    )
    .orderBy(
      asc(sql`${cardSchedules.dueAt} is null`),
      asc(cardSchedules.dueAt),
      asc(cards.createdAt)
    )
    .limit(limit);
}

export async function countDueForLang(
  userId: string,
  sourceLang: string,
  targetLang: string
): Promise<number> {
  const [row] = await getDb()
    .select({ total: sql<number>`count(*)::int` })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .leftJoin(cardSchedules, eq(cardSchedules.cardId, cards.id))
    .where(
      and(
        eq(decks.userId, userId),
        langCondition(sourceLang, targetLang),
        dueCondition()
      )
    );
  return row?.total ?? 0;
}

export async function countFreshForLang(
  userId: string,
  sourceLang: string,
  targetLang: string
): Promise<number> {
  const [row] = await getDb()
    .select({ total: sql<number>`count(*)::int` })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .leftJoin(cardSchedules, eq(cardSchedules.cardId, cards.id))
    .where(
      and(
        eq(decks.userId, userId),
        langCondition(sourceLang, targetLang),
        isNull(cardSchedules.cardId)
      )
    );
  return row?.total ?? 0;
}

export async function listFreshForLang(
  userId: string,
  sourceLang: string,
  targetLang: string,
  limit: number
): Promise<Card[]> {
  return getDb()
    .select({ card: cards })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .leftJoin(cardSchedules, eq(cardSchedules.cardId, cards.id))
    .where(
      and(
        eq(decks.userId, userId),
        langCondition(sourceLang, targetLang),
        isNull(cardSchedules.cardId)
      )
    )
    .orderBy(asc(cards.createdAt))
    .limit(limit)
    .then((rows) => rows.map((row) => row.card));
}
```

- [ ] **Step 4: Run tests**

```bash
bun test lib/db/__tests__/lang-queue.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/db/repositories/study.ts apps/web/lib/db/__tests__/lang-queue.test.ts
git commit -m "feat(db): language-scoped due queue and fresh card queries"
```

---

### Task 6: Farm view types + world repository (start, import, snapshot)

**Files:**

- Create: `apps/web/lib/game/types.ts` (client-safe view types)
- Create: `apps/web/lib/db/repositories/farm.ts`
- Test: `apps/web/lib/db/__tests__/farm-world.test.ts`

**Interfaces:**

- Consumes: `START_PLOTS`, `STARTING_GOLD` from `@/lib/game/core/economy`; `countDueForLang`, `countFreshForLang`, `listFreshForLang` from `./study`; `levelFromXp` from `../schema`.
- Produces (used by Tasks 7, 9, 10, 11): types `PlotView`, `BedView`, `FreshCardView`, `HarvestCard`, `FarmWorldSnapshot`; `startFarmWorld(userId, input): Promise<FarmWorld | undefined>` (idempotent); `getFarmWorld(userId, langKey)`; `listFarmWorlds(userId): Promise<{ world: FarmWorld; dueCount: number }[]>`; `loadFarmWorldDetail(userId, langKey): Promise<FarmWorldSnapshot | undefined>`.

- [ ] **Step 1: Write `apps/web/lib/game/types.ts`**

```ts
import type { CardExample, FarmStats } from "@/lib/db/schema";

export type PlotView = {
  slotIndex: number;
  cardId: string | null;
  hanzi: string | null;
  pinyin: string | null;
  translation: string | null;
  plantedAt: Date | null;
  variant: number;
  schedule: { dueAt: Date; intervalDays: number; reviewCount: number } | null;
};

export type BedView = {
  id: string;
  deckId: string;
  name: string;
  plotCount: number;
  position: number;
  plots: PlotView[];
};

export type FreshCardView = {
  cardId: string;
  hanzi: string;
  pinyin: string;
  translation: string;
};

export type HarvestCard = {
  cardId: string;
  hanzi: string;
  pinyin: string;
  translation: string;
  examples: CardExample[];
  fresh: boolean;
};

export type FarmWorldSnapshot = {
  world: {
    id: string;
    langKey: string;
    tier: number;
    gold: number;
    stats: FarmStats;
  };
  beds: BedView[];
  items: { itemKey: string; qty: number }[];
  freshQueue: FreshCardView[];
  dueCount: number;
  freshCount: number;
  xp: number;
  level: number;
};
```

- [ ] **Step 2: Write the failing integration test**

```ts
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

import { createCard, createDeck } from "../repositories/content";
import {
  listFarmWorlds,
  loadFarmWorldDetail,
  startFarmWorld,
} from "../repositories/farm";

const databaseUrl = process.env.DATABASE_URL ?? "";
const describeIntegration = databaseUrl ? describe : describe.skip;

const USER_A = "farm-user-a";
const USER_B = "farm-user-b";
const ZH = {
  langKey: "zh-vi",
  sourceLang: "zh",
  targetLang: "vi",
  worldName: "中文 · Việt",
  bedName: "Zh garden",
};
const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../../drizzle", import.meta.url)
);

describeIntegration("farm world repository", () => {
  let rawClient: ReturnType<typeof postgres>;

  beforeAll(async () => {
    rawClient = postgres(databaseUrl, {
      max: 1,
      prepare: false,
      onnotice: () => {},
    });
    await migrate(drizzle(rawClient), { migrationsFolder: MIGRATIONS_FOLDER });
  });

  afterAll(async () => {
    await rawClient?.end();
  });

  beforeEach(async () => {
    await rawClient`truncate table decks, cards, card_schedules, study_sessions, review_logs, card_recordings, deck_progress, farm_worlds cascade`;
  });

  test("start creates world, garden bed, and is idempotent", async () => {
    const world = await startFarmWorld(USER_A, ZH);
    expect(world).toBeDefined();
    expect(world!.gold).toBe(40);

    const again = await startFarmWorld(USER_A, ZH);
    expect(again!.id).toBe(world!.id);

    const detail = await loadFarmWorldDetail(USER_A, "zh-vi");
    expect(detail!.beds).toHaveLength(1);
    expect(detail!.beds[0].plotCount).toBe(6);
    expect(detail!.beds[0].plots).toHaveLength(6);
    expect(detail!.beds[0].plots.every((plot) => plot.cardId === null)).toBe(
      true
    );
  });

  test("legacy same-language decks import as beds with planted cards", async () => {
    const legacy = await createDeck(USER_A, {
      name: "Old zh deck",
      sourceLang: "zh",
      targetLang: "vi",
    });
    for (const hanzi of ["一", "二", "三", "四", "五", "六", "七", "八"]) {
      await createCard(USER_A, {
        deckId: legacy.id,
        hanzi,
        pinyin: "x",
        translation: "y",
        examples: [],
        collocations: [],
      });
    }
    const enDeck = await createDeck(USER_A, {
      name: "En deck",
      sourceLang: "en",
      targetLang: "vi",
    });
    await createCard(USER_A, {
      deckId: enDeck.id,
      hanzi: "hello",
      pinyin: "x",
      translation: "y",
      examples: [],
      collocations: [],
    });

    await startFarmWorld(USER_A, ZH);
    const detail = await loadFarmWorldDetail(USER_A, "zh-vi");
    expect(detail!.beds).toHaveLength(2);
    const imported = detail!.beds.find((bed) => bed.deckId === legacy.id)!;
    // ceil(8 cards / 2) = 4, clamped up to START_PLOTS = 6; 6 oldest planted.
    expect(imported.plotCount).toBe(6);
    const plantedHanzi = imported.plots
      .slice()
      .sort((a, b) => a.slotIndex - b.slotIndex)
      .map((plot) => plot.hanzi);
    expect(plantedHanzi).toEqual(["一", "二", "三", "四", "五", "六"]);
    expect(detail!.beds.some((bed) => bed.deckId === enDeck.id)).toBe(false);
  });

  test("snapshot exposes counts and world state", async () => {
    await startFarmWorld(USER_A, ZH);
    const detail = await loadFarmWorldDetail(USER_A, "zh-vi");
    expect(detail!.dueCount).toBe(0);
    expect(detail!.freshCount).toBe(0);
    expect(detail!.xp).toBe(0);
    expect(detail!.level).toBe(1);

    const overviews = await listFarmWorlds(USER_A);
    expect(overviews).toHaveLength(1);
    expect(overviews[0].dueCount).toBe(0);
  });

  test("user isolation", async () => {
    await startFarmWorld(USER_A, ZH);
    expect(await loadFarmWorldDetail(USER_B, "zh-vi")).toBeUndefined();
    expect(await listFarmWorlds(USER_B)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
bun test lib/db/__tests__/farm-world.test.ts
```

Expected: FAIL — `repositories/farm` not found.

- [ ] **Step 4: Implement `repositories/farm.ts`**

```ts
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { START_PLOTS, STARTING_GOLD } from "@/lib/game/core/economy";
import type { BedView, FarmWorldSnapshot, PlotView } from "@/lib/game/types";

import { getDb } from "../index";
import {
  cardSchedules,
  cards,
  deckProgress,
  decks,
  farmBeds,
  farmItems,
  farmPlots,
  farmWorlds,
  levelFromXp,
  type Card,
  type FarmStats,
  type FarmWorld,
} from "../schema";
import { countDueForLang, countFreshForLang, listFreshForLang } from "./study";

export type StartFarmWorldInput = {
  langKey: string;
  sourceLang: string;
  targetLang: string;
  worldName: string;
  bedName: string;
};

export type FarmWorldOverview = { world: FarmWorld; dueCount: number };

export async function getFarmWorld(
  userId: string,
  langKey: string
): Promise<FarmWorld | undefined> {
  const [world] = await getDb()
    .select()
    .from(farmWorlds)
    .where(and(eq(farmWorlds.userId, userId), eq(farmWorlds.langKey, langKey)))
    .limit(1);
  return world;
}

export async function startFarmWorld(
  userId: string,
  input: StartFarmWorldInput
): Promise<FarmWorld | undefined> {
  const existing = await getFarmWorld(userId, input.langKey);
  if (existing) {
    return existing;
  }

  return getDb().transaction(async (tx) => {
    const [world] = await tx
      .insert(farmWorlds)
      .values({ userId, langKey: input.langKey, gold: STARTING_GOLD })
      .onConflictDoNothing()
      .returning();
    if (!world) {
      // Raced another start; the winner's world already exists.
      return getFarmWorld(userId, input.langKey);
    }

    const [gardenDeck] = await tx
      .insert(decks)
      .values({
        userId,
        name: input.bedName,
        sourceLang: input.sourceLang,
        targetLang: input.targetLang,
      })
      .returning();

    await tx.insert(farmBeds).values({
      worldId: world.id,
      deckId: gardenDeck.id,
      plotCount: START_PLOTS,
      position: 0,
    });

    // Legacy decks of the same language pair become beds; oldest cards
    // occupy the first slots so the farm never starts empty.
    const legacyDecks = await tx
      .select()
      .from(decks)
      .where(
        and(
          eq(decks.userId, userId),
          eq(decks.sourceLang, input.sourceLang),
          eq(decks.targetLang, input.targetLang)
        )
      )
      .orderBy(asc(decks.createdAt));

    let position = 1;
    for (const deck of legacyDecks) {
      if (deck.id === gardenDeck.id) continue;
      const deckCards = await tx
        .select({ id: cards.id })
        .from(cards)
        .where(eq(cards.deckId, deck.id))
        .orderBy(asc(cards.createdAt));
      const plotCount = Math.max(START_PLOTS, Math.ceil(deckCards.length / 2));
      const [bed] = await tx
        .insert(farmBeds)
        .values({ worldId: world.id, deckId: deck.id, plotCount, position })
        .returning();
      position += 1;
      if (deckCards.length > 0) {
        await tx.insert(farmPlots).values(
          deckCards.slice(0, plotCount).map((card, index) => ({
            bedId: bed.id,
            slotIndex: index,
            cardId: card.id,
          }))
        );
      }
    }

    return world;
  });
}

export async function listFarmWorlds(
  userId: string
): Promise<FarmWorldOverview[]> {
  const worlds = await getDb()
    .select()
    .from(farmWorlds)
    .where(eq(farmWorlds.userId, userId));
  return Promise.all(
    worlds.map(async (world) => ({
      world,
      dueCount: await countDueForLang(
        userId,
        world.langKey.slice(0, 2),
        world.langKey.slice(3, 5)
      ),
    }))
  );
}

export async function loadFarmWorldDetail(
  userId: string,
  langKey: string
): Promise<FarmWorldSnapshot | undefined> {
  const world = await getFarmWorld(userId, langKey);
  if (!world) {
    return undefined;
  }
  const sourceLang = langKey.slice(0, 2);
  const targetLang = langKey.slice(3, 5);

  const bedRows = await getDb()
    .select({ bed: farmBeds, deckName: decks.name })
    .from(farmBeds)
    .innerJoin(decks, eq(farmBeds.deckId, decks.id))
    .where(eq(farmBeds.worldId, world.id))
    .orderBy(asc(farmBeds.position));

  const bedIds = bedRows.map((row) => row.bed.id);
  const plotRows = bedIds.length
    ? await getDb()
        .select({
          bedId: farmPlots.bedId,
          slotIndex: farmPlots.slotIndex,
          plantedAt: farmPlots.plantedAt,
          variant: farmPlots.variant,
          cardId: cards.id,
          hanzi: cards.hanzi,
          pinyin: cards.pinyin,
          translation: cards.translation,
          dueAt: cardSchedules.dueAt,
          intervalDays: cardSchedules.intervalDays,
          reviewCount: cardSchedules.reviewCount,
        })
        .from(farmPlots)
        .innerJoin(cards, eq(farmPlots.cardId, cards.id))
        .leftJoin(cardSchedules, eq(cardSchedules.cardId, cards.id))
        .where(inArray(farmPlots.bedId, bedIds))
    : [];

  const beds: BedView[] = bedRows.map(({ bed, deckName }) => {
    const plots: PlotView[] = Array.from(
      { length: bed.plotCount },
      (_, slotIndex) => {
        const row = plotRows.find(
          (plot) => plot.bedId === bed.id && plot.slotIndex === slotIndex
        );
        return row
          ? {
              slotIndex,
              cardId: row.cardId,
              hanzi: row.hanzi,
              pinyin: row.pinyin,
              translation: row.translation,
              plantedAt: row.plantedAt,
              variant: row.variant,
              schedule:
                row.dueAt !== null && row.intervalDays !== null
                  ? {
                      dueAt: row.dueAt,
                      intervalDays: row.intervalDays,
                      reviewCount: row.reviewCount ?? 0,
                    }
                  : null,
            }
          : {
              slotIndex,
              cardId: null,
              hanzi: null,
              pinyin: null,
              translation: null,
              plantedAt: null,
              variant: 0,
              schedule: null,
            };
      }
    );
    return {
      id: bed.id,
      deckId: bed.deckId,
      name: deckName,
      plotCount: bed.plotCount,
      position: bed.position,
      plots,
    };
  });

  const items = await getDb()
    .select({ itemKey: farmItems.itemKey, qty: farmItems.qty })
    .from(farmItems)
    .where(eq(farmItems.worldId, world.id));

  const freshCards = await listFreshForLang(userId, sourceLang, targetLang, 20);
  const dueCount = await countDueForLang(userId, sourceLang, targetLang);
  const freshCount = await countFreshForLang(userId, sourceLang, targetLang);

  const [xpRow] = await getDb()
    .select({ xp: sql<number>`coalesce(sum(${deckProgress.xp}), 0)::int` })
    .from(deckProgress)
    .innerJoin(decks, eq(deckProgress.deckId, decks.id))
    .where(
      and(
        eq(deckProgress.userId, userId),
        eq(decks.sourceLang, sourceLang),
        eq(decks.targetLang, targetLang)
      )
    );
  const xp = xpRow?.xp ?? 0;

  return {
    world: {
      id: world.id,
      langKey: world.langKey,
      tier: world.tier,
      gold: world.gold,
      stats: world.stats as FarmStats,
    },
    beds,
    items,
    freshQueue: freshCards.map((card: Card) => ({
      cardId: card.id,
      hanzi: card.hanzi,
      pinyin: card.pinyin,
      translation: card.translation,
    })),
    dueCount,
    freshCount,
    xp,
    level: levelFromXp(xp),
  };
}
```

- [ ] **Step 5: Run tests**

```bash
bun test lib/db/__tests__/farm-world.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/game/types.ts apps/web/lib/db/repositories/farm.ts apps/web/lib/db/__tests__/farm-world.test.ts
git commit -m "feat(db): farm world start, legacy deck import, snapshot loading"
```

---

### Task 7: Bed operations + harvest claim

**Files:**

- Modify: `apps/web/lib/db/repositories/farm.ts`
- Test: `apps/web/lib/db/__tests__/farm-ops.test.ts` (new)

**Interfaces:**

- Consumes: `expandBedCost`, `harvestGold`, `PLOTS_PER_EXPAND` from `@/lib/game/core/economy`; `ReviewGrade` from `@colyglot/srs`; `getStudySession` from `./study`; `SeedWord` type from `@/lib/game/content/types`.
- Produces (used by Tasks 9, 10):
  - `type PlantSeedsResult = { planted: { hanzi: string; cardId: string; slotIndex: number }[]; skipped: string[]; bedFull: boolean }`
  - `plantSeeds(userId, langKey, bedId, words: SeedWord[]): Promise<PlantSeedsResult | undefined>` — `undefined` = bed/world not owned; duplicates → `skipped`; no free slot → `bedFull: true`
  - `expandFarmBed(userId, bedId): Promise<{ plotCount: number; gold: number } | "insufficient" | undefined>` — computes cost from current plotCount, atomic gold guard
  - `type ClaimHarvestResult = { alreadyClaimed: boolean; goldAwarded: number; cardsHarvested: number; gold: number }`
  - `claimSessionHarvest(userId, sessionId, langKey): Promise<ClaimHarvestResult | undefined>`

- [ ] **Step 1: Write the failing integration test**

```ts
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { ReviewGrade } from "@colyglot/srs";

import { createCard, createDeck } from "../repositories/content";
import {
  claimSessionHarvest,
  expandFarmBed,
  loadFarmWorldDetail,
  plantSeeds,
  startFarmWorld,
} from "../repositories/farm";
import { appendReviewLog, openStudySession } from "../repositories/study";
import type { SeedWord } from "@/lib/game/content/types";

const databaseUrl = process.env.DATABASE_URL ?? "";
const describeIntegration = databaseUrl ? describe : describe.skip;

const USER = "farm-ops-user";
const ZH = {
  langKey: "zh-vi",
  sourceLang: "zh",
  targetLang: "vi",
  worldName: "中文 · Việt",
  bedName: "Zh garden",
};
const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../../drizzle", import.meta.url)
);

function word(hanzi: string): SeedWord {
  return {
    hanzi,
    pinyin: "x",
    translation: "y",
    examples: [],
    collocations: [],
  };
}

describeIntegration("farm bed operations and harvest claim", () => {
  let rawClient: ReturnType<typeof postgres>;

  beforeAll(async () => {
    rawClient = postgres(databaseUrl, {
      max: 1,
      prepare: false,
      onnotice: () => {},
    });
    await migrate(drizzle(rawClient), { migrationsFolder: MIGRATIONS_FOLDER });
  });

  afterAll(async () => {
    await rawClient?.end();
  });

  beforeEach(async () => {
    await rawClient`truncate table decks, cards, card_schedules, study_sessions, review_logs, card_recordings, deck_progress, farm_worlds cascade`;
  });

  async function gardenBedId(): Promise<string> {
    const detail = await loadFarmWorldDetail(USER, "zh-vi");
    if (!detail) throw new Error("world missing");
    return detail.beds[0].id;
  }

  test("plantSeeds fills free slots and skips duplicates", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();

    const result = await plantSeeds(USER, "zh-vi", bedId, [
      word("你好"),
      word("谢谢"),
    ]);
    expect(result!.planted.map((p) => p.hanzi)).toEqual(["你好", "谢谢"]);
    expect(result!.skipped).toEqual([]);

    const dup = await plantSeeds(USER, "zh-vi", bedId, [
      word("你好"),
      word("再见"),
    ]);
    expect(dup!.planted.map((p) => p.hanzi)).toEqual(["再见"]);
    expect(dup!.skipped).toEqual(["你好"]);
  });

  test("plantSeeds reports bed full", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    await plantSeeds(
      USER,
      "zh-vi",
      bedId,
      ["一", "二", "三", "四", "五", "六"].map(word)
    );
    const result = await plantSeeds(USER, "zh-vi", bedId, [word("七")]);
    expect(result!.bedFull).toBe(true);
    expect(result!.planted).toEqual([]);
  });

  test("plantSeeds returns undefined for another user's bed", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    expect(
      await plantSeeds("other-user", "zh-vi", bedId, [word("你好")])
    ).toBeUndefined();
  });

  test("expandFarmBed charges gold atomically", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();

    const first = await expandFarmBed(USER, bedId);
    expect(first).toEqual({ plotCount: 9, gold: 20 });

    const second = await expandFarmBed(USER, bedId); // costs 40 > 20 remaining
    expect(second).toBe("insufficient");
  });

  test("claimSessionHarvest pays per-grade gold once, scoped to language", async () => {
    await startFarmWorld(USER, ZH);
    const bedId = await gardenBedId();
    const planted = await plantSeeds(USER, "zh-vi", bedId, [
      word("你好"),
      word("谢谢"),
    ]);
    const zhCardId = planted!.planted[0].cardId;

    const enDeck = await createDeck(USER, {
      name: "en",
      sourceLang: "en",
      targetLang: "vi",
    });
    const enCard = await createCard(USER, {
      deckId: enDeck.id,
      hanzi: "hello",
      pinyin: "x",
      translation: "y",
      examples: [],
      collocations: [],
    });

    const session = await openStudySession(USER);
    await appendReviewLog(USER, {
      cardId: zhCardId,
      sessionId: session.id,
      grade: ReviewGrade.GOOD,
      intervalDaysBefore: 6,
    });
    await appendReviewLog(USER, {
      cardId: enCard!.id,
      sessionId: session.id,
      grade: ReviewGrade.PERFECT,
      intervalDaysBefore: 30,
    });

    const claim = await claimSessionHarvest(USER, session.id, "zh-vi");
    expect(claim).toEqual({
      alreadyClaimed: false,
      goldAwarded: 8,
      cardsHarvested: 1,
      gold: 48,
    });

    const reClaim = await claimSessionHarvest(USER, session.id, "zh-vi");
    expect(reClaim!.alreadyClaimed).toBe(true);
    expect(reClaim!.gold).toBe(48);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test lib/db/__tests__/farm-ops.test.ts
```

Expected: FAIL — `plantSeeds`/`expandFarmBed`/`claimSessionHarvest` not exported.

- [ ] **Step 3: Implement — append to `repositories/farm.ts`**

Extend the file's imports: add `farmHarvestClaims`, `reviewLogs`, `studySessions` to the schema import; add `expandBedCost`, `harvestGold`, `PLOTS_PER_EXPAND` to the economy import; add `ReviewGrade` from `@colyglot/srs`; add `getStudySession` to the `./study` import; add `import type { SeedWord } from "@/lib/game/content/types";`. Then append:

```ts
export type PlantSeedsResult = {
  planted: { hanzi: string; cardId: string; slotIndex: number }[];
  skipped: string[];
  bedFull: boolean;
};

export async function plantSeeds(
  userId: string,
  langKey: string,
  bedId: string,
  words: SeedWord[]
): Promise<PlantSeedsResult | undefined> {
  const [owned] = await getDb()
    .select({ bed: farmBeds, world: farmWorlds })
    .from(farmBeds)
    .innerJoin(farmWorlds, eq(farmBeds.worldId, farmWorlds.id))
    .where(
      and(
        eq(farmBeds.id, bedId),
        eq(farmWorlds.userId, userId),
        eq(farmWorlds.langKey, langKey)
      )
    )
    .limit(1);
  if (!owned) {
    return undefined;
  }
  const result: PlantSeedsResult = { planted: [], skipped: [], bedFull: false };

  await getDb().transaction(async (tx) => {
    const occupied = await tx
      .select({ slotIndex: farmPlots.slotIndex })
      .from(farmPlots)
      .where(eq(farmPlots.bedId, bedId));
    const taken = new Set(occupied.map((row) => row.slotIndex));
    const freeSlots: number[] = [];
    for (let slot = 0; slot < owned.bed.plotCount; slot += 1) {
      if (!taken.has(slot)) freeSlots.push(slot);
    }
    if (freeSlots.length === 0) {
      result.bedFull = true;
      return;
    }

    const existingHanzi = await tx
      .select({ hanzi: cards.hanzi })
      .from(cards)
      .where(eq(cards.deckId, owned.bed.deckId));
    const knownHanzi = new Set(existingHanzi.map((row) => row.hanzi));

    let slotCursor = 0;
    for (const seed of words) {
      if (knownHanzi.has(seed.hanzi)) {
        result.skipped.push(seed.hanzi);
        continue;
      }
      if (slotCursor >= freeSlots.length) {
        result.skipped.push(seed.hanzi);
        continue;
      }
      const [card] = await tx
        .insert(cards)
        .values({ ...seed, deckId: owned.bed.deckId })
        .returning();
      const slotIndex = freeSlots[slotCursor];
      slotCursor += 1;
      await tx.insert(farmPlots).values({ bedId, slotIndex, cardId: card.id });
      result.planted.push({ hanzi: seed.hanzi, cardId: card.id, slotIndex });
    }

    if (result.planted.length > 0) {
      await tx
        .update(farmWorlds)
        .set({
          stats: sql`jsonb_set(${farmWorlds.stats}, '{planted}', ((${farmWorlds.stats} ->> 'planted')::int + ${result.planted.length})::text::jsonb)`,
          updatedAt: new Date(),
        })
        .where(eq(farmWorlds.id, owned.world.id));
    }
  });

  return result;
}

export async function expandFarmBed(
  userId: string,
  bedId: string
): Promise<{ plotCount: number; gold: number } | "insufficient" | undefined> {
  const [row] = await getDb()
    .select({ bed: farmBeds, world: farmWorlds })
    .from(farmBeds)
    .innerJoin(farmWorlds, eq(farmBeds.worldId, farmWorlds.id))
    .where(and(eq(farmBeds.id, bedId), eq(farmWorlds.userId, userId)))
    .limit(1);
  if (!row) {
    return undefined;
  }
  const cost = expandBedCost(row.bed.plotCount);
  const newPlotCount = row.bed.plotCount + PLOTS_PER_EXPAND;

  return getDb().transaction(async (tx) => {
    const [world] = await tx
      .update(farmWorlds)
      .set({ gold: sql`${farmWorlds.gold} - ${cost}`, updatedAt: new Date() })
      .where(
        and(eq(farmWorlds.id, row.world.id), sql`${farmWorlds.gold} >= ${cost}`)
      )
      .returning();
    if (!world) {
      return "insufficient" as const;
    }
    await tx
      .update(farmBeds)
      .set({ plotCount: newPlotCount })
      .where(eq(farmBeds.id, bedId));
    return { plotCount: newPlotCount, gold: world.gold };
  });
}

export type ClaimHarvestResult = {
  alreadyClaimed: boolean;
  goldAwarded: number;
  cardsHarvested: number;
  gold: number;
};

export async function claimSessionHarvest(
  userId: string,
  sessionId: string,
  langKey: string
): Promise<ClaimHarvestResult | undefined> {
  const session = await getStudySession(userId, sessionId);
  const world = await getFarmWorld(userId, langKey);
  if (!session || !world) {
    return undefined;
  }
  const sourceLang = langKey.slice(0, 2);
  const targetLang = langKey.slice(3, 5);

  const logs = await getDb()
    .select({
      grade: reviewLogs.grade,
      intervalDaysBefore: reviewLogs.intervalDaysBefore,
    })
    .from(reviewLogs)
    .innerJoin(cards, eq(reviewLogs.cardId, cards.id))
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(
      and(
        eq(reviewLogs.sessionId, sessionId),
        eq(decks.userId, userId),
        eq(decks.sourceLang, sourceLang),
        eq(decks.targetLang, targetLang)
      )
    );

  // Insert-once claim marker makes the whole operation idempotent.
  const [claim] = await getDb()
    .insert(farmHarvestClaims)
    .values({ sessionId, worldId: world.id, goldAwarded: 0 })
    .onConflictDoNothing()
    .returning();
  if (!claim) {
    return {
      alreadyClaimed: true,
      goldAwarded: 0,
      cardsHarvested: 0,
      gold: world.gold,
    };
  }

  const goldAwarded = logs.reduce(
    (total, log) =>
      total + harvestGold(log.intervalDaysBefore, log.grade as ReviewGrade),
    0
  );

  return getDb().transaction(async (tx) => {
    const [updated] = await tx
      .update(farmWorlds)
      .set({
        gold: sql`${farmWorlds.gold} + ${goldAwarded}`,
        stats: sql`jsonb_set(jsonb_set(${farmWorlds.stats}, '{harvested}', ((${farmWorlds.stats} ->> 'harvested')::int + ${logs.length})::text::jsonb), '{goldEarned}', ((${farmWorlds.stats} ->> 'goldEarned')::int + ${goldAwarded})::text::jsonb)`,
        updatedAt: new Date(),
      })
      .where(eq(farmWorlds.id, world.id))
      .returning();
    await tx
      .update(farmHarvestClaims)
      .set({ goldAwarded })
      .where(eq(farmHarvestClaims.sessionId, sessionId));
    return {
      alreadyClaimed: false,
      goldAwarded,
      cardsHarvested: logs.length,
      gold: updated.gold,
    };
  });
}
```

Note: `studySessions` does not need importing after all — remove it from the import list if the linter flags it unused.

- [ ] **Step 4: Run tests**

```bash
bun test lib/db/__tests__/farm-ops.test.ts lib/db/__tests__/farm-world.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/db/repositories/farm.ts apps/web/lib/db/__tests__/farm-ops.test.ts
git commit -m "feat(db): plant seeds, expand bed, idempotent harvest claims"
```

---

### Task 8: Record `intervalDaysBefore` in `gradeCardAction`

**Files:**

- Modify: `apps/web/lib/db/repositories/study.ts` (optional field on `AppendReviewLogInput`)
- Modify: `apps/web/lib/actions/study.ts` (pass pre-review interval)
- Test: `apps/web/lib/db/__tests__/data-layer.test.ts` (extend)

**Interfaces:**

- Produces: `AppendReviewLogInput = { cardId; sessionId; grade; intervalDaysBefore?: number }` (optional — existing call sites keep compiling). The action records `current?.intervalDays ?? 0`. SRS math untouched.

- [ ] **Step 1: Write the failing test**

`apps/web/lib/db/__tests__/data-layer.test.ts` already defines `USER_ID = "user-a"` and a helper `createDeckWithCard(hanzi?)` returning `{ deck, card }`, and already imports `openStudySession`, `upsertCardSchedule`, `appendReviewLog`, `ReviewGrade` (add any missing ones to the existing import blocks). Append inside the main `describeIntegration` block:

```ts
test("appendReviewLog snapshots the pre-review interval", async () => {
  const { card } = await createDeckWithCard("间隔");
  const session = await openStudySession(USER_ID);
  await upsertCardSchedule(USER_ID, card.id, {
    easeFactor: 2.5,
    intervalDays: 6,
    dueAt: new Date(),
    reviewCount: 2,
    consecutiveCorrect: 2,
    lapses: 0,
    lastReviewedAt: null,
  });
  const log = await appendReviewLog(USER_ID, {
    cardId: card.id,
    sessionId: session.id,
    grade: ReviewGrade.GOOD,
    intervalDaysBefore: 6,
  });
  expect(log!.intervalDaysBefore).toBe(6);

  const legacy = await appendReviewLog(USER_ID, {
    cardId: card.id,
    sessionId: session.id,
    grade: ReviewGrade.GOOD,
  });
  expect(legacy!.intervalDaysBefore).toBe(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test lib/db/__tests__/data-layer.test.ts
```

Expected: FAIL — `intervalDaysBefore` does not exist on the log type.

- [ ] **Step 3: Implement**

In `repositories/study.ts`:

```ts
export type AppendReviewLogInput = {
  cardId: string;
  sessionId: string;
  grade: ReviewGrade;
  // Pre-review memory strength for the farm economy; 0 for legacy callers.
  intervalDaysBefore?: number;
};
```

and change the insert to:

```ts
const [log] = await getDb()
  .insert(reviewLogs)
  .values({ ...input, intervalDaysBefore: input.intervalDaysBefore ?? 0 })
  .returning();
```

In `actions/study.ts`, change the `appendReviewLog` call to:

```ts
const log = await appendReviewLog(userId, {
  cardId,
  sessionId,
  grade,
  intervalDaysBefore: current?.intervalDays ?? 0,
});
```

- [ ] **Step 4: Run all integration tests**

```bash
bun test lib/db
```

Expected: PASS (existing tests unaffected — the field is optional).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/db/repositories/study.ts apps/web/lib/actions/study.ts apps/web/lib/db/__tests__/data-layer.test.ts
git commit -m "feat(db): snapshot pre-review interval on review logs"
```

---

### Task 9: Farm server actions

**Files:**

- Create: `apps/web/lib/actions/farm.ts`

**Interfaces:**

- Consumes: `LANG_PACKS`, `langsFromKey` from `@/lib/game/content`; `HarvestCard` from `@/lib/game/types`; `getDueQueueForLang`, `openStudySession` from `@/lib/db/repositories/study`; Task 6/7 repositories; `requireUserId` from `@/lib/auth/session`.
- Produces (used by Tasks 10–14):
  - `startWorldAction(langKey: string): Promise<ActionResult<{ langKey: string }>>`
  - `plantSeedsAction(langKey: string, bedId: string, hanziList: string[]): Promise<ActionResult<PlantSeedsResult>>`
  - `expandBedAction(bedId: string): Promise<ActionResult<{ plotCount: number; gold: number }>>`
  - `claimHarvestAction(sessionId: string, langKey: string): Promise<ActionResult<ClaimHarvestResult>>`
  - `openHarvestAction(langKey: string): Promise<ActionResult<{ sessionId: string; queue: HarvestCard[] }>>`

- [ ] **Step 1: Write `actions/farm.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import { LANG_PACKS, langsFromKey } from "@/lib/game/content";
import type { SeedWord } from "@/lib/game/content/types";
import type { HarvestCard } from "@/lib/game/types";
import {
  claimSessionHarvest,
  expandFarmBed,
  getFarmWorld,
  plantSeeds,
  startFarmWorld,
  type ClaimHarvestResult,
  type PlantSeedsResult,
} from "@/lib/db/repositories/farm";
import {
  getDueQueueForLang,
  openStudySession,
} from "@/lib/db/repositories/study";
import type { ActionResult } from "./types";

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function startWorldAction(
  langKey: string
): Promise<ActionResult<{ langKey: string }>> {
  const userId = await requireUserId();
  const pack = LANG_PACKS[langKey];
  if (!pack) {
    return { ok: false, error: "Unknown language" };
  }
  try {
    const world = await startFarmWorld(userId, {
      langKey,
      sourceLang: pack.sourceLang,
      targetLang: pack.targetLang,
      worldName: pack.name,
      bedName: `${pack.name} garden`,
    });
    if (!world) {
      return { ok: false, error: "Could not start farm" };
    }
    revalidatePath("/");
    return { ok: true, data: { langKey } };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function plantSeedsAction(
  langKey: string,
  bedId: string,
  hanziList: string[]
): Promise<ActionResult<PlantSeedsResult>> {
  const userId = await requireUserId();
  const pack = LANG_PACKS[langKey];
  if (!pack) {
    return { ok: false, error: "Unknown language" };
  }
  const wanted = new Set(hanziList);
  const words: SeedWord[] = pack.packs
    .flatMap((seedPack) => seedPack.words)
    .filter((word) => wanted.has(word.hanzi));
  try {
    const result = await plantSeeds(userId, langKey, bedId, words);
    if (!result) {
      return { ok: false, error: "Bed not found" };
    }
    revalidatePath("/");
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function expandBedAction(
  bedId: string
): Promise<ActionResult<{ plotCount: number; gold: number }>> {
  const userId = await requireUserId();
  try {
    const result = await expandFarmBed(userId, bedId);
    if (result === undefined) {
      return { ok: false, error: "Bed not found" };
    }
    if (result === "insufficient") {
      return { ok: false, error: "Not enough gold" };
    }
    revalidatePath("/");
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function claimHarvestAction(
  sessionId: string,
  langKey: string
): Promise<ActionResult<ClaimHarvestResult>> {
  const userId = await requireUserId();
  try {
    const result = await claimSessionHarvest(userId, sessionId, langKey);
    if (!result) {
      return { ok: false, error: "Nothing to claim" };
    }
    revalidatePath("/");
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function openHarvestAction(
  langKey: string
): Promise<ActionResult<{ sessionId: string; queue: HarvestCard[] }>> {
  const userId = await requireUserId();
  const langs = langsFromKey(langKey);
  const world = await getFarmWorld(userId, langKey);
  if (!langs || !world) {
    return { ok: false, error: "Farm not found" };
  }
  try {
    const session = await openStudySession(userId);
    const queue = await getDueQueueForLang(
      userId,
      langs.sourceLang,
      langs.targetLang,
      50
    );
    return {
      ok: true,
      data: {
        sessionId: session.id,
        queue: queue.map((item) => ({
          cardId: item.card.id,
          hanzi: item.card.hanzi,
          pinyin: item.card.pinyin,
          translation: item.card.translation,
          examples: item.card.examples,
          fresh: item.schedule === null,
        })),
      },
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
bun run typecheck && bun run lint
```

Expected: PASS (run in `apps/web`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/actions/farm.ts
git commit -m "feat(web): farm server actions for world, seeds, expand, harvest"
```

---

### Task 10: Farm store with optimistic transformers

**Files:**

- Create: `apps/web/lib/game/store/farm-store.ts`
- Test: `apps/web/lib/game/store/farm-store.test.ts`

**Interfaces:**

- Consumes: `FarmWorldSnapshot` from `@/lib/game/types` (client-safe — never import from repositories here).
- Produces (used by Tasks 11–14): pure transformers `applyPlant(snapshot, bedId, hanzi, pinyin, translation)`, `applyGoldDelta(snapshot, delta)`, `applyClaim(snapshot, claim)`, `applyExpand(snapshot, bedId, plotCount, gold)`, `rollbackPlant(snapshot, bedId, hanziList)` — all `FarmWorldSnapshot -> FarmWorldSnapshot`; zustand `useFarmStore` with `{ snapshot, hydrate(snapshot), setSnapshot(snapshot) }`. Optimistic plot cards carry `cardId` starting with `"temp-"`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";

import type { FarmWorldSnapshot } from "@/lib/game/types";
import {
  applyClaim,
  applyExpand,
  applyGoldDelta,
  applyPlant,
  rollbackPlant,
} from "./farm-store";

function fixture(): FarmWorldSnapshot {
  return {
    world: {
      id: "w1",
      langKey: "zh-vi",
      tier: 0,
      gold: 40,
      stats: { planted: 1, harvested: 0, goldEarned: 0 },
    },
    beds: [
      {
        id: "b1",
        deckId: "d1",
        name: "Garden",
        plotCount: 6,
        position: 0,
        plots: [
          {
            slotIndex: 0,
            cardId: "c1",
            hanzi: "你好",
            pinyin: "nǐ hǎo",
            translation: "xin chào",
            plantedAt: new Date(),
            variant: 0,
            schedule: null,
          },
          ...Array.from({ length: 5 }, (_, i) => ({
            slotIndex: i + 1,
            cardId: null,
            hanzi: null,
            pinyin: null,
            translation: null,
            plantedAt: null,
            variant: 0,
            schedule: null,
          })),
        ],
      },
    ],
    items: [],
    freshQueue: [],
    dueCount: 0,
    freshCount: 1,
    xp: 0,
    level: 1,
  };
}

describe("farm store transformers", () => {
  test("applyPlant fills the first empty slot with a temp card", () => {
    const next = applyPlant(fixture(), "b1", "谢谢", "xiè xie", "cảm ơn");
    expect(next.beds[0].plots[1].hanzi).toBe("谢谢");
    expect(next.beds[0].plots[1].cardId?.startsWith("temp-")).toBe(true);
    expect(next.freshCount).toBe(2);
  });

  test("applyPlant is a no-op when the bed is full", () => {
    const base = fixture();
    const full = {
      ...base,
      beds: [
        {
          ...base.beds[0],
          plots: base.beds[0].plots.map((p) => ({ ...p, cardId: "x" })),
        },
      ],
    };
    expect(applyPlant(full, "b1", "谢谢", "xiè xie", "cảm ơn")).toBe(full);
  });

  test("applyGoldDelta and applyClaim update gold", () => {
    expect(applyGoldDelta(fixture(), -20).world.gold).toBe(20);
    const claimed = applyClaim(fixture(), {
      goldAwarded: 8,
      cardsHarvested: 1,
      gold: 48,
    });
    expect(claimed.world.gold).toBe(48);
    expect(claimed.world.stats.goldEarned).toBe(8);
    expect(claimed.world.stats.harvested).toBe(1);
  });

  test("applyExpand grows plotCount and gold", () => {
    const next = applyExpand(fixture(), "b1", 9, 20);
    expect(next.beds[0].plotCount).toBe(9);
    expect(next.beds[0].plots).toHaveLength(9);
    expect(next.world.gold).toBe(20);
  });

  test("rollbackPlant removes optimistic temp plots", () => {
    const planted = applyPlant(fixture(), "b1", "谢谢", "xiè xie", "cảm ơn");
    const rolledBack = rollbackPlant(planted, "b1", ["谢谢"]);
    expect(rolledBack.beds[0].plots[1].hanzi).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test lib/game/store/farm-store.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `farm-store.ts`**

```ts
import { create } from "zustand";

import type { FarmWorldSnapshot } from "@/lib/game/types";

type BedView = FarmWorldSnapshot["beds"][number];

function withBed(
  snapshot: FarmWorldSnapshot,
  bedId: string,
  map: (bed: BedView) => BedView
): FarmWorldSnapshot {
  return {
    ...snapshot,
    beds: snapshot.beds.map((bed) => (bed.id === bedId ? map(bed) : bed)),
  };
}

export function applyPlant(
  snapshot: FarmWorldSnapshot,
  bedId: string,
  hanzi: string,
  pinyin: string,
  translation: string
): FarmWorldSnapshot {
  let planted = false;
  const next = withBed(snapshot, bedId, (bed) => {
    const freeIndex = bed.plots.findIndex((plot) => plot.cardId === null);
    if (freeIndex === -1) return bed;
    planted = true;
    const plots = bed.plots.slice();
    plots[freeIndex] = {
      ...plots[freeIndex],
      cardId: `temp-${hanzi}`,
      hanzi,
      pinyin,
      translation,
      plantedAt: new Date(),
    };
    return { ...bed, plots };
  });
  return planted ? { ...next, freshCount: snapshot.freshCount + 1 } : snapshot;
}

export function applyGoldDelta(
  snapshot: FarmWorldSnapshot,
  delta: number
): FarmWorldSnapshot {
  return {
    ...snapshot,
    world: { ...snapshot.world, gold: snapshot.world.gold + delta },
  };
}

export function applyClaim(
  snapshot: FarmWorldSnapshot,
  claim: { goldAwarded: number; cardsHarvested: number; gold: number }
): FarmWorldSnapshot {
  return {
    ...snapshot,
    world: {
      ...snapshot.world,
      gold: claim.gold,
      stats: {
        planted: snapshot.world.stats.planted,
        harvested: snapshot.world.stats.harvested + claim.cardsHarvested,
        goldEarned: snapshot.world.stats.goldEarned + claim.goldAwarded,
      },
    },
  };
}

export function applyExpand(
  snapshot: FarmWorldSnapshot,
  bedId: string,
  plotCount: number,
  gold: number
): FarmWorldSnapshot {
  const next = withBed(snapshot, bedId, (bed) => {
    const plots = bed.plots.slice();
    while (plots.length < plotCount) {
      plots.push({
        slotIndex: plots.length,
        cardId: null,
        hanzi: null,
        pinyin: null,
        translation: null,
        plantedAt: null,
        variant: 0,
        schedule: null,
      });
    }
    return { ...bed, plotCount, plots };
  });
  return { ...next, world: { ...next.world, gold } };
}

export function rollbackPlant(
  snapshot: FarmWorldSnapshot,
  bedId: string,
  hanziList: string[]
): FarmWorldSnapshot {
  const hanziSet = new Set(hanziList);
  return withBed(snapshot, bedId, (bed) => ({
    ...bed,
    plots: bed.plots.map((plot) =>
      plot.cardId?.startsWith("temp-") && plot.hanzi && hanziSet.has(plot.hanzi)
        ? {
            ...plot,
            cardId: null,
            hanzi: null,
            pinyin: null,
            translation: null,
            plantedAt: null,
          }
        : plot
    ),
  }));
}

type FarmStoreState = {
  snapshot: FarmWorldSnapshot | null;
  hydrate: (snapshot: FarmWorldSnapshot) => void;
  setSnapshot: (snapshot: FarmWorldSnapshot) => void;
};

export const useFarmStore = create<FarmStoreState>((set) => ({
  snapshot: null,
  hydrate: (snapshot) => set({ snapshot }),
  setSnapshot: (snapshot) => set({ snapshot }),
}));
```

- [ ] **Step 4: Run tests**

```bash
bun test lib/game/store/farm-store.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/game/store/
git commit -m "feat(web): farm snapshot store with optimistic transformers"
```

---

### Task 11: Farm view page + title screen

This task wires `/` into the game: no `?lang=` → title screen; `?lang=zh-vi` → the farm view. Panels arrive in Tasks 12–14; until then the three action-bar buttons render with live counts but stay disabled (each later task replaces one `disabled` attribute with an `onClick`).

**Files:**

- Modify: `apps/web/app/page.tsx` (replace entirely)
- Create: `apps/web/components/farm/title-page-data.ts` (server)
- Create: `apps/web/components/farm/title-screen.tsx` (client)
- Create: `apps/web/components/farm/farm-game-screen.tsx` (server)
- Create: `apps/web/components/farm/start-farm-prompt.tsx` (client)
- Create: `apps/web/components/farm/farm-game.tsx` (client root)
- Create: `apps/web/components/farm/top-bar.tsx`
- Create: `apps/web/components/farm/farm-scene.tsx`
- Create: `apps/web/components/farm/art/plot-tile.tsx`
- Delete: `apps/web/components/dashboard/dashboard-content.tsx` becomes unreferenced after this task — leave deletion to Task 15.

**Interfaces:**

- Consumes: `LANG_PACKS` (Task 2), `listFarmWorlds`/`loadFarmWorldDetail` (Task 6), `getCurrentStreak` from `@/lib/db/repositories/study`, `startWorldAction`/`expandBedAction` (Task 9), `useFarmStore`/`hydrate` (Task 10), `cropStage`/`formatWait` (Task 3), `shade` (Task 4), `XP_PER_LEVEL` from `@/lib/xp`.
- Produces: `/` routes as designed. E2E hooks: plot buttons `aria-label={`Plot ${hanzi}`}`, gold `data-testid="farm-gold"`, topbar brand link `${pack.flag} ${pack.name}`, action-bar buttons named exactly `Seeds`/`Nursery`/`Harvest`(counts appended, e.g.`Nursery · 2`). Tasks 12–14 each edit `farm-game.tsx` to enable one button and render one panel.

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
import { connection } from "next/server";
import { Suspense } from "react";

import { FarmGameScreen } from "@/components/farm/farm-game-screen";
import { TitleScreen } from "@/components/farm/title-screen";
import { loadTitleScreenData } from "@/components/farm/title-page-data";
import { Skeleton } from "@/components/ui/skeleton";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={<Skeleton className="m-4 h-64 rounded-2xl" />}>
      {params.lang ? (
        <FarmGameScreen langKey={params.lang} />
      ) : (
        <TitleScreenLoader />
      )}
    </Suspense>
  );
}

async function TitleScreenLoader() {
  await connection();
  const data = await loadTitleScreenData();
  return <TitleScreen data={data} />;
}
```

- [ ] **Step 2: Write `title-page-data.ts`**

```ts
import "server-only";

import { getUserId } from "@/lib/auth/session";
import { listFarmWorlds } from "@/lib/db/repositories/farm";
import { getCurrentStreak } from "@/lib/db/repositories/study";
import { LANG_PACKS } from "@/lib/game/content";

export const FUTURE_LANGS: { langKey: string; name: string }[] = [
  { langKey: "en-vi", name: "English · Việt" },
];

export type TitleScreenData = {
  signedIn: boolean;
  streak: number;
  worlds: {
    langKey: string;
    name: string;
    flag: string;
    tierName: string;
    gold: number;
    dueCount: number;
    started: boolean;
  }[];
  futureLangs: { langKey: string; name: string }[];
};

export async function loadTitleScreenData(): Promise<TitleScreenData> {
  const userId = await getUserId();
  if (!userId) {
    return {
      signedIn: false,
      streak: 0,
      worlds: Object.values(LANG_PACKS).map((pack) => ({
        langKey: pack.key,
        name: pack.name,
        flag: pack.flag,
        tierName: pack.tiers[0].name,
        gold: 0,
        dueCount: 0,
        started: false,
      })),
      futureLangs: FUTURE_LANGS,
    };
  }

  const [overviews, streak] = await Promise.all([
    listFarmWorlds(userId),
    getCurrentStreak(userId),
  ]);

  return {
    signedIn: true,
    streak,
    worlds: Object.values(LANG_PACKS).map((pack) => {
      const overview = overviews.find(
        (entry) => entry.world.langKey === pack.key
      );
      return {
        langKey: pack.key,
        name: pack.name,
        flag: pack.flag,
        tierName: pack.tiers[overview?.world.tier ?? 0].name,
        gold: overview?.world.gold ?? 0,
        dueCount: overview?.dueCount ?? 0,
        started: Boolean(overview),
      };
    }),
    futureLangs: FUTURE_LANGS,
  };
}
```

- [ ] **Step 3: Write `title-screen.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { startWorldAction } from "@/lib/actions/farm";
import type { TitleScreenData } from "./title-page-data";

export function TitleScreen({ data }: { data: TitleScreenData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function play(langKey: string, started: boolean) {
    if (!data.signedIn) {
      router.push("/sign-in");
      return;
    }
    setBusyKey(langKey);
    try {
      if (!started) {
        const result = await startWorldAction(langKey);
        if (!result.ok) {
          setBusyKey(null);
          return;
        }
      }
      startTransition(() => {
        router.push(`/?lang=${langKey}`);
      });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center gap-6 p-6">
      <header className="mt-10 flex flex-col items-center gap-1 text-center">
        <div className="text-4xl">🌱</div>
        <h1 className="text-3xl font-extrabold">Colyglot Language Farm</h1>
        <p className="text-sm text-fg-muted">
          Plant words, harvest memories. Spaced repetition is your growing
          season.
        </p>
        {data.signedIn ? (
          <p className="text-sm">🔥 {data.streak} day streak</p>
        ) : null}
      </header>

      <section
        aria-label="Choose your language"
        className="flex w-full flex-col gap-3"
      >
        <h2 className="text-lg font-bold">Choose your language</h2>
        {data.worlds.map((world) => (
          <div
            key={world.langKey}
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4"
          >
            <div>
              <div className="text-lg font-bold">
                {world.flag} {world.name}
              </div>
              <div className="text-sm text-fg-muted">
                {world.started
                  ? `${world.tierName} · 💰 ${world.gold} · ${world.dueCount} ready to harvest`
                  : "A fresh garden awaits"}
              </div>
            </div>
            <button
              type="button"
              className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
              disabled={pending && busyKey === world.langKey}
              onClick={() => play(world.langKey, world.started)}
            >
              {world.started ? "Play" : "Start farm"}
            </button>
          </div>
        ))}
        {data.futureLangs.map((lang) => (
          <div
            key={lang.langKey}
            className="flex items-center justify-between rounded-2xl border border-dashed border-line p-4 opacity-60"
          >
            <span className="font-bold">{lang.name}</span>
            <span className="text-sm text-fg-muted">Coming soon</span>
          </div>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Write `farm-game-screen.tsx` + `start-farm-prompt.tsx`**

`farm-game-screen.tsx` (server):

```tsx
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getUserId } from "@/lib/auth/session";
import { loadFarmWorldDetail } from "@/lib/db/repositories/farm";
import { getCurrentStreak } from "@/lib/db/repositories/study";

import { FarmGame } from "./farm-game";
import { StartFarmPrompt } from "./start-farm-prompt";

export async function FarmGameScreen({ langKey }: { langKey: string }) {
  await connection();
  const userId = await getUserId();
  if (!userId) {
    redirect("/sign-in");
  }
  const [snapshot, streak] = await Promise.all([
    loadFarmWorldDetail(userId, langKey),
    getCurrentStreak(userId),
  ]);
  if (!snapshot) {
    return <StartFarmPrompt langKey={langKey} />;
  }
  return <FarmGame initialSnapshot={snapshot} streak={streak} />;
}
```

`start-farm-prompt.tsx` (client):

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { startWorldAction } from "@/lib/actions/farm";

export function StartFarmPrompt({ langKey }: { langKey: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-4xl">🌱</div>
      <h1 className="text-2xl font-extrabold">
        This farm has not been started
      </h1>
      <button
        type="button"
        className="rounded-full bg-primary px-6 py-2 font-bold text-on-primary disabled:opacity-50"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const result = await startWorldAction(langKey);
          if (result.ok) {
            router.refresh();
          }
          setBusy(false);
        }}
      >
        Start this farm
      </button>
    </main>
  );
}
```

- [ ] **Step 5: Write `top-bar.tsx`**

```tsx
"use client";

import { XP_PER_LEVEL } from "@/lib/xp";

export function TopBar({
  flag,
  langName,
  tierName,
  gold,
  level,
  xp,
  streak,
}: {
  flag: string;
  langName: string;
  tierName: string;
  gold: number;
  level: number;
  xp: number;
  streak: number;
}) {
  const intoLevel = xp % XP_PER_LEVEL;
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur">
      <a href="/" className="flex flex-col">
        <span className="text-sm font-extrabold leading-tight">
          {flag} {langName}
        </span>
        <span className="text-xs text-fg-muted">{tierName}</span>
      </a>
      <div className="flex items-center gap-3 text-sm font-bold">
        <span data-testid="farm-gold">💰 {gold}</span>
        <span title="day streak">🔥 {streak}</span>
        <span className="flex flex-col items-center">
          <span>Lv {level}</span>
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
            <span
              className="block h-full rounded-full bg-green-500"
              style={{ width: `${(intoLevel / XP_PER_LEVEL) * 100}%` }}
            />
          </span>
        </span>
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Write `art/plot-tile.tsx`**

```tsx
import { shade } from "@/lib/game/art/palette";
import { cropStage, formatWait } from "@/lib/game/core/crops";
import type { FarmTheme } from "@/lib/game/content/types";
import type { PlotView } from "@/lib/game/types";

const STAGE_GLYPH: Record<string, string> = {
  fresh: "🌱",
  growing: "🌿",
  ready: "✨",
  urgent: "🐛",
};

export function PlotTile({
  plot,
  theme,
  now,
}: {
  plot: PlotView;
  theme: FarmTheme;
  now: Date;
}) {
  if (!plot.hanzi) {
    return (
      <div
        className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed text-xs"
        style={{
          borderColor: theme.plotBorder,
          background: shade(theme.plot, -0.15),
        }}
        aria-label="Empty plot"
      >
        <span className="opacity-40">＋</span>
      </div>
    );
  }

  const stage = cropStage(plot.schedule, now);
  const ready = stage === "ready" || stage === "urgent";
  const wait = plot.schedule ? formatWait(plot.schedule.dueAt, now) : "";

  return (
    <button
      type="button"
      aria-label={`Plot ${plot.hanzi}`}
      className="relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2"
      style={{
        borderColor: theme.plotBorder,
        background: shade(theme.plot, ready ? 0.08 : -0.05),
        boxShadow: ready ? `0 0 12px ${theme.accent}66` : undefined,
      }}
    >
      <span className="text-lg leading-none">{plot.hanzi}</span>
      <span className="text-[10px] text-white/80">{plot.pinyin}</span>
      <span className="absolute right-1 top-1 text-xs">
        {STAGE_GLYPH[stage]}
      </span>
      {stage === "growing" ? (
        <span className="absolute bottom-1 text-[10px] text-white/80">
          {wait}
        </span>
      ) : null}
    </button>
  );
}
```

- [ ] **Step 7: Write `farm-scene.tsx`**

```tsx
"use client";

import { useState } from "react";

import { expandBedAction } from "@/lib/actions/farm";
import { expandBedCost } from "@/lib/game/core/economy";
import type { FarmTheme } from "@/lib/game/content/types";
import type { FarmWorldSnapshot } from "@/lib/game/types";
import { applyExpand, useFarmStore } from "@/lib/game/store/farm-store";

import { PlotTile } from "./art/plot-tile";

export function FarmScene({
  snapshot,
  theme,
  now,
  onExpandFailed,
}: {
  snapshot: FarmWorldSnapshot;
  theme: FarmTheme;
  now: Date;
  onExpandFailed: (message: string) => void;
}) {
  const setSnapshot = useFarmStore((state) => state.setSnapshot);
  const [busyBed, setBusyBed] = useState<string | null>(null);

  async function expand(bedId: string, plotCount: number) {
    setBusyBed(bedId);
    try {
      const result = await expandBedAction(bedId);
      if (result.ok) {
        setSnapshot(
          applyExpand(snapshot, bedId, result.data.plotCount, result.data.gold)
        );
      } else {
        onExpandFailed(`Need ${expandBedCost(plotCount)} gold to expand`);
      }
    } finally {
      setBusyBed(null);
    }
  }

  return (
    <div
      className="min-h-[calc(100dvh-10rem)] p-4"
      style={{
        background: `linear-gradient(to bottom, ${theme.sky[0]}, ${theme.sky[1]} 55%, ${theme.ground[0]} 55.5%, ${theme.ground[1]})`,
      }}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        {snapshot.beds.map((bed) => (
          <section
            key={bed.id}
            className="rounded-2xl border border-black/10 bg-black/10 p-3 backdrop-blur-sm"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white drop-shadow">
                {bed.name}
              </h2>
              <button
                type="button"
                className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
                disabled={busyBed === bed.id}
                onClick={() => expand(bed.id, bed.plotCount)}
              >
                +3 plots · 💰 {expandBedCost(bed.plotCount)}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {bed.plots.map((plot) => (
                <PlotTile
                  key={plot.slotIndex}
                  plot={plot}
                  theme={theme}
                  now={now}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Write `farm-game.tsx`** (v1: action-bar buttons disabled; Tasks 12–14 enable them one by one)

```tsx
"use client";

import { useEffect, useState } from "react";

import { LANG_PACKS } from "@/lib/game/content";
import type { FarmWorldSnapshot } from "@/lib/game/types";
import { useFarmStore } from "@/lib/game/store/farm-store";

import { FarmScene } from "./farm-scene";
import { TopBar } from "./top-bar";

export function FarmGame({
  initialSnapshot,
  streak,
}: {
  initialSnapshot: FarmWorldSnapshot;
  streak: number;
}) {
  const snapshot = useFarmStore((state) => state.snapshot);
  const hydrate = useFarmStore((state) => state.hydrate);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    hydrate(initialSnapshot);
  }, [initialSnapshot, hydrate]);

  const current = snapshot ?? initialSnapshot;
  const pack = LANG_PACKS[current.world.langKey];
  const tier = pack.tiers[current.world.tier];
  const now = new Date();

  return (
    <div className="min-h-dvh">
      <TopBar
        flag={pack.flag}
        langName={pack.name}
        tierName={tier.name}
        gold={current.world.gold}
        level={current.level}
        xp={current.xp}
        streak={streak}
      />
      <FarmScene
        snapshot={current}
        theme={tier.theme}
        now={now}
        onExpandFailed={setNotice}
      />
      {notice ? (
        <p className="fixed inset-x-0 bottom-24 z-10 mx-auto w-fit rounded-full bg-black/80 px-4 py-2 text-sm text-white">
          {notice}
        </p>
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-line bg-surface/95 p-2 backdrop-blur">
        <button
          type="button"
          disabled
          className="flex flex-col items-center px-4 text-xs font-bold opacity-40"
        >
          <span className="text-xl">🌰</span>Seeds
        </button>
        <button
          type="button"
          disabled
          className="flex flex-col items-center px-4 text-xs font-bold opacity-40"
        >
          <span className="text-xl">🧑‍🌾</span>Nursery
          {current.freshCount > 0 ? ` · ${current.freshCount}` : ""}
        </button>
        <button
          type="button"
          disabled
          className="flex flex-col items-center px-4 text-xs font-bold opacity-40"
        >
          <span className="text-xl">🧺</span>Harvest
          {current.dueCount > 0 ? ` · ${current.dueCount}` : ""}
        </button>
      </nav>
    </div>
  );
}
```

- [ ] **Step 9: Typecheck, lint, and run all unit tests**

```bash
bun run typecheck && bun run lint && bun test lib/game
```

Expected: PASS. Note the old dashboard still exists but nothing imports it from the new page — `DashboardContent` and `GameHudSkeleton` become dead code, removed in Task 15. If `typecheck` reports other files importing the old page's exports (it should not — `page.tsx` exports nothing), fix those imports.

- [ ] **Step 10: Commit**

```bash
git add apps/web/app/page.tsx apps/web/components/farm/
git commit -m "feat(web): farm world view with themed beds and plots"
```

---

### Task 12: Seeds panel (catalog + planting)

**Files:**

- Create: `apps/web/components/farm/seeds-panel.tsx`
- Modify: `apps/web/components/farm/farm-game.tsx`

**Interfaces:**

- Consumes: `LANG_PACKS` (Task 2), `plantSeedsAction` (Task 9), `useFarmStore`, `applyPlant`, `rollbackPlant` (Task 10).
- Produces: overlay listing packs → words with `Plant ${hanzi}` buttons and a `Planted` state for existing hanzi; success keeps the optimistic plot (then `router.refresh()` for server truth); failure rolls back with a notice. `farm-game.tsx` gains a `seeds` overlay + enabled Seeds button.

- [ ] **Step 1: Write `seeds-panel.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { plantSeedsAction } from "@/lib/actions/farm";
import { LANG_PACKS } from "@/lib/game/content";
import {
  applyPlant,
  rollbackPlant,
  useFarmStore,
} from "@/lib/game/store/farm-store";

export function SeedsPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const snapshot = useFarmStore((state) => state.snapshot);
  const setSnapshot = useFarmStore((state) => state.setSnapshot);
  const [busyHanzi, setBusyHanzi] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pack = snapshot ? LANG_PACKS[snapshot.world.langKey] : null;
  const gardenBed =
    snapshot?.beds.find((bed) => bed.position === 0) ?? snapshot?.beds[0];
  const plantedHanzi = useMemo(
    () =>
      new Set(
        (snapshot?.beds ?? []).flatMap((bed) =>
          bed.plots.flatMap((plot) => (plot.hanzi ? [plot.hanzi] : []))
        )
      ),
    [snapshot]
  );
  const freeSlots = gardenBed
    ? gardenBed.plots.filter((plot) => plot.cardId === null).length
    : 0;

  if (!snapshot || !pack || !gardenBed) {
    return null;
  }

  async function plant(hanzi: string, pinyin: string, translation: string) {
    setBusyHanzi(hanzi);
    setNotice(null);
    setSnapshot(
      applyPlant(snapshot, gardenBed!.id, hanzi, pinyin, translation)
    );
    const result = await plantSeedsAction(
      snapshot.world.langKey,
      gardenBed!.id,
      [hanzi]
    );
    if (result.ok && result.data.planted.length > 0) {
      router.refresh();
    } else {
      setSnapshot(
        rollbackPlant(
          useFarmStore.getState().snapshot ?? snapshot,
          gardenBed!.id,
          [hanzi]
        )
      );
      setNotice(
        result.ok
          ? result.data.bedFull
            ? "This bed is full — expand it first"
            : "Already planted"
          : result.error
      );
    }
    setBusyHanzi(null);
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-line p-4">
        <h1 className="text-lg font-extrabold">🌰 Seed catalog</h1>
        <div className="text-xs text-fg-muted">
          {freeSlots} free plots in {gardenBed.name}
        </div>
        <button
          type="button"
          className="rounded-full border border-line px-4 py-1 text-sm"
          onClick={onClose}
        >
          Close
        </button>
      </header>
      {notice ? (
        <p className="bg-orange-100 px-4 py-2 text-sm text-orange-900">
          {notice}
        </p>
      ) : null}
      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto p-4">
        {pack.packs.map((seedPack) => (
          <section key={seedPack.key} className="mb-6">
            <h2 className="mb-2 font-bold">
              {seedPack.icon} {seedPack.name}
            </h2>
            <ul className="flex flex-col gap-2">
              {seedPack.words.map((word) => {
                const planted = plantedHanzi.has(word.hanzi);
                return (
                  <li
                    key={word.hanzi}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3"
                  >
                    <div>
                      <div className="font-bold">
                        {word.hanzi}{" "}
                        <span className="text-sm text-fg-muted">
                          {word.pinyin}
                        </span>
                      </div>
                      <div className="text-sm text-fg-muted">
                        {word.translation}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-full bg-primary px-4 py-1 text-sm font-bold text-on-primary disabled:opacity-40"
                      disabled={planted || busyHanzi === word.hanzi}
                      onClick={() =>
                        plant(word.hanzi, word.pinyin, word.translation)
                      }
                    >
                      {planted ? "Planted" : `Plant ${word.hanzi}`}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Enable Seeds in `farm-game.tsx`**

Add import: `import { SeedsPanel } from "./seeds-panel";` and add overlay state. Replace the `notice` state line:

```tsx
const [open, setOpen] = useState<"seeds" | null>(null);
```

Replace the disabled Seeds button with:

```tsx
<button
  type="button"
  className="flex flex-col items-center px-4 text-xs font-bold"
  onClick={() => setOpen("seeds")}
>
  <span className="text-xl">🌰</span>Seeds
</button>
```

Add before `</div>` (after the notice paragraph):

```tsx
{
  open === "seeds" ? <SeedsPanel onClose={() => setOpen(null)} /> : null;
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
bun run typecheck && bun run lint
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/farm/seeds-panel.tsx apps/web/components/farm/farm-game.tsx
git commit -m "feat(web): seed catalog panel with optimistic planting"
```

---

### Task 13: Nursery session (first exposure = first review)

**Files:**

- Move: `apps/web/components/study/speak-button.tsx` → `apps/web/components/farm/speak-button.tsx` (`git mv`)
- Create: `apps/web/components/farm/nursery-session.tsx`
- Modify: `apps/web/components/farm/farm-game.tsx`

**Interfaces:**

- Consumes: `snapshot.freshQueue` (Task 6 view type), `startStudySessionAction`, `gradeCardAction`, `finishSessionAction` from `@/lib/actions/study` (existing, unmodified), `claimHarvestAction` (Task 9), `ReviewGrade` from `@/lib/db/schema`, `SpeakButton` (moved; props are `{ text: string; className?: string; onSpeakEnd?: () => void }`).
- Produces: overlay walking `freshQueue`; "Got it" grades GOOD (the first SM-2 review → 1-day interval); "Skip" advances without grading; "Stop"/end finishes the session, claims harvest gold, refreshes. `farm-game.tsx` gains the `nursery` overlay + enabled button.

- [ ] **Step 1: Move speak button**

```bash
git mv apps/web/components/study/speak-button.tsx apps/web/components/farm/speak-button.tsx
```

The file uses only absolute imports (`@/lib/utils/cn`) — no path fixes needed.

- [ ] **Step 2: Write `nursery-session.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { claimHarvestAction } from "@/lib/actions/farm";
import {
  finishSessionAction,
  gradeCardAction,
  startStudySessionAction,
} from "@/lib/actions/study";
import { ReviewGrade } from "@/lib/db/schema";
import { useFarmStore } from "@/lib/game/store/farm-store";

import { SpeakButton } from "./speak-button";

export function NurserySession({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const snapshot = useFarmStore((state) => state.snapshot);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [graded, setGraded] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const queue = snapshot?.freshQueue ?? [];
  const card = queue[index];
  const done = index >= queue.length;

  if (!snapshot) return null;

  async function ensureSession(): Promise<string> {
    if (!sessionId) {
      const result = await startStudySessionAction();
      if (!result.ok) throw new Error(result.error);
      setSessionId(result.data);
      return result.data;
    }
    return sessionId;
  }

  async function gotIt() {
    if (!card || busy) return;
    setBusy(true);
    try {
      const id = await ensureSession();
      const result = await gradeCardAction(card.cardId, id, ReviewGrade.GOOD);
      if (result.ok) {
        setGraded((count) => count + 1);
        setIndex((i) => i + 1);
      }
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (sessionId && graded > 0) {
      await finishSessionAction(sessionId, graded);
      await claimHarvestAction(sessionId, snapshot!.world.langKey);
      router.refresh();
    }
    onClose();
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
        <div className="text-4xl">🌱</div>
        <h1 className="text-xl font-extrabold">Nursery complete</h1>
        <p className="text-sm text-fg-muted">
          {graded} new words planted in memory.
        </p>
        <button
          type="button"
          className="rounded-full bg-primary px-6 py-2 font-bold text-on-primary"
          onClick={finish}
        >
          Back to farm
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-line p-4">
        <h1 className="text-lg font-extrabold">🧑‍🌾 Nursery</h1>
        <span className="text-sm text-fg-muted">
          {index + 1} / {queue.length}
        </span>
        <button
          type="button"
          className="rounded-full border border-line px-4 py-1 text-sm"
          onClick={finish}
        >
          Stop
        </button>
      </header>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-6xl font-bold">{card.hanzi}</div>
          <div className="text-xl text-fg-muted">{card.pinyin}</div>
          <div className="text-2xl font-bold">{card.translation}</div>
          <SpeakButton text={card.hanzi} />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-full border border-line px-6 py-3 font-bold disabled:opacity-50"
            disabled={busy}
            onClick={() => setIndex((i) => i + 1)}
          >
            Skip
          </button>
          <button
            type="button"
            className="rounded-full bg-green-600 px-8 py-3 font-bold text-white disabled:opacity-50"
            disabled={busy}
            onClick={gotIt}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Enable Nursery in `farm-game.tsx`**

Add `import { NurserySession } from "./nursery-session";`, widen the overlay state type to `"seeds" | "nursery" | null`, replace the disabled Nursery button with:

```tsx
<button
  type="button"
  className="flex flex-col items-center px-4 text-xs font-bold"
  onClick={() => setOpen("nursery")}
>
  <span className="text-xl">🧑‍🌾</span>Nursery
  {current.freshCount > 0 ? ` · ${current.freshCount}` : ""}
</button>
```

and add:

```tsx
{
  open === "nursery" ? <NurserySession onClose={() => setOpen(null)} /> : null;
}
```

- [ ] **Step 4: Typecheck and lint**

```bash
bun run typecheck && bun run lint
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/farm/nursery-session.tsx apps/web/components/farm/speak-button.tsx apps/web/components/farm/farm-game.tsx
git commit -m "feat(web): nursery first-exposure flow over the SRS path"
```

---

### Task 14: Harvest session + claim celebration

**Files:**

- Create: `apps/web/components/farm/harvest-session.tsx`
- Modify: `apps/web/components/farm/farm-game.tsx`

**Interfaces:**

- Consumes: `openHarvestAction`, `claimHarvestAction` (Task 9), `finishSessionAction`, `gradeCardAction` (existing), `ReviewGrade` from `@/lib/db/schema`, `useFarmStore`, `applyClaim` (Task 10), `HarvestCard` from `@/lib/game/types`, `SpeakButton`.
- Produces: overlay: "Begin harvest" → flip-card flow (`Card: ${hanzi}` reveal button, grade buttons named `Grade Again` / `Grade Hard` / `Grade Good` / `Grade Easy`; FORGOT requeues the card at the end of the local queue) → finish + claim → celebration with `data-testid="harvest-gold"` showing `+N gold` → "Back to farm" applies the claim to the store and refreshes.

- [ ] **Step 1: Write `harvest-session.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { claimHarvestAction, openHarvestAction } from "@/lib/actions/farm";
import { finishSessionAction, gradeCardAction } from "@/lib/actions/study";
import { ReviewGrade } from "@/lib/db/schema";
import type { HarvestCard } from "@/lib/game/types";
import { applyClaim, useFarmStore } from "@/lib/game/store/farm-store";

import { SpeakButton } from "./speak-button";

const GRADE_BUTTONS: {
  grade: ReviewGrade;
  label: string;
  className: string;
}[] = [
  {
    grade: ReviewGrade.FORGOT,
    label: "Again",
    className: "bg-red-600 text-white",
  },
  {
    grade: ReviewGrade.HARD,
    label: "Hard",
    className: "bg-orange-500 text-white",
  },
  {
    grade: ReviewGrade.GOOD,
    label: "Good",
    className: "bg-green-600 text-white",
  },
  {
    grade: ReviewGrade.EASY,
    label: "Easy",
    className: "bg-sky-600 text-white",
  },
];

export function HarvestSession({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const snapshot = useFarmStore((state) => state.snapshot);
  const setSnapshot = useFarmStore((state) => state.setSnapshot);
  const [queue, setQueue] = useState<HarvestCard[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [claim, setClaim] = useState<{
    goldAwarded: number;
    cardsHarvested: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!snapshot) return null;

  if (claim) {
    return (
      <div className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
        <div className="text-4xl">🧺✨</div>
        <h1 className="text-xl font-extrabold">Harvest complete</h1>
        <p data-testid="harvest-gold" className="text-2xl font-extrabold">
          +{claim.goldAwarded} gold
        </p>
        <p className="text-sm text-fg-muted">
          {claim.cardsHarvested} crops harvested.
        </p>
        <button
          type="button"
          className="rounded-full bg-primary px-6 py-2 font-bold text-on-primary"
          onClick={() => {
            router.refresh();
            onClose();
          }}
        >
          Back to farm
        </button>
      </div>
    );
  }

  if (queue === null) {
    return (
      <div className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
        <div className="text-4xl">🧺</div>
        <h1 className="text-xl font-extrabold">Harvest</h1>
        <p className="text-sm text-fg-muted">
          {snapshot.dueCount > 0
            ? `${snapshot.dueCount} crops are ready. Grade each one to harvest.`
            : "Nothing is ready yet — plant and nurture words first."}
        </p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-full border border-line px-6 py-2 font-bold"
            onClick={onClose}
          >
            Back
          </button>
          <button
            type="button"
            className="rounded-full bg-primary px-6 py-2 font-bold text-on-primary disabled:opacity-50"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              const result = await openHarvestAction(snapshot.world.langKey);
              if (result.ok) {
                setSessionId(result.data.sessionId);
                setQueue(result.data.queue);
              } else {
                setError(result.error);
              }
              setBusy(false);
            }}
          >
            Begin harvest
          </button>
        </div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
        <div className="text-4xl">🌿</div>
        <h1 className="text-xl font-extrabold">All caught up</h1>
        <p className="text-sm text-fg-muted">Every crop is still growing.</p>
        <button
          type="button"
          className="rounded-full bg-primary px-6 py-2 font-bold text-on-primary"
          onClick={onClose}
        >
          Back to farm
        </button>
      </div>
    );
  }

  const card = queue[0];

  async function grade(selected: ReviewGrade) {
    if (busy || !sessionId) return;
    setBusy(true);
    setRevealed(false);
    try {
      const result = await gradeCardAction(card.cardId, sessionId, selected);
      if (result.ok) {
        setReviewed((count) => count + 1);
        // FORGOT lapses the crop: it goes back to the end of today's basket.
        setQueue((current) =>
          result.data.requeued
            ? [...current!.slice(1), card]
            : current!.slice(1)
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (sessionId && reviewed > 0) {
      await finishSessionAction(sessionId, reviewed);
      const result = await claimHarvestAction(
        sessionId,
        snapshot!.world.langKey
      );
      if (result.ok) {
        setSnapshot(applyClaim(useFarmStore.getState().snapshot!, result.data));
        setClaim({
          goldAwarded: result.data.goldAwarded,
          cardsHarvested: result.data.cardsHarvested,
        });
        return;
      }
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-line p-4">
        <h1 className="text-lg font-extrabold">🧺 Harvest</h1>
        <span className="text-sm text-fg-muted">{reviewed} harvested</span>
        <button
          type="button"
          className="rounded-full border border-line px-4 py-1 text-sm"
          onClick={finish}
        >
          Finish
        </button>
      </header>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        {card.fresh ? (
          <span className="rounded-full bg-line px-3 py-1 text-xs font-bold">
            New word
          </span>
        ) : null}
        <button
          type="button"
          aria-label={`Card: ${card.hanzi}`}
          className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-line bg-surface p-8"
          onClick={() => setRevealed(true)}
        >
          <span className="text-6xl font-bold">{card.hanzi}</span>
          <span className="text-xl text-fg-muted">{card.pinyin}</span>
          {revealed ? (
            <span className="text-2xl font-bold">{card.translation}</span>
          ) : (
            <span className="text-sm text-fg-muted">Tap to reveal</span>
          )}
        </button>
        <SpeakButton text={card.hanzi} />
        {revealed ? (
          <div className="flex w-full gap-2">
            {GRADE_BUTTONS.map((button) => (
              <button
                key={button.label}
                type="button"
                className={`flex-1 rounded-full px-3 py-3 text-sm font-bold disabled:opacity-50 ${button.className}`}
                disabled={busy}
                onClick={() => grade(button.grade)}
              >
                Grade {button.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Enable Harvest in `farm-game.tsx`**

Add `import { HarvestSession } from "./harvest-session";`, widen overlay state to `"seeds" | "nursery" | "harvest" | null`, replace the disabled Harvest button with:

```tsx
<button
  type="button"
  className="flex flex-col items-center px-4 text-xs font-bold"
  onClick={() => setOpen("harvest")}
>
  <span className="text-xl">🧺</span>Harvest
  {current.dueCount > 0 ? ` · ${current.dueCount}` : ""}
</button>
```

and add:

```tsx
{
  open === "harvest" ? <HarvestSession onClose={() => setOpen(null)} /> : null;
}
```

- [ ] **Step 3: Typecheck, lint, unit tests**

```bash
bun run typecheck && bun run lint && bun test lib/game
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/farm/harvest-session.tsx apps/web/components/farm/farm-game.tsx
git commit -m "feat(web): harvest session with server-computed gold claims"
```

---

### Task 15: Retire the old UI + update auth e2e + AGENTS.md

**Files:**

- Delete: `apps/web/app/decks/`, `apps/web/app/onboarding/`, `apps/web/components/game/`, `apps/web/components/dashboard/`, `apps/web/components/decks/`, `apps/web/components/study/`, `apps/web/lib/three/`, `apps/web/lib/missions.ts`, `apps/web/lib/actions/decks.ts`, `apps/web/e2e/study.spec.ts`
- Modify: `apps/web/app/layout.tsx`, `apps/web/components/app-shell.tsx` (if it imports retired modules), `apps/web/e2e/auth-setup.ts`, `apps/web/e2e/auth.spec.ts`, `AGENTS.md`
- Possibly modify: `apps/web/package.json` (drop 3D deps)

**Interfaces:**

- Produces: no imports of retired modules anywhere; `bun run build` green; auth e2e matches the new `/` behavior.

- [ ] **Step 1: Delete retired routes/components**

```bash
git rm -r apps/web/app/decks apps/web/app/onboarding \
  apps/web/components/game apps/web/components/dashboard \
  apps/web/components/decks apps/web/components/study \
  apps/web/lib/three apps/web/lib/missions.ts \
  apps/web/lib/actions/decks.ts apps/web/e2e/study.spec.ts
```

- [ ] **Step 2: Clean `layout.tsx`**

Remove the `GameCanvasMount` import and its `<GameCanvasMount />` element from `apps/web/app/layout.tsx`. Keep fonts, ThemeProvider, ToastProvider.

- [ ] **Step 3: Hunt dangling imports**

`apps/web/components/app-shell.tsx` imports only `@/components/auth/account-menu-gate` and `@/components/theme-toggle` (verified clean), and `apps/web/app/dev/ui/page.tsx` imports only ui primitives + app-shell (verified clean). The grep is the gate for anything else:

```bash
grep -rn "components/game\|components/dashboard\|components/decks\|components/study\|lib/three\|lib/missions\|actions/decks" apps/web --include="*.ts" --include="*.tsx" | grep -v node_modules
```

Expected: no matches. `bun run typecheck` is the second gate.

- [ ] **Step 4: Drop 3D dependencies**

```bash
cd apps/web && bun remove three @react-three/fiber @react-three/drei @types/three
```

- [ ] **Step 5: Update auth e2e to the new `/` behavior**

`apps/web/e2e/auth-setup.ts` — the signed-in assertion currently expects a link named "Colyglot". Change the assertion line to the title screen heading:

```ts
await expect(
  page.getByRole("heading", { name: "Colyglot Language Farm" })
).toBeVisible();
```

`apps/web/e2e/auth.spec.ts` — replace the first two tests (they target the old redirect and the retired `/decks/...` URL):

```ts
test("signed-out visit to the farm redirects to /sign-in with next", async ({
  page,
}) => {
  await page.goto("/?lang=zh-vi");

  await expect(page).toHaveURL(/\/sign-in\?next=/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" })
  ).toBeVisible();
});

test("signed-out title screen shows the language picker with sign-in CTA", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Choose your language" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Start farm" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
});
```

Keep the callback and recording-api tests unchanged.

- [ ] **Step 6: Update `AGENTS.md` repo structure**

In the Repo Structure block, replace the `components/` line with:

```
  components/            # farm game UI (components/farm) + UI primitives (components/ui)
```

and add after the `lib/storage/` line:

```
  lib/game/              # client-safe farm content registry, core economy, art, store
```

- [ ] **Step 7: Full validation**

From repo root:

```bash
bun run lint && bun run typecheck && bun run test && bun run build
```

Expected: ALL PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(web): retire 3D island UI for the language farm"
```

---

### Task 16: E2E farm spec + final sweep

**Files:**

- Create: `apps/web/e2e/farm.spec.ts`

**Interfaces:**

- Consumes: the full running app (production build), the signed-in storage state from `auth-setup.ts`.
- Produces: green e2e proving the vertical slice: title → start world → plant → nursery → harvest → claim.

- [ ] **Step 1: Write `e2e/farm.spec.ts`**

The test is written to be re-runnable against a persistent database (the e2e user's world survives between runs), so it never assumes a pristine farm:

```ts
import { expect, test } from "@playwright/test";

test.describe("language farm", () => {
  test("start world, plant, nursery, harvest, claim gold", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Choose your language" })
    ).toBeVisible();

    // First run: "Start farm"; later runs: "Play".
    await page.getByRole("button", { name: /^(Start farm|Play)$/ }).click();
    await expect(page.getByTestId("farm-gold")).toBeVisible();
    const goldBefore = await page.getByTestId("farm-gold").textContent();

    // Plant seed words from the catalog (skip any already planted from an
    // earlier run — the e2e user's farm persists in the database).
    await page.getByRole("button", { name: "Seeds" }).click();
    for (const hanzi of ["你好", "谢谢"]) {
      const plantButton = page.getByRole("button", { name: `Plant ${hanzi}` });
      if (await plantButton.isEnabled()) {
        await plantButton.click();
        await expect(
          page.getByRole("button", { name: `Plot ${hanzi}` }).first()
        ).toBeVisible({ timeout: 10_000 });
      }
    }
    await page.getByRole("button", { name: "Close" }).click();

    // Nursery: first exposure IS the first SM-2 review. Learn one if the
    // nursery has anything left to teach.
    await page.getByRole("button", { name: /Nursery/ }).click();
    const gotIt = page.getByRole("button", { name: "Got it" });
    if ((await gotIt.count()) > 0) {
      await gotIt.first().click();
      const skip = page.getByRole("button", { name: "Skip" });
      if ((await skip.count()) > 0) {
        await skip.click();
      }
    }
    await page.getByRole("button", { name: "Back to farm" }).click();

    // Harvest only when something is due (the Harvest tab shows a count).
    // First run against a fresh database always exercises the full path.
    const harvestButton = page
      .getByRole("button", { name: /Harvest( · \d+)?$/ })
      .first();
    const harvestLabel = await harvestButton.textContent();
    if (harvestLabel && harvestLabel.includes("·")) {
      await harvestButton.click();
      await page.getByRole("button", { name: "Begin harvest" }).click();
      const flip = page.getByRole("button", { name: /^Card: / }).first();
      await expect(flip).toBeVisible();
      await flip.click();
      await page.getByRole("button", { name: "Grade Good" }).click();
      await expect(page.getByTestId("harvest-gold")).toBeVisible({
        timeout: 15_000,
      });
      await page.getByRole("button", { name: "Back to farm" }).click();
      await expect(page.getByTestId("farm-gold")).not.toHaveText(
        goldBefore ?? "",
        {
          timeout: 10_000,
        }
      );
    }
  });
});
```

});
});

````

- [ ] **Step 2: Run e2e**

The Playwright `webServer` runs `bun run start` — build first:

```bash
bun run build && bun run test:e2e
````

(from `apps/web`; requires `DATABASE_URL` in `.env` and the Supabase e2e sign-in env `E2E_SIGNIN_TOKEN=colyglot-e2e`, which playwright.config already sets).

Expected: ALL PASS (auth-setup, farm, auth specs).

- [ ] **Step 3: Final full validation sweep** (AGENTS.md hierarchy: unit → integration → e2e)

From repo root:

```bash
bun run lint && bun run typecheck && bun run test && bun run build && (cd apps/web && bun run test:e2e)
```

Expected: ALL PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/e2e/farm.spec.ts
git commit -m "test(web): e2e coverage for the language farm slice"
```

---

## Self-Review (already applied)

- Spec coverage: title/world picker (T11), beds=decks + legacy import (T6), plots/crops + dueAt clock (T6/T11), nursery (T13), harvest=review + server yield + idempotent claim (T7/T9/T14), gold economy + expansion sink (T3/T7), content registry + zh pack (T2), palette art (T4/T11), streak/XP topbar (T11), retirement (T15), e2e (T16). Phase 2/3 items (workshop, civ, research, wonders, en→vi, PWA, audio) intentionally out of this plan.
- Type consistency: `FarmWorldSnapshot`/`BedView`/`PlotView`/`HarvestCard` defined once in `lib/game/types.ts`; `PlantSeedsResult`/`ClaimHarvestResult` defined in the repository and imported by actions; the client store re-derives nothing.
- No placeholders: every code block is complete and final.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-27-language-farm-phase-1.md`. Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task, reviewed between tasks
2. **Inline Execution** — execute tasks in this session with checkpoints

Which approach?
