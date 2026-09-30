// Correct-run pad (GAME_PLAY §8.3): five correct answers in a row swell
// in a warm chord bed under the farm track; one miss and it fades away.
// Pure WebAudio — lazy context, gentle attack/release so the layer
// breathes rather than switches.

const PAD_BASE_GAIN = 0.14;
const ATTACK_SECONDS = 1.6;
const RELEASE_SECONDS = 2.2;
const RAMP_SECONDS = 0.4;
// C major add9, low register: a calm, open bed under the m4a track.
const PAD_FREQUENCIES = [130.81, 164.81, 196.0, 293.66];

type PadNodes = {
  master: GainNode;
  sources: Array<OscillatorNode | null>;
};

let audioContext: AudioContext | null = null;
let pad: PadNodes | null = null;
let padVolume = 1;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

function ramp(gain: GainNode, target: number, seconds: number): void {
  const audio = audioContext;
  if (!audio) return;
  gain.gain.cancelScheduledValues(audio.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, audio.currentTime);
  gain.gain.linearRampToValueAtTime(target, audio.currentTime + seconds);
}

export function padLayerActive(): boolean {
  return pad !== null;
}

export function startPadLayer(): void {
  if (pad) return;
  const audio = ensureContext();
  if (!audio) return;
  const master = audio.createGain();
  master.gain.setValueAtTime(0.0001, audio.currentTime);
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.4;
  filter.connect(master);
  master.connect(audio.destination);
  const sources = PAD_FREQUENCIES.map((frequency, index) => {
    const oscillator = audio.createOscillator();
    oscillator.type = index === 0 ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    oscillator.detune.value = (index % 2 === 0 ? 1 : -1) * 3;
    const voice = audio.createGain();
    voice.gain.value = 1 / (PAD_FREQUENCIES.length + 1);
    oscillator.connect(voice);
    voice.connect(filter);
    oscillator.start();
    return oscillator;
  });
  pad = { master, sources };
  ramp(master, PAD_BASE_GAIN * padVolume, ATTACK_SECONDS);
}

export function setPadLayerVolume(volume: number): void {
  padVolume = Math.min(1, Math.max(0, volume));
  if (pad && audioContext) {
    ramp(pad.master, PAD_BASE_GAIN * padVolume, RAMP_SECONDS);
  }
}

export function stopPadLayer(): void {
  if (!pad || !audioContext) return;
  const { master, sources } = pad;
  pad = null;
  ramp(master, 0.0001, RELEASE_SECONDS);
  window.setTimeout(
    () => {
      sources.forEach((oscillator) => oscillator?.stop());
      master.disconnect();
    },
    RELEASE_SECONDS * 1000 + 120
  );
}
