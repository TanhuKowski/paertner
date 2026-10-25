import { withPayload } from "@payloadcms/next/withPayload";
export default withPayload({
  poweredByHeader: false,
  outputFileTracingExcludes: {
    "/*": [
      "./Brandkit/**/*",
      "./WEBSITE_PLAN.md",
      "./scrollcraft/**/*",
      "./.local/**/*",
      "./data/**/*",
      "./.env*",
    ],
  },
  images: { qualities: [75, 85], formats: ["image/webp"] },
  // The website is managed in paertner Dashboard; Payload's own admin screens are closed. The REST API under /api
  // stays, since the dashboard edits content through it.
  async redirects() {
    const dashboard = (process.env.DASHBOARD_URL || "https://app.paertner.com").replace(/\/$/, "");
    return [
      { source: "/admin", destination: dashboard + "/app/website", permanent: false },
      { source: "/admin/:path*", destination: dashboard + "/app/website", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
});
