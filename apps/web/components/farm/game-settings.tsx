"use client";

import { Check, Settings, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

import { Dialog } from "@/components/ui/dialog";
import { MUSIC_VOLUME_MAX, MUSIC_VOLUME_MIN } from "@/lib/game/music";
import {
  flushMusicPersist,
  onMusicPersist,
  useMusicStore,
} from "@/lib/game/store/music-store";

const iconButtonClass =
  "flex size-9 items-center justify-center rounded-full bg-white/40 text-fg transition hover:bg-white/60 active:scale-95 dark:bg-black/25 dark:hover:bg-black/40";

export function GameSettings() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const volume = useMusicStore((state) => state.volume);
  const muted = useMusicStore((state) => state.muted);
  const setVolume = useMusicStore((state) => state.setVolume);
  const setMuted = useMusicStore((state) => state.setMuted);

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [saved]);

  useEffect(() => {
    onMusicPersist(() => setSaved(true));
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Game settings"
        title="Settings"
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
        title="Settings"
        modal={false}
      >
        <section className="flex flex-col gap-4">
          <div>
            <h3 className="mb-3 text-sm font-bold">Music</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={muted ? "Unmute music" : "Mute music"}
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
                aria-label="Music volume"
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
              Settings saved
            </div>
          )}
        </section>
      </Dialog>
    </>
  );
}
