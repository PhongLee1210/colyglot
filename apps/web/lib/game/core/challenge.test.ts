import { describe, expect, test } from "bun:test";

import { ReviewGrade } from "@colyglot/srs";

import {
  buildChallenge,
  challengeDirection,
  challengeTier,
  CHOICE_COUNT,
  gradeFromResponse,
  showsPinyin,
  shuffle,
  type ChallengeTier,
  type ChallengeWord,
} from "./challenge";

const word = (
  hanzi: string,
  pinyin: string,
  translation: string,
  packKey: string
): ChallengeWord => ({ hanzi, pinyin, translation, packKey });

const GREETINGS = [
  word("对不起", "duì bu qǐ", "xin lỗi", "greetings"),
  word("对", "duì", "đúng", "greetings"),
  word("不", "bù", "không", "greetings"),
  word("谢谢", "xiè xie", "cảm ơn", "greetings"),
  word("再见", "zài jiàn", "tạm biệt", "greetings"),
];

const FOOD = [
  word("吃", "chī", "ăn", "food"),
  word("喝", "hē", "uống", "food"),
  word("水", "shuǐ", "nước", "food"),
  word("饭", "fàn", "cơm", "food"),
];

const POOL = [...GREETINGS, ...FOOD];
const SUBJECT = GREETINGS[0];

// A cycling generator keeps buildChallenge deterministic without pinning
// the implementation to a specific number of random() calls.
function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("challengeTier", () => {
  test("maps the pre-review interval to the four GAME_PLAY §3.1 bands", () => {
    expect(challengeTier(0)).toBe("seedling");
    expect(challengeTier(2)).toBe("seedling");
    expect(challengeTier(3)).toBe("growing");
    expect(challengeTier(13)).toBe("growing");
    expect(challengeTier(14)).toBe("mature");
    expect(challengeTier(44)).toBe("mature");
    expect(challengeTier(45)).toBe("ancient");
    expect(challengeTier(400)).toBe("ancient");
  });

  test("a missing schedule reads as the easiest band", () => {
    expect(challengeTier(-1)).toBe("seedling");
  });
});

describe("challengeDirection", () => {
  test("recognition gives way to production as the crop matures", () => {
    expect(challengeDirection("seedling")).toBe("recognize");
    expect(challengeDirection("growing")).toBe("recognize");
    expect(challengeDirection("mature")).toBe("produce");
    expect(challengeDirection("ancient")).toBe("produce");
  });
});

describe("showsPinyin", () => {
  test("pinyin is a crutch only a brand-new word gets", () => {
    expect(showsPinyin("seedling")).toBe(true);
    expect(showsPinyin("growing")).toBe(false);
    expect(showsPinyin("mature")).toBe(false);
    expect(showsPinyin("ancient")).toBe(false);
  });
});

describe("buildChallenge", () => {
  const tiers: { tier: ChallengeTier; intervalDays: number }[] = [
    { tier: "seedling", intervalDays: 0 },
    { tier: "growing", intervalDays: 6 },
    { tier: "mature", intervalDays: 20 },
    { tier: "ancient", intervalDays: 60 },
  ];

  test("every tier offers a full grid of distinct choices with the answer in it", () => {
    for (const { intervalDays } of tiers) {
      const challenge = buildChallenge(SUBJECT, POOL, intervalDays);
      expect(challenge.choices).toHaveLength(CHOICE_COUNT);
      expect(new Set(challenge.choices).size).toBe(CHOICE_COUNT);
      expect(challenge.choices).toContain(challenge.answer);
    }
  });

  test("recognition asks with the characters and answers in translation", () => {
    const challenge = buildChallenge(SUBJECT, POOL, 6);
    expect(challenge.promptText).toBe("对不起");
    expect(challenge.promptPinyin).toBeNull();
    expect(challenge.answer).toBe("xin lỗi");
  });

  test("a new word keeps its pinyin on the prompt", () => {
    expect(buildChallenge(SUBJECT, POOL, 0).promptPinyin).toBe("duì bu qǐ");
  });

  test("production asks with the meaning and answers in characters", () => {
    const challenge = buildChallenge(SUBJECT, POOL, 20);
    expect(challenge.promptText).toBe("xin lỗi");
    expect(challenge.answer).toBe("对不起");
    expect(
      challenge.choices.every((choice) => /\p{Script=Han}/u.test(choice))
    ).toBe(true);
  });

  test("a new word draws its distractors from other packs", () => {
    const challenge = buildChallenge(SUBJECT, POOL, 0, sequence([0.1, 0.7]));
    const distractors = challenge.choices.filter(
      (choice) => choice !== challenge.answer
    );
    const foodMeanings = new Set(FOOD.map((item) => item.translation));
    expect(distractors.every((choice) => foodMeanings.has(choice))).toBe(true);
  });

  test("a growing word draws its distractors from its own pack", () => {
    const challenge = buildChallenge(SUBJECT, POOL, 6, sequence([0.1, 0.7]));
    const distractors = challenge.choices.filter(
      (choice) => choice !== challenge.answer
    );
    const greetingMeanings = new Set(GREETINGS.map((item) => item.translation));
    expect(distractors.every((choice) => greetingMeanings.has(choice))).toBe(
      true
    );
  });

  test("a mature word is confused against shared characters", () => {
    const challenge = buildChallenge(SUBJECT, POOL, 20, sequence([0.1, 0.7]));
    expect(challenge.choices).toContain("对");
    expect(challenge.choices).toContain("不");
  });

  test("a pool too thin for the rule still fills the grid", () => {
    const challenge = buildChallenge(SUBJECT, GREETINGS, 0);
    expect(challenge.choices).toHaveLength(CHOICE_COUNT);
    expect(challenge.choices).toContain(challenge.answer);
  });

  test("a pool smaller than the grid degrades instead of throwing", () => {
    const challenge = buildChallenge(SUBJECT, [SUBJECT, FOOD[0]], 0);
    expect(challenge.choices).toContain(challenge.answer);
    expect(challenge.choices.length).toBeLessThanOrEqual(CHOICE_COUNT);
  });

  test("the same seed produces the same grid", () => {
    const seed = () => sequence([0.42, 0.11, 0.87, 0.3]);
    expect(buildChallenge(SUBJECT, POOL, 6, seed()).choices).toEqual(
      buildChallenge(SUBJECT, POOL, 6, seed()).choices
    );
  });
});

describe("gradeFromResponse", () => {
  const answered = (overrides: {
    correct?: boolean;
    elapsedMs?: number;
    hesitated?: boolean;
    tier?: ChallengeTier;
  }) =>
    gradeFromResponse({
      correct: true,
      elapsedMs: 3000,
      hesitated: false,
      tier: "growing",
      ...overrides,
    });

  test("a wrong tap is always FORGOT, however fast", () => {
    expect(answered({ correct: false, elapsedMs: 80 })).toBe(
      ReviewGrade.FORGOT
    );
    expect(answered({ correct: false, elapsedMs: 30_000 })).toBe(
      ReviewGrade.FORGOT
    );
  });

  test("response time maps onto the GAME_PLAY §3.2 bands", () => {
    expect(answered({ elapsedMs: 9000 })).toBe(ReviewGrade.HARD);
    expect(answered({ elapsedMs: 6001 })).toBe(ReviewGrade.HARD);
    expect(answered({ elapsedMs: 6000 })).toBe(ReviewGrade.GOOD);
    expect(answered({ elapsedMs: 2501 })).toBe(ReviewGrade.GOOD);
    expect(answered({ elapsedMs: 2500 })).toBe(ReviewGrade.EASY);
    expect(answered({ elapsedMs: 1201 })).toBe(ReviewGrade.EASY);
  });

  test("hesitating costs the same as a slow answer", () => {
    expect(answered({ elapsedMs: 900, hesitated: true })).toBe(
      ReviewGrade.HARD
    );
  });

  test("PERFECT is gated behind production so easy words cannot farm it", () => {
    expect(answered({ elapsedMs: 800, tier: "seedling" })).toBe(
      ReviewGrade.EASY
    );
    expect(answered({ elapsedMs: 800, tier: "growing" })).toBe(
      ReviewGrade.EASY
    );
    expect(answered({ elapsedMs: 800, tier: "mature" })).toBe(
      ReviewGrade.PERFECT
    );
    expect(answered({ elapsedMs: 800, tier: "ancient" })).toBe(
      ReviewGrade.PERFECT
    );
  });
});

describe("shuffle", () => {
  test("keeps every item exactly once", () => {
    const items = [1, 2, 3, 4, 5];
    expect(shuffle(items, sequence([0.9, 0.2, 0.5, 0.1])).sort()).toEqual(
      items
    );
  });

  test("leaves the source array untouched", () => {
    const items = [1, 2, 3];
    shuffle(items, sequence([0.9]));
    expect(items).toEqual([1, 2, 3]);
  });
});
