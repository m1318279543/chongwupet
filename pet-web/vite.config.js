import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
// Element Plus 按需引入：模板里的 el-* 组件与 JS 里的 ElMessage 等 API 自动按需导入
// 样式仍用全量 index.css（见 main.js），规避按需样式的变量覆盖顺序问题
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    // 独立缓存目录，避开 vite 重建 deps 触发 safe-delete 拦截
    cacheDir: '.vite-cache',
    plugins: [
      vue(),
      AutoImport({ resolvers: [ElementPlusResolver()] }),
      Components({ resolvers: [ElementPlusResolver()] }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    server: {
      host: '0.0.0.0',
      port: 82,
      // 允许任意 Host（含 cloudflared 等隧道的 *.trycloudflare.com），否则公网访问会被 Vite 的 Host 校验 403 拦截
      allowedHosts: true,
      open: false,
      proxy: {
        '/dev-api': {
          target: 'http://localhost:8081',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/dev-api/, '')
        }
      }
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 2000
    }
  }
})
