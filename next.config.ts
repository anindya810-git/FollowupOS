import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's engine + better-sqlite3 are native deps — keep them external from
  // the server bundle.
  serverExternalPackages: ['@prisma/client', 'prisma', 'better-sqlite3', '@prisma/adapter-better-sqlite3'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
};

export default nextConfig;
