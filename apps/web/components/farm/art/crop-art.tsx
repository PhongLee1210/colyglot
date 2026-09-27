import type { FarmTheme } from "@/lib/game/content/types";
import type { CropStage } from "@/lib/game/core/crops";

const STEM = "#4e8a3f";
const LEAF = "#7fc95f";
const LEAF_LIGHT = "#a5de7e";
const WILT_STEM = "#a3814a";
const WILT_LEAF = "#c4a35e";

type CropArtProps = {
  stage: CropStage;
  variant: number;
  theme: FarmTheme;
  className?: string;
  animated?: boolean;
};

// One SVG crop per SRS stage; the silhouette varies deterministically by
// `variant` (from cropVariant). Urgent crops wilt and attract a pest.
export function CropArt({
  stage,
  variant,
  theme,
  className,
  animated = true,
}: CropArtProps) {
  const wilted = stage === "urgent";
  const stemColor = wilted ? WILT_STEM : STEM;
  const leafColor = wilted ? WILT_LEAF : LEAF;
  const lightColor = wilted ? WILT_LEAF : LEAF_LIGHT;
  const height = stage === "fresh" ? 16 : stage === "growing" ? 26 : 34;
  const baseY = 58;
  const topY = baseY - height;

  const idle =
    animated && stage === "urgent"
      ? { animation: "bug-wiggle 1.2s ease-in-out infinite" }
      : animated && stage !== "fresh"
        ? { animation: "sway 3.2s ease-in-out infinite" }
        : undefined;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={
        wilted
          ? "wilting crop"
          : stage === "ready"
            ? "ripe crop"
            : stage === "growing"
              ? "growing crop"
              : "seedling"
      }
      style={{ transformOrigin: "50% 100%", ...idle }}
    >
      {/* variant 1 grows a twin stalk, variant 2 a side leaf cluster */}
      {variant === 1 ? (
        <path
          d={`M38 ${baseY} Q36 ${baseY - height * 0.7} 33 ${topY + 4}`}
          stroke={stemColor}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      ) : null}
      {variant === 2 ? (
        <ellipse cx="22" cy={topY + 12} rx="6" ry="4" fill={lightColor} />
      ) : null}

      <path
        d={`M32 ${baseY} Q31 ${baseY - height * 0.6} 32 ${topY}`}
        stroke={stemColor}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />

      {stage === "fresh" ? (
        <>
          <ellipse cx="25" cy={topY} rx="6" ry="3.5" fill={leafColor} />
          <ellipse cx="39" cy={topY + 2} rx="6" ry="3.5" fill={lightColor} />
        </>
      ) : stage === "ready" ? (
        <>
          {/* grain head tinted with the tier accent so harvest reads at a glance */}
          <ellipse cx="32" cy={topY} rx="7" ry="10" fill={theme.accent} />
          <ellipse cx="28" cy={topY + 4} rx="4" ry="7" fill={leafColor} />
          <ellipse cx="36" cy={topY + 4} rx="4" ry="7" fill={leafColor} />
          <ellipse cx="20" cy={topY + 14} rx="6.5" ry="4" fill={lightColor} />
          <ellipse cx="44" cy={topY + 16} rx="6.5" ry="4" fill={leafColor} />
        </>
      ) : (
        <>
          <ellipse cx="23" cy={topY + 8} rx="7" ry="4.5" fill={leafColor} />
          <ellipse cx="41" cy={topY + 12} rx="7" ry="4.5" fill={lightColor} />
          <ellipse cx="25" cy={topY + 20} rx="6" ry="4" fill={leafColor} />
        </>
      )}

      {stage === "urgent" ? (
        <g>
          <circle cx="46" cy={topY + 6} r="3.5" fill="#5b3a29" />
          <circle cx="47.5" cy={topY + 5} r="1" fill="#fff" />
        </g>
      ) : null}
    </svg>
  );
}
