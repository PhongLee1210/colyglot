"use client";

import { useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};

// The first click after navigation can land before React hydrates the
// SSR'd controls and silently do nothing. Controls stay disabled until
// hydration attaches their handlers. The server snapshot reports false
// and the client snapshot flips to true once hydration runs.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}
