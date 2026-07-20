/**
 * Chart geometry unit — finite series + nearest-index hover.
 *
 * Invoked from web/ (cwd + module root):
 *   pytest tests/test_web_route_regressions.py::test_chart_geometry_unit
 */
import {
  buildChartGeometry,
  finiteSeries,
  nearestIndexAtX,
} from "./src/lib/chart-geometry.ts";

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) fail(msg);
}

assert(
  JSON.stringify(finiteSeries([1, null, Number.NaN, 3, undefined])) ===
    JSON.stringify([1, 3]),
  "finiteSeries drops null/NaN",
);

const geo = buildChartGeometry([10, 20, 15]);
assert(geo != null, "geometry for 3 points");
assert(geo.points.length === 3, "3 points");
assert(geo.points[0]!.value === 10, "first value");
assert(geo.points[2]!.value === 15, "last value");

const midX = geo.points[1]!.x;
assert(nearestIndexAtX(geo.points, midX) === 1, "nearest mid");
assert(nearestIndexAtX(geo.points, geo.points[0]!.x - 5) === 0, "nearest left");
assert(
  nearestIndexAtX(geo.points, geo.points[2]!.x + 50) === 2,
  "nearest right",
);

assert(buildChartGeometry([1]) == null, "single point → null");
assert(buildChartGeometry([]) == null, "empty → null");

console.log("WEB_CHART_GEOMETRY_UNIT_OK");
