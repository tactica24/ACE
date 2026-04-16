const allowedOrigins = Array.from(
  new Set(
    [
      'localhost:3000',
      process.env.ACE_APP_BASE_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
      process.env.VERCEL_BRANCH_URL,
      process.env.VERCEL_URL,
    ]
      .filter(Boolean)
      .map((value) => {
        try {
          return new URL(String(value).includes('://') ? String(value) : `https://${String(value)}`).host;
        } catch {
          return String(value).replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        }
      })
  )
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;
