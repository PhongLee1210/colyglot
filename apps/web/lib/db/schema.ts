import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { DEFAULT_EASE_FACTOR } from "@colyglot/srs";

import type { CardCollocation, CardExample } from "@/lib/game/content/types";
import type { UserTier } from "@/lib/game/core/access";
import { STARTING_GOLD } from "@/lib/game/core/economy";
import { DEFAULT_MUSIC_VOLUME } from "@/lib/game/music";
import type { FarmStats } from "@/lib/game/types";
import { DEFAULT_UI_LANG } from "@/lib/i18n/ui-langs";

export const DEFAULT_SOURCE_LANG = "zh";
export const DEFAULT_TARGET_LANG = "vi";

export const decks = pgTable(
  "decks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    sourceLang: text("source_lang").notNull().default(DEFAULT_SOURCE_LANG),
    targetLang: text("target_lang").notNull().default(DEFAULT_TARGET_LANG),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("decks_user_id_idx").on(table.userId)]
);

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deckId: uuid("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    hanzi: text("hanzi").notNull(),
    pinyin: text("pinyin").notNull(),
    translation: text("translation").notNull(),
    examples: jsonb("examples")
      .$type<CardExample[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    collocations: jsonb("collocations")
      .$type<CardCollocation[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Set by the graduation hook when the word's interval crosses the
    // graduation threshold (GAME_PLAY §5.1) — the Forest membership flag.
    graduatedAt: timestamp("graduated_at", { withTimezone: true }),
  },
  (table) => [
    index("cards_deck_id_idx").on(table.deckId),
    // Natural key: re-running the legacy seed import must never duplicate cards.
    unique("cards_deck_id_hanzi_key").on(table.deckId, table.hanzi),
  ]
);

export const cardSchedules = pgTable(
  "card_schedules",
  {
    cardId: uuid("card_id")
      .primaryKey()
      .references(() => cards.id, { onDelete: "cascade" }),
    easeFactor: real("ease_factor").notNull().default(DEFAULT_EASE_FACTOR),
    intervalDays: integer("interval_days").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull().defaultNow(),
    reviewCount: integer("review_count").notNull().default(0),
    consecutiveCorrect: integer("consecutive_correct").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  },
  (table) => [index("card_schedules_due_at_idx").on(table.dueAt)]
);

export const studySessions = pgTable(
  "study_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    cardsReviewed: integer("cards_reviewed").notNull().default(0),
  },
  (table) => [index("study_sessions_user_id_idx").on(table.userId)]
);

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => studySessions.id, { onDelete: "cascade" }),
    grade: integer("grade").notNull(),
    // Memory strength at harvest time (pre-review interval); 0 for legacy rows.
    intervalDaysBefore: integer("interval_days_before").notNull().default(0),
    // Calibration metrics (GAME_PLAY §3.2/§10.4): response time and
    // hesitation feed the threshold-tuning loop; null on legacy rows.
    elapsedMs: integer("elapsed_ms"),
    hesitated: boolean("hesitated").notNull().default(false),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("review_logs_card_id_idx").on(table.cardId),
    index("review_logs_session_id_idx").on(table.sessionId),
    index("review_logs_reviewed_at_idx").on(table.reviewedAt),
    check("review_logs_grade_check", sql`${table.grade} between 1 and 5`),
  ]
);

export const cardRecordings = pgTable(
  "card_recordings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    durationMs: integer("duration_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("card_recordings_card_id_idx").on(table.cardId),
    // One take per card: re-recording replaces the previous take.
    unique("card_recordings_card_id_key").on(table.cardId),
  ]
);

export const deckProgress = pgTable(
  "deck_progress",
  {
    deckId: uuid("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    xp: integer("xp").notNull().default(0),
    level: integer("level").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One progress row per deck; a deck belongs to exactly one user.
    unique("deck_progress_deck_id_key").on(table.deckId),
    index("deck_progress_user_id_idx").on(table.userId),
  ]
);

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
    gold: integer("gold").notNull().default(STARTING_GOLD),
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
    // "greenhouse" beds hold demoted words only (GAME_PLAY §5.2) — seeds
    // are never planted into them.
    kind: text("kind").notNull().default("garden"),
    // Which region the bed belongs to (GAME_PLAY §5.3); legacy beds are
    // homestead by default.
    regionKey: text("region_key").notNull().default("homestead"),
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

// One row per day the player finished every ripe crop (or none were ripe):
// the streak counts sweep days, not bare review days (GAME_PLAY §6.4).
export const farmSweepDays = pgTable(
  "farm_sweep_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    langKey: text("lang_key").notNull(),
    dayKey: text("day_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("farm_sweep_days_user_lang_day_key").on(
      table.userId,
      table.langKey,
      table.dayKey
    ),
    index("farm_sweep_days_user_lang_idx").on(table.userId, table.langKey),
  ]
);

export const userAccounts = pgTable(
  "user_accounts",
  {
    userId: text("user_id").primaryKey(),
    tier: text("tier").$type<UserTier>().notNull().default("EARLY_ACCESS"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Set the moment an EARLY_ACCESS player became STANDARD; null while
    // still on the anonymous tier.
    upgradedAt: timestamp("upgraded_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "user_accounts_tier_check",
      sql`${table.tier} in ('STANDARD', 'EARLY_ACCESS')`
    ),
  ]
);

export const userSettings = pgTable(
  "user_settings",
  {
    userId: text("user_id").primaryKey(),
    musicVolume: integer("music_volume")
      .notNull()
      .default(DEFAULT_MUSIC_VOLUME),
    musicMuted: boolean("music_muted").notNull().default(false),
    uiLang: text("ui_lang").notNull().default(DEFAULT_UI_LANG),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "user_settings_music_volume_check",
      sql`${table.musicVolume} between 0 and 100`
    ),
    check("user_settings_ui_lang_check", sql`${table.uiLang} in ('en', 'vi')`),
  ]
);

export type Deck = typeof decks.$inferSelect;
export type NewDeck = typeof decks.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type CardSchedule = typeof cardSchedules.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type ReviewLog = typeof reviewLogs.$inferSelect;
export type CardRecording = typeof cardRecordings.$inferSelect;
export type DeckProgress = typeof deckProgress.$inferSelect;
export type FarmWorld = typeof farmWorlds.$inferSelect;
export type FarmBed = typeof farmBeds.$inferSelect;
export type FarmPlot = typeof farmPlots.$inferSelect;
export type FarmItem = typeof farmItems.$inferSelect;
export type FarmSweepDay = typeof farmSweepDays.$inferSelect;
export type FarmHarvestClaim = typeof farmHarvestClaims.$inferSelect;
export type UserAccount = typeof userAccounts.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
