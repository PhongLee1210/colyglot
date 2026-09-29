"use client";

import { useLayoutEffect, type RefObject } from "react";

const HUD_TOP_VAR = "--hud-top";

// Publishes the topbar's bottom edge as a CSS variable so the floating HUD
// layers (goal pill, stat rail, side panel) stay clear of it even when the
// bar wraps to two rows on narrow phones.
export function useHudTopVar(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const root = document.documentElement;
    const publish = () => {
      root.style.setProperty(
        HUD_TOP_VAR,
        `${Math.round(element.getBoundingClientRect().bottom)}px`
      );
    };

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    window.addEventListener("resize", publish);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", publish);
      root.style.removeProperty(HUD_TOP_VAR);
    };
  }, [ref]);
}
