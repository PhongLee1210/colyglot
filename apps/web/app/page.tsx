import { connection } from "next/server";
import { Suspense } from "react";

import { FarmGameScreen } from "@/components/farm/farm-game-screen";
import { loadTitleScreenData } from "@/components/farm/title-page-data";
import { TitleScreen } from "@/components/farm/title-screen";
import { Skeleton } from "@/components/ui/skeleton";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={<Skeleton className="m-4 h-64 rounded-2xl" />}>
      {params.lang ? (
        <FarmGameScreen langKey={params.lang} />
      ) : (
        <TitleScreenLoader />
      )}
    </Suspense>
  );
}

async function TitleScreenLoader() {
  await connection();
  const data = await loadTitleScreenData();
  return <TitleScreen data={data} />;
}
