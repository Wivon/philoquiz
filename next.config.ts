import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully client-side app: multiplayer runs peer-to-peer over WebRTC (PeerJS),
  // so the site is static and deploys anywhere (Vercel, GitHub Pages, …).
  // For a static export (e.g. GitHub Pages) add: output: "export".
  reactStrictMode: true,
};

export default nextConfig;
