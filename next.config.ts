import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 是原生模組，不能被打包進去。
  serverExternalPackages: ["better-sqlite3"],
  // 單機版不做影像最佳化，圖檔一律走 /api/drawing-file。
  images: { unoptimized: true },
  // 正式建置後仍要讀得到 migration 檔。
  outputFileTracingIncludes: { "/api/**": ["./drizzle/**"] },
};

export default nextConfig;
