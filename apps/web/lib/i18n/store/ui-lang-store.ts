import { create } from "zustand";

import { DEFAULT_UI_LANG, type UiLang } from "@/lib/i18n/ui-langs";

type UiLangPersist = (lang: UiLang) => Promise<unknown>;

let persistFn: UiLangPersist | null = null;
let onPersist: (() => void) | null = null;

export function bindUiLangPersistence(fn: UiLangPersist): void {
  persistFn = fn;
}

export function onUiLangPersist(callback: () => void): void {
  onPersist = callback;
}

type UiLangStoreState = {
  uiLang: UiLang;
  hydrated: boolean;
  hydrate: (lang: UiLang) => void;
  setUiLang: (lang: UiLang) => void;
};

export const useUiLangStore = create<UiLangStoreState>((set) => ({
  uiLang: DEFAULT_UI_LANG,
  hydrated: false,
  hydrate: (lang) => set({ uiLang: lang, hydrated: true }),
  setUiLang: (lang) => {
    set({ uiLang: lang });
    // Switching language is a deliberate one-shot action — persist without a debounce.
    void persistFn?.(lang)
      .then(() => {
        onPersist?.();
      })
      .catch(() => {
        // Preference sync is best-effort; the next switch retries.
      });
  },
}));

export function resetUiLangStoreForTests(): void {
  persistFn = null;
  onPersist = null;
  useUiLangStore.setState({ uiLang: DEFAULT_UI_LANG, hydrated: false });
}
