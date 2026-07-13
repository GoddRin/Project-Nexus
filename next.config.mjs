/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard/weather/philipines',
        destination: '/dashboard/weather/philippines',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
