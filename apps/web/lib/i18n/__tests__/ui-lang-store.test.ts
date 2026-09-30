import { beforeEach, describe, expect, test } from "bun:test";

import {
  bindUiLangPersistence,
  onUiLangPersist,
  resetUiLangStoreForTests,
  useUiLangStore,
} from "../store/ui-lang-store";
import { DEFAULT_UI_LANG } from "../ui-langs";

describe("ui lang store", () => {
  beforeEach(() => {
    resetUiLangStoreForTests();
  });

  test("starts at the default lang until hydrated", () => {
    expect(useUiLangStore.getState().uiLang).toBe(DEFAULT_UI_LANG);
    expect(useUiLangStore.getState().hydrated).toBe(false);
  });

  test("hydrates the persisted lang", () => {
    useUiLangStore.getState().hydrate("en");
    expect(useUiLangStore.getState().uiLang).toBe("en");
    expect(useUiLangStore.getState().hydrated).toBe(true);
  });

  test("setUiLang updates state and persists immediately", () => {
    const persisted: string[] = [];
    bindUiLangPersistence(async (lang) => {
      persisted.push(lang);
    });
    useUiLangStore.getState().setUiLang("en");
    expect(useUiLangStore.getState().uiLang).toBe("en");
    expect(persisted).toEqual(["en"]);
  });

  test("setUiLang without a bound persister only updates state", () => {
    expect(() => useUiLangStore.getState().setUiLang("en")).not.toThrow();
    expect(useUiLangStore.getState().uiLang).toBe("en");
  });

  test("setUiLang swallows persistence errors", async () => {
    bindUiLangPersistence(async () => {
      throw new Error("offline");
    });
    expect(() => useUiLangStore.getState().setUiLang("vi")).not.toThrow();
    expect(useUiLangStore.getState().uiLang).toBe("vi");
  });

  test("notifies persistence listeners after a successful save", async () => {
    const saved: string[] = [];
    onUiLangPersist(() => saved.push("saved"));
    bindUiLangPersistence(async () => {});
    useUiLangStore.getState().setUiLang("en");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(saved).toEqual(["saved"]);
  });
});
