/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.bungie.net',
        pathname: '/common/destiny2_content/icons/**',
      },
    ],
  },
};

export default nextConfig;
