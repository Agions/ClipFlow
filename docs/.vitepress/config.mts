import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'StoryForge',
  description: 'AI 驱动的专业智能视频剪辑工具',
  
  lang: 'zh-CN',
  
  cleanUrls: true,
  
  ignoreDeadLinks: true,
  
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#2563eb' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'StoryForge',
    
    nav: [
      { text: '文档', link: '/' },
      { text: '快速开始', link: '/getting-started' },
      { text: '功能介绍', link: '/features' },
      { 
        text: '更多',
        items: [
          { text: '安装配置', link: '/installation' },
          { text: 'AI 模型配置', link: '/ai-config' },
          { text: '常见问题', link: '/faq' },
        ]
      },
      { 
        text: 'GitHub',
        link: 'https://github.com/Agions/StoryForge' 
      }
    ],

    sidebar: {
      '/': [
        {
          text: '入门',
          items: [
            { text: '概述', link: '/' },
            { text: '快速开始', link: '/getting-started' },
            { text: '功能介绍', link: '/features' },
          ]
        },
        {
          text: '指南',
          items: [
            { text: '安装配置', link: '/installation' },
            { text: 'AI 模型配置', link: '/ai-config' },
            { text: '项目结构', link: '/project-structure' },
          ]
        },
        {
          text: '其他',
          items: [
            { text: '常见问题', link: '/faq' },
            { text: '更新日志', link: '/changelog' },
          ]
        }
      ]
    },

    footer: {
      message: '基于 MIT 许可证发布',
      copyright: 'Copyright © 2025-2026 StoryForge'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Agions/StoryForge' }
    ],

    editLink: {
      pattern: 'https://github.com/Agions/StoryForge/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },

    search: {
      provider: 'local'
    }
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true
  },

  sitemap: {
    hostname: 'https://agions.github.io/StoryForge'
  }
})
