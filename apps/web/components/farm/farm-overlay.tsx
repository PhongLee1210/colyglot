import type { ReactNode } from "react";

export function FarmOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
      {children}
    </div>
  );
}

export function FarmPanel({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-bg">{children}</div>
  );
}

export function BackToFarmButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="rounded-full bg-primary px-6 py-2 font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800 dark:hover:bg-primary-500"
      onClick={onClick}
    >
      Back to farm
    </button>
  );
}
