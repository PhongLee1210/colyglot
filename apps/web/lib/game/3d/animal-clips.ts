export type AnimalClipName =
  "idle" | "walk" | "talk" | "wave" | "eat" | "cheer" | "hop";

export type AnimalClipMeta = {
  seconds: number;
  loop: boolean;
};

export const ANIMAL_CLIPS: Record<AnimalClipName, AnimalClipMeta> = {
  idle: { seconds: 2.4, loop: true },
  walk: { seconds: 0.8, loop: true },
  talk: { seconds: 2.0, loop: true },
  wave: { seconds: 1.8, loop: false },
  eat: { seconds: 1.2, loop: false },
  cheer: { seconds: 1.5, loop: false },
  hop: { seconds: 0.64, loop: false },
};

export type AnimalCharacter = "pip" | "momo" | "nori" | "juniper" | "bramble";

export const ANIMAL_CHARACTERS: readonly AnimalCharacter[] = [
  "pip",
  "momo",
  "nori",
  "juniper",
  "bramble",
];
