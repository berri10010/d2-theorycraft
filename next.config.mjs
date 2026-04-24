import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {

  // Fully static export — no Next.js server, no API routes, no SSR.
  // All pages are pre-rendered to HTML + JS at build time and served via CDN.
  output: 'export',

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

export default withBundleAnalyzer(nextConfig);
