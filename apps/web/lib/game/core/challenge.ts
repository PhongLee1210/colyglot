import { ReviewGrade } from "@colyglot/srs";

import { sharesRadical } from "@/lib/game/core/hanzi";

// The review question gets harder as the crop matures (GAME_PLAY §3.1): a
// tree can only grow old if the player keeps winning a harder question, so
// a big tree cannot be faked by tapping through easy recognition.
export type ChallengeTier = "seedling" | "growing" | "mature" | "ancient";

// Recognizing a word ("what does 对不起 mean?") is far easier than producing
// it ("which word means xin lỗi?"), so the direction flips with maturity.
export type ChallengeDirection = "recognize" | "produce";

export const GROWING_MIN_INTERVAL_DAYS = 3;
export const MATURE_MIN_INTERVAL_DAYS = 14;
export const ANCIENT_MIN_INTERVAL_DAYS = 45;

// Response-time bands that turn a tap into a ReviewGrade (GAME_PLAY §3.2).
// Starting values: log 200 real reviews, and if over 40% land in one band
// the thresholds say nothing — shift them toward 15% EASY+PERFECT / 55%
// GOOD / 20% HARD / 10% FORGOT.
export const PERFECT_MAX_RESPONSE_MS = 1200;
export const EASY_MAX_RESPONSE_MS = 2500;
export const GOOD_MAX_RESPONSE_MS = 6000;

export const CHOICE_COUNT = 4;

// Feedback windows (GAME_PLAY §8.1). A wrong answer holds longer than a
// right one because seeing the correct answer next to your mistake is the
// moment the learning actually happens — animation must never swallow it.
export const CORRECT_HOLD_MS = 900;
export const WRONG_HOLD_MS = 1500;
export const UNDO_WINDOW_MS = 2000;

// The answer feedback lands on a deliberate beat: the button sinks
// immediately (0–80ms), then the color burst, chime and shake all land
// together at 120ms (GAME_PLAY §8.1, "120 ms" row).
export const FEEDBACK_DELAY_MS = 120;
export const SHAKE_MS = 120;

// Early taps in the last instant of a hold still count for the next
// question (GAME_PLAY §8.4 rule 3): a tap buffered within this window of
// the next grid appearing replays onto the choice at the same position.
export const INPUT_BUFFER_MS = 120;

export type ChallengeWord = {
  hanzi: string;
  pinyin: string;
  translation: string;
  packKey: string;
};

export type Challenge = {
  tier: ChallengeTier;
  direction: ChallengeDirection;
  question: string;
  hint: string;
  promptText: string;
  promptPinyin: string | null;
  choices: string[];
  answer: string;
};

export type ResponseOutcome = {
  correct: boolean;
  elapsedMs: number;
  hesitated: boolean;
  tier: ChallengeTier;
};

export function challengeTier(intervalDaysBefore: number): ChallengeTier {
  if (intervalDaysBefore >= ANCIENT_MIN_INTERVAL_DAYS) return "ancient";
  if (intervalDaysBefore >= MATURE_MIN_INTERVAL_DAYS) return "mature";
  if (intervalDaysBefore >= GROWING_MIN_INTERVAL_DAYS) return "growing";
  return "seedling";
}

export function challengeDirection(tier: ChallengeTier): ChallengeDirection {
  return tier === "seedling" || tier === "growing" ? "recognize" : "produce";
}

// Pinyin is a second answer, not a prompt: it stays only while the word is
// brand new and the player cannot be expected to read the characters yet.
export function showsPinyin(tier: ChallengeTier): boolean {
  return tier === "seedling";
}

export const TIER_LABEL: Record<ChallengeTier, string> = {
  seedling: "New word",
  growing: "Growing",
  mature: "Mature",
  ancient: "Ancient",
};

const TIER_HINT: Record<ChallengeTier, string> = {
  seedling: "New word — read it aloud, then pick what it means.",
  growing: "No pinyin now. Sound it out before you pick.",
  mature: "Picture where you would use it, then pick the word.",
  ancient: "These look alike — check the tone before you pick.",
};

export function shuffle<T>(
  items: readonly T[],
  random: () => number = Math.random
): T[] {
  // Fisher–Yates: `sort(() => Math.random() - 0.5)` skews positions, which
  // lets learners guess the answer slot instead of recalling the meaning.
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function tonelessPinyin(pinyin: string): string {
  return pinyin
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\d|\s/g, "")
    .toLowerCase();
}

function sharesCharacter(left: string, right: string): boolean {
  return [...left].some((character) => right.includes(character));
}

// Starting value: two leading letters. Validate with GAME_PLAY §10.4 — at
// the ancient tier the correct rate must sit in 75–88%; above 92% means the
// distractors are too easy and this match needs to be stricter.
const NEAR_PINYIN_PREFIX_LENGTH = 2;

function nearPinyin(left: string, right: string): boolean {
  const first = tonelessPinyin(left);
  const second = tonelessPinyin(right);
  return (
    first === second ||
    first.slice(0, NEAR_PINYIN_PREFIX_LENGTH) ===
      second.slice(0, NEAR_PINYIN_PREFIX_LENGTH)
  );
}

type DistractorRule = (candidate: ChallengeWord) => boolean;

// Ranked from the ideal distractor down; whatever the content pack cannot
// fill is topped up by the always-true rule appended in pickDistractors, so
// a thin pool degrades into easier choices instead of a broken grid.
function distractorRules(
  tier: ChallengeTier,
  word: ChallengeWord
): DistractorRule[] {
  switch (tier) {
    case "seedling":
      return [(candidate) => candidate.packKey !== word.packKey];
    case "growing":
      return [(candidate) => candidate.packKey === word.packKey];
    case "mature":
      // Same radical OR same sound: both are the ways a mature reader
      // actually confuses two words (GAME_PLAY §3.1).
      return [
        (candidate) =>
          sharesRadical(candidate.hanzi, word.hanzi) ||
          nearPinyin(candidate.pinyin, word.pinyin),
      ];
    case "ancient":
      // Near-identical: prefer radical AND sound together, degrade to
      // either — the choice grid must read like a fine-discrimination test.
      return [
        (candidate) =>
          sharesRadical(candidate.hanzi, word.hanzi) &&
          nearPinyin(candidate.pinyin, word.pinyin),
        (candidate) =>
          sharesRadical(candidate.hanzi, word.hanzi) ||
          nearPinyin(candidate.pinyin, word.pinyin),
        (candidate) => sharesCharacter(candidate.hanzi, word.hanzi),
      ];
  }
}

function choiceText(
  word: ChallengeWord,
  direction: ChallengeDirection
): string {
  return direction === "recognize" ? word.translation : word.hanzi;
}

function pickDistractors(
  word: ChallengeWord,
  pool: readonly ChallengeWord[],
  tier: ChallengeTier,
  direction: ChallengeDirection,
  random: () => number
): string[] {
  const taken = new Set([choiceText(word, direction)]);
  const candidates = pool.filter((item) => item.hanzi !== word.hanzi);
  const picked: string[] = [];

  for (const rule of [...distractorRules(tier, word), () => true]) {
    if (picked.length >= CHOICE_COUNT - 1) break;
    for (const candidate of shuffle(candidates.filter(rule), random)) {
      if (picked.length >= CHOICE_COUNT - 1) break;
      const text = choiceText(candidate, direction);
      if (taken.has(text)) continue;
      taken.add(text);
      picked.push(text);
    }
  }
  return picked;
}

export function buildChallenge(
  word: ChallengeWord,
  pool: readonly ChallengeWord[],
  intervalDaysBefore: number,
  random: () => number = Math.random
): Challenge {
  const tier = challengeTier(intervalDaysBefore);
  const direction = challengeDirection(tier);
  const answer = choiceText(word, direction);
  return {
    tier,
    direction,
    question:
      direction === "recognize"
        ? "What does this mean?"
        : "Which word means this?",
    hint: TIER_HINT[tier],
    promptText: direction === "recognize" ? word.hanzi : word.translation,
    promptPinyin: showsPinyin(tier) ? word.pinyin : null,
    choices: shuffle(
      [answer, ...pickDistractors(word, pool, tier, direction, random)],
      random
    ),
    answer,
  };
}

// PERFECT is gated behind production so a fast tap on a brand-new word can
// never farm the 1.5 gold multiplier (GAME_PLAY §3.2).
function awardsPerfect(tier: ChallengeTier): boolean {
  return challengeDirection(tier) === "produce";
}

export function gradeFromResponse({
  correct,
  elapsedMs,
  hesitated,
  tier,
}: ResponseOutcome): ReviewGrade {
  if (!correct) return ReviewGrade.FORGOT;
  if (hesitated || elapsedMs > GOOD_MAX_RESPONSE_MS) return ReviewGrade.HARD;
  if (elapsedMs > EASY_MAX_RESPONSE_MS) return ReviewGrade.GOOD;
  if (elapsedMs > PERFECT_MAX_RESPONSE_MS) return ReviewGrade.EASY;
  return awardsPerfect(tier) ? ReviewGrade.PERFECT : ReviewGrade.EASY;
}
