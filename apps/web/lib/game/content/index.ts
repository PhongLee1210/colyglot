export {
  REGIONS,
  getRegion,
  isRegionKey,
  masteryOf,
  regionOfPack,
  type RegionDef,
  type RegionKey,
} from "./regions";
export { zh } from "./zh";

export {
  LANG_PACKS,
  findWord,
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

// Importing this module registers every built-in language pack exactly once
// (the `export { zh }` above both imports and re-exports it).
