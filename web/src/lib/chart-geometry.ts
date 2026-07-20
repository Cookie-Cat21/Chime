/**
 * Shared 1D series geometry for area/line sparks (pure — server-safe).
 */

export type ChartPoint = { x: number; y: number; value: number };

export type ChartGeometry = {
  width: number;
  height: number;
  padX: number;
  padY: number;
  min: number;
  max: number;
  span: number;
  points: ChartPoint[];
  linePoints: string;
  areaPoints: string;
};

/** Finite numbers only — drops null/NaN/Inf (keeps index alignment via filter). */
export function finiteSeries(
  values: Array<number | null | undefined>,
): number[] {
  return values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
}

export function buildChartGeometry(
  series: number[],
  opts?: { width?: number; height?: number; padX?: number; padY?: number },
): ChartGeometry | null {
  if (series.length < 2) return null;
  const width = opts?.width ?? 240;
  const height = opts?.height ?? 64;
  const padX = opts?.padX ?? 2;
  const padY = opts?.padY ?? 4;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max !== min ? max - min : 1;
  const points = series.map((value, i) => {
    const x = padX + (i / (series.length - 1)) * (width - padX * 2);
    const y = padY + (1 - (value - min) / span) * (height - padY * 2);
    return { x, y, value };
  });
  const linePoints = points
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPoints = [
    `${points[0]!.x.toFixed(1)},${(height - padY).toFixed(1)}`,
    ...points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `${points[points.length - 1]!.x.toFixed(1)},${(height - padY).toFixed(1)}`,
  ].join(" ");
  return { width, height, padX, padY, min, max, span, points, linePoints, areaPoints };
}

/** Nearest point index for a pointer X in viewBox space. */
export function nearestIndexAtX(
  points: ChartPoint[],
  x: number,
): number {
  if (points.length === 0) return 0;
  let best = 0;
  let bestDist = Math.abs(points[0]!.x - x);
  for (let i = 1; i < points.length; i++) {
    const d = Math.abs(points[i]!.x - x);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}
