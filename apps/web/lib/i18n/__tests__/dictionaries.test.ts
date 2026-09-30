import { describe, expect, test } from "bun:test";

import { DICTIONARIES, getDictionary } from "../dictionaries";
import { DEFAULT_UI_LANG, UI_LANGS, type UiLang } from "../ui-langs";

describe("i18n dictionaries", () => {
  test("provides a dictionary for every UI lang", () => {
    for (const lang of UI_LANGS) {
      expect(DICTIONARIES[lang]).toBeDefined();
    }
  });

  test("keeps translated strings non-empty", () => {
    for (const lang of UI_LANGS) {
      const dictionary = DICTIONARIES[lang];
      expect(dictionary.settings.title.length).toBeGreaterThan(0);
      expect(dictionary.account.signOut.length).toBeGreaterThan(0);
      expect(dictionary.signIn.heading.length).toBeGreaterThan(0);
      expect(dictionary.farm.welcomeToFarm("Việt")).toContain("Việt");
    }
  });

  test("falls back to the default lang for unknown values", () => {
    expect(getDictionary("xx" as UiLang)).toBe(DICTIONARIES[DEFAULT_UI_LANG]);
  });
});
