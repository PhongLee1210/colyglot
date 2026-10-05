// The farm boots through five beats; their wording lives in the dictionary
// so the loading screen speaks the player's language.
export const LOADING_STEP_COUNT = 5;

export function loadingStepIndex(progress: number): number {
  const clamped = Math.min(Math.max(progress, 0), 100);
  return Math.min(
    LOADING_STEP_COUNT - 1,
    Math.floor((clamped / 100) * LOADING_STEP_COUNT)
  );
}
