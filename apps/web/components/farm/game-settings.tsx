"use client";

import { Check, Settings, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { MUSIC_VOLUME_MAX, MUSIC_VOLUME_MIN } from "@/lib/game/music";
import {
  flushMusicPersist,
  onMusicPersist,
  useMusicStore,
} from "@/lib/game/store/music-store";
import type { FarmWorldCard } from "@/lib/game/types";
import {
  onUiLangPersist,
  useUiLangStore,
} from "@/lib/i18n/store/ui-lang-store";
import { UI_LANG_NAMES, UI_LANGS } from "@/lib/i18n/ui-langs";
import { useT } from "@/lib/i18n/use-t";

const iconButtonClass =
  "flex size-9 items-center justify-center rounded-full bg-white/40 text-fg transition hover:bg-white/60 active:scale-95 dark:bg-black/25 dark:hover:bg-black/40";

export function GameSettings({
  worlds,
  activeLangKey,
  busyLangKey,
  onSelectWorld,
}: {
  worlds: FarmWorldCard[];
  activeLangKey: string | null;
  busyLangKey: string | null;
  onSelectWorld: (world: FarmWorldCard) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const volume = useMusicStore((state) => state.volume);
  const muted = useMusicStore((state) => state.muted);
  const setVolume = useMusicStore((state) => state.setVolume);
  const setMuted = useMusicStore((state) => state.setMuted);
  const uiLang = useUiLangStore((state) => state.uiLang);
  const setUiLang = useUiLangStore((state) => state.setUiLang);
  const t = useT();

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [saved]);

  useEffect(() => {
    onMusicPersist(() => setSaved(true));
    onUiLangPersist(() => setSaved(true));
  }, []);

  function switchUiLang(lang: (typeof UI_LANGS)[number]) {
    if (lang === uiLang) return;
    setUiLang(lang);
  }

  return (
    <>
      <button
        type="button"
        aria-label={t.settings.open}
        title={t.settings.title}
        onClick={() => setOpen(true)}
        className={iconButtonClass}
      >
        <Settings className="size-4.5" aria-hidden />
      </button>
      <Dialog
        open={open}
        onClose={() => {
          flushMusicPersist();
          setOpen(false);
        }}
        title={t.settings.title}
        modal={false}
      >
        <section className="flex flex-col gap-4">
          <div>
            <h3 className="mb-3 text-sm font-bold">
              {t.settings.interfaceLanguage}
            </h3>
            <div className="flex gap-2" role="group">
              {UI_LANGS.map((lang) => {
                const active = lang === uiLang;
                return (
                  <Button
                    key={lang}
                    type="button"
                    variant={active ? "primary" : "secondary"}
                    size="sm"
                    className="flex-1"
                    aria-pressed={active}
                    data-testid={`settings-ui-lang-${lang}`}
                    onClick={() => switchUiLang(lang)}
                  >
                    {UI_LANG_NAMES[lang]}
                  </Button>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold">
              {t.settings.courseLanguage}
            </h3>
            <div className="flex flex-col gap-2">
              {worlds.map((world) => {
                const active = world.langKey === activeLangKey;
                const busy = busyLangKey === world.langKey;
                return (
                  <div
                    key={world.langKey}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white/40 px-3 py-2 dark:bg-black/25"
                  >
                    <span className="text-sm font-bold">
                      {world.flag} {world.name}
                    </span>
                    {active ? (
                      <span className="text-xs font-bold text-fg-muted">
                        {t.settings.playing}
                      </span>
                    ) : (
                      <button
                        type="button"
                        data-testid={`settings-world-${world.langKey}`}
                        className="rounded-full bg-primary px-3.5 py-1 text-xs font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-primary-500"
                        disabled={busyLangKey !== null}
                        onClick={() => onSelectWorld(world)}
                      >
                        {busy
                          ? t.settings.switching
                          : world.started
                            ? t.settings.switch
                            : t.settings.start}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold">{t.settings.music}</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={muted ? t.settings.unmute : t.settings.mute}
                aria-pressed={muted}
                data-testid="music-mute"
                onClick={() => setMuted(!muted)}
                className={iconButtonClass}
              >
                {muted ? (
                  <VolumeX className="size-5" aria-hidden />
                ) : (
                  <Volume2 className="size-5" aria-hidden />
                )}
              </button>
              <input
                type="range"
                aria-label={t.settings.volumeLabel}
                data-testid="music-volume"
                min={MUSIC_VOLUME_MIN}
                max={MUSIC_VOLUME_MAX}
                step={1}
                value={volume}
                onChange={(event) =>
                  setVolume(Number(event.currentTarget.value))
                }
                disabled={muted}
                className="h-2 w-full accent-primary disabled:opacity-50"
              />
              <span
                data-testid="music-volume-value"
                className="w-8 shrink-0 text-right text-xs font-bold text-fg-muted"
              >
                {volume}
              </span>
            </div>
          </div>
          {saved && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <Check className="size-4" aria-hidden />
              {t.settings.saved}
            </div>
          )}
        </section>
      </Dialog>
    </>
  );
}
