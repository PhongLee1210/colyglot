import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { useUiLangStore } from "@/lib/i18n/store/ui-lang-store";

export function useT(): Dictionary {
  const uiLang = useUiLangStore((state) => state.uiLang);
  return getDictionary(uiLang);
}
