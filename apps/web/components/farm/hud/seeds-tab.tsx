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
import { LANG_PACKS, REGIONS } from "@/lib/game/content";
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
import { bedName } from "@/lib/i18n/labels";
import { useT } from "@/lib/i18n/use-t";

import { panelActionClass, panelCardClass } from "./controls";

type PendingWord = { hanzi: string; pinyin: string; translation: string };

export function SeedsTab() {
  const router = useRouter();
  const t = useT();
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
        toast(t.seeds.upgradeLinkSent, "success");
        setUpgradeOpen(false);
      } else {
        toast(t.errors[result.error], "danger");
      }
    } catch {
      toast(t.farm.connectionLost, "danger");
    }
    setUpgrading(false);
  }

  async function plantMany(
    key: string,
    bedId: string,
    bedLabel: string,
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
            t.seeds.plantedCapReached(result.data.planted.length),
            "success"
          );
        } else {
          toast(t.seeds.capReachedUpgrade, "danger");
        }
        setUpgradeOpen(true);
      } else if (result.ok && result.data.planted.length > 0) {
        router.refresh();
        useFxStore.getState().react("wave");
        const plantedCount = result.data.planted.length;
        const waiting = words.length - plantedCount;
        toast(
          waiting > 0
            ? t.seeds.plantedSomeWaiting(plantedCount, waiting, bedLabel)
            : t.seeds.plantedCount(plantedCount),
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
              ? t.seeds.bedFullExpandToast(bedLabel)
              : t.seeds.alreadyPlanted
            : t.errors[result.error],
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
      toast(t.farm.connectionLost, "danger");
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
        toast(t.seeds.bedExpanded(result.data.plotCount), "success");
      } else {
        toast(t.beds.needGoldToExpand(expandBedCost(plotCount)), "danger");
      }
    } catch {
      toast(t.farm.connectionLost, "danger");
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
        toast(
          t.seeds.regionUnlocked(t.regions[regionKey as "market"].name),
          "success"
        );
      } else {
        toast(t.errors[result.error], "danger");
      }
    } catch {
      toast(t.farm.connectionLost, "danger");
    }
    setUnlockArmed(null);
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-fg-muted">{t.seeds.intro}</p>
      <p className="rounded-full bg-green-100 px-3 py-1.5 text-center text-xs font-bold text-green-900 dark:bg-green-900/40 dark:text-green-100">
        {t.seeds.freeNote}
      </p>
      {access.cardLimit !== null ? (
        atCap ? (
          <button
            type="button"
            data-testid="quota-chip"
            className="rounded-full bg-amber-100 px-3 py-1.5 text-center text-xs font-bold text-amber-900 underline-offset-2 transition hover:underline dark:bg-amber-900/40 dark:text-amber-100"
            onClick={() => setUpgradeOpen(true)}
          >
            {t.seeds.quotaAtCap(access.cardsUsed, access.cardLimit)}
          </button>
        ) : (
          <p
            data-testid="quota-chip"
            className="rounded-full bg-sky-100 px-3 py-1.5 text-center text-xs font-bold text-sky-900 dark:bg-sky-900/40 dark:text-sky-100"
          >
            {t.seeds.quotaUsed(access.cardsUsed, access.cardLimit)}
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
                  🔒 {region.icon} {t.regions[region.key].name}
                  <span className="ml-2 text-xs font-normal text-fg-muted">
                    {t.regions[region.key].blurb}
                  </span>
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold">
                  {t.seeds.unlockCost(region.unlockGold, region.unlockTrees)}
                </p>
                <p className="text-xs text-fg-muted">
                  {status.treesGateMet
                    ? t.seeds.forestReady
                    : t.seeds.forestProgress(
                        snapshot.forest.length,
                        region.unlockTrees
                      )}
                  {!status.goldGateMet
                    ? t.seeds.goldProgress(
                        snapshot.world.gold,
                        region.unlockGold
                      )
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
                    ? t.common.locked
                    : unlockArmed === region.key
                      ? t.seeds.tapAgainToUnlock
                      : t.seeds.unlockRegion(t.regions[region.key].name)}
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
        const bedLabel = bedName(t, bed);

        return (
          <div key={region.key} className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-fg-muted">
              {region.icon}{" "}
              {t.seeds.freePlotsIn(
                t.regions[region.key].name,
                freeSlots,
                bedLabel
              )}
            </p>

            {freeSlots === 0 ? (
              <div
                className={`flex items-center justify-between gap-3 ${panelCardClass}`}
              >
                <p className="text-sm font-semibold">
                  {t.seeds.bedFullExpand(
                    bedLabel,
                    expandBedCost(bed.plotCount)
                  )}
                </p>
                <button
                  type="button"
                  className={`shrink-0 ${panelActionClass}`}
                  disabled={expanding}
                  onClick={() => expandBed(bed.id, bed.plotCount)}
                >
                  {expanding
                    ? t.seeds.expanding
                    : t.seeds.expandAction(expandBedCost(bed.plotCount))}
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
                      {seedPack.icon} {t.seedPacks[seedPack.key]}
                      <span className="ml-2 text-xs font-normal text-fg-muted">
                        {t.seeds.packWordCount(seedPack.words.length)}
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
                          bedLabel,
                          unplanted
                        )
                      }
                    >
                      {busy === `pack-${seedPack.key}`
                        ? t.seeds.planting
                        : atCap
                          ? t.seeds.limitReached
                          : freeSlots === 0
                            ? t.seeds.bedFull
                            : t.seeds.plantPack}
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
                              plantMany(word.hanzi, bed.id, bedLabel, [
                                {
                                  hanzi: word.hanzi,
                                  pinyin: word.pinyin,
                                  translation: word.translation,
                                },
                              ])
                            }
                          >
                            {planted
                              ? t.seeds.plantedBadge
                              : busy === word.hanzi
                                ? t.seeds.planting
                                : atCap
                                  ? t.seeds.limitReached
                                  : freeSlots === 0
                                    ? t.seeds.bedFull
                                    : t.seeds.plantWord(word.hanzi)}
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
        title={t.seeds.upgradeTitle}
      >
        <p className="text-sm text-fg-muted">{t.seeds.upgradeBody}</p>
        <Field label={t.seeds.upgradeEmailLabel} htmlFor="upgrade-email">
          <Input
            id="upgrade-email"
            type="email"
            autoComplete="email"
            value={upgradeEmail}
            placeholder={t.seeds.upgradeEmailPlaceholder}
            onChange={(event) => setUpgradeEmail(event.target.value)}
          />
        </Field>
        <button
          type="button"
          className={panelActionClass}
          disabled={upgrading}
          onClick={() => void upgrade()}
        >
          {upgrading ? t.seeds.upgradeSending : t.seeds.upgradeSend}
        </button>
      </Dialog>
    </div>
  );
}
