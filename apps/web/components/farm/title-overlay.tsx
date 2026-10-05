"use client";

import Image from "next/image";
import Link from "next/link";

import { STARTING_GOLD } from "@/lib/game/core/economy";
import type { FarmWorldCard } from "@/lib/game/types";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils/cn";

export type TitleOverlayProps = {
  worlds: FarmWorldCard[];
  futureLangs: { langKey: string; name: string }[];
  streak: number;
  activeLangKey: string | null;
  busyLangKey: string | null;
  signedIn: boolean;
  canBegin: boolean;
  onBegin: () => void;
  onSelectWorld: (world: FarmWorldCard) => void;
};

const CTA_CLASS =
  "raised w-full max-w-xs rounded-full bg-green-600 px-8 py-3.5 font-display text-lg font-extrabold text-white transition hover:bg-green-700 active:translate-y-[3px] active:raised-pressed disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none dark:bg-green-500 dark:text-green-950 dark:hover:bg-green-400";

const RAIL_TILE_CLASS =
  "flex shrink-0 flex-col items-center gap-1.5 rounded-2xl px-3 py-2.5";

const RAIL_BUTTON_CLASS =
  "rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-primary-500";

export function TitleOverlay({
  worlds,
  futureLangs,
  streak,
  activeLangKey,
  busyLangKey,
  signedIn,
  canBegin,
  onBegin,
  onSelectWorld,
}: TitleOverlayProps) {
  const t = useT();
  const activeWorld = worlds.find((world) => world.langKey === activeLangKey);
  const ctaLabel = !signedIn
    ? t.title.playNow
    : !canBegin
      ? t.title.pickFarm
      : activeWorld?.started
        ? t.title.continueFarm
        : t.title.begin;

  return (
    <section
      aria-label={t.title.ariaWelcome}
      data-testid="title-overlay"
      className="absolute inset-0 z-40 overflow-y-auto bg-[radial-gradient(120%_90%_at_50%_8%,rgb(0_0_0/0.15),rgb(0_0_0/0.62))] p-4 backdrop-blur-[3px]"
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center gap-4 py-6 text-center sm:justify-center">
        <HeroMark />
        <div className="flex flex-col items-center gap-1">
          <h1 className="bg-gradient-to-b from-yellow-300 via-accent to-yellow-600 bg-clip-text font-display text-4xl font-extrabold tracking-tight text-transparent drop-shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
            {t.title.appName}
          </h1>
          <p className="text-sm font-semibold text-white/90">
            {t.title.tagline}
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-white/65">
            {t.title.blurb}
          </p>
        </div>
        <ProgressChip world={activeWorld} streak={streak} />
        <button
          type="button"
          data-testid="title-begin"
          className={CTA_CLASS}
          disabled={busyLangKey !== null || (signedIn && !canBegin)}
          onClick={onBegin}
        >
          {ctaLabel}
        </button>
        {!signedIn ? (
          <Link
            href="/sign-in"
            className="text-xs font-semibold text-white/70 underline-offset-4 transition hover:text-white hover:underline"
          >
            {t.title.alreadyHaveFarm}
          </Link>
        ) : null}
        <WorldRail
          worlds={worlds}
          futureLangs={futureLangs}
          activeLangKey={activeLangKey}
          busyLangKey={busyLangKey}
          onSelectWorld={onSelectWorld}
        />
        <TitleLinks />
      </div>
    </section>
  );
}

function HeroMark() {
  return (
    <span
      aria-hidden="true"
      className="animate-pulse rounded-[1.75rem] bg-white/10 p-1 shadow-[0_0_36px_rgb(234_179_8/0.35)] ring-1 ring-white/25 motion-reduce:animate-none"
    >
      <Image
        src="/logo.png"
        alt=""
        width={1092}
        height={929}
        priority
        className="size-20 rounded-3xl object-contain"
      />
    </span>
  );
}

function ProgressChip({
  world,
  streak,
}: {
  world: FarmWorldCard | undefined;
  streak: number;
}) {
  const t = useT();
  if (!world) return null;
  return (
    <p
      data-testid="title-chip"
      className="glass-dark rounded-full px-4 py-1.5 text-xs font-bold text-white"
    >
      {world.flag} {world.name} · {t.farmTiers[world.tierKey].name}
      {streak > 0 ? (
        <span className="text-white/70"> · 🔥 {streak}</span>
      ) : null}
    </p>
  );
}

function WorldRail({
  worlds,
  futureLangs,
  activeLangKey,
  busyLangKey,
  onSelectWorld,
}: {
  worlds: FarmWorldCard[];
  futureLangs: { langKey: string; name: string }[];
  activeLangKey: string | null;
  busyLangKey: string | null;
  onSelectWorld: (world: FarmWorldCard) => void;
}) {
  const t = useT();
  return (
    <div
      data-testid="title-rail"
      aria-label={t.title.ariaChooseLanguage}
      className="flex w-full items-stretch gap-2 overflow-x-auto pb-1"
    >
      {worlds.map((world) => {
        const active = world.langKey === activeLangKey;
        const busy = busyLangKey === world.langKey;
        return (
          <div
            key={world.langKey}
            className={cn(
              RAIL_TILE_CLASS,
              "glass-warm text-fg",
              active && "ring-2 ring-primary"
            )}
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              {world.flag}
            </span>
            <span className="text-xs font-bold">{world.name}</span>
            <span className="max-w-24 truncate text-[10px] text-fg-muted">
              {world.started
                ? `${t.farmTiers[world.tierKey].name} · ${t.title.goldAfterTier(world.gold)}`
                : t.title.startWithGold(STARTING_GOLD)}
            </span>
            {active ? (
              <span className="rounded-full bg-primary/15 px-3 py-1 text-[10px] font-extrabold text-primary">
                {t.title.hereNow}
              </span>
            ) : (
              <button
                type="button"
                data-testid={`title-world-${world.langKey}`}
                className={RAIL_BUTTON_CLASS}
                disabled={busyLangKey !== null}
                onClick={() => onSelectWorld(world)}
              >
                {busy ? "…" : world.started ? t.common.play : t.common.start}
              </button>
            )}
          </div>
        );
      })}
      {futureLangs.map((lang) => (
        <div
          key={lang.langKey}
          aria-disabled="true"
          className={cn(
            RAIL_TILE_CLASS,
            "border border-dashed border-white/30 text-white/45"
          )}
        >
          <span
            aria-hidden="true"
            className="text-2xl leading-none opacity-50 grayscale"
          >
            🔒
          </span>
          <span className="text-xs font-bold">{lang.name}</span>
          <span className="text-[10px] text-white/50">
            {t.title.comingSoon}
          </span>
        </div>
      ))}
    </div>
  );
}

function TitleLinks() {
  const t = useT();
  const links = t.title.links;
  return (
    <nav
      aria-label={t.title.ariaLinks}
      className="mt-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-2 text-xs text-white/55"
    >
      {links.map((label, index) => (
        <span key={label} className="flex items-center gap-3">
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          <button type="button" aria-disabled="true" disabled>
            {label}
          </button>
        </span>
      ))}
    </nav>
  );
}
