"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/toast";
import { buyItemAction } from "@/lib/actions/farm";
import {
  findShopItem,
  houseTierOwned,
  SHOP_ITEMS,
  type ShopCategory,
} from "@/lib/game/core/shop";
import { useFarmStore } from "@/lib/game/store/farm-store";
import { useFxStore } from "@/lib/game/store/fx-store";
import { applyGoldDelta, applyItemOwned } from "@/lib/game/store/reducers";

import { panelActionClass, panelCardClass } from "./controls";

const CATEGORY_TITLE: Record<ShopCategory, string> = {
  house: "🏠 House — a milestone you can see",
  deco: "🪵 Decorations",
  animal: "🐾 Animals (each one does something)",
};

// The two spend lanes (GAME_PLAY §6.3): this tab is the farm lane — how
// the place looks and who lives in it. Capability lane (beds, regions)
// lives in Seeds.
export function ShopTab() {
  const router = useRouter();
  const { toast } = useToast();
  const snapshot = useFarmStore((state) => state.snapshot);
  const hydrate = useFarmStore((state) => state.hydrate);
  const [busy, setBusy] = useState<string | null>(null);

  if (!snapshot) return null;

  const owned = new Set(snapshot.items.map((item) => item.itemKey));
  const houseTier = houseTierOwned(snapshot.items);
  const gold = snapshot.world.gold;

  async function buy(itemKey: string) {
    if (busy) return;
    setBusy(itemKey);
    try {
      const result = await buyItemAction(snapshot!.world.langKey, itemKey);
      if (result.ok) {
        let next = applyGoldDelta(
          useFarmStore.getState().snapshot!,
          result.data.gold - useFarmStore.getState().snapshot!.world.gold
        );
        next = applyItemOwned(next, itemKey);
        hydrate(next);
        router.refresh();
        useFxStore.getState().react("hop");
        toast(
          `${findShopItem(itemKey)?.name ?? itemKey} purchased!`,
          "success"
        );
      } else {
        toast(result.error, "danger");
      }
    } catch {
      toast("Connection lost — check your network and try again", "danger");
    }
    setBusy(null);
  }

  const categories: ShopCategory[] = ["deco", "animal", "house"];

  return (
    <div className="flex flex-col gap-3" data-testid="shop-tab">
      <p className="text-sm text-fg-muted">
        Spend gold on your farm — learning stays free.
      </p>
      <p className="rounded-full bg-amber-100 px-3 py-1.5 text-center text-xs font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
        {gold.toLocaleString()} 💰 in the purse
      </p>

      {categories.map((category) => (
        <section key={category} className="flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-fg-muted">
            {CATEGORY_TITLE[category]}
          </h3>
          {SHOP_ITEMS.filter((item) => item.category === category).map(
            (item) => {
              const isOwned = owned.has(item.key);
              const tierLocked =
                item.houseTier !== undefined &&
                item.houseTier !== houseTier + 1;
              const affordable = gold >= item.price;
              return (
                <div
                  key={item.key}
                  data-testid={`shop-${item.key}`}
                  className={`flex items-center justify-between gap-3 ${panelCardClass}`}
                >
                  <div className="min-w-0">
                    <p className="font-bold">
                      <span aria-hidden="true">{item.icon}</span> {item.name}
                      {item.houseTier !== undefined &&
                      item.houseTier <= houseTier ? (
                        <span className="ml-2 text-xs font-semibold text-green-700 dark:text-green-400">
                          built
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-fg-muted">{item.blurb}</p>
                  </div>
                  <button
                    type="button"
                    className={`shrink-0 ${panelActionClass}`}
                    disabled={isOwned || tierLocked || busy !== null}
                    onClick={() => void buy(item.key)}
                  >
                    {isOwned
                      ? "Owned"
                      : tierLocked
                        ? `Build tier ${houseTier + 1} first`
                        : busy === item.key
                          ? "Buying…"
                          : affordable
                            ? `${item.price.toLocaleString()} 💰`
                            : `${item.price.toLocaleString()} 💰 — keep harvesting`}
                  </button>
                </div>
              );
            }
          )}
        </section>
      ))}
    </div>
  );
}
