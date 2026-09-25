import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep `next dev` from writing extra markdown files at the project root.
  agentRules: false,
};

export default nextConfig;
