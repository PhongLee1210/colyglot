"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

const PRESS = "active:translate-y-[3px] active:raised-pressed";

export function StatPill({
  icon,
  label,
  title,
  className,
}: {
  icon: ReactNode;
  label: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "glass-dark flex w-max items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold text-white",
        className
      )}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

export function CountBadge({
  count,
  tone = "alert",
}: {
  count: number | string;
  tone?: "alert" | "gold";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "ml-1 rounded-full px-1.5 text-[11px] font-extrabold leading-5",
        tone === "gold"
          ? "bg-accent text-on-accent"
          : "bg-red-600 text-white animate-[badge-pulse_1.6s_ease-in-out_infinite] motion-reduce:animate-none"
      )}
    >
      {count}
    </span>
  );
}

export function DockButton({
  icon,
  label,
  ariaLabel,
  testId,
  badge,
  badgeTone,
  tone = "default",
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  ariaLabel?: string;
  testId?: string;
  badge?: number | string;
  badgeTone?: "alert" | "gold";
  tone?: "default" | "gold";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "glass-warm raised flex flex-none items-center gap-1.5 rounded-2xl px-4 py-2.5 font-display text-sm font-extrabold text-fg transition",
        "disabled:opacity-55 disabled:shadow-none",
        !disabled && PRESS,
        tone === "gold" && "bg-accent/85 text-on-accent"
      )}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {icon}
      </span>
      <span className="whitespace-nowrap">{label}</span>
      {badge !== undefined && badge !== 0 && badge !== "" ? (
        <CountBadge count={badge} tone={badgeTone} />
      ) : null}
    </button>
  );
}

export function RailButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "glass-warm raised flex size-12 items-center justify-center rounded-full text-xl text-fg transition",
        PRESS,
        active && "bg-green-500/80 text-white"
      )}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

export const panelCardClass =
  "rounded-2xl border border-white/60 bg-white/55 p-4 shadow-[0_3px_10px_rgb(0_0_0/0.08)] dark:border-white/10 dark:bg-white/5";

export const panelActionClass =
  "rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary transition hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-primary-500";
