import { mix, shade } from "@/lib/game/art/palette";

type DecorProps = { className?: string };

export function Sun({ className }: DecorProps) {
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden="true">
      <circle cx="36" cy="36" r="28" fill="#ffd45e" opacity="0.35" />
      <circle cx="36" cy="36" r="18" fill="#ffd45e" />
      <circle cx="30" cy="32" r="3" fill="#e8b23a" opacity="0.6" />
    </svg>
  );
}

export function Cloud({
  className,
  style,
}: DecorProps & { style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 96 40"
      className={className}
      style={{ animation: "cloud-drift 70s ease-in-out infinite", ...style }}
      aria-hidden="true"
    >
      <ellipse cx="28" cy="26" rx="20" ry="12" fill="#fff" opacity="0.95" />
      <ellipse cx="52" cy="20" rx="24" ry="14" fill="#fff" opacity="0.95" />
      <ellipse cx="74" cy="27" rx="17" ry="10" fill="#fff" opacity="0.9" />
    </svg>
  );
}

export function Tree({ className }: DecorProps) {
  return (
    <svg viewBox="0 0 64 72" className={className} aria-hidden="true">
      <rect x="29" y="40" width="6" height="28" rx="2" fill="#8a5a33" />
      <circle cx="32" cy="24" r="17" fill="#5fae52" />
      <circle cx="20" cy="32" r="11" fill="#6fbe5f" />
      <circle cx="44" cy="31" r="12" fill="#81cc6e" />
    </svg>
  );
}

export function Flower({
  className,
  hue = "pink",
}: DecorProps & { hue?: "pink" | "yellow" }) {
  const petal = hue === "pink" ? "#f4a4c0" : "#f7d154";
  return (
    <svg viewBox="0 0 24 32" className={className} aria-hidden="true">
      <path
        d="M12 30 Q11 22 12 14"
        stroke="#4e8a3f"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="12" cy="8" r="3.2" fill="#fff6d8" />
      <circle cx="7" cy="10" r="3" fill={petal} />
      <circle cx="17" cy="10" r="3" fill={petal} />
      <circle cx="9" cy="5" r="3" fill={petal} />
      <circle cx="15" cy="5" r="3" fill={petal} />
    </svg>
  );
}

export function Rock({ className }: DecorProps) {
  return (
    <svg viewBox="0 0 40 24" className={className} aria-hidden="true">
      <ellipse cx="16" cy="16" rx="14" ry="8" fill="#b9b3a6" />
      <ellipse cx="28" cy="18" rx="9" ry="6" fill="#a29c8f" />
      <ellipse cx="13" cy="13" rx="6" ry="3" fill="#c9c4b8" />
    </svg>
  );
}

export function Pond({ className }: DecorProps) {
  return (
    <svg viewBox="0 0 120 56" className={className} aria-hidden="true">
      <ellipse cx="60" cy="30" rx="56" ry="24" fill="#8fd0ea" />
      <ellipse cx="60" cy="30" rx="44" ry="17" fill="#a8ddf2" />
      <path
        d="M34 26 q8 -3 16 0"
        stroke="#ffffff"
        strokeWidth="2"
        fill="none"
        opacity="0.7"
        strokeLinecap="round"
      />
      <path
        d="M62 36 q9 -3 18 0"
        stroke="#ffffff"
        strokeWidth="2"
        fill="none"
        opacity="0.55"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Shed({ className }: DecorProps) {
  return (
    <svg viewBox="0 0 96 80" className={className} aria-hidden="true">
      <polygon points="8,34 48,8 88,34" fill="#8a4a2f" />
      <rect x="16" y="34" width="64" height="42" rx="4" fill="#c96f4a" />
      <rect x="38" y="46" width="20" height="30" rx="2" fill="#7a3f28" />
      <path d="M38 46 h20 v8 h-20 z" fill="#5d3a1e" opacity="0.35" />
      <rect x="22" y="40" width="10" height="10" rx="2" fill="#f3e3c3" />
      <rect x="64" y="40" width="10" height="10" rx="2" fill="#f3e3c3" />
    </svg>
  );
}

export function Fence({
  posts = 8,
  className,
}: DecorProps & { posts?: number }) {
  const width = posts * 14;
  const rails = Array.from({ length: posts - 1 }, (_, i) => i);
  return (
    <svg
      viewBox={`0 0 ${width} 30`}
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {rails.map((i) => (
        <rect
          key={`rail-${i}`}
          x={i * 14 + 8}
          y={8}
          width={14}
          height={3.5}
          rx={1.5}
          fill="#b98a5a"
        />
      ))}
      {rails.map((i) => (
        <rect
          key={`post-${i}`}
          x={i * 14 + 2}
          y={3}
          width={6}
          height={26}
          rx={2}
          fill="#96683f"
        />
      ))}
      <rect x={width - 8} y={3} width="6" height="26" rx="2" fill="#96683f" />
    </svg>
  );
}

export function Butterfly({
  className,
  delay = 0,
}: DecorProps & { delay?: number }) {
  return (
    <svg
      viewBox="0 0 28 24"
      className={className}
      style={{ animation: `float-soft 4s ease-in-out infinite ${delay}ms` }}
      aria-hidden="true"
    >
      <ellipse
        cx="9"
        cy="10"
        rx="7"
        ry="9"
        fill="#f4b6d8"
        transform="rotate(-18 9 10)"
      />
      <ellipse
        cx="19"
        cy="10"
        rx="7"
        ry="9"
        fill="#f7cbe4"
        transform="rotate(18 19 10)"
      />
      <rect x="13" y="6" width="2" height="13" rx="1" fill="#5b3a29" />
    </svg>
  );
}

// Grass-tone helpers shared by scene backgrounds.
export function grassTexture(ground: [string, string]): {
  backgroundImage: string;
  backgroundSize: string;
} {
  return {
    backgroundImage: `radial-gradient(${shade(ground[0], -0.07)} 1.2px, transparent 1.2px)`,
    backgroundSize: "22px 22px",
  };
}

export function waterTint(hex: string): string {
  return mix(hex, "#7cc4e8", 0.2);
}
