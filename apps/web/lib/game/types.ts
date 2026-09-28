import type { CardExample } from "@/lib/game/content/types";

export type FarmStats = {
  planted: number;
  harvested: number;
  goldEarned: number;
};

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

export type FarmWorldCard = {
  langKey: string;
  name: string;
  flag: string;
  tierName: string;
  gold: number;
  dueCount: number;
  started: boolean;
};
