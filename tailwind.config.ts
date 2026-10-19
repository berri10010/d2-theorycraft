import type { Config } from 'tailwindcss'

const config: Config = {
  // Covers src/lib too — clarityRender.tsx emits class names outside components/app.
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
export default config
