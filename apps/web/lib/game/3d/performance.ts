export type QualityTier = "high" | "medium" | "low";

export type QualitySignals = {
  devicePixelRatio: number;
  hardwareConcurrency: number;
  viewportWidth: number;
  viewportHeight: number;
  prefersReducedMotion: boolean;
};

export type QualityConfig = {
  tier: QualityTier;
  shadowMapSize: 2048 | 1024 | 512;
  shadowsEnabled: boolean;
  dprCap: number;
  antialias: boolean;
};

export const QUALITY_CONFIGS: Record<
  QualityTier,
  Omit<QualityConfig, "tier">
> = {
  high: {
    shadowMapSize: 2048,
    shadowsEnabled: true,
    dprCap: 2,
    antialias: true,
  },
  medium: {
    shadowMapSize: 1024,
    shadowsEnabled: true,
    dprCap: 1.5,
    antialias: true,
  },
  low: {
    shadowMapSize: 512,
    shadowsEnabled: false,
    dprCap: 1,
    antialias: false,
  },
};

export function classifyQualityTier(signals: QualitySignals): QualityTier {
  if (signals.prefersReducedMotion) return "low";
  if (signals.hardwareConcurrency <= 4) return "low";
  const smallScreen =
    Math.min(signals.viewportWidth, signals.viewportHeight) < 420;
  if (
    signals.hardwareConcurrency <= 6 ||
    (smallScreen && signals.devicePixelRatio > 2)
  ) {
    return "medium";
  }
  return "high";
}

export function qualityConfig(signals: QualitySignals): QualityConfig {
  const tier = classifyQualityTier(signals);
  return { tier, ...QUALITY_CONFIGS[tier] };
}

export function detectQualityConfig(): QualityConfig {
  const signals: QualitySignals = {
    devicePixelRatio:
      typeof window === "undefined" ? 1 : window.devicePixelRatio,
    hardwareConcurrency:
      typeof navigator === "undefined" ? 8 : navigator.hardwareConcurrency || 8,
    viewportWidth: typeof window === "undefined" ? 1280 : window.innerWidth,
    viewportHeight: typeof window === "undefined" ? 800 : window.innerHeight,
    prefersReducedMotion:
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
  return qualityConfig(signals);
}

export function hasWebGLSupport(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}
