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
 * On subsequent changes the path morphs from the currently-displayed
 * position to the new target points over `duration` ms.
 *
 * fromRef is updated every animation frame so that mid-flight changes
 * always start from the actual visual position — no snapping.
 *
 * Both point arrays must have the same length — this is guaranteed for
 * the damage falloff chart because `buildCurve` always emits 81 points.
 */
export function useAnimatedPath(
  points: [number, number][],
  duration = DEFAULT_DURATION,
): string {
  const frameRef  = useRef<number>(0);
  const fromRef   = useRef<[number, number][] | null>(null); // current visual position
  const startRef  = useRef(0);
  const isFirstRef = useRef(true);

  const [path, setPath] = useState(() => pathStr(points));

  useEffect(() => {
    cancelAnimationFrame(frameRef.current);

    // First render — no animation, just display immediately
    if (isFirstRef.current) {
      isFirstRef.current = false;
      fromRef.current = points;
      setPath(pathStr(points));
      return;
    }

    const from = fromRef.current ?? points;
    const to   = points;

    // If lengths differ (weapon switch changed breakpoint count) jump immediately
    if (from.length !== to.length) {
      fromRef.current = points;
      setPath(pathStr(points));
      return;
    }

    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);

      const interp: [number, number][] = new Array(from.length);
      for (let i = 0; i < from.length; i++) {
        interp[i] = [
          lerp(from[i][0], to[i][0], eased),
          lerp(from[i][1], to[i][1], eased),
        ];
      }

      // Always update fromRef to current visual position so any new animation
      // that interrupts this one starts from exactly where we are now.
      fromRef.current = interp;
      setPath(pathStr(interp));

      if (t < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        fromRef.current = to; // snap to exact final value
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
