import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// NOTE: unplugin-auto-import & unplugin-vue-components removed
//       — packages not installed; import manually where needed

export default defineConfig({
  base: './',
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1430,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 1430,
    strictPort: true,
  },
  css: {
    devSourcemap: false,
    modules: {
      localsConvention: 'camelCase',
    },
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/store': path.resolve(__dirname, './src/store/index'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 400,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        inlineDynamicImports: false,
        // Simplified vendor chunking — avoids 200+ lines of dead-path conditions
        manualChunks(id) {
          if (!id.includes('node_modules')) return null

          // Framework core
          if (/node_modules\/react(?:-dom)?\//.test(id)) return 'vendor-react'
          if (/node_modules\/react-router(?:-dom)?\//.test(id)) return 'vendor-router'
          if (/node_modules\/zustand\//.test(id)) return 'vendor-zustand'

          // Tauri
          if (/node_modules\/@tauri-apps\//.test(id)) return 'vendor-tauri'

          // UI library
          if (/node_modules\/antd\//.test(id)) return 'vendor-antd'
          if (/node_modules\/@ant-design\//.test(id)) return 'vendor-antd-icons'
          if (/node_modules\/rc-[a-z-]+\//.test(id)) return 'vendor-rc'

          // Utilities
          if (/node_modules\/dayjs\//.test(id)) return 'vendor-dayjs'
          if (/node_modules\/axios\//.test(id)) return 'vendor-axios'
          if (/node_modules\/i18next\//.test(id) || /node_modules\/react-i18next\//.test(id)) return 'vendor-i18n'

          return 'vendor'
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'dayjs', 'zustand', 'antd'],
    exclude: ['@ant-design/icons'],
  },
  esbuild: {
    legalComments: 'none',
    drop: ['console', 'debugger'],
    target: 'esnext',
  },
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __BUILD_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
})
