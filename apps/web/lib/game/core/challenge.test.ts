import { describe, expect, test } from "bun:test";

import { ReviewGrade } from "@colyglot/srs";

import { radicalOf, sharesRadical, wordRadicals } from "@/lib/game/core/hanzi";

import {
  buildChallenge,
  challengeDirection,
  challengeTier,
  CHOICE_COUNT,
  deriveGrade,
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

  test("a mature word prefers radical-family distractors over unrelated ones", () => {
    // 吃/喝/吗 share the 口 radical with each other but not the sound; a
    // radical-blind rule would rank 水 and 饭 the same as 喝 and 吗.
    const subject = word("吃", "chī", "ăn", "food");
    const near = [
      word("喝", "hē", "uống", "food"),
      word("吗", "ma", "không?", "greetings"),
    ];
    const far = [
      word("水", "shuǐ", "nước", "food"),
      word("饭", "fàn", "cơm", "food"),
    ];
    const challenge = buildChallenge(subject, [subject, ...near, ...far], 20);
    expect(challenge.choices).toContain("喝");
    expect(challenge.choices).toContain("吗");
  });

  test("an ancient word is squeezed toward radical-and-sound lookalikes", () => {
    // The ancient tier (GAME_PLAY §3.1) wants near-identical options: the
    // ranked rules must spend their picks on 对/不 before anything else.
    const challenge = buildChallenge(SUBJECT, POOL, 60, sequence([0.1, 0.7]));
    expect(challenge.choices).toContain("对");
    expect(challenge.choices).toContain("不");
    expect(challenge.tier).toBe("ancient");
    expect(challenge.direction).toBe("produce");
  });

  test("an ancient pool with no radical matches degrades to shared characters", () => {
    const subject = word("茶", "chá", "trà", "food");
    const pool = [
      subject,
      word("面条", "miàn tiáo", "mì", "food"),
      word("再见", "zài jiàn", "tạm biệt", "greetings"),
      word("咖啡", "kā fēi", "cà phê", "food"),
    ];
    const challenge = buildChallenge(subject, pool, 60);
    expect(challenge.choices).toHaveLength(CHOICE_COUNT);
    expect(challenge.choices).toContain(challenge.answer);
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

describe("deriveGrade", () => {
  // The server re-derives the grade from the raw outcome (GAME_PLAY §3.2
  // D2): a tampered client cannot post PERFECT for a 7-second answer.
  test("derives the tier from the DB interval, not the client", () => {
    expect(
      deriveGrade(16, { correct: true, elapsedMs: 900, hesitated: false })
    ).toBe(ReviewGrade.PERFECT);
    expect(
      deriveGrade(1, { correct: true, elapsedMs: 900, hesitated: false })
    ).toBe(ReviewGrade.EASY);
    expect(
      deriveGrade(16, { correct: true, elapsedMs: 7_000, hesitated: false })
    ).toBe(ReviewGrade.HARD);
    expect(
      deriveGrade(1, { correct: false, elapsedMs: 400, hesitated: false })
    ).toBe(ReviewGrade.FORGOT);
    expect(
      deriveGrade(5, { correct: true, elapsedMs: 2_000, hesitated: true })
    ).toBe(ReviewGrade.HARD);
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

describe("radicals", () => {
  test("maps the planted vocabulary onto its radical families", () => {
    expect(radicalOf("吃")).toBe("口");
    expect(radicalOf("果")).toBe("木");
    expect(radicalOf("？")).toBeNull();
  });

  test("a word carries the radicals of every character", () => {
    expect(wordRadicals("米饭")).toEqual(new Set(["米", "饣"]));
    expect(wordRadicals("咖啡")).toEqual(new Set(["口"]));
  });

  test("words share a radical only through a common family", () => {
    expect(sharesRadical("咖啡", "吃")).toBe(true);
    expect(sharesRadical("米饭", "苹果")).toBe(false);
  });
});
