import { useRef, useState, useEffect } from 'react';

const DEFAULT_DURATION = 300;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Smoothly animates a single numeric value when it changes.
 *
 * On first call the value is returned immediately (no animation).
 * On subsequent changes it interpolates from the current displayed
 * value to the new target over `duration` ms.
 *
 * fromRef is updated every animation frame so that mid-flight changes
 * always start from the actual visual value — no snapping.
 */
export function useAnimatedValue(
  value: number,
  duration = DEFAULT_DURATION,
): number {
  const frameRef   = useRef(0);
  const fromRef    = useRef(value); // current visual value
  const startRef   = useRef(0);
  const isFirstRef = useRef(true);

  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    cancelAnimationFrame(frameRef.current);

    if (isFirstRef.current) {
      isFirstRef.current = false;
      fromRef.current = value;
      setDisplayed(value);
      return;
    }

    const from = fromRef.current;
    const to   = value;

    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);

      const val = lerp(from, to, eased);

      // Always keep fromRef at the current visual value so any new animation
      // that interrupts this one starts from exactly where we are.
      fromRef.current = val;
      setDisplayed(val);

      if (t < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        fromRef.current = to; // snap to exact final value
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return displayed;
}
