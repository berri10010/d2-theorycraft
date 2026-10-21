import type { Config } from 'tailwindcss'

// Theme-aware colours resolve to CSS variables (see globals.css) so the same
// utility classes render correctly in dark and light mode — no per-class overrides.
const themed = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`

const config: Config = {
  // Covers src/lib too — clarityRender.tsx emits class names outside components/app.
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // One shared scale for small text. Never go below these: they grow by a point on phones.
      //   2xs: captions, meta lines, chip labels (11px, 12px on phones)
      //   3xs: single-glyph badges on icons (10px, 11px on phones)
      fontSize: { '2xs': 'var(--fs-2xs)', '3xs': 'var(--fs-3xs)' },
      colors: {
        // Overlays / page background / primary text: `white` and `black` flip between themes.
        black: themed('black'),
        white: themed('white'),
        // Text ramp (primary → secondary). ink-4 clears WCAG AA (4.5:1) on dark and light surfaces.
        ink: { DEFAULT: themed('ink'), 2: themed('ink-2'), 3: themed('ink-3'), 4: themed('ink-4') },
        // Raised panels / popovers.
        surface: { DEFAULT: themed('surface'), 2: themed('surface-2') },
      },
    },
  },
  plugins: [],
}
export default config
