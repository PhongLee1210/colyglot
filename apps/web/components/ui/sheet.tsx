"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  contentClassName?: string;
};

// Bottom sheet on phones, centered panel from lg up — DESIGN.md's "phone
// forms open in sheets" rule. Native <dialog> supplies the focus trap and
// Esc handling; `m-0 mt-auto` pins the fixed-position dialog to the bottom.
// The header sticks inside the scroll area and body scroll locks so long
// lists never strand the Close button off-screen.
export function Sheet({
  open,
  onClose,
  title,
  children,
  contentClassName,
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      className="m-0 mt-auto max-h-[86dvh] overflow-hidden w-full max-w-lg rounded-t-3xl border border-glass-border bg-surface p-0 text-fg backdrop:bg-black/50 open:animate-[sheet-in_240ms_cubic-bezier(0.2,0.9,0.3,1)] lg:m-auto lg:rounded-3xl"
      onClose={onClose}
    >
      <div className="flex max-h-[86dvh] flex-col">
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-line"
        />
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 bg-surface/95 px-5 pb-3 pt-2 backdrop-blur">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button
            type="button"
            aria-label={`Close ${title}`}
            className="rounded-full border border-line px-4 py-1 text-sm transition hover:bg-surface-2"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div
          className={cn(
            "overscroll-contain overflow-y-auto p-5 pt-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line/60 hover:[&::-webkit-scrollbar-thumb]:bg-line [&::-webkit-scrollbar-thumb]:transition-colors",
            contentClassName
          )}
        >
          {children}
        </div>
      </div>
    </dialog>
  );
}
