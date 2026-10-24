import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 本地单用户动态应用：关闭缓存组件模型，保持经典动态渲染
  cacheComponents: false,
  partialPrefetching: false,
  // 原生模块不入 bundle
  serverExternalPackages: ["better-sqlite3", "unpdf", "officeparser"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
