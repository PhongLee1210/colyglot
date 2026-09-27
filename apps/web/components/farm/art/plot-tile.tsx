"use client";

import { useState } from "react";

import { shade } from "@/lib/game/art/palette";
import { cropVariant } from "@/lib/game/art/variants";
import type { FarmTheme } from "@/lib/game/content/types";
import { cropStage, formatWait, type CropStage } from "@/lib/game/core/crops";
import type { PlotView } from "@/lib/game/types";

import { CropArt } from "./crop-art";

const STAGE_BADGE: Record<CropStage, string> = {
  fresh: "🌱",
  growing: "⏳",
  ready: "✨",
  urgent: "🐛",
};

function stageLine(stage: CropStage, wait: string): string {
  switch (stage) {
    case "fresh":
      return "New seedling — visit the Nursery";
    case "growing":
      return `Growing · ready in ${wait}`;
    case "ready":
      return "Ready to harvest";
    case "urgent":
      return "Memory fading — harvest soon";
  }
}

export function PlotTile({
  plot,
  theme,
  now,
}: {
  plot: PlotView;
  theme: FarmTheme;
  now: Date | null;
}) {
  const [open, setOpen] = useState(false);

  if (!plot.hanzi) {
    return (
      <div
        role="img"
        className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed text-xs"
        style={{
          borderColor: shade(theme.plotBorder, 0.25),
          background: shade(theme.plot, -0.15),
        }}
        aria-label="Empty plot"
      >
        <span className="opacity-40">＋</span>
      </div>
    );
  }

  const stage = now === null ? null : cropStage(plot.schedule, now);
  const ready = stage === "ready" || stage === "urgent";
  const wait =
    now !== null && plot.schedule ? formatWait(plot.schedule.dueAt, now) : "";
  const variant = cropVariant(plot.hanzi);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Plot ${plot.hanzi}`}
        aria-expanded={open}
        className="relative flex aspect-square w-full flex-col items-center justify-end overflow-visible rounded-xl border-2 pb-1 pt-6 transition-[filter] hover:brightness-105"
        style={{
          borderColor: shade(theme.plotBorder, ready ? 0.2 : 0),
          background: `linear-gradient(to top, ${shade(theme.plot, -0.12)}, ${shade(theme.plot, 0.08)})`,
          // New soil pops in; delay scales with slot so expansions cascade.
          animation: `pop-in 240ms ease-out ${plot.slotIndex * 40}ms backwards`,
          ...(ready && stage
            ? {
                ["--pulse-color" as string]: `${theme.accent}88`,
                animation: `pop-in 240ms ease-out ${plot.slotIndex * 40}ms backwards, ready-pulse 1.6s ease-out 300ms infinite`,
              }
            : {}),
        }}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        {stage ? (
          <span className="absolute left-1 top-1 text-[10px] leading-none">
            {STAGE_BADGE[stage]}
          </span>
        ) : null}
        <CropArt
          stage={stage ?? "fresh"}
          variant={variant}
          theme={theme}
          className="pointer-events-none absolute inset-x-0 bottom-4 top-2 h-auto w-full"
        />
        <span className="relative z-10 max-w-full truncate rounded-full bg-white/75 px-1.5 text-sm font-bold leading-tight text-[#2c2416] font-hanzi dark:bg-black/45 dark:text-white">
          {plot.hanzi}
        </span>
        {stage === "growing" ? (
          <span className="relative z-10 text-[9px] text-white/85">{wait}</span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close plot details"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label={`${plot.hanzi} details`}
            className="absolute bottom-full left-1/2 z-40 mb-2 w-40 -translate-x-1/2 rounded-2xl border border-line bg-surface/95 p-3 text-left text-fg shadow-xl"
          >
            <p className="font-hanzi text-lg font-bold leading-tight">
              {plot.hanzi}
              <span className="ml-1 font-sans text-xs font-normal text-fg-muted">
                {plot.pinyin}
              </span>
            </p>
            <p className="text-sm font-semibold">{plot.translation}</p>
            <p className="mt-1 text-xs text-fg-muted">
              {stage ? stageLine(stage, wait) : "…"}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
