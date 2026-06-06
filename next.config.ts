import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Minimal bundle for Docker — copies only the files needed at runtime.
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.blocketcdn.se" },
      { protocol: "https", hostname: "img.tradera.net" },
      { protocol: "https", hostname: "musikborsen.se" },
      { protocol: "https", hostname: "guitargeeks.se" },
      { protocol: "https", hostname: "www.dlxmusic.se" },
    ],
  },
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
