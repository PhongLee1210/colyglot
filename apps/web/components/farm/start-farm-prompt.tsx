"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/toast";
import { startWorldAction } from "@/lib/actions/farm";

import { useHydrated } from "./use-hydrated";

export function StartFarmPrompt({ langKey }: { langKey: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const hydrated = useHydrated();

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-4xl">🌱</div>
      <h1 className="text-2xl font-extrabold">
        This farm has not been started
      </h1>
      <button
        type="button"
        className="rounded-full bg-primary px-6 py-2 font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-primary-500"
        disabled={busy || !hydrated}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await startWorldAction(langKey);
            if (result.ok) {
              router.refresh();
            } else {
              toast(result.error, "danger");
            }
          } catch {
            toast(
              "Connection lost — check your network and try again",
              "danger"
            );
          }
          setBusy(false);
        }}
      >
        Start this farm
      </button>
    </main>
  );
}
