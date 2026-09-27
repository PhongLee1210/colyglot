import { LANG_PACKS } from "@/lib/game/content";

import { CropArt } from "./crop-art";
import { Cloud, Fence, Shed, Sun, Tree } from "./farm-decor";

// Miniature farm built from the same decor pieces as the live world —
// the title is an honest preview, not a separate illustration.
export function TitleHero() {
  const theme = LANG_PACKS["zh-vi"].tiers[0].theme;
  return (
    <div
      aria-hidden="true"
      className="relative h-44 w-full overflow-hidden rounded-3xl border border-line"
      style={{
        background: `linear-gradient(to bottom, ${theme.sky[0]}, ${theme.sky[1]} 52%, ${theme.ground[0]} 52.5%, ${theme.ground[1]})`,
      }}
    >
      <Sun className="absolute right-4 top-3 w-12" />
      <Cloud className="absolute left-[8%] top-4 w-20" />
      <Cloud
        className="absolute left-[45%] top-9 w-16 opacity-80"
        style={{ animationDelay: "-40s" }}
      />
      <Tree className="absolute bottom-8 left-3 w-10" />
      <Shed className="absolute bottom-7 right-4 w-16" />
      <div className="absolute inset-x-0 bottom-2 mx-auto flex w-fit items-end gap-1.5">
        {(["ready", "growing", "fresh", "ready", "urgent"] as const).map(
          (stage, i) => (
            <div
              key={i}
              className="flex h-16 w-11 flex-col justify-end rounded-t-md rounded-b-lg border-2 pb-0.5"
              style={{ borderColor: theme.plotBorder, background: theme.plot }}
            >
              <CropArt
                stage={stage}
                variant={i % 3}
                theme={theme}
                className="h-12 w-full"
              />
            </div>
          )
        )}
      </div>
      <Fence posts={12} className="absolute inset-x-4 bottom-[4.7rem] h-5" />
    </div>
  );
}
