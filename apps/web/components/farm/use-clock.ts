"use client";

import { useSyncExternalStore } from "react";

let cachedNow: Date | null = null;

function subscribe(callback: () => void): () => void {
  cachedNow = new Date();
  const timer = setInterval(() => {
    cachedNow = new Date();
    callback();
  }, 30_000);
  return () => clearInterval(timer);
}

function getSnapshot(): Date | null {
  return cachedNow;
}

function getServerSnapshot(): Date | null {
  return null;
}

export function useClock(): Date | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
