import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep `next dev` from writing extra markdown files at the project root.
  agentRules: false,
  // The sky faces (~6 MB), the asteroid scans (~8 MB) and the hull steel (~6 MB) change rarely: let browsers keep them for a week.
  async headers() {
    const week = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }];
    return [
      { source: "/sky/:path*", headers: week },
      { source: "/asteroids/:path*", headers: week },
      { source: "/hull/:path*", headers: week },
    ];
  },
};

export default nextConfig;
