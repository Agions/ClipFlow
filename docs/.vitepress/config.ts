import { defineConfig } from 'vitepress';

export default defineConfig({
  base: '/fablr/',
  title: 'Fablr (剧工)',
  description: '开源桌面级 AI 影视/短剧解说创作工坊 · Tauri 2 + Rust + React 18 · 本地优先 · 全链路自动化',
  lang: 'zh-CN',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#08080C' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:site_name', content: 'Fablr (剧工) 文档中心' }],
    ['meta', { name: 'description', content: '开源桌面级 AI 影视/短剧解说创作工坊。长视频拆条 + 多 Agent 剧本研磨 + 5 轨剪辑合成 + 5 级消重矩阵与剪映草稿导出，100% 本地优先处理。' }],
    ['meta', { name: 'keywords', content: 'AI, 短剧解说, 视频创作, Tauri 2, Rust, React 18, FFmpeg, Whisper, 剪映草稿, 消重矩阵' }],
  ],

  themeConfig: {
    logo: '/favicon.svg',
    siteTitle: 'Fablr (剧工)',

    nav: [
      { text: '新手入门', link: '/getting-started/01-introduction' },
      { text: '核心工坊 SOP', link: '/workshops/01-asset-hub' },
      { text: '架构与设计原理', link: '/architecture/01-system-overview' },
      { text: '开发者指南', link: '/developer/01-development-guide' },
      { text: '配置与参考', link: '/reference/01-keyboard-shortcuts' },
      { text: '更新日志', link: '/CHANGELOG' },
      { text: 'GitHub', link: 'https://github.com/Agions/fablr' },
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: '1. 新手起步',
          items: [
            { text: '产品定位与核心价值', link: '/getting-started/01-introduction' },
            { text: '安装指南 (多平台)', link: '/getting-started/02-installation' },
            { text: '5 分钟快速上手实战', link: '/getting-started/03-quick-start' },
          ],
        },
      ],
      '/workshops/': [
        {
          text: '2. 核心工坊实战 SOP',
          items: [
            { text: '素材拆条工坊 (Asset Hub)', link: '/workshops/01-asset-hub' },
            { text: '剧本研磨工坊 (Script Studio)', link: '/workshops/02-script-studio' },
            { text: '5 轨剪辑工作台 (Workspace)', link: '/workshops/03-workspace' },
            { text: '消重发布工坊 (Export Hub)', link: '/workshops/04-export-dedup' },
          ],
        },
      ],
      '/architecture/': [
        {
          text: '3. 架构与设计原理',
          items: [
            { text: '系统整体架构与分层', link: '/architecture/01-system-overview' },
            { text: '原子化防竞态持久化驱动', link: '/architecture/02-atomic-file-driver' },
            { text: '多 Agent 协同编排与状态机', link: '/architecture/03-multi-agent-system' },
            { text: 'Rust 原生引擎与 DDD 领域设计', link: '/architecture/04-rust-native-backend' },
          ],
        },
      ],
      '/developer/': [
        {
          text: '4. 开发者与扩展指南',
          items: [
            { text: '本地开发与环境搭建', link: '/developer/01-development-guide' },
            { text: '质量门禁与测试规范', link: '/developer/02-testing-and-standards' },
            { text: '自定义模型与 Agent 扩展', link: '/developer/03-custom-agent-engine' },
          ],
        },
      ],
      '/reference/': [
        {
          text: '5. 配置与参考资料',
          items: [
            { text: '桌面端全功能快捷键清单', link: '/reference/01-keyboard-shortcuts' },
            { text: '全局配置与加速镜像', link: '/reference/02-configuration' },
            { text: '常见问题与排错手册 (FAQ)', link: '/reference/03-faq' },
          ],
        },
      ],
    },

    editLink: {
      pattern: 'https://github.com/Agions/fablr/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/Agions/fablr' }],

    footer: {
      message: '基于 MIT 协议开源 · 剧工 (Fablr) 架构工坊',
      copyright: 'Copyright © 2026 Agions · 由 VitePress 驱动',
    },

    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },

    outline: {
      level: [2, 3],
      label: '本页目录',
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
  },
});
