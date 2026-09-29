"use client";

import { useEffect, type ReactNode } from "react";

import { useHudStore } from "@/lib/game/store/hud-store";
import { cn } from "@/lib/utils/cn";

import { PANEL_TABS, findPanelTab } from "./tabs";

export function SidePanel({ children }: { children: ReactNode }) {
  const openTab = useHudStore((state) => state.openTab);
  const openPanel = useHudStore((state) => state.openPanel);
  const closePanel = useHudStore((state) => state.closePanel);

  useEffect(() => {
    if (!openTab) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePanel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openTab, closePanel]);

  if (!openTab) return null;
  const active = findPanelTab(openTab);

  return (
    <aside
      role="dialog"
      aria-label={active.label}
      data-testid="side-panel"
      className="glass-warm fixed inset-x-1.5 bottom-[4.75rem] z-30 flex h-[min(60dvh,26rem)] flex-col overflow-hidden rounded-3xl text-fg animate-[panel-in_220ms_cubic-bezier(0.2,0.9,0.3,1)] motion-reduce:animate-none sm:inset-x-auto sm:bottom-24 sm:right-19 sm:top-[calc(var(--hud-top)+3.5rem)] sm:h-auto sm:w-100"
    >
      <nav
        aria-label="Farm panels"
        className="flex shrink-0 gap-0.5 overflow-x-auto border-b-2 border-white/40 bg-white/25 px-1.5 pt-1.5 [scrollbar-width:none] sm:grid sm:grid-cols-7 sm:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {PANEL_TABS.map((tab) => {
          const selected = tab.id === openTab;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={selected}
              className={cn(
                "relative flex flex-none scroll-ml-3 snap-center flex-col items-center gap-0.5 rounded-t-xl px-2.5 pb-1.5 pt-2 text-fg-muted transition sm:flex-1 sm:px-1",
                selected
                  ? "bg-glass-strong text-fg shadow-[inset_0_3px_0_var(--accent)]"
                  : "hover:bg-white/40"
              )}
              onClick={() => openPanel(tab.id)}
            >
              <span aria-hidden="true" className="text-xl leading-none">
                {tab.icon}
              </span>
              <span className="whitespace-nowrap text-[10px] font-extrabold">
                {tab.label}
              </span>
              {tab.locked ? (
                <span
                  aria-hidden="true"
                  className="absolute right-1 top-0.5 text-[9px]"
                >
                  🔒
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pt-3">
        <h2 className="font-display text-lg font-extrabold">{active.label}</h2>
        <button
          type="button"
          aria-label={`Close ${active.label}`}
          className="-m-1 flex size-8 items-center justify-center rounded-full text-fg-muted transition hover:bg-white/50 active:scale-95 dark:hover:bg-white/10"
          onClick={closePanel}
        >
          ✕
        </button>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain p-4 pt-3 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line/60 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
        {children}
      </div>
    </aside>
  );
}
