import type { LanguagePack, SeedWord } from "./types";

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

export function findWord(langKey: string, hanzi: string): SeedWord | null {
  const pack = LANG_PACKS[langKey];
  if (!pack) return null;
  for (const seedPack of pack.packs) {
    const found = seedPack.words.find((word) => word.hanzi === hanzi);
    if (found) return found;
  }
  return null;
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
