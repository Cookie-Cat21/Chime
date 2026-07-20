/** Pure helpers for area sparks — safe on server and client. */

export type AreaSparkTone = "up" | "down" | "flat" | "neutral";

export function toneFromSeries(
  values: Array<number | null | undefined>,
  upIsGood = true,
): AreaSparkTone {
  const series = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  if (series.length < 2) return "flat";
  const first = series[0]!;
  const last = series[series.length - 1]!;
  if (Math.abs(last - first) < 1e-9) return "flat";
  const up = last >= first;
  const good = upIsGood ? up : !up;
  return good ? "up" : "down";
}

export const AREA_SPARK_STROKE: Record<AreaSparkTone, string> = {
  up: "oklch(0.45 0.1 160)",
  down: "oklch(0.52 0.12 25)",
  flat: "oklch(0.55 0.02 250)",
  neutral: "oklch(0.48 0.04 250)",
};
