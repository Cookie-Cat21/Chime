import type { NextConfig } from "next";

/** Baseline response headers for the thin dash. Strict CSP deferred (needs nonces). */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Opt out of legacy XSS auditors; modern browsers ignore / mishandle them.
  { key: "X-XSS-Protection", value: "0" },
];

const nextConfig: NextConfig = {
  // Required for web/Dockerfile standalone runner (compose profile `web`).
  output: "standalone",
  // Don't advertise the framework to clients.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
