import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Ant Design 组件按需导入
import autoImport from 'unplugin-auto-import/vite'
import { AntDesignResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    // Auto import resolvers for antd
    // Note: Using babel-plugin-import equivalent through vite
  ],
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
      '@/store/app': path.resolve(__dirname, './src/store/index'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 400, // 降低警告阈值
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // Rollup 优化选项
    rollupOptions: {
      output: {
        // 更优化的 chunk 命名
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // 静态资源内联阈值
        inlineDynamicImports: false,
        manualChunks: (id) => {
          // Node modules 外部化
          if (!id.includes('node_modules')) {
            return null
          }

          // React 核心 - 单独 chunk
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react'
          }

          // React Router
          if (id.includes('node_modules/react-router') || id.includes('node_modules/history/')) {
            return 'router'
          }

          // Zustand 状态管理
          if (id.includes('node_modules/zustand/')) {
            return 'zustand'
          }

          // Tauri API
          if (id.includes('node_modules/@tauri-apps/api')) {
            return 'tauri-api'
          }

          // Ant Design Icons - 单独打包
          if (id.includes('node_modules/@ant-design/icons/') || id.includes('node_modules/@ant-design/icons-react/')) {
            return 'antd-icons'
          }

          // Ant Design 组件库 - 按功能拆分 (使用 kebab-case 路径)
          if (id.includes('node_modules/antd/')) {
            // 基础组件
            if (id.includes('/es/button/') || id.includes('/lib/button/') ||
                id.includes('/es/input/') || id.includes('/lib/input/') ||
                id.includes('/es/input-number/') || id.includes('/lib/input-number/') ||
                id.includes('/es/checkbox/') || id.includes('/lib/checkbox/') ||
                id.includes('/es/radio/') || id.includes('/lib/radio/') ||
                id.includes('/es/switch/') || id.includes('/lib/switch/') ||
                id.includes('/es/slider/') || id.includes('/lib/slider/') ||
                id.includes('/es/select/') || id.includes('/lib/select/') ||
                id.includes('/es/date-picker/') || id.includes('/lib/date-picker/') ||
                id.includes('/es/time-picker/') || id.includes('/lib/time-picker/') ||
                id.includes('/es/upload/') || id.includes('/lib/upload/') ||
                id.includes('/es/auto-complete/') || id.includes('/lib/auto-complete/')) {
              return 'antd-basic'
            }

            // 布局组件
            if (id.includes('/es/layout/') || id.includes('/lib/layout/') ||
                id.includes('/es/row/') || id.includes('/lib/row/') ||
                id.includes('/es/col/') || id.includes('/lib/col/') ||
                id.includes('/es/grid/') || id.includes('/lib/grid/') ||
                id.includes('/es/card/') || id.includes('/lib/card/') ||
                id.includes('/es/tabs/') || id.includes('/lib/tabs/') ||
                id.includes('/es/flex/') || id.includes('/lib/flex/') ||
                id.includes('/es/divider/') || id.includes('/lib/divider/')) {
              return 'antd-layout'
            }

            // 反馈组件
            if (id.includes('/es/modal/') || id.includes('/lib/modal/') ||
                id.includes('/es/drawer/') || id.includes('/lib/drawer/') ||
                id.includes('/es/message/') || id.includes('/lib/message/') ||
                id.includes('/es/notification/') || id.includes('/lib/notification/') ||
                id.includes('/es/alert/') || id.includes('/lib/alert/') ||
                id.includes('/es/spin/') || id.includes('/lib/spin/') ||
                id.includes('/es/skeleton/') || id.includes('/lib/skeleton/') ||
                id.includes('/es/progress/') || id.includes('/lib/progress/') ||
                id.includes('/es/result/') || id.includes('/lib/result/') ||
                id.includes('/es/empty/') || id.includes('/lib/empty/') ||
                id.includes('/es/collapse/') || id.includes('/lib/collapse/') ||
                id.includes('/es/spinner/') || id.includes('/lib/spinner/')) {
              return 'antd-feedback'
            }

            // 数据展示
            if (id.includes('/es/table/') || id.includes('/lib/table/') ||
                id.includes('/es/list/') || id.includes('/lib/list/') ||
                id.includes('/es/descriptions/') || id.includes('/lib/descriptions/') ||
                id.includes('/es/timeline/') || id.includes('/lib/timeline/') ||
                id.includes('/es/tree/') || id.includes('/lib/tree/') ||
                id.includes('/es/tree-select/') || id.includes('/lib/tree-select/') ||
                id.includes('/es/steps/') || id.includes('/lib/steps/') ||
                id.includes('/es/segmented/') || id.includes('/lib/segmented/') ||
                id.includes('/es/image/') || id.includes('/lib/image/') ||
                id.includes('/es/calendar/') || id.includes('/lib/calendar/') ||
                id.includes('/es/carousel/') || id.includes('/lib/carousel/')) {
              return 'antd-data'
            }

            // 表单组件
            if (id.includes('/es/form/') || id.includes('/lib/form/') ||
                id.includes('/es/cascader/') || id.includes('/lib/cascader/') ||
                id.includes('/es/mentions/') || id.includes('/lib/mentions/') ||
                id.includes('/es/rate/') || id.includes('/lib/rate/')) {
              return 'antd-form'
            }

            // 导航组件
            if (id.includes('/es/menu/') || id.includes('/lib/menu/') ||
                id.includes('/es/dropdown/') || id.includes('/lib/dropdown/') ||
                id.includes('/es/breadcrumb/') || id.includes('/lib/breadcrumb/') ||
                id.includes('/es/pagination/') || id.includes('/lib/pagination/') ||
                id.includes('/es/steps/') || id.includes('/lib/steps/') ||
                id.includes('/es/config-provider/') || id.includes('/lib/config-provider/') ||
                id.includes('/es/page-header/') || id.includes('/lib/page-header/') ||
                id.includes('/es/splitter/') || id.includes('/lib/splitter/')) {
              return 'antd-nav'
            }

            // 通用组件
            if (id.includes('/es/space/') || id.includes('/lib/space/') ||
                id.includes('/es/badge/') || id.includes('/lib/badge/') ||
                id.includes('/es/tag/') || id.includes('/lib/tag/') ||
                id.includes('/es/avatar/') || id.includes('/lib/avatar/') ||
                id.includes('/es/tooltip/') || id.includes('/lib/tooltip/') ||
                id.includes('/es/popover/') || id.includes('/lib/popover/') ||
                id.includes('/es/popconfirm/') || id.includes('/lib/popconfirm/') ||
                id.includes('/es/typography/') || id.includes('/lib/typography/') ||
                id.includes('/es/qr-code/') || id.includes('/lib/qr-code/') ||
                id.includes('/es/qrcode/') || id.includes('/lib/qrcode/') ||
                id.includes('/es/watermark/') || id.includes('/lib/watermark/') ||
                id.includes('/es/statistic/') || id.includes('/lib/statistic/') ||
                id.includes('/es/float-button/') || id.includes('/lib/float-button/') ||
                id.includes('/es/back-top/') || id.includes('/lib/back-top/') ||
                id.includes('/es/anchor/') || id.includes('/lib/anchor/') ||
                id.includes('/es/tour/') || id.includes('/lib/tour/') ||
                id.includes('/es/transfer/') || id.includes('/lib/transfer/') ||
                id.includes('/es/color-picker/') || id.includes('/lib/color-picker/') ||
                id.includes('/es/app/') || id.includes('/lib/app/')) {
              return 'antd-general'
            }

            // 其他 antd 组件
            return 'antd-misc'
          }

          // Ant Design 内部 rc-* 组件库
          if (id.includes('node_modules/rc-')) {
            return 'antd-rc'
          }

          // 其他库
          if (id.includes('node_modules/dayjs/')) {
            return 'dayjs'
          }

          if (id.includes('node_modules/axios/')) {
            return 'axios'
          }

          if (id.includes('node_modules/i18next/') || id.includes('node_modules/react-i18next/')) {
            return 'i18n'
          }

          // lodash
          if (id.includes('node_modules/lodash/')) {
            return 'lodash'
          }

          // Ant Design 其他
          if (id.includes('node_modules/@ant-design/')) {
            return 'antd-other'
          }

          // 其他 vendor
          return 'vendor'
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'dayjs',
      'zustand',
      'antd',
    ],
    exclude: ['@ant-design/icons'],
  },
  esbuild: {
    legalComments: 'none',
    drop: ['console', 'debugger'],
    // ES2022+ 特性
    target: 'esnext',
  },
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __BUILD_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
})
