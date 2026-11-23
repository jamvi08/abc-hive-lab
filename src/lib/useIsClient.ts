import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** false during prerender/hydration, true afterwards (no hydration mismatch). */
export function useIsClient() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
