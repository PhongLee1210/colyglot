"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils/cn";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  modal?: boolean;
  showCloseButton?: boolean;
};

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  modal = true,
  showCloseButton = true,
}: DialogProps) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      void (modal ? dialog.showModal() : dialog.show());
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, modal]);

  useEffect(() => {
    if (!open || modal) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      const dialog = ref.current;
      const target = event.target as Node;
      if (dialog && !dialog.contains(target)) {
        onClose();
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open, modal, onClose]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={cn(
        "fixed w-[min(92vw,420px)] rounded-2xl border border-line bg-surface p-0 text-fg open:animate-[deck-stack-in_160ms_ease-out]",
        modal
          ? "inset-0 m-auto backdrop:bg-black/50"
          : "left-1/2 top-20 -translate-x-1/2",
        className
      )}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) {
          onClose();
        }
      }}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          {showCloseButton && (
            <button
              type="button"
              aria-label={t.common.closeDialog(title)}
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-lg transition hover:bg-white/40 dark:hover:bg-white/10"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        {children}
      </div>
    </dialog>
  );
}
