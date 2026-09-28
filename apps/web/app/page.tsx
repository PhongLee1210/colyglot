import { Suspense } from "react";

import { FarmGameScreen } from "@/components/farm/farm-game-screen";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={<BootFallback />}>
      <FarmGameScreen langKey={params.lang} />
    </Suspense>
  );
}

function BootFallback() {
  return (
    <div className="flex h-dvh items-center justify-center bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-400">
      <span aria-hidden="true" className="animate-pulse text-6xl">
        🌱
      </span>
    </div>
  );
}
