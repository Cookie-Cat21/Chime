"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorMessage, apiMutate } from "@/lib/api/client-fetch";

export function WatchlistAddForm() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const trimmed = symbol.trim().toUpperCase();
      if (!trimmed) {
        setError("Enter a CSE symbol.");
        return;
      }
      const { ok, status, data } = await apiMutate("/api/v1/watchlist", {
        method: "POST",
        body: { symbol: trimmed },
      });
      if (!ok) {
        setError(apiErrorMessage(data, `Could not add (${status}).`));
        return;
      }
      setSymbol("");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Label htmlFor="watch_symbol">Add symbol</Label>
        <Input
          id="watch_symbol"
          name="symbol"
          className="h-10 font-mono"
          placeholder="e.g. JKH.N0000"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          autoComplete="off"
          required
        />
      </div>
      <Button type="submit" disabled={pending} className="h-10 shrink-0">
        {pending ? "Adding…" : "Add"}
      </Button>
      {error ? (
        <p className="w-full text-sm text-destructive sm:basis-full" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function UnwatchButton({ symbol }: { symbol: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setError(null);
    setPending(true);
    try {
      const { ok, status, data } = await apiMutate(
        `/api/v1/watchlist/${encodeURIComponent(symbol)}`,
        { method: "DELETE" },
      );
      if (!ok) {
        setError(apiErrorMessage(data, `Could not unwatch (${status}).`));
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={onClick}
      >
        {pending ? "…" : "Unwatch"}
      </Button>
      {error ? (
        <p className="max-w-[12rem] text-right text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
