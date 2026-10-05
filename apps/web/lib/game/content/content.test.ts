import { describe, expect, test } from "bun:test";

import { findWord } from "./index";
import { LANG_PACKS, langsFromKey, validateContent } from "./registry";
import type { LanguagePack } from "./types";
import { zh } from "./zh";

describe("content registry", () => {
  test("zh pack passes validation", () => {
    expect(validateContent([zh])).toEqual([]);
  });

  test("zh pack is registered under its key with 2 packs of 12 words", () => {
    expect(LANG_PACKS["zh-vi"]).toBe(zh);
    expect(zh.packs).toHaveLength(2);
    expect(zh.packs.every((pack) => pack.words.length === 12)).toBe(true);
  });

  test("flags structural errors", () => {
    const bad: LanguagePack = {
      ...zh,
      key: "xx-vi",
      tiers: zh.tiers.slice(0, 3),
      packs: [
        {
          key: "dup",
          icon: "x",
          words: zh.packs[0].words.slice(0, 2),
        },
        { key: "dup", icon: "y", words: [zh.packs[0].words[0]] },
      ],
    };
    const errors = validateContent([bad]);
    expect(errors.some((e) => e.includes("must define 9 tiers"))).toBe(true);
    expect(errors.some((e) => e.includes("duplicate pack key"))).toBe(true);
    expect(errors.some((e) => e.includes("duplicate hanzi"))).toBe(true);
  });

  test("langsFromKey parses and rejects", () => {
    expect(langsFromKey("zh-vi")).toEqual({
      sourceLang: "zh",
      targetLang: "vi",
    });
    expect(langsFromKey("zhvi")).toBeNull();
  });
});

describe("findWord", () => {
  test("resolves a registered word with its examples", () => {
    const word = findWord("zh-vi", "你好");
    expect(word).not.toBeNull();
    expect(word!.translation).toBe("xin chào");
    expect(word!.examples.length).toBeGreaterThan(0);
  });

  test("returns null for unknown hanzi or language", () => {
    expect(findWord("zh-vi", "不存在的词")).toBeNull();
    expect(findWord("xx-yy", "你好")).toBeNull();
  });
});
