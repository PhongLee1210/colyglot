"use client";

import { useEffect, useRef } from "react";

import { FX_DURATIONS } from "@/lib/game/3d/animation";
import { useFxStore } from "@/lib/game/store/fx-store";

const COIN_MIN = 3;
const COIN_MAX = 9;
const COIN_SIZE_PX = 14;

function coinCount(amount: number): number {
  return Math.min(COIN_MAX, Math.max(COIN_MIN, Math.round(amount / 2)));
}

function spawnCoin(
  container: HTMLElement,
  from: { x: number; y: number },
  target: { x: number; y: number },
  delay: number
): { animation: Animation; coin: HTMLElement } {
  const coin = document.createElement("span");
  coin.style.position = "absolute";
  coin.style.left = "0";
  coin.style.top = "0";
  coin.style.width = `${COIN_SIZE_PX}px`;
  coin.style.height = `${COIN_SIZE_PX}px`;
  coin.style.borderRadius = "9999px";
  coin.style.background =
    "radial-gradient(circle at 35% 30%, #ffe9a3, #f5c542 62%, #c8901f)";
  coin.style.boxShadow =
    "inset 0 -2px 2px rgba(120, 74, 10, 0.55), 0 1px 2px rgba(0, 0, 0, 0.25)";
  container.appendChild(coin);

  const midX = (from.x + target.x) / 2 + (target.x - from.x) * 0.1;
  const midY = Math.min(from.y, target.y) - 120;
  const animation = coin.animate(
    [
      { transform: `translate(${from.x}px, ${from.y}px) scale(1)`, offset: 0 },
      {
        transform: `translate(${midX}px, ${midY}px) scale(1.1)`,
        offset: 0.55,
        easing: "cubic-bezier(0.2, 0.6, 0.4, 1)",
      },
      {
        transform: `translate(${target.x}px, ${target.y}px) scale(0.55)`,
        opacity: 0.15,
        offset: 1,
        easing: "cubic-bezier(0.5, 0, 0.9, 0.6)",
      },
    ],
    { duration: FX_DURATIONS.coinFlight, delay, fill: "forwards" }
  );
  return { animation, coin };
}

function goldChipCenter(): { x: number; y: number } {
  const chip = document.querySelector<HTMLElement>('[data-testid="farm-gold"]');
  if (!chip) return { x: window.innerWidth - 56, y: 44 };
  const rect = chip.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// Coins arc from the (already screen-projected) plot position into the
// HUD gold chip with the concept's staggered 65ms fan-out. WAAPI keeps
// the flights off React's render path; reduced motion never spawns one.
export function CoinFlightHost() {
  const containerRef = useRef<HTMLDivElement>(null!);
  const flights = useFxStore((state) => state.coinFlights);
  const settleCoinFlight = useFxStore((state) => state.settleCoinFlight);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () =>
      useFxStore.getState().setMotionScale(query.matches ? 0 : 1);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (flights.length === 0) return;
    const container = containerRef.current;
    if (!container) return;
    if (useFxStore.getState().motionScale <= 0) {
      flights.forEach((flight) => settleCoinFlight(flight.id));
      return;
    }
    const target = goldChipCenter();
    flights.forEach((flight) => {
      const total = coinCount(flight.amount);
      const running: { animation: Animation; coin: HTMLElement }[] = [];
      for (let i = 0; i < total; i++) {
        running.push(
          spawnCoin(
            container,
            { x: flight.x, y: flight.y },
            target,
            i * FX_DURATIONS.coinStagger
          )
        );
      }
      const settle = () => settleCoinFlight(flight.id);
      const last = running[running.length - 1];
      if (last) {
        last.animation.onfinish = () => {
          last.coin.remove();
          settle();
        };
        running.slice(0, -1).forEach(({ animation, coin }) => {
          animation.onfinish = () => coin.remove();
        });
      } else {
        settle();
      }
    });
  }, [flights, settleCoinFlight]);

  return (
    <div
      ref={containerRef}
      data-testid="coin-flight"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    />
  );
}
