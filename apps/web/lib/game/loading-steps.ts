export const LOADING_STEPS = [
  "Warming the soil…",
  "Sprouting seedlings…",
  "Hanging the lanterns…",
  "Waking the scarecrow…",
  "Rustling the leaves…",
] as const;

export function loadingStepIndex(progress: number): number {
  const clamped = Math.min(Math.max(progress, 0), 100);
  return Math.min(
    LOADING_STEPS.length - 1,
    Math.floor((clamped / 100) * LOADING_STEPS.length)
  );
}
