"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorMessage, apiMutate } from "@/lib/api/client-fetch";
import { ALERT_TYPES, type AlertType } from "@/lib/api/symbol";

const TYPE_OPTIONS: { value: AlertType; label: string }[] = [
  { value: "price_above", label: "Above price" },
  { value: "price_below", label: "Below price" },
  { value: "daily_move", label: "Daily move %" },
  { value: "disclosure", label: "New disclosure" },
];

export function AlertCreateForm() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [type, setType] = useState<AlertType>("price_above");
  const [threshold, setThreshold] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const needsThreshold = type !== "disclosure";

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
      if (!ALERT_TYPES.includes(type)) {
        setError("Pick a valid alert type.");
        return;
      }

      const body: {
        symbol: string;
        type: AlertType;
        threshold?: number;
      } = { symbol: trimmed, type };

      if (needsThreshold) {
        const n = Number(threshold);
        if (!Number.isFinite(n)) {
          setError("Enter a numeric threshold.");
          return;
        }
        body.threshold = n;
      }

      const { ok, status, data } = await apiMutate("/api/v1/alerts", {
        method: "POST",
        body,
      });
      if (!ok) {
        setError(apiErrorMessage(data, `Could not create (${status}).`));
        return;
      }
      setSymbol("");
      setThreshold("");
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
      className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="alert_symbol">Symbol</Label>
        <Input
          id="alert_symbol"
          name="symbol"
          className="h-10 font-mono"
          placeholder="JKH.N0000"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          autoComplete="off"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="alert_type">Type</Label>
        <select
          id="alert_type"
          className="border-input bg-background h-10 rounded-lg border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          value={type}
          onChange={(e) => setType(e.target.value as AlertType)}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {needsThreshold ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="alert_threshold">
            {type === "daily_move" ? "Percent" : "Price"}
          </Label>
          <Input
            id="alert_threshold"
            name="threshold"
            className="h-10 font-mono"
            inputMode="decimal"
            placeholder={type === "daily_move" ? "5" : "25.00"}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            required
          />
        </div>
      ) : (
        <div className="hidden lg:block" aria-hidden />
      )}
      <div className="flex flex-col justify-end gap-1.5">
        <Button type="submit" disabled={pending} className="h-10 w-full sm:w-auto">
          {pending ? "Creating…" : "Create alert"}
        </Button>
      </div>
      {error ? (
        <p
          className="text-sm text-destructive sm:col-span-2 lg:col-span-4"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function CancelAlertButton({ ruleId }: { ruleId: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setError(null);
    setPending(true);
    try {
      const { ok, status, data } = await apiMutate(`/api/v1/alerts/${ruleId}`, {
        method: "DELETE",
      });
      if (!ok) {
        setError(apiErrorMessage(data, `Could not cancel (${status}).`));
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
        {pending ? "…" : "Cancel"}
      </Button>
      {error ? (
        <p className="max-w-[12rem] text-right text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
