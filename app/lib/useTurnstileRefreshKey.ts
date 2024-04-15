import { useEffect, useState } from "react";

export function useTurnstileRefreshKey(srcData: any) {
  const [turnstileRefreshKey, setTurnstileRefreshKey] =
    useState<string>("cf-initial");
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    setTurnstileRefreshKey(crypto.randomUUID());
  }, [srcData]);

  return turnstileRefreshKey;
}
