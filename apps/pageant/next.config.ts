import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {},
  outputFileTracingRoot: process.cwd() + "/../..",
  outputFileTracingIncludes: {
    "/api/publications/*/pdf": ["./public/fonts/*"],
  },
  async rewrites() {
    return [
      { source: "/Fobi/records", destination: "/Fobi/records/index.html" },
      { source: "/Fobi/records/", destination: "/Fobi/records/index.html" },
      { source: "/news/downloads", destination: "/news/downloads/index.html" },
      { source: "/news/downloads/", destination: "/news/downloads/index.html" },
    ];
  },
  async redirects() {
    return [
      ...[
        ["/backoffice.html", "/studio"],
        ["/platform/admin/index.html", "/studio"],
        ["/checkin.html", "/studio"],
        ["/Fobi/index.html", "/Fobi"],
        ["/fobi", "/Fobi"],
        ["/pageants.html", "/events"],
        ["/pageant.html", "/events"],
        ["/contestants.html", "/events/fobi-2026"],
        ["/apply.html", "/events"],
        ["/platform/member", "/account"],
        ["/platform/organizers", "/create"],
        ["/platform/recruitment", "/events"],
        ["/platform/training", "/events"],
        ["/platform/training/stage", "/events"],
        ["/platform/training/camera", "/events"],
        ["/platform/training/media", "/events"],
      ].map(([source, destination]) => ({
        source,
        destination:
          destination.startsWith("/studio") ||
          destination === "/account" ||
          destination === "/create"
            ? "https://pageant.self.com.tw" + destination
            : destination,
        permanent: false,
      })),
      { source: "/news/index.html", destination: "/news", permanent: true },
      {
        source: "/news/:slug/index.html",
        destination: "/news/:slug",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/studio/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/account/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};
export default config;
