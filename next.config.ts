import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep `next dev` from writing extra markdown files at the project root.
  agentRules: false,
  // The sky faces (~6 MB) change rarely: let browsers keep them for a week.
  async headers() {
    return [
      {
        source: "/sky/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
