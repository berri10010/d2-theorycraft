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
 */
export function useAnimatedValue(
  value: number,
  duration = DEFAULT_DURATION,
): number {
  const prevRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const fromRef = useRef(0);
  const toRef   = useRef(0);
  const startRef = useRef(0);

  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    cancelAnimationFrame(frameRef.current);

    if (prevRef.current === null) {
      prevRef.current = value;
      fromRef.current = value;
      toRef.current   = value;
      setDisplayed(value);
      return;
    }

    const from = fromRef.current;
    const to   = value;

    fromRef.current = from;
    toRef.current   = to;
    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);

      setDisplayed(lerp(from, to, eased));

      if (t < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return displayed;
}
