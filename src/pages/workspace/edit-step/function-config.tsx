/**
 * 功能配置常量 — AI 三大核心功能（视频解说 / 第一人称 / 混剪）的元数据
 *
 * 集中管理，避免每次渲染重建。
 */
import type { AIFunctionType } from '../shared/function-mode-map';
import type { FunctionMode } from '../components/function-mode-selector';
import { PenTool, User, Grid3x3 } from 'lucide-react';

export const FUNCTION_CONFIG: Record<AIFunctionType, FunctionMode> = {
  'video-narration': {
    title: 'AI 视频解说',
    icon: <PenTool size={20} />,
    description: '对视频内容进行专业解说，适合教程、评测、科普',
    color: 'var(--accent-secondary)',
    features: ['智能总结要点', '专业术语解释', '逻辑连贯', '多种语气可选'],
    example: '欢迎观看本期内容！今天我们来聊聊这个话题...',
  },
  'first-person': {
    title: 'AI 第一人称',
    icon: <User size={20} />,
    description: '以第一人称视角讲述，像主播一样与观众互动',
    color: 'var(--accent-success)',
    features: ['真实互动感', '情感充沛', '口语化表达', '粉丝粘性高'],
    example: '嘿，朋友们！我是XXX，今天带大家一起体验...',
  },
  remix: {
    title: 'AI 混剪',
    icon: <Grid3x3 size={20} />,
    description: '自动识别精彩片段，生成节奏感强的混剪视频',
    color: 'var(--accent-amber)',
    features: ['智能片段选取', '节奏感强', '高潮迭起', '自动配音'],
    example: '【开场】就在刚才，发生了这一幕...',
  },
};
