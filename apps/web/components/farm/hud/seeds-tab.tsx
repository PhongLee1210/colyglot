"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { expandBedAction, plantSeedsAction } from "@/lib/actions/farm";
import { LANG_PACKS } from "@/lib/game/content";
import { expandBedCost } from "@/lib/game/core/economy";
import { useFarmStore } from "@/lib/game/store/farm-store";
import { useFxStore } from "@/lib/game/store/fx-store";
import {
  applyExpand,
  applyPlant,
  rollbackPlant,
} from "@/lib/game/store/reducers";

import { panelActionClass, panelCardClass } from "./controls";

type PendingWord = { hanzi: string; pinyin: string; translation: string };

export function SeedsTab() {
  const router = useRouter();
  const { toast } = useToast();
  const snapshot = useFarmStore((state) => state.snapshot);
  const hydrate = useFarmStore((state) => state.hydrate);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);

  const pack = snapshot ? LANG_PACKS[snapshot.world.langKey] : null;
  const gardenBed =
    snapshot?.beds.find((bed) => bed.position === 0) ?? snapshot?.beds[0];
  const plantedHanzi = useMemo(
    () =>
      new Set(
        (snapshot?.beds ?? []).flatMap((bed) =>
          bed.plots.flatMap((plot) => (plot.hanzi ? [plot.hanzi] : []))
        )
      ),
    [snapshot]
  );
  const freeSlots = gardenBed
    ? gardenBed.plots.filter((plot) => plot.cardId === null).length
    : 0;

  if (!snapshot || !pack || !gardenBed) {
    return null;
  }

  async function plantMany(
    key: string,
    words: PendingWord[],
    bedFullMessage: string
  ) {
    if (words.length === 0 || busy) return;
    setBusy(key);
    let optimistic = snapshot!;
    for (const word of words) {
      optimistic = applyPlant(
        optimistic,
        gardenBed!.id,
        word.hanzi,
        word.pinyin,
        word.translation
      );
    }
    hydrate(optimistic);
    try {
      const result = await plantSeedsAction(
        snapshot!.world.langKey,
        gardenBed!.id,
        words.map((word) => word.hanzi)
      );
      if (result.ok && result.data.planted.length > 0) {
        router.refresh();
        useFxStore.getState().react("wave");
        const plantedCount = result.data.planted.length;
        const waiting = words.length - plantedCount;
        toast(
          waiting > 0
            ? `Planted ${plantedCount} · ${waiting} need space — expand the bed for more`
            : `Planted ${plantedCount} seed${plantedCount > 1 ? "s" : ""}`,
          "success"
        );
      } else {
        const latest = useFarmStore.getState().snapshot;
        if (latest) {
          hydrate(
            rollbackPlant(
              latest,
              gardenBed!.id,
              words.map((word) => word.hanzi)
            )
          );
        }
        toast(
          result.ok
            ? result.data.bedFull
              ? bedFullMessage
              : "Already planted"
            : result.error,
          "danger"
        );
      }
    } catch {
      const latest = useFarmStore.getState().snapshot;
      if (latest) {
        hydrate(
          rollbackPlant(
            latest,
            gardenBed!.id,
            words.map((word) => word.hanzi)
          )
        );
      }
      toast("Connection lost — check your network and try again", "danger");
    }
    setBusy(null);
  }

  async function expandBed() {
    if (expanding) return;
    setExpanding(true);
    try {
      const result = await expandBedAction(gardenBed!.id);
      if (result.ok) {
        hydrate(
          applyExpand(
            useFarmStore.getState().snapshot!,
            gardenBed!.id,
            result.data.plotCount,
            result.data.gold
          )
        );
        router.refresh();
        useFxStore.getState().react("hop");
        toast(`Bed expanded — ${result.data.plotCount} plots now`, "success");
      } else {
        toast(
          `Need ${expandBedCost(gardenBed!.plotCount)} gold to expand`,
          "danger"
        );
      }
    } catch {
      toast("Connection lost — check your network and try again", "danger");
    }
    setExpanding(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-fg-muted">
        Plant words and grow your vocabulary.
      </p>
      <p className="rounded-full bg-green-100 px-3 py-1.5 text-center text-xs font-bold text-green-900 dark:bg-green-900/40 dark:text-green-100">
        Learning is free — planting costs 0 💰
      </p>
      <p className="text-xs text-fg-muted">
        {freeSlots} free plot{freeSlots === 1 ? "" : "s"} in {gardenBed.name}
      </p>

      {freeSlots === 0 ? (
        <div
          className={`flex items-center justify-between gap-3 ${panelCardClass}`}
        >
          <p className="text-sm font-semibold">
            Bed full — expand for {expandBedCost(gardenBed.plotCount)} 💰 to
            keep planting
          </p>
          <button
            type="button"
            className={`shrink-0 ${panelActionClass}`}
            disabled={expanding}
            onClick={expandBed}
          >
            {expanding
              ? "Expanding…"
              : `Expand +3 · ${expandBedCost(gardenBed.plotCount)}💰`}
          </button>
        </div>
      ) : null}

      {pack.packs.map((seedPack) => {
        const unplanted = seedPack.words
          .filter((word) => !plantedHanzi.has(word.hanzi))
          .slice(0, Math.max(freeSlots, 0));
        return (
          <section key={seedPack.key} className={panelCardClass}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-display font-extrabold">
                {seedPack.icon} {seedPack.name}
                <span className="ml-2 text-xs font-normal text-fg-muted">
                  {seedPack.words.length} words
                </span>
              </h3>
              <button
                type="button"
                className={panelActionClass}
                disabled={
                  unplanted.length === 0 || busy !== null || freeSlots === 0
                }
                onClick={() =>
                  plantMany(
                    `pack-${seedPack.key}`,
                    unplanted,
                    `Not enough free plots in ${gardenBed.name} — expand it first`
                  )
                }
              >
                {busy === `pack-${seedPack.key}`
                  ? "Planting…"
                  : freeSlots === 0
                    ? "Bed full"
                    : "Plant Pack"}
              </button>
            </div>
            <ul className="flex flex-col gap-2">
              {seedPack.words.map((word) => {
                const planted = plantedHanzi.has(word.hanzi);
                return (
                  <li
                    key={word.hanzi}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <div>
                      <div className="font-bold">
                        <span className="font-hanzi">{word.hanzi}</span>{" "}
                        <span className="text-sm text-fg-muted">
                          {word.pinyin}
                        </span>
                      </div>
                      <div className="text-sm text-fg-muted">
                        {word.translation}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={panelActionClass}
                      disabled={planted || busy !== null || freeSlots === 0}
                      onClick={() =>
                        plantMany(
                          word.hanzi,
                          [
                            {
                              hanzi: word.hanzi,
                              pinyin: word.pinyin,
                              translation: word.translation,
                            },
                          ],
                          `Not enough free plots in ${gardenBed.name} — expand it first`
                        )
                      }
                    >
                      {planted
                        ? "Planted"
                        : busy === word.hanzi
                          ? "Planting…"
                          : freeSlots === 0
                            ? "Bed full"
                            : `Plant ${word.hanzi}`}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
