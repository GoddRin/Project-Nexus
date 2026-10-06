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
  // Pre-generated Gemini voice lines (lib/atlas-ai/speechDiskCache.ts) read from disk by the speech routes
  outputFileTracingIncludes: {
    '/api/atlas-ai/tts': ['./voice-bank/atlas-tts/**/*'],
    '/api/atlas-ai/tts/status': ['./voice-bank/atlas-tts/**/*'],
  },
  transpilePackages: ['three'],
  images: {
    // 90 is for news cover photographs, which carry fine lettering
    qualities: [75, 90],
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
      // Large files that never change under the same address: let the browser keep them instead
      // of asking the server again on every visit (they were all "max-age=0, must-revalidate").
      {
        // voice clips are named by the hash of their text: a given file can never change
        source: "/voice/:file([0-9a-f]+\.mp3)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // 3D characters: the address carries a version (?v=7) that is raised with every new file
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=604800" }],
      },
      {
        source: "/project-images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }],
      },
      {
        source: "/audio/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }],
      },
      {
        // GIS overlays (river flow lines, boundaries)
        source: "/data/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
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
