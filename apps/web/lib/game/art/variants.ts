export const CROP_VARIANT_COUNT = 3;

// Deterministic per-word crop silhouette. Art must never call Math.random
// in render (rendering standard), so variety comes from a stable hash.
export function cropVariant(seed: string): number {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % CROP_VARIANT_COUNT;
}
