import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Custom server (server.ts) handles HTTP + Socket.IO.
  // Nothing special required here for the local-network multiplayer setup.
  reactStrictMode: true,
};

export default nextConfig;
