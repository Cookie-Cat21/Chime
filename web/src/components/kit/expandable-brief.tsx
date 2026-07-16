"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Clamped brief with in-place expand — filing summary without leaving the page. */
export function ExpandableBrief({
  title,
  text,
  status = "ready",
  clampClassName = "line-clamp-6",
  className,
}: {
  title: string;
  text: string;
  /** Ops/status chrome — ready briefs default; pending uses shimmer-free Badge. */
  status?: "ready" | "pending" | "failed" | "skipped";
  clampClassName?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const long = text.length > 280;
  const statusLabel =
    status === "ready"
      ? "AI brief"
      : status === "pending"
        ? "Brief pending"
        : status === "failed"
          ? "Brief failed"
          : "Brief skipped";

  return (
    <article
      className={cn(
        "rounded-lg border border-border/70 bg-muted/25 p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={status === "failed" ? "destructive" : "secondary"}
          className="text-[10px] uppercase tracking-wide"
        >
          {statusLabel}
        </Badge>
        <p className="text-sm font-medium">{title}</p>
      </div>
      <p
        className={cn(
          "mt-2 text-sm leading-relaxed text-muted-foreground",
          !open && clampClassName,
        )}
      >
        {text}
      </p>
      {long ? (
        <button
          type="button"
          className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Show less" : "Show full brief"}
        </button>
      ) : null}
    </article>
  );
}
