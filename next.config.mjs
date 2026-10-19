import bundleAnalyzer from '@next/bundle-analyzer';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default (phase) => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  /** @type {import('next').NextConfig} */
  const nextConfig = {
    // Fully static export — no Next.js server, no API routes, no SSR.
    // All pages are pre-rendered to HTML + JS at build time and served via CDN.
    output: 'export',

    // `src/app/admin/page.dev.tsx` is the owner-only admin UI. It talks to the
    // local scripts/admin-server.mjs, so it only exists under `next dev` and is
    // never part of the production export.
    pageExtensions: isDev ? ['dev.tsx', 'tsx', 'ts', 'jsx', 'js'] : ['tsx', 'ts', 'jsx', 'js'],

    images: {
      // next/image optimisation requires a server; disable it for static export.
      unoptimized: true,
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'www.bungie.net',
          pathname: '/**',
        },
      ],
    },

    experimental: {
      // Ensure SWC is used for transpilation even if Babel config is detected
      // elsewhere in node_modules. SWC is ~17× faster than Babel.
      forceSwcTransforms: true,
    },
  };

  return withBundleAnalyzer(nextConfig);
};
