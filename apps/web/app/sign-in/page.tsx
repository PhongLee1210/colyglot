import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInForm } from "@/components/auth/sign-in-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign in · Colyglot",
};

export default function SignInPage() {
  return (
    <main className="relative mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center gap-8 overflow-hidden px-4 py-12">
      <span
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-hanzi text-[260px] leading-none font-black text-fg opacity-[0.04] select-none"
        aria-hidden
      >
        學
      </span>
      <div className="relative flex flex-col items-center gap-3 animate-[stagger-in_360ms_cubic-bezier(0.22,1,0.36,1)_both]">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-xl font-extrabold text-on-primary dark:from-primary-400 dark:to-primary-600">
          C
        </span>
        <span className="text-sm font-semibold tracking-tight">Colyglot</span>
      </div>
      <div className="relative flex flex-col items-center gap-1 text-center animate-[stagger-in_360ms_cubic-bezier(0.22,1,0.36,1)_60ms_both]">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-fg-muted">
          Sign in to keep your streak and your decks.
        </p>
      </div>
      <div
        className="relative animate-[stagger-in_360ms_cubic-bezier(0.22,1,0.36,1)_120ms_both]"
        aria-live="polite"
      >
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <SignInForm />
        </Suspense>
      </div>
    </main>
  );
}
