"use client";

import type { ReactNode } from "react";

import { useT } from "@/lib/i18n/use-t";

// Sessions take the whole screen and must cover the HUD layer (z-30), not
// sit under the dock and rails that float above the farm.

export function FarmOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
      {children}
    </div>
  );
}

export function FarmPanel({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg">{children}</div>
  );
}

export function BackToFarmButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      className="rounded-full bg-primary px-6 py-2 font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800 dark:hover:bg-primary-500"
      onClick={onClick}
    >
      {t.common.backToFarm}
    </button>
  );
}
