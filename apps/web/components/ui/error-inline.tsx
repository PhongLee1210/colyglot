"use client";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-t";

export function ErrorInline({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const t = useT();
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        {message}
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t.common.tryAgain}
        </Button>
      ) : null}
    </div>
  );
}
