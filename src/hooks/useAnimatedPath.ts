import { useRef, useState, useEffect } from 'react';

const DEFAULT_DURATION = 300;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Smoothly animates an SVG path string when its point array changes.
 *
 * On first call the path is returned immediately (no animation).
 * On subsequent changes the path morphs from the previously-displayed
 * points to the new target points over `duration` ms.
 *
 * Both point arrays must have the same length — this is guaranteed for
 * the damage falloff chart because `buildCurve` always emits 81 points.
 */
export function useAnimatedPath(
  points: [number, number][],
  duration = DEFAULT_DURATION,
): string {
  const prevRef = useRef<[number, number][] | null>(null);
  const frameRef = useRef<number>(0);
  const fromRef = useRef<[number, number][] | null>(null);
  const toRef   = useRef<[number, number][] | null>(null);
  const startRef = useRef(0);

  const [path, setPath] = useState(() => pathStr(points));

  useEffect(() => {
    cancelAnimationFrame(frameRef.current);

    // First render — no animation, just set the path
    if (!prevRef.current) {
      prevRef.current = points;
      fromRef.current = points;
      toRef.current   = points;
      setPath(pathStr(points));
      return;
    }

    // Capture current displayed points as the "from" position
    const from = fromRef.current ?? prevRef.current;
    const to   = points;

    // Safety: if length changed, jump immediately (shouldn't happen for falloff)
    if (from.length !== to.length) {
      prevRef.current = points;
      fromRef.current = points;
      toRef.current   = points;
      setPath(pathStr(points));
      return;
    }

    fromRef.current = from;
    toRef.current   = to;
    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);

      const interp: [number, number][] = new Array(from.length);
      for (let i = 0; i < from.length; i++) {
        interp[i] = [lerp(from[i][0], to[i][0], eased), lerp(from[i][1], to[i][1], eased)];
      }

      setPath(pathStr(interp));

      if (t < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = points;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameRef.current);
  }, [points, duration]);

  return path;
}

function pathStr(pts: [number, number][]): string {
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}
