import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";

import { SignInForm } from "@/components/auth/sign-in-form";
import { SignInHeading } from "@/components/auth/sign-in-heading";
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
      <div className="relative flex flex-col items-center animate-[stagger-in_360ms_cubic-bezier(0.22,1,0.36,1)_both]">
        <Image
          src="/logo.png"
          alt="Colyglot"
          width={1092}
          height={929}
          priority
          className="h-16 w-auto"
        />
      </div>
      <SignInHeading />
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
