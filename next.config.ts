import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) dynamically imports its own worker file at
  // runtime; bundling it rewrites that path and breaks resolution. Keeping
  // it external lets Node require it directly from node_modules instead.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
