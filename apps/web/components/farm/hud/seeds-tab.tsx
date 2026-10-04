"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { upgradeToStandardAction } from "@/lib/actions/auth";
import {
  expandBedAction,
  plantSeedsAction,
  unlockRegionAction,
} from "@/lib/actions/farm";
import { getRegion, LANG_PACKS, REGIONS } from "@/lib/game/content";
import { expandBedCost } from "@/lib/game/core/economy";
import { pickPlantingBed } from "@/lib/game/core/planting";
import { useFarmStore } from "@/lib/game/store/farm-store";
import { useFxStore } from "@/lib/game/store/fx-store";
import {
  applyExpand,
  applyPlant,
  rollbackPlant,
} from "@/lib/game/store/reducers";
import type { RegionStatus } from "@/lib/game/types";

import { panelActionClass, panelCardClass } from "./controls";

type PendingWord = { hanzi: string; pinyin: string; translation: string };

export function SeedsTab() {
  const router = useRouter();
  const { toast } = useToast();
  const snapshot = useFarmStore((state) => state.snapshot);
  const hydrate = useFarmStore((state) => state.hydrate);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);
  const [unlockArmed, setUnlockArmed] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeEmail, setUpgradeEmail] = useState("");
  const [upgrading, setUpgrading] = useState(false);

  const pack = snapshot ? LANG_PACKS[snapshot.world.langKey] : null;
  const plantedHanzi = useMemo(
    () =>
      new Set(
        (snapshot?.beds ?? []).flatMap((bed) =>
          bed.plots.flatMap((plot) => (plot.hanzi ? [plot.hanzi] : []))
        )
      ),
    [snapshot]
  );

  if (!snapshot || !pack) {
    return null;
  }

  const access = snapshot.access;
  const atCap =
    access.cardLimit !== null && access.cardsUsed >= access.cardLimit;

  async function upgrade() {
    if (upgrading) return;
    setUpgrading(true);
    try {
      const result = await upgradeToStandardAction(upgradeEmail);
      if (result.ok) {
        toast("Upgrade link sent — check your email to finish", "success");
        setUpgradeOpen(false);
      } else {
        toast(result.error, "danger");
      }
    } catch {
      toast("Connection lost — check your network and try again", "danger");
    }
    setUpgrading(false);
  }

  async function plantMany(
    key: string,
    bedId: string,
    bedName: string,
    words: PendingWord[]
  ) {
    if (words.length === 0 || busy) return;
    setBusy(key);
    let optimistic = snapshot!;
    for (const word of words) {
      optimistic = applyPlant(
        optimistic,
        bedId,
        word.hanzi,
        word.pinyin,
        word.translation
      );
    }
    hydrate(optimistic);
    try {
      const result = await plantSeedsAction(
        snapshot!.world.langKey,
        bedId,
        words.map((word) => word.hanzi)
      );
      if (result.ok && result.data.capReached) {
        router.refresh();
        if (result.data.planted.length > 0) {
          useFxStore.getState().react("wave");
          toast(
            `Planted ${result.data.planted.length} — word limit reached`,
            "success"
          );
        } else {
          toast("Word limit reached — upgrade to keep planting", "danger");
        }
        setUpgradeOpen(true);
      } else if (result.ok && result.data.planted.length > 0) {
        router.refresh();
        useFxStore.getState().react("wave");
        const plantedCount = result.data.planted.length;
        const waiting = words.length - plantedCount;
        toast(
          waiting > 0
            ? `Planted ${plantedCount} · ${waiting} need space — expand ${bedName} for more`
            : `Planted ${plantedCount} seed${plantedCount > 1 ? "s" : ""}`,
          "success"
        );
      } else {
        const latest = useFarmStore.getState().snapshot;
        if (latest) {
          hydrate(
            rollbackPlant(
              latest,
              bedId,
              words.map((word) => word.hanzi)
            )
          );
        }
        toast(
          result.ok
            ? result.data.bedFull
              ? `${bedName} is full — expand it for more plots`
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
            bedId,
            words.map((word) => word.hanzi)
          )
        );
      }
      toast("Connection lost — check your network and try again", "danger");
    }
    setBusy(null);
  }

  async function expandBed(bedId: string, plotCount: number) {
    if (expanding) return;
    setExpanding(true);
    try {
      const result = await expandBedAction(bedId);
      if (result.ok) {
        hydrate(
          applyExpand(
            useFarmStore.getState().snapshot!,
            bedId,
            result.data.plotCount,
            result.data.gold
          )
        );
        router.refresh();
        useFxStore.getState().react("hop");
        toast(`Bed expanded — ${result.data.plotCount} plots now`, "success");
      } else {
        toast(`Need ${expandBedCost(plotCount)} gold to expand`, "danger");
      }
    } catch {
      toast("Connection lost — check your network and try again", "danger");
    }
    setExpanding(false);
  }

  async function unlock(regionKey: string) {
    if (busy) return;
    setBusy(`unlock-${regionKey}`);
    try {
      const result = await unlockRegionAction(
        snapshot!.world.langKey,
        regionKey
      );
      if (result.ok) {
        hydrate(result.data);
        router.refresh();
        useFxStore.getState().react("cheer");
        toast(`${getRegion(regionKey as "market").name} unlocked!`, "success");
      } else {
        toast(result.error, "danger");
      }
    } catch {
      toast("Connection lost — check your network and try again", "danger");
    }
    setUnlockArmed(null);
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-fg-muted">
        Plant words and grow your vocabulary.
      </p>
      <p className="rounded-full bg-green-100 px-3 py-1.5 text-center text-xs font-bold text-green-900 dark:bg-green-900/40 dark:text-green-100">
        Learning is free — planting costs 0 💰
      </p>
      {access.cardLimit !== null ? (
        atCap ? (
          <button
            type="button"
            data-testid="quota-chip"
            className="rounded-full bg-amber-100 px-3 py-1.5 text-center text-xs font-bold text-amber-900 underline-offset-2 transition hover:underline dark:bg-amber-900/40 dark:text-amber-100"
            onClick={() => setUpgradeOpen(true)}
          >
            {access.cardsUsed} / {access.cardLimit} words planted — tap to
            upgrade
          </button>
        ) : (
          <p
            data-testid="quota-chip"
            className="rounded-full bg-sky-100 px-3 py-1.5 text-center text-xs font-bold text-sky-900 dark:bg-sky-900/40 dark:text-sky-100"
          >
            {access.cardsUsed} / {access.cardLimit} words planted
          </p>
        )
      ) : null}

      {REGIONS.map((region) => {
        const status: RegionStatus | undefined = snapshot.regions.find(
          (item) => item.key === region.key
        );
        if (!status) return null;
        const seedPacks = pack.packs.filter((seedPack) =>
          region.packKeys.includes(seedPack.key)
        );

        if (!status.unlocked) {
          return (
            <section
              key={region.key}
              data-testid={`region-locked-${region.key}`}
              className={`${panelCardClass} opacity-95`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-display font-extrabold">
                  🔒 {region.icon} {region.name}
                  <span className="ml-2 text-xs font-normal text-fg-muted">
                    {region.blurb}
                  </span>
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold">
                  Unlock for {region.unlockGold.toLocaleString()} 💰{" "}
                  {region.unlockTrees} 🌲
                </p>
                <p className="text-xs text-fg-muted">
                  {status.treesGateMet
                    ? "Your Forest is ready."
                    : `Forest trees: ${snapshot.forest.length}/${region.unlockTrees} — trees are memory, they cannot be bought.`}
                  {!status.goldGateMet
                    ? ` · Gold: ${snapshot.world.gold.toLocaleString()}/${region.unlockGold.toLocaleString()}`
                    : ""}
                </p>
                <button
                  type="button"
                  data-testid={`unlock-${region.key}`}
                  className={panelActionClass}
                  disabled={
                    !status.goldGateMet || !status.treesGateMet || busy !== null
                  }
                  onClick={() => {
                    if (unlockArmed === region.key) {
                      void unlock(region.key);
                    } else {
                      setUnlockArmed(region.key);
                    }
                  }}
                >
                  {!status.goldGateMet || !status.treesGateMet
                    ? "Locked"
                    : unlockArmed === region.key
                      ? "Tap again to unlock"
                      : `Unlock ${region.name}`}
                </button>
              </div>
            </section>
          );
        }

        const bed = pickPlantingBed(snapshot.beds, region.key);
        if (!bed) return null;
        const freeSlots = bed.plots.filter(
          (plot) => plot.cardId === null
        ).length;

        return (
          <div key={region.key} className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-fg-muted">
              {region.icon} {region.name} — {freeSlots} free plot
              {freeSlots === 1 ? "" : "s"} in {bed.name}
            </p>

            {freeSlots === 0 ? (
              <div
                className={`flex items-center justify-between gap-3 ${panelCardClass}`}
              >
                <p className="text-sm font-semibold">
                  {bed.name} is full — expand for {expandBedCost(bed.plotCount)}{" "}
                  💰 to keep planting
                </p>
                <button
                  type="button"
                  className={`shrink-0 ${panelActionClass}`}
                  disabled={expanding}
                  onClick={() => expandBed(bed.id, bed.plotCount)}
                >
                  {expanding
                    ? "Expanding…"
                    : `Expand +3 · ${expandBedCost(bed.plotCount)}💰`}
                </button>
              </div>
            ) : null}

            {seedPacks.map((seedPack) => {
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
                        unplanted.length === 0 ||
                        busy !== null ||
                        freeSlots === 0 ||
                        atCap
                      }
                      onClick={() =>
                        plantMany(
                          `pack-${seedPack.key}`,
                          bed.id,
                          bed.name,
                          unplanted
                        )
                      }
                    >
                      {busy === `pack-${seedPack.key}`
                        ? "Planting…"
                        : atCap
                          ? "Limit reached"
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
                            disabled={
                              planted ||
                              busy !== null ||
                              freeSlots === 0 ||
                              atCap
                            }
                            onClick={() =>
                              plantMany(word.hanzi, bed.id, bed.name, [
                                {
                                  hanzi: word.hanzi,
                                  pinyin: word.pinyin,
                                  translation: word.translation,
                                },
                              ])
                            }
                          >
                            {planted
                              ? "Planted"
                              : busy === word.hanzi
                                ? "Planting…"
                                : atCap
                                  ? "Limit reached"
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
      })}

      <Dialog
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="Upgrade to Standard"
      >
        <p className="text-sm text-fg-muted">
          Keep every word you planted. Enter your email and we will send a
          sign-in link — your farm carries over untouched.
        </p>
        <Field label="Email" htmlFor="upgrade-email">
          <Input
            id="upgrade-email"
            type="email"
            autoComplete="email"
            value={upgradeEmail}
            placeholder="you@example.com"
            onChange={(event) => setUpgradeEmail(event.target.value)}
          />
        </Field>
        <button
          type="button"
          className={panelActionClass}
          disabled={upgrading}
          onClick={() => void upgrade()}
        >
          {upgrading ? "Sending…" : "Send upgrade link"}
        </button>
      </Dialog>
    </div>
  );
}
