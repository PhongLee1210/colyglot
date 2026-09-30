// Per-answer coin flight (GAME_PLAY §8.1 beat 1): a few gold coins lift
// off the answered card and land on the session tally chip. WAAPI keeps
// this off React's render path; reduced motion never spawns a flight.

const COIN_SIZE_PX = 14;
const FLIGHT_MS = 420;
const STAGGER_MS = 60;

export function spawnAnswerCoins(
  from: HTMLElement | null,
  to: HTMLElement | null,
  count = 3
): void {
  if (!from || !to) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const fromRect = from.getBoundingClientRect();
  const toRect = to.getBoundingClientRect();
  const start = {
    x: fromRect.left + fromRect.width / 2,
    y: fromRect.top + fromRect.height * 0.75,
  };
  const end = {
    x: toRect.left + toRect.width / 2,
    y: toRect.top + toRect.height / 2,
  };
  for (let index = 0; index < count; index++) {
    const coin = document.createElement("span");
    coin.setAttribute("aria-hidden", "true");
    coin.style.position = "fixed";
    coin.style.left = "0";
    coin.style.top = "0";
    coin.style.zIndex = "60";
    coin.style.pointerEvents = "none";
    coin.style.width = `${COIN_SIZE_PX}px`;
    coin.style.height = `${COIN_SIZE_PX}px`;
    coin.style.borderRadius = "9999px";
    coin.style.background =
      "radial-gradient(circle at 35% 30%, #ffe9a3, #f5c542 62%, #c8901f)";
    coin.style.boxShadow =
      "inset 0 -2px 2px rgba(120, 74, 10, 0.55), 0 1px 2px rgba(0, 0, 0, 0.25)";
    document.body.appendChild(coin);

    const midX = (start.x + end.x) / 2 + (index - 1) * 26;
    const midY = Math.min(start.y, end.y) - 110 - index * 8;
    const animation = coin.animate(
      [
        {
          transform: `translate(${start.x}px, ${start.y}px) scale(1)`,
          offset: 0,
        },
        {
          transform: `translate(${midX}px, ${midY}px) scale(1.1)`,
          offset: 0.55,
          easing: "cubic-bezier(0.2, 0.6, 0.4, 1)",
        },
        {
          transform: `translate(${end.x}px, ${end.y}px) scale(0.55)`,
          opacity: 0.15,
          offset: 1,
          easing: "cubic-bezier(0.5, 0, 0.9, 0.6)",
        },
      ],
      { duration: FLIGHT_MS, delay: index * STAGGER_MS, fill: "forwards" }
    );
    animation.finished.then(
      () => coin.remove(),
      () => coin.remove()
    );
  }
}
