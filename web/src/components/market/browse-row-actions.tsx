"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { InlineError } from "@/components/inline-error";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { apiErrorMessage, apiMutate } from "@/lib/api/client-fetch";
import { normalizeSymbol } from "@/lib/api/symbol";
import { cn } from "@/lib/utils";

/**
 * Compact Watch (mutate) + Alert (deep link) CTAs for browse rows.
 * Watch hits POST /api/v1/watchlist — not a symbol-detail detour.
 */
export function BrowseRowActions({
  symbol,
  watching = false,
  className,
}: {
  symbol: string;
  watching?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isWatching, setIsWatching] = useState(watching);
  const alertHref = `/alerts?symbol=${encodeURIComponent(symbol)}`;

  async function onWatch() {
    setError(null);
    const normalized = normalizeSymbol(symbol);
    if (!normalized) {
      const msg = "Invalid CSE symbol.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setPending(true);
    try {
      const { ok, status, data } = await apiMutate("/api/v1/watchlist", {
        method: "POST",
        body: { symbol: normalized },
      });
      if (!ok) {
        const msg = apiErrorMessage(data, `Could not watch (${status}).`);
        setError(msg);
        toast.error(msg);
        return;
      }
      const created =
        data &&
        typeof data === "object" &&
        "created" in data &&
        typeof (data as { created: unknown }).created === "boolean"
          ? (data as { created: boolean }).created
          : status === 201;
      setIsWatching(true);
      toast.success(
        created
          ? `Watching ${normalized}. Pushes still go to Telegram.`
          : `Already watching ${normalized}. Pushes still go to Telegram.`,
      );
      router.refresh();
    } catch {
      const msg = "Network error.";
      setError(msg);
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <div className="flex items-center gap-2">
        {isWatching ? (
          <span className="text-xs font-medium text-muted-foreground">
            Watching
          </span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => void onWatch()}
            aria-busy={pending || undefined}
            className="min-h-11 px-2 text-xs font-medium sm:min-h-8"
          >
            {pending ? "…" : "Watch"}
          </Button>
        )}
        <Link
          href={alertHref}
          className="inline-flex min-h-11 items-center rounded-sm px-1 text-xs font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none sm:min-h-8"
        >
          Alert
        </Link>
      </div>
      <InlineError
        message={error}
        className="max-w-[12rem] px-1 py-0.5 text-right text-xs"
      />
    </div>
  );
}
