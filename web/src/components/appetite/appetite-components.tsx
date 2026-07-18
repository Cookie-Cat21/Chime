import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  breadth: "Breadth",
  intensity: "Intensity",
  index: "ASPI day",
  participation: "Participation",
};

const WEIGHTS: Record<string, string> = {
  breadth: "40%",
  intensity: "25%",
  index: "20%",
  participation: "15%",
};

/** Component breakdown bars for the latest appetite day. */
export function AppetiteComponents({
  components,
  className,
}: {
  components: {
    breadth: number | null;
    intensity: number | null;
    index: number | null;
    participation: number | null;
  };
  className?: string;
}) {
  const rows = (
    ["breadth", "intensity", "index", "participation"] as const
  ).map((k) => ({
    key: k,
    label: LABELS[k]!,
    weight: WEIGHTS[k]!,
    value: components[k],
  }));

  return (
    <ul className={cn("space-y-2.5", className)} aria-label="Score components">
      {rows.map((r) => {
        const v = r.value == null || !Number.isFinite(r.value) ? null : r.value;
        const pct = v == null ? 0 : Math.max(0, Math.min(100, v));
        return (
          <li key={r.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-foreground">
                {r.label}{" "}
                <span className="font-mono text-muted-foreground">
                  ({r.weight})
                </span>
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {v == null ? "—" : v.toFixed(1)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-sm bg-muted/50">
              <div
                className="h-full rounded-sm bg-foreground/70"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
