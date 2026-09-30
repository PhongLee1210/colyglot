"use client";

const LEAVES = ["🍃", "🌾", "✨"];

// Coins fly toward the HUD gold chip's fixed position (top-right); the
// celebration overlay is glass so the world stays visible behind it.
export function HarvestCelebration({
  claim,
  reviewed,
  onDone,
}: {
  claim: {
    goldAwarded: number;
    cardsHarvested: number;
    streak: number;
    streakBonus: number;
  };
  reviewed: number;
  onDone: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Harvest celebration"
      className="glass fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 p-6 text-center text-fg"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            className="absolute top-0 text-xl"
            style={{
              left: `${(i * 8 + 4) % 100}%`,
              animation: `leaf-fall ${1400 + (i % 3) * 300}ms linear ${i * 110}ms infinite`,
            }}
          >
            {LEAVES[i % LEAVES.length]}
          </span>
        ))}
      </div>
      <div className="relative flex flex-col items-center gap-3 animate-[pop-in_360ms_ease-out]">
        <div className="text-5xl" aria-hidden="true">
          🧺✨
        </div>
        <h1 className="text-xl font-extrabold">Harvest complete!</h1>
        <p
          data-testid="harvest-gold"
          className="text-3xl font-extrabold text-green-700 dark:text-green-400"
        >
          +{claim.goldAwarded} gold
        </p>
        <p className="text-sm text-fg-muted">
          {claim.cardsHarvested} crops harvested · {reviewed} words reviewed
        </p>
        <p className="text-sm font-semibold">
          🔥 Streak: {claim.streak} day{claim.streak === 1 ? "" : "s"}
          {claim.streakBonus > 0 ? ` · +${claim.streakBonus} sweep bonus` : ""}
        </p>
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute left-1/2 top-8 text-lg"
            style={{
              // deterministic fan-out toward the top-right gold chip
              ["--coin-x" as string]: `${20 + i * 14}px`,
              ["--coin-y" as string]: "-38vh",
              animation: `coin-fly 900ms ease-in ${120 + i * 70}ms both`,
            }}
          >
            🪙
          </span>
        ))}
        <button
          type="button"
          className="mt-2 min-h-11 rounded-full bg-primary px-6 py-2 font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800 dark:hover:bg-primary-500"
          onClick={onDone}
        >
          Back to farm
        </button>
      </div>
    </div>
  );
}
