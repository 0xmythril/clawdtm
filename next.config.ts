import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    
    if (!convexUrl) {
      console.warn("NEXT_PUBLIC_CONVEX_URL not set, API rewrites disabled");
      return [];
    }

    // Convex HTTP routes are served at .convex.site, not .convex.cloud
    // Convert: https://xyz.convex.cloud -> https://xyz.convex.site
    const convexHttpUrl = convexUrl.replace('.convex.cloud', '.convex.site');

    return [
      {
        // Proxy all /api/v1/* requests to Convex HTTP router
        source: "/api/v1/:path*",
        destination: `${convexHttpUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
