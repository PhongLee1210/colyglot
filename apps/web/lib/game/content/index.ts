import { zh } from "./zh";

export {
  findWord,
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
