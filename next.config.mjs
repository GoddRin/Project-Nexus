/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  turbopack: {
    // The in-browser voice's phonemizer (lib/atlas-ai/piperVoice.worker.ts) references fs/path in a
    // Node-only branch; give browser bundles an empty stand-in.
    resolveAlias: {
      fs: { browser: './lib/atlas-ai/emptyModule.ts' },
      path: { browser: './lib/atlas-ai/emptyModule.ts' },
    },
  },
  experimental: {
    // The on-disk Turbopack dev cache came back corrupted after the dev server was stopped hard:
    // every route except a few answered 404 until .next/dev was deleted. Start clean each time instead.
    turbopackFileSystemCacheForDev: false,
  },
  transpilePackages: ['three'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/dashboard/weather/philipines',
        destination: '/dashboard/weather/philippines',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // replace this your actual origin
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
          { key: "Access-Control-Allow-Private-Network", value: "true" },
        ]
      }
    ]
  }
};

export default nextConfig;
