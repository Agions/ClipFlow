import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/story-fab/',
  title: 'StoryFab',
  description: 'AI 影视解说创作工坊 · Tauri 2 + Svelte 5 + Rust · 本地优先 · 全链路自动化',
  lang: 'zh-CN',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#0B0F1F' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:site_name', content: 'StoryFab 文档' }],
    ['meta', { name: 'description', content: '本地优先的 AI 影视解说创作工具。剪辑模式 + 解说模式，全链路本地处理。' }],
    ['meta', { name: 'keywords', content: 'AI, 视频创作, 影视解说, Tauri 2, Svelte 5, Rust, FFmpeg, 本地处理, 隐私' }],
  ],

  themeConfig: {
    logo: '/favicon.svg',
    siteTitle: 'StoryFab',

    nav: [
      { text: '快速开始', link: '/getting-started/introduction' },
      { text: '功能指南', link: '/features/commentary-mode' },
      { text: '配置', link: '/configuration/configuration' },
      { text: 'FAQ', link: '/reference/faq' },
      { text: '更新日志', link: '/changelog' },
      { text: 'GitHub', link: 'https://github.com/Agions/story-fab' },
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: '开始使用',
          items: [
            { text: '产品介绍', link: '/getting-started/introduction' },
            { text: '安装指南', link: '/getting-started/installation' },
            { text: '快速上手', link: '/getting-started/quick-start' },
          ],
        },
      ],
      '/features/': [
        {
          text: '功能指南',
          items: [
            { text: '剪辑模式', link: '/features/commentary-mode' },
            { text: '解说模式', link: '/features/ai-analysis' },
            { text: '脚本生成', link: '/features/script-generation' },
            { text: '导出与分发', link: '/features/export' },
          ],
        },
      ],
      '/configuration/': [
        {
          text: '配置',
          items: [
            { text: '高级配置', link: '/configuration/configuration' },
            { text: '键盘快捷键', link: '/configuration/keyboard-shortcuts' },
          ],
        },
      ],
      '/reference/': [
        {
          text: '参考资料',
          items: [
            { text: '常见问题', link: '/reference/faq' },
          ],
        },
      ],
    },

    editLink: {
      pattern: 'https://github.com/Agions/story-fab/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/Agions/story-fab' }],

    footer: {
      message: '基于 MIT 协议开源',
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

    lastUpdated: {
      text: '最后更新于',
    },

    returnToTopLabel: '返回顶部',
  },

  markdown: {
    theme: { light: 'github-light', dark: 'github-dark' },
    lineNumbers: false,
    toc: { level: [2, 3] },
  },

  vite: {
    server: { fs: { strict: false } },
  },
})
