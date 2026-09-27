import { ReviewGrade } from "@colyglot/srs";

export const STARTING_GOLD = 40;
export const START_PLOTS = 6;
export const PLOTS_PER_EXPAND = 3;
export const EXPAND_BASE_COST = 20;
export const BASE_GOLD_CAP_DAYS = 60;

export function expansionsSoFar(plotCount: number): number {
  return Math.floor((plotCount - START_PLOTS) / PLOTS_PER_EXPAND);
}

// Cost of the NEXT expansion from a bed with `plotCount` plots: 20, 40, 60 …
export function expandBedCost(plotCount: number): number {
  return EXPAND_BASE_COST * (expansionsSoFar(plotCount) + 1);
}

// Mature memories pay more: the pre-review interval IS memory strength.
export function baseHarvestGold(intervalDaysBefore: number): number {
  const clamped = Math.min(Math.max(intervalDaysBefore, 0), BASE_GOLD_CAP_DAYS);
  return 2 + clamped;
}

export const GRADE_GOLD_MULTIPLIER: Record<ReviewGrade, number> = {
  [ReviewGrade.FORGOT]: 0.25,
  [ReviewGrade.HARD]: 0.75,
  [ReviewGrade.GOOD]: 1,
  [ReviewGrade.EASY]: 1.25,
  [ReviewGrade.PERFECT]: 1.5,
};

export function harvestGold(
  intervalDaysBefore: number,
  grade: ReviewGrade
): number {
  return Math.max(
    1,
    Math.round(
      baseHarvestGold(intervalDaysBefore) * GRADE_GOLD_MULTIPLIER[grade]
    )
  );
}

export type HarvestPreview = {
  base: number;
  multiplier: number;
  total: number;
};

// Shown right after grading so "better memory → better harvest" is visible.
// Display-only: the claim at session end stays the authoritative payout.
export function harvestPreview(
  intervalDaysBefore: number,
  grade: ReviewGrade
): HarvestPreview {
  return {
    base: baseHarvestGold(intervalDaysBefore),
    multiplier: GRADE_GOLD_MULTIPLIER[grade],
    total: harvestGold(intervalDaysBefore, grade),
  };
}
