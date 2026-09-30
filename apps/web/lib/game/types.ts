import type { CardExample } from "@/lib/game/content/types";

// One sweep covers at most this many crops; the badge honestly shows
// "50+" past it so the player knows a second sweep is waiting.
export const DUE_SWEEP_LIMIT = 50;

export type FarmStats = {
  planted: number;
  harvested: number;
  goldEarned: number;
  /** Set once the world's first tree graduated (15d exception used up). */
  firstGraduation?: boolean;
};

export type PlotView = {
  slotIndex: number;
  cardId: string | null;
  hanzi: string | null;
  pinyin: string | null;
  translation: string | null;
  plantedAt: Date | null;
  variant: number;
  schedule: {
    dueAt: Date;
    intervalDays: number;
    reviewCount: number;
    /** Total forgets — drives the cat's weak-spot bed (GAME_PLAY §6.3). */
    lapses: number;
  } | null;
};

export type BedView = {
  id: string;
  deckId: string;
  name: string;
  plotCount: number;
  position: number;
  // Greenhouse beds hold demoted words only (GAME_PLAY §5.2).
  kind: "garden" | "greenhouse";
  // Which region owns this bed (GAME_PLAY §5.3); legacy beds are
  // homestead.
  regionKey: "homestead" | "market";
  plots: PlotView[];
};

// One region's standing in the snapshot (GAME_PLAY §5.3 + §7): the unlock
// gates plus how close its topic is to mastery (80% of its words living
// in the Forest).
export type RegionStatus = {
  key: "homestead" | "market";
  unlocked: boolean;
  goldGateMet: boolean;
  treesGateMet: boolean;
  mastered: boolean;
  /** 0–100: share of the region's words that are Forest trees. */
  masteryPct: number;
};

// A graduated word living in the Forest (GAME_PLAY §5.1) — derived from
// the SM-2 schedule, never stored as its own row.
export type ForestTreeView = {
  cardId: string;
  hanzi: string;
  pinyin: string;
  translation: string;
  intervalDays: number;
};

// A lifecycle crossing surfaced by a grade commit (GAME_PLAY §5): the
// word graduated into the Forest, or fell back down to a plot.
export type FarmReviewEvent = {
  type: "graduation" | "demotion";
  hanzi: string;
  pinyin: string;
  translation: string;
  intervalDays: number;
  replanted: boolean;
  greenhouse: boolean;
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
  // Pre-review memory strength: it picks the challenge tier the card is
  // asked at, and the gold the harvest pays.
  intervalDays: number;
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
  forest: ForestTreeView[];
  // Consecutive days every ripe crop was swept (GAME_PLAY §6.4).
  streak: number;
  // Best consecutive sweep run in this world's history — mementos honor
  // it, so a broken streak never takes the wreath or sky away (§6.4).
  longestStreak: number;
  // Per-region unlock gates and mastery (GAME_PLAY §5.3/§7), REGIONS order.
  regions: RegionStatus[];
  items: { itemKey: string; qty: number }[];
  freshQueue: FreshCardView[];
  dueCount: number;
  freshCount: number;
  xp: number;
  level: number;
};

export type FarmWorldCard = {
  langKey: string;
  name: string;
  flag: string;
  tierName: string;
  gold: number;
  dueCount: number;
  started: boolean;
};
