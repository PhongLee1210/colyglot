import { sql } from "drizzle-orm";
import {
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

export const LOCAL_USER_ID = "local";

export const DEFAULT_SOURCE_LANG = "zh";
export const DEFAULT_TARGET_LANG = "vi";

export const DEFAULT_EASE_FACTOR = 2.5;
export const DEFAULT_DUE_QUEUE_LIMIT = 50;

export enum ReviewGrade {
  FORGOT = 1,
  HARD = 2,
  GOOD = 3,
  EASY = 4,
  PERFECT = 5,
}

export function isValidReviewGrade(grade: number): grade is ReviewGrade {
  return (
    Number.isInteger(grade) &&
    grade >= ReviewGrade.FORGOT &&
    grade <= ReviewGrade.PERFECT
  );
}

export type CardExample = {
  hanzi: string;
  pinyin: string;
  translation: string;
};

export type CardCollocation = {
  phrase: string;
  pinyin: string;
  translation: string;
};

export const decks = pgTable(
  "decks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    sourceLang: text("source_lang").notNull().default(DEFAULT_SOURCE_LANG),
    targetLang: text("target_lang").notNull().default(DEFAULT_TARGET_LANG),
    userId: text("user_id").notNull().default(LOCAL_USER_ID),
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

export const studySessions = pgTable("study_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  cardsReviewed: integer("cards_reviewed").notNull().default(0),
});

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

export type Deck = typeof decks.$inferSelect;
export type NewDeck = typeof decks.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type CardSchedule = typeof cardSchedules.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type ReviewLog = typeof reviewLogs.$inferSelect;
export type CardRecording = typeof cardRecordings.$inferSelect;
