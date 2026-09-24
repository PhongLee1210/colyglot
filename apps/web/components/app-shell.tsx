import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { AccountMenuGate } from "@/components/auth/account-menu-gate";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({
  children,
  title,
  backHref,
  actions,
  account = true,
}: {
  children: ReactNode;
  title?: ReactNode;
  backHref?: string;
  actions?: ReactNode;
  account?: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-[max(env(safe-area-inset-top),12px)]">
      <header className="flex items-center gap-2 py-3">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Back"
            className="flex size-9 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
        ) : (
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-extrabold text-on-primary dark:from-primary-400 dark:to-primary-600 dark:text-on-primary">
              C
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Colyglot
            </span>
          </Link>
        )}
        {title ? (
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold">
            {title}
          </h1>
        ) : (
          <div className="flex-1" />
        )}
        {actions}
        {account ? (
          <Suspense fallback={<span className="size-9" aria-hidden />}>
            <AccountMenuGate />
          </Suspense>
        ) : null}
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
