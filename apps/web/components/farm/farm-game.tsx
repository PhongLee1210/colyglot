"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { startWorldAction, switchWorldAction } from "@/lib/actions/farm";
import { updateMusicSettingsAction } from "@/lib/actions/settings";
import { LANG_PACKS } from "@/lib/game/content";
import type { MusicSettings } from "@/lib/game/music";
import { useCameraStore } from "@/lib/game/store/camera-store";
import { useFarmStore } from "@/lib/game/store/farm-store";
import {
  bindMusicPersistence,
  useMusicStore,
} from "@/lib/game/store/music-store";
import { useSceneStore } from "@/lib/game/store/scene-store";
import { useSelectionStore } from "@/lib/game/store/selection-store";
import type { FarmWorldCard, FarmWorldSnapshot } from "@/lib/game/types";

import { BedRail } from "./bed-rail";
import { CoinFlightHost } from "./coin-flight-host";
import { GameMusic } from "./game-music";
import { HarvestSession } from "./harvest-session";
import { LoadingScreen } from "./loading-screen";
import { NurserySession } from "./nursery-session";
import { PlotInfoCard } from "./plot-info-card";
import { SeedsPanel } from "./seeds-panel";
import { ShortcutRail } from "./shortcut-rail";
import { TitleOverlay } from "./title-overlay";
import { TopBar } from "./top-bar";
import { useClock } from "./use-clock";
import { useHydrated } from "./use-hydrated";

const Farm3DWorld = dynamic(
  () => import("./farm-3d/world").then((mod) => mod.Farm3DWorld),
  {
    ssr: false,
    loading: () => null,
  }
);

type Phase = "loading" | "title" | "playing";

export function FarmGame({
  langKey,
  initialSnapshot,
  worlds,
  futureLangs,
  streak,
  skipTitle,
  musicSettings,
}: {
  langKey: string;
  initialSnapshot: FarmWorldSnapshot | null;
  worlds: FarmWorldCard[];
  futureLangs: { langKey: string; name: string }[];
  streak: number;
  skipTitle: boolean;
  musicSettings: MusicSettings;
}) {
  const snapshot = useFarmStore((state) => state.snapshot);
  const hydrate = useFarmStore((state) => state.hydrate);
  const hydrateMusic = useMusicStore((state) => state.hydrate);
  const sceneReady = useSceneStore((state) => state.sceneReady);
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("loading");
  const [open, setOpen] = useState<"seeds" | "nursery" | "harvest" | null>(
    null
  );
  const [busyLangKey, setBusyLangKey] = useState<string | null>(null);
  const now = useClock();
  const hydrated = useHydrated();
  const navDisabled = !hydrated;

  useEffect(() => {
    if (initialSnapshot) {
      hydrate(initialSnapshot);
    }
  }, [initialSnapshot, hydrate]);

  useEffect(() => {
    hydrateMusic(musicSettings);
  }, [musicSettings, hydrateMusic]);

  useEffect(() => {
    bindMusicPersistence((settings) =>
      updateMusicSettingsAction(settings.volume, settings.muted)
    );
  }, []);

  const current = snapshot ?? initialSnapshot;
  const pack =
    LANG_PACKS[current?.world.langKey ?? langKey] ??
    Object.values(LANG_PACKS)[0];
  const tier = pack.tiers[current?.world.tier ?? 0];
  const activeLangKey = current?.world.langKey ?? null;

  const syncUrl = useCallback((nextLangKey: string) => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("lang") === nextLangKey) return;
    url.searchParams.set("lang", nextLangKey);
    window.history.replaceState(null, "", url);
  }, []);

  const beginPlay = useCallback(
    (langKeyOfWorld: string) => {
      syncUrl(langKeyOfWorld);
      setPhase("playing");
    },
    [syncUrl]
  );

  const selectWorld = useCallback(
    async (world: FarmWorldCard) => {
      if (busyLangKey) return;
      setBusyLangKey(world.langKey);
      try {
        if (!world.started) {
          const started = await startWorldAction(world.langKey);
          if (!started.ok) {
            toast(started.error, "danger");
            return;
          }
        }
        const result = await switchWorldAction(world.langKey);
        if (!result.ok) {
          toast(result.error, "danger");
          return;
        }
        hydrate(result.data);
        // Fresh farm, fresh framing: recenter the camera and drop any
        // stale plot selection from the previous world.
        useCameraStore.getState().reset();
        useSelectionStore.getState().clearSelection();
        toast(`Welcome to your ${world.name} farm`, "success");
        if (phase === "title") {
          beginPlay(world.langKey);
        } else {
          syncUrl(world.langKey);
        }
      } catch {
        toast("Connection lost — check your network and try again", "danger");
      } finally {
        setBusyLangKey(null);
      }
    },
    [busyLangKey, hydrate, phase, beginPlay, syncUrl, toast]
  );

  const finishLoading = useCallback(() => {
    setPhase(skipTitle && current ? "playing" : "title");
  }, [skipTitle, current]);

  return (
    <div className="relative h-dvh overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, ${tier.theme.sky[0]}, ${tier.theme.sky[1]} 46%, ${tier.theme.ground[1]})`,
        }}
      />
      {current ? (
        <div className="absolute inset-0">
          <Farm3DWorld snapshot={current} theme={tier.theme} now={now} />
        </div>
      ) : null}
      <GameMusic />
      {phase === "playing" && current ? (
        <div className="animate-[hud-enter_400ms_ease-out] motion-reduce:animate-none">
          <TopBar
            flag={pack.flag}
            langName={pack.name}
            tierName={tier.name}
            gold={current.world.gold}
            level={current.level}
            xp={current.xp}
            streak={streak}
            worlds={worlds}
            activeLangKey={activeLangKey}
            busyLangKey={busyLangKey}
            onSelectWorld={selectWorld}
            onOpenWorlds={() => setPhase("title")}
          />
          <BedRail snapshot={current} now={now} />
          <PlotInfoCard
            snapshot={current}
            now={now}
            onOpenSeeds={() => setOpen("seeds")}
            onOpenHarvest={() => setOpen("harvest")}
          />
          <StageLegend />
          <nav
            aria-label="Farm actions"
            className="glass fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 flex justify-around rounded-full py-2"
          >
            <button
              type="button"
              className="flex min-h-11 flex-col items-center rounded-full px-5 text-xs font-bold transition hover:bg-white/40 active:scale-95 dark:hover:bg-white/10"
              disabled={navDisabled}
              onClick={() => setOpen("seeds")}
            >
              <span aria-hidden="true" className="text-xl">
                🌰
              </span>
              Seeds
            </button>
            <button
              type="button"
              aria-label={
                current.freshCount > 0
                  ? `Nursery, ${current.freshCount} new seedlings`
                  : undefined
              }
              className="relative flex min-h-11 flex-col items-center rounded-full px-5 text-xs font-bold transition hover:bg-white/40 active:scale-95 dark:hover:bg-white/10"
              disabled={navDisabled}
              onClick={() => setOpen("nursery")}
            >
              <span aria-hidden="true" className="text-xl">
                🌱
              </span>
              Nursery
              {current.freshCount > 0 ? (
                <span className="absolute -top-1 right-1 rounded-full bg-accent px-1.5 text-[10px] font-extrabold text-on-accent">
                  {current.freshCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              aria-label={
                current.dueCount > 0
                  ? `Harvest, ${current.dueCount} ready`
                  : undefined
              }
              className="relative flex min-h-11 flex-col items-center rounded-full px-5 text-xs font-bold transition hover:bg-white/40 active:scale-95 dark:hover:bg-white/10"
              disabled={navDisabled}
              onClick={() => setOpen("harvest")}
            >
              <span aria-hidden="true" className="text-xl">
                🧺
              </span>
              Harvest
              {current.dueCount > 0 ? (
                <span className="absolute -top-1 right-1 rounded-full bg-accent px-1.5 text-[10px] font-extrabold text-on-accent">
                  {current.dueCount}
                </span>
              ) : null}
            </button>
          </nav>
          <ShortcutRail />
          <CoinFlightHost />
          {open === "seeds" ? (
            <SeedsPanel open onClose={() => setOpen(null)} />
          ) : null}
          {open === "nursery" ? (
            <NurserySession onClose={() => setOpen(null)} />
          ) : null}
          {open === "harvest" ? (
            <HarvestSession streak={streak} onClose={() => setOpen(null)} />
          ) : null}
        </div>
      ) : null}
      {phase === "loading" ? (
        <LoadingScreen
          theme={tier.theme}
          ready={current ? sceneReady : true}
          onDone={finishLoading}
        />
      ) : null}
      {phase === "title" ? (
        <TitleOverlay
          worlds={worlds}
          futureLangs={futureLangs}
          streak={streak}
          activeLangKey={activeLangKey}
          busyLangKey={busyLangKey}
          canBegin={Boolean(current)}
          onBegin={() => current && beginPlay(current.world.langKey)}
          onSelectWorld={selectWorld}
        />
      ) : null}
    </div>
  );
}

function StageLegend() {
  return (
    <div className="glass pointer-events-none fixed bottom-24 left-3 z-10 hidden items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold text-fg lg:flex">
      <span aria-hidden="true">🌱 New</span>
      <span aria-hidden="true">⏳ Growing</span>
      <span aria-hidden="true">✨ Ready</span>
      <span aria-hidden="true">🧺 Harvest</span>
    </div>
  );
}
