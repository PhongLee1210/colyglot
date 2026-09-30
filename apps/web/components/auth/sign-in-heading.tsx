"use client";

import { useT } from "@/lib/i18n/use-t";

export function SignInHeading() {
  const t = useT();
  return (
    <div className="relative flex flex-col items-center gap-1 text-center animate-[stagger-in_360ms_cubic-bezier(0.22,1,0.36,1)_60ms_both]">
      <h1 className="text-2xl font-bold tracking-tight">{t.signIn.heading}</h1>
      <p className="text-sm text-fg-muted">{t.signIn.subtitle}</p>
    </div>
  );
}
