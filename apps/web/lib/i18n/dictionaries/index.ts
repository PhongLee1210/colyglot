import { DEFAULT_UI_LANG, type UiLang } from "@/lib/i18n/ui-langs";

import { en, type Dictionary } from "./en";
import { vi } from "./vi";

export type { Dictionary };

export const DICTIONARIES: Record<UiLang, Dictionary> = { en, vi };

export function getDictionary(lang: UiLang): Dictionary {
  return DICTIONARIES[lang] ?? DICTIONARIES[DEFAULT_UI_LANG];
}
