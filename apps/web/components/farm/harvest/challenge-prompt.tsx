"use client";

import { TIER_LABEL, type Challenge } from "@/lib/game/core/challenge";
import { cn } from "@/lib/utils/cn";

const RETRY_BADGE =
  "bg-orange-500/20 text-orange-700 dark:bg-orange-400/20 dark:text-orange-300";

export function ChallengePrompt({
  challenge,
  retry,
}: {
  challenge: Challenge;
  retry: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={cn(
          "rounded-full px-3 py-1 text-xs font-bold",
          retry ? RETRY_BADGE : "bg-line text-fg-muted"
        )}
      >
        {retry ? "Retry" : TIER_LABEL[challenge.tier]}
      </span>
      <p
        data-testid="harvest-prompt"
        className={cn(
          "font-bold",
          challenge.direction === "recognize"
            ? "font-hanzi text-6xl"
            : "max-w-md text-4xl"
        )}
      >
        {challenge.promptText}
      </p>
      {challenge.promptPinyin ? (
        <p className="text-xl text-fg-muted">{challenge.promptPinyin}</p>
      ) : null}
    </div>
  );
}
