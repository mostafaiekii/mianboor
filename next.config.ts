import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // روی Vercel خروجی استاندارد لازم است؛ standalone فقط برای اجرای محلی
  output: process.env.VERCEL ? undefined : "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
