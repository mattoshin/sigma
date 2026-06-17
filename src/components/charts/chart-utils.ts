"use client";

import { useEffect, useRef, useState } from "react";

/** Track a container's width for responsive SVG charts (height stays fixed). */
export function useChartWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Bisect a sorted-by-price array to the nearest point to `price`. */
export function nearestByPrice<T extends { price: number }>(points: T[], price: number): T {
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].price < price) lo = mid;
    else hi = mid;
  }
  return Math.abs(points[lo].price - price) <= Math.abs(points[hi].price - price)
    ? points[lo]
    : points[hi];
}

export const CHART_COLORS = {
  rnd: "var(--info)",
  subjective: "var(--accent)",
  up: "var(--up)",
  down: "var(--down)",
  grid: "var(--line)",
  axis: "var(--faint)",
};
