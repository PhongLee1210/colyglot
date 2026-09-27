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
