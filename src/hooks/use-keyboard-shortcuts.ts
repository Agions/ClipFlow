/**
 * useKeyboardShortcuts — 全局快捷键 Hook
 *
 * 支持的快捷键：
 *  播放控制：空格（播放/暂停）| K（暂停）| J（后退3秒）| L（前进3秒）
 *  片段操作：I（设定入点）| O（设定出点）| S（保存项目）
 *  时间线：← →（逐帧）| ↑ ↓（缩放）| Home/End（跳转首尾）
 *  删除：Delete / Backspace（删除选中片段）
 *  撤销/重做：⌘Z / ⇧⌘Z
 *  全选：⌘A
 *
 * 使用方式：
 *   const { setPlayPause, setInPoint, setOutPoint } = useKeyboardShortcuts({
 *     onPlayPause: () => {}, onInPoint: () => {}, onOutPoint: () => {},
 *     onSeek: (delta) => {}, onDelete: () => {},
 *     onUndo: () => {}, onRedo: () => {},
 *     enabled: true,  // 默认启用
 *   });
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcutsOptions {
  /** 播放/暂停回调 */
  onPlayPause?: () => void;
  /** 暂停回调 */
  onPause?: () => void;
  /** 前进/后退回调（秒数） */
  onSeek?: (deltaSeconds: number) => void;
  /** 跳转至时间点（秒） */
  onSeekTo?: (timeSeconds: number) => void;
  /** 设定入点 */
  onInPoint?: () => void;
  /** 设定出点 */
  onOutPoint?: () => void;
  /** 删除选中 */
  onDelete?: () => void;
  /** 撤销 */
  onUndo?: () => void;
  /** 重做 */
  onRedo?: () => void;
  /** 全选 */
  onSelectAll?: () => void;
  /** 导出 */
  onExport?: () => void;
  /** 是否启用（可临时禁用，如输入框聚焦时） */
  enabled?: boolean;
  /** 是否拦截浏览器默认快捷键（默认 true） */
  preventDefault?: boolean;
}

interface ShortcutKey {
  key: string;
  code?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
}

const SHORTCUT_MAP: Array<{
  keys: ShortcutKey[];
  action: keyof Required<KeyboardShortcutsOptions>;
  delta?: number;
}> = [
  // 播放控制
  { keys: [{ key: ' ' }], action: 'onPlayPause' },
  { keys: [{ key: 'k' }, { key: 'K' }], action: 'onPause' },
  // 逐帧/跳转
  { keys: [{ key: 'ArrowLeft' }], action: 'onSeek', delta: -1 },
  { keys: [{ key: 'ArrowRight' }], action: 'onSeek', delta: 1 },
  { keys: [{ key: 'j' }, { key: 'J' }], action: 'onSeek', delta: -3 },
  { keys: [{ key: 'l' }, { key: 'L' }], action: 'onSeek', delta: 3 },
  { keys: [{ key: 'Home' }], action: 'onSeekTo', delta: 0 },
  // 入出点
  { keys: [{ key: 'i' }, { key: 'I' }], action: 'onInPoint' },
  { keys: [{ key: 'o' }, { key: 'O' }], action: 'onOutPoint' },
  // 删除
  { keys: [{ key: 'Delete' }], action: 'onDelete' },
  { keys: [{ key: 'Backspace' }], action: 'onDelete' },
  // 缩放（通过上下箭头 + ctrl）
  { keys: [{ key: 'ArrowUp' }], action: 'onSeek', delta: 5 },
  { keys: [{ key: 'ArrowDown' }], action: 'onSeek', delta: -5 },
  // Home 跳转开头（已在上面处理 delta:0）
  { keys: [{ key: 'End' }], action: 'onSeekTo', delta: -1 }, // special, handled in code
];

const MAC_SHORTCUTS: Array<{
  keys: ShortcutKey[];
  action: 'onUndo' | 'onRedo' | 'onSelectAll' | 'onExport';
}> = [
  { keys: [{ key: 'z', meta: true }], action: 'onUndo' },
  { keys: [{ key: 'z', meta: true, shift: true }], action: 'onRedo' },
  { keys: [{ key: 'a', meta: true }], action: 'onSelectAll' },
  { keys: [{ key: 'e', meta: true }], action: 'onExport' },
];

const WIN_SHORTCUTS: Array<{
  keys: ShortcutKey[];
  action: 'onUndo' | 'onRedo' | 'onSelectAll' | 'onExport';
}> = [
  { keys: [{ key: 'z', ctrl: true }], action: 'onUndo' },
  { keys: [{ key: 'z', ctrl: true, shift: true }], action: 'onRedo' },
  { keys: [{ key: 'a', ctrl: true }], action: 'onSelectAll' },
  { keys: [{ key: 'e', ctrl: true }], action: 'onExport' },
];

/** 检测是否为 Mac */
function isMac(): boolean {
  return /macintosh|mac os/i.test(navigator.platform);
}

/** 匹配单个按键 */
function matchKey(e: KeyboardEvent, shortcut: ShortcutKey): boolean {
  if (shortcut.code && e.code !== shortcut.code) return false;
  if (shortcut.key && e.key !== shortcut.key) return false;
  if (shortcut.ctrl && !e.ctrlKey) return false;
  if (shortcut.meta && !e.metaKey) return false;
  if (shortcut.shift && !e.shiftKey) return false;
  if (shortcut.alt && !e.altKey) return false;
  return true;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  const {
    onPlayPause,
    onPause,
    onSeek,
    onSeekTo,
    onInPoint,
    onOutPoint,
    onDelete,
    onUndo,
    onRedo,
    onSelectAll,
    onExport,
    enabled = true,
    preventDefault = true,
  } = options;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // 用于判断 End 键
  const durationRef = useRef<number>(0);
  const setDuration = useCallback((d: number) => { durationRef.current = d; }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabledRef.current) return;

      // 忽略在输入框/文本框中触发的快捷键
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // 仍然允许 Escape（用于退出输入框）
        if (e.key !== 'Escape') return;
      }

      const isMacPlatform = isMac();
      const platformShortcuts = isMacPlatform ? MAC_SHORTCUTS : WIN_SHORTCUTS;

      // ── 平台快捷键 ⌘/Ctrl ───────────────────────────────
      for (const shortcut of platformShortcuts) {
        if (shortcut.keys.some(s => matchKey(e, s))) {
          if (preventDefault) e.preventDefault();
          const action = shortcut.action;
          if (action === 'onUndo') onUndo?.();
          else if (action === 'onRedo') onRedo?.();
          else if (action === 'onSelectAll') onSelectAll?.();
          else if (action === 'onExport') onExport?.();
          return;
        }
      }

      // ── 普通快捷键 ─────────────────────────────────────
      for (const shortcut of SHORTCUT_MAP) {
        const match = shortcut.keys.some(s => matchKey(e, s));
        if (!match) continue;

        if (preventDefault) e.preventDefault();

        // End 键跳到结尾
        if (e.key === 'End' && onSeekTo) {
          onSeekTo(durationRef.current);
          return;
        }

        if (shortcut.action === 'onPlayPause') {
          onPlayPause?.();
        } else if (shortcut.action === 'onPause') {
          onPause?.();
        } else if (shortcut.action === 'onInPoint') {
          onInPoint?.();
        } else if (shortcut.action === 'onOutPoint') {
          onOutPoint?.();
        } else if (shortcut.action === 'onDelete') {
          onDelete?.();
        } else if (shortcut.action === 'onSeek' && shortcut.delta !== undefined) {
          onSeek?.(shortcut.delta);
        } else if (shortcut.action === 'onSeekTo' && shortcut.delta !== undefined && onSeekTo) {
          if (shortcut.delta === 0) onSeekTo(0);
        }
        return;
      }
    },
    [onPlayPause, onPause, onSeek, onSeekTo, onInPoint, onOutPoint, onDelete, onUndo, onRedo, onSelectAll, onExport, preventDefault]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 快捷键参考表（用于帮助 UI）
  return { setDuration };
}

// ─────────────────────────────────────────────────────────────────────────────
// 快捷键帮助文档组件
// ─────────────────────────────────────────────────────────────────────────────

export const KEYBOARD_SHORTCUTS_HELP = [
  { category: '播放控制', items: [
    { key: '空格', desc: '播放 / 暂停' },
    { key: 'K', desc: '暂停' },
    { key: 'J', desc: '后退 3 秒' },
    { key: 'L', desc: '前进 3 秒' },
    { key: '←', desc: '后退 1 秒' },
    { key: '→', desc: '前进 1 秒' },
  ]},
  { category: '片段编辑', items: [
    { key: 'I', desc: '设定入点' },
    { key: 'O', desc: '设定出点' },
    { key: 'Delete', desc: '删除选中片段' },
    { key: '⌘A', desc: '全选' },
  ]},
  { category: '时间线', items: [
    { key: '↑', desc: '放大时间线' },
    { key: '↓', desc: '缩小时间线' },
    { key: 'Home', desc: '跳转到开头' },
    { key: 'End', desc: '跳转到结尾' },
  ]},
  { category: '项目', items: [
    { key: '⌘Z', desc: '撤销' },
    { key: '⇧⌘Z', desc: '重做' },
    { key: '⌘E', desc: '导出' },
    { key: '⌘S', desc: '保存' },
  ]},
];
