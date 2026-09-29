import { useMusicStore } from "@/lib/game/store/music-store";

// GAME_PLAY §8.4 rule 1: every answer fires at least two feedback channels.
// Tones are synthesised rather than loaded so a review never waits on a
// network request to feel responsive.
const CORRECT_FROM_HZ = 660;
const CORRECT_TO_HZ = 988;
const CORRECT_MS = 180;
const WRONG_HZ = 164;
const WRONG_MS = 140;

// Well under the music bed so the answer tone reads as a chime, not a hit.
const PEAK_GAIN = 0.12;
const SILENCE_GAIN = 0.0001;
const ATTACK_SECONDS = 0.01;

const CORRECT_HAPTIC_MS = 12;
const WRONG_HAPTIC_PATTERN = [18, 40, 18];

let sharedContext: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) {
    return null;
  }
  sharedContext ??= new AudioContext();
  // Browsers suspend contexts created before the first gesture; every call
  // runs from a tap, so resuming here is always allowed.
  if (sharedContext.state === "suspended") {
    void sharedContext.resume().catch(() => {});
  }
  return sharedContext;
}

function playTone(fromHz: number, toHz: number, durationMs: number): void {
  const context = audioContext();
  if (!context) {
    return;
  }
  const seconds = durationMs / 1000;
  const startedAt = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(fromHz, startedAt);
  oscillator.frequency.linearRampToValueAtTime(toHz, startedAt + seconds);
  gain.gain.setValueAtTime(SILENCE_GAIN, startedAt);
  gain.gain.linearRampToValueAtTime(PEAK_GAIN, startedAt + ATTACK_SECONDS);
  gain.gain.exponentialRampToValueAtTime(SILENCE_GAIN, startedAt + seconds);

  oscillator.connect(gain).connect(context.destination);
  oscillator.start(startedAt);
  oscillator.stop(startedAt + seconds);
}

// iOS Safari exposes no Vibration API at all, so haptics are a bonus
// channel — the visual and audio channels carry the feedback on their own.
function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return;
  }
  navigator.vibrate(pattern);
}

export function playAnswerFeedback(correct: boolean): void {
  if (useMusicStore.getState().muted) {
    return;
  }
  if (correct) {
    playTone(CORRECT_FROM_HZ, CORRECT_TO_HZ, CORRECT_MS);
    vibrate(CORRECT_HAPTIC_MS);
    return;
  }
  playTone(WRONG_HZ, WRONG_HZ, WRONG_MS);
  vibrate(WRONG_HAPTIC_PATTERN);
}
