import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

/**
 * 双入口：
 *   index.html → web 端（桌面管理控制台，仅管理员）
 *   h5.html    → h5 端（手机：注册 / 登录 / 我的账号）
 * 分开打包，手机端不必下载管理台那套代码。
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    rollupOptions: {
      input: {
        web: fileURLToPath(new URL("./index.html", import.meta.url)),
        h5: fileURLToPath(new URL("./h5.html", import.meta.url)),
      },
    },
  },
});
