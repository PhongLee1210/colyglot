import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  transpilePackages: ["@colyglot/srs"],
};

export default nextConfig;
