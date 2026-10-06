/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // P2-3 打包优化：`$env:ANALYZE=1; npm run build` 时额外输出依赖体积分析（dist/stats.html）
    ...(process.env.ANALYZE
      ? [visualizer({ gzipSize: true, filename: 'stats.html', emitFile: true, open: false })]
      : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // P2-4：默认 node 环境跑纯逻辑单测；需要 DOM/组件的测试用文件头 `// @vitest-environment jsdom` 单独声明
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // P2-3 打包优化：
        // 1) 只把「稳定且必加载」的大依赖固定成 vendor chunk（react/react-dom），
        //    复用浏览器 HTTP 长缓存，业务代码更新时它们不重新下载；
        // 2) echarts 体积大（~190KB gzip）只用在看板，自成 chunk 随看板按需加载、独立缓存；
        // 3) antd 的 Table/DatePicker/Select 等重组件**故意不合并**，交给 rolldown
        //    自动按「页面」分包，避免把它们拖进首屏（合并反而会让登录页多下载不需要的 UI）。
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return 'react-core';
          }
          if (id.includes('/echarts/') || id.includes('/zrender/')) {
            return 'echarts';
          }
        },
      },
    },
  },
});
