import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInForm } from "@/components/auth/sign-in-form";
import { CardListSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign in · Colyglot",
};

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-fg-muted">
          Sign in to keep your streak and your decks.
        </p>
      </div>
      <Suspense fallback={<CardListSkeleton count={2} />}>
        <SignInForm />
      </Suspense>
    </main>
  );
}
