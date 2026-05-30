import type { NextConfig } from "next";

// Content-Security-Policy. Conservative but meaningful: locks down base-uri,
// objects, framing and form targets, and constrains where scripts/styles/
// connections can come from. 'unsafe-inline'/'unsafe-eval' are retained for
// scripts because Next.js injects inline hydration scripts without a nonce;
// a nonce-based CSP is the next hardening step.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join('; ')

const nextConfig: NextConfig = {
  // Type errors must fail the build — the codebase is type-clean and we want
  // it to stay that way (no silently-shipped type regressions).
  typescript: {
    ignoreBuildErrors: false,
  },
  serverExternalPackages: ['@prisma/client', 'prisma', 'better-sqlite3', '@prisma/adapter-better-sqlite3'],
  // Don't leak the framework/version to clients.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
    ]
  },
};
export default nextConfig;
