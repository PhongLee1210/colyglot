"use client";

import { useToast } from "@/components/ui/toast";

const SHORTCUTS: { icon: string; label: string; badge?: string }[] = [
  { icon: "📜", label: "Missions" },
  { icon: "🔬", label: "Tech", badge: "🔒" },
  { icon: "📋", label: "Orders", badge: "🔒" },
  { icon: "🏛️", label: "Wonders", badge: "🔒" },
];

// Phase-2 systems surface as locked shortcuts so progression feels ahead;
// every entry toasts instead of dead-ending.
export function ShortcutRail() {
  const { toast } = useToast();
  return (
    <nav
      aria-label="Farm shortcuts"
      className="fixed right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 sm:flex"
    >
      {SHORTCUTS.map((item) => (
        <button
          key={item.label}
          type="button"
          aria-label={`${item.label} — coming soon`}
          className="glass relative flex h-11 w-11 items-center justify-center rounded-full text-lg transition hover:scale-110 hover:brightness-105 active:scale-95"
          onClick={() => toast(`${item.label} is coming soon`, "info")}
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.badge ? (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 text-[9px]"
            >
              {item.badge}
            </span>
          ) : null}
        </button>
      ))}
    </nav>
  );
}
