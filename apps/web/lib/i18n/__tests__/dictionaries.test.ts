import { describe, expect, test } from "bun:test";

import { ACTION_ERROR_CODES } from "@/lib/actions/error-codes";
import { REGIONS } from "@/lib/game/content/regions";
import { zh } from "@/lib/game/content/zh";
import { SHOP_ITEMS } from "@/lib/game/core/shop";
import { LOADING_STEP_COUNT } from "@/lib/game/loading-steps";

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

  test("renders every action error code", () => {
    for (const lang of UI_LANGS) {
      for (const code of ACTION_ERROR_CODES) {
        expect(DICTIONARIES[lang].errors[code].length).toBeGreaterThan(0);
      }
    }
  });

  test("names every region, shop item, seed pack and farm tier", () => {
    for (const lang of UI_LANGS) {
      const dictionary = DICTIONARIES[lang];
      for (const region of REGIONS) {
        expect(dictionary.regions[region.key].name.length).toBeGreaterThan(0);
        expect(dictionary.regions[region.key].bedName.length).toBeGreaterThan(
          0
        );
      }
      for (const item of SHOP_ITEMS) {
        expect(dictionary.shopItems[item.key]?.name.length).toBeGreaterThan(0);
      }
      for (const pack of zh.packs) {
        expect(dictionary.seedPacks[pack.key]?.length).toBeGreaterThan(0);
      }
      for (const tier of zh.tiers) {
        expect(dictionary.farmTiers[tier.key]?.name.length).toBeGreaterThan(0);
      }
    }
  });

  test("provides one loading step per boot beat", () => {
    for (const lang of UI_LANGS) {
      expect(DICTIONARIES[lang].loading.steps).toHaveLength(LOADING_STEP_COUNT);
    }
  });
});
