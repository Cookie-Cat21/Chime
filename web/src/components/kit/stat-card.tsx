import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** HyperUI-style stat card — health KPIs (Ceyfi port, Chime tokens). */
export function StatCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
    </article>
  );
}
