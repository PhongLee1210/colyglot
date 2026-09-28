"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useToast } from "@/components/ui/toast";
import { startWorldAction } from "@/lib/actions/farm";
import { STARTING_GOLD } from "@/lib/game/core/economy";
import type { TitleScreenData } from "@/lib/queries/title-page";
import { TitleHero } from "./art/title-hero";

export function TitleScreen({ data }: { data: TitleScreenData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function play(langKey: string, started: boolean) {
    if (!data.signedIn) {
      router.push("/sign-in");
      return;
    }
    setBusyKey(langKey);
    try {
      if (!started) {
        const result = await startWorldAction(langKey);
        if (!result.ok) {
          toast(result.error, "danger");
          return;
        }
      }
      startTransition(() => {
        router.push(`/?lang=${langKey}`);
      });
    } catch {
      toast("Connection lost — check your network and try again", "danger");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center gap-6 p-6">
      <header className="mt-10 flex flex-col items-center gap-1 text-center">
        <div className="text-4xl">🌱</div>
        <h1 className="text-3xl font-extrabold">Colyglot Language Farm</h1>
        <p className="text-sm text-fg-muted">
          Plant words, harvest memories. Spaced repetition is your growing
          season.
        </p>
        {data.signedIn ? (
          <p className="text-sm">🔥 {data.streak} day streak</p>
        ) : null}
      </header>

      <TitleHero />

      <section
        aria-label="Choose your language"
        className="flex w-full flex-col gap-3"
      >
        <h2 className="text-lg font-bold">Choose your language</h2>
        {data.worlds.map((world) => (
          <div
            key={world.langKey}
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-line-strong"
          >
            <div>
              <div className="text-lg font-bold">
                {world.flag} {world.name}
              </div>
              <div className="text-sm text-fg-muted">
                {world.started
                  ? `${world.tierName} · 💰 ${world.gold} · ${world.dueCount} ready to harvest`
                  : `A fresh garden awaits — start with ${STARTING_GOLD} 💰`}
              </div>
            </div>
            <button
              type="button"
              className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-primary-500"
              disabled={pending && busyKey === world.langKey}
              onClick={() => play(world.langKey, world.started)}
            >
              {world.started ? "Play" : "Start farm"}
            </button>
          </div>
        ))}
        {data.futureLangs.map((lang) => (
          <div
            key={lang.langKey}
            className="flex items-center justify-between rounded-2xl border border-dashed border-line p-4 opacity-60"
          >
            <span className="font-bold">{lang.name}</span>
            <span className="text-sm text-fg-muted">Coming soon</span>
          </div>
        ))}
      </section>
    </main>
  );
}
