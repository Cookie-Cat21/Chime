"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useToast } from "@/components/toast";
import { apiErrorMessage, apiMutate } from "@/lib/api/client-fetch";
import { normalizeSymbol } from "@/lib/api/symbol";

/**
 * Real Watch mutate + Alert deep link for movers rows (replaces fake Watch→detail).
 */
export function MoverRowActions({
  symbol,
  watching: watchingProp = false,
}: {
  symbol: string;
  /** From watchlist — avoids showing Watch when already watching. */
  watching?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [watching, setWatching] = useState(watchingProp);
  const alertHref = `/alerts?symbol=${encodeURIComponent(symbol)}`;

  useEffect(() => {
    setWatching(watchingProp);
  }, [watchingProp]);

  async function onWatch() {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) {
      toast.error("Invalid CSE symbol.");
      return;
    }
    setPending(true);
    try {
      const { ok, status, data } = await apiMutate("/api/v1/watchlist", {
        method: "POST",
        body: { symbol: normalized },
      });
      if (!ok) {
        toast.error(apiErrorMessage(data, `Could not watch (${status}).`));
        return;
      }
      setWatching(true);
      const created =
        data &&
        typeof data === "object" &&
        "created" in data &&
        typeof (data as { created: unknown }).created === "boolean"
          ? (data as { created: boolean }).created
          : status === 201;
      toast.success(
        created
          ? `Watching ${normalized}.`
          : `Already watching ${normalized}.`,
      );
      router.refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="flex shrink-0 items-center gap-2 text-xs font-medium">
      {watching ? (
        <span className="text-muted-foreground">Watching</span>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => void onWatch()}
          className="min-h-11 rounded-sm text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60 sm:min-h-0"
        >
          {pending ? "…" : "Watch"}
        </button>
      )}
      <Link
        href={alertHref}
        className="inline-flex min-h-11 items-center text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none sm:min-h-0"
      >
        Alert
      </Link>
    </span>
  );
}
