"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Soft-reload Server Components — not a live tick stream. */
export const DEFAULT_SOFT_REFRESH_MS = 60_000;
export const MIN_SOFT_REFRESH_MS = 15_000;
export const MAX_SOFT_REFRESH_MS = 300_000;

function clamp(ms: number): number {
  if (!Number.isFinite(ms)) return DEFAULT_SOFT_REFRESH_MS;
  return Math.min(
    MAX_SOFT_REFRESH_MS,
    Math.max(MIN_SOFT_REFRESH_MS, Math.round(ms)),
  );
}

/**
 * Periodically ``router.refresh()`` so SSR pages pick up new Postgres rows
 * without SSE. Keeps Vercel Fluid CPU light vs a held-open stream.
 */
export function SoftPageRefresh({
  intervalMs = DEFAULT_SOFT_REFRESH_MS,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();
  const period = clamp(intervalMs);

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, period);
    return () => window.clearInterval(id);
  }, [router, period]);

  return null;
}
