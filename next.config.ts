import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    
    if (!convexUrl) {
      console.warn("NEXT_PUBLIC_CONVEX_URL not set, API rewrites disabled");
      return [];
    }

    return [
      {
        // Proxy all /api/v1/* requests to Convex HTTP router
        source: "/api/v1/:path*",
        destination: `${convexUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
