"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils/cn";

export type ToastTone = "info" | "success" | "danger";

export type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 2400;

const toneStyles: Record<ToastTone, string> = {
  info: "bg-surface text-fg border-line",
  success: "bg-green-600 text-white border-green-700",
  danger: "bg-red-500 text-white border-red-600",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const regionRef = useRef<HTMLDivElement>(null);

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  // Sheets are native <dialog>s in the browser's top layer, which plain
  // z-index can't rise above. Promoting the region to a manual popover puts
  // it in the top layer too — after any open dialog — while degrading to
  // plain fixed positioning on browsers without the Popover API.
  useEffect(() => {
    const region = regionRef.current;
    if (!region || typeof region.showPopover !== "function") {
      return;
    }
    if (toasts.length > 0 && !region.matches(":popover-open")) {
      region.showPopover();
    }
    if (toasts.length === 0 && region.matches(":popover-open")) {
      region.hidePopover();
    }
  }, [toasts.length]);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        ref={regionRef}
        popover="manual"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),16px)] z-50 flex flex-col items-center gap-2 border-none bg-transparent p-0 px-4"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto max-w-[420px] rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg animate-[toast-in_180ms_ease-out]",
              toneStyles[item.tone]
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return context;
}
