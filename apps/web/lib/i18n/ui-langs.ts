export const UI_LANGS = ["en", "vi"] as const;

export type UiLang = (typeof UI_LANGS)[number];

export const DEFAULT_UI_LANG: UiLang = "vi";

// Always rendered in each language's own name so users can find theirs.
export const UI_LANG_NAMES: Record<UiLang, string> = {
  en: "English",
  vi: "Tiếng Việt",
};
