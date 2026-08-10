/**
 * use-keyboard-shortcuts 测试
 *
 * Stage 9 PR-11：全局快捷键 hook 覆盖
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS_HELP } from './use-keyboard-shortcuts';

// Capture platform at module load
const originalPlatform = navigator.platform;

function setPlatform(value: string) {
  Object.defineProperty(navigator, 'platform', {
    value,
    configurable: true,
  });
}

function fireKey(opts: {
  key: string;
  code?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  target?: Partial<HTMLElement>;
}) {
  // jsdom sometimes ignores KeyboardEvent modifier flags passed to the
  // constructor; assert them directly on the instance for reliability.
  const event = new KeyboardEvent('keydown', {
    key: opts.key,
    code: opts.code ?? opts.key,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'ctrlKey', { value: !!opts.ctrl, configurable: true });
  Object.defineProperty(event, 'metaKey', { value: !!opts.meta, configurable: true });
  Object.defineProperty(event, 'shiftKey', { value: !!opts.shift, configurable: true });
  Object.defineProperty(event, 'altKey', { value: !!opts.alt, configurable: true });
  if (opts.target) {
    Object.defineProperty(event, 'target', { value: opts.target });
  }
  window.dispatchEvent(event);
  return event;
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    // The hook's isMac() check uses /macintosh|mac os/i against
    // navigator.platform — "Macintosh" is what matches the regex.
    setPlatform('Macintosh');
  });

  afterEach(() => {
    setPlatform(originalPlatform);
  });

  it('exposes a setDuration updater', () => {
    const { result } = renderHook(() => useKeyboardShortcuts({}));
    expect(typeof result.current.setDuration).toBe('function');
    act(() => result.current.setDuration(120));
    // No assertion on private ref — just that call doesn't throw
  });

  // ─── 播放控制 ────────────────────────────────────────
  describe('playback controls', () => {
    it('triggers onPlayPause on Space', () => {
      const onPlayPause = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onPlayPause }));
      fireKey({ key: ' ' });
      expect(onPlayPause).toHaveBeenCalledTimes(1);
    });

    it('triggers onPause on K (uppercase)', () => {
      const onPause = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onPause }));
      fireKey({ key: 'K' });
      expect(onPause).toHaveBeenCalledTimes(1);
    });

    it('triggers onPause on k (lowercase)', () => {
      const onPause = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onPause }));
      fireKey({ key: 'k' });
      expect(onPause).toHaveBeenCalledTimes(1);
    });

    it('triggers onSeek(-1) on ArrowLeft', () => {
      const onSeek = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onSeek }));
      fireKey({ key: 'ArrowLeft' });
      expect(onSeek).toHaveBeenCalledWith(-1);
    });

    it('triggers onSeek(1) on ArrowRight', () => {
      const onSeek = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onSeek }));
      fireKey({ key: 'ArrowRight' });
      expect(onSeek).toHaveBeenCalledWith(1);
    });

    it('triggers onSeek(-3) on J', () => {
      const onSeek = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onSeek }));
      fireKey({ key: 'j' });
      expect(onSeek).toHaveBeenCalledWith(-3);
    });

    it('triggers onSeek(3) on L', () => {
      const onSeek = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onSeek }));
      fireKey({ key: 'L' });
      expect(onSeek).toHaveBeenCalledWith(3);
    });

    it('triggers onSeek(5) on ArrowUp', () => {
      const onSeek = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onSeek }));
      fireKey({ key: 'ArrowUp' });
      expect(onSeek).toHaveBeenCalledWith(5);
    });

    it('triggers onSeek(-5) on ArrowDown', () => {
      const onSeek = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onSeek }));
      fireKey({ key: 'ArrowDown' });
      expect(onSeek).toHaveBeenCalledWith(-5);
    });
  });

  // ─── 入出点 / 删除 ─────────────────────────────────
  describe('in/out point & delete', () => {
    it('triggers onInPoint on I', () => {
      const onInPoint = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onInPoint }));
      fireKey({ key: 'I' });
      expect(onInPoint).toHaveBeenCalledTimes(1);
    });

    it('triggers onOutPoint on O', () => {
      const onOutPoint = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onOutPoint }));
      fireKey({ key: 'O' });
      expect(onOutPoint).toHaveBeenCalledTimes(1);
    });

    it('triggers onDelete on Delete', () => {
      const onDelete = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onDelete }));
      fireKey({ key: 'Delete' });
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('triggers onDelete on Backspace', () => {
      const onDelete = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onDelete }));
      fireKey({ key: 'Backspace' });
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  // ─── 时间跳转 ─────────────────────────────────────
  describe('seek-to', () => {
    it('triggers onSeekTo(0) on Home', () => {
      const onSeekTo = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onSeekTo }));
      fireKey({ key: 'Home' });
      expect(onSeekTo).toHaveBeenCalledWith(0);
    });

    it('triggers onSeekTo(duration) on End', () => {
      const onSeekTo = vi.fn();
      const { result } = renderHook(() => useKeyboardShortcuts({ onSeekTo }));
      act(() => result.current.setDuration(180));
      fireKey({ key: 'End' });
      expect(onSeekTo).toHaveBeenCalledWith(180);
    });

    it('does nothing on End when onSeekTo is not provided', () => {
      renderHook(() => useKeyboardShortcuts({}));
      // Just ensure no throw
      fireKey({ key: 'End' });
    });
  });

  // ─── Mac 平台快捷键 ⌘ ─────────────────────────────
  describe('macOS shortcuts (Meta)', () => {
    beforeEach(() => setPlatform('Macintosh'));

    it('⌘Z triggers onUndo', () => {
      const onUndo = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onUndo }));
      fireKey({ key: 'z', meta: true });
      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('⇧⌘Z triggers onRedo', () => {
      const onRedo = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onRedo }));
      fireKey({ key: 'z', meta: true, shift: true });
      expect(onRedo).toHaveBeenCalledTimes(1);
    });

    it('⌘A triggers onSelectAll', () => {
      const onSelectAll = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onSelectAll }));
      fireKey({ key: 'a', meta: true });
      expect(onSelectAll).toHaveBeenCalledTimes(1);
    });

    it('⌘E triggers onExport', () => {
      const onExport = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onExport }));
      fireKey({ key: 'e', meta: true });
      expect(onExport).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Windows 平台快捷键 Ctrl ───────────────────────
  describe('Windows shortcuts (Ctrl)', () => {
    beforeEach(() => setPlatform('Win32'));

    it('Ctrl+Z triggers onUndo', () => {
      const onUndo = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onUndo }));
      fireKey({ key: 'z', ctrl: true });
      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('Ctrl+Shift+Z triggers onRedo', () => {
      const onRedo = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onRedo }));
      fireKey({ key: 'z', ctrl: true, shift: true });
      expect(onRedo).toHaveBeenCalledTimes(1);
    });
  });

  // ─── 启用 / 禁用 ───────────────────────────────────
  describe('enable / disable', () => {
    it('does not trigger when enabled=false', () => {
      const onPlayPause = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onPlayPause, enabled: false }));
      fireKey({ key: ' ' });
      expect(onPlayPause).not.toHaveBeenCalled();
    });

    it('picks up enabled changes via the ref', () => {
      const onPlayPause = vi.fn();
      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) => useKeyboardShortcuts({ onPlayPause, enabled }),
        { initialProps: { enabled: false } }
      );
      fireKey({ key: ' ' });
      expect(onPlayPause).not.toHaveBeenCalled();
      rerender({ enabled: true });
      fireKey({ key: ' ' });
      expect(onPlayPause).toHaveBeenCalledTimes(1);
    });
  });

  // ─── 输入框忽略 ───────────────────────────────────
  describe('input element focus', () => {
    it('ignores keys when target is INPUT', () => {
      const onPlayPause = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onPlayPause }));
      fireKey({ key: ' ', target: { tagName: 'INPUT' } });
      expect(onPlayPause).not.toHaveBeenCalled();
    });

    it('ignores keys when target is TEXTAREA', () => {
      const onInPoint = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onInPoint }));
      fireKey({ key: 'I', target: { tagName: 'TEXTAREA' } });
      expect(onInPoint).not.toHaveBeenCalled();
    });

    it('ignores keys when target is contentEditable', () => {
      const onDelete = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onDelete }));
      fireKey({
        key: 'Delete',
        target: { tagName: 'DIV', isContentEditable: true },
      });
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('still allows Escape in INPUT (special case)', () => {
      const onPlayPause = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onPlayPause }));
      // Escape is not a known shortcut, so it should fall through silently
      fireKey({ key: 'Escape', target: { tagName: 'INPUT' } });
      // No callback should fire (Escape is not bound)
      expect(onPlayPause).not.toHaveBeenCalled();
    });
  });

  // ─── preventDefault ───────────────────────────────
  describe('preventDefault', () => {
    it('calls preventDefault by default', () => {
      renderHook(() => useKeyboardShortcuts({ onPlayPause: vi.fn() }));
      const ev = fireKey({ key: ' ' });
      expect(ev.defaultPrevented).toBe(true);
    });

    it('does not call preventDefault when preventDefault=false', () => {
      renderHook(() => useKeyboardShortcuts({ onPlayPause: vi.fn(), preventDefault: false }));
      const ev = fireKey({ key: ' ' });
      expect(ev.defaultPrevented).toBe(false);
    });
  });

  // ─── 缺失回调 ─────────────────────────────────────
  describe('missing callbacks', () => {
    it('does not throw when callbacks are undefined', () => {
      renderHook(() => useKeyboardShortcuts({}));
      expect(() => {
        fireKey({ key: ' ' });
        fireKey({ key: 'k' });
        fireKey({ key: 'j' });
        fireKey({ key: 'I' });
        fireKey({ key: 'O' });
        fireKey({ key: 'Delete' });
        fireKey({ key: 'Home' });
        fireKey({ key: 'End' });
      }).not.toThrow();
    });
  });

  // ─── 清理 ─────────────────────────────────────────
  it('removes keydown listener on unmount', () => {
    const onPlayPause = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onPlayPause }));
    unmount();
    fireKey({ key: ' ' });
    expect(onPlayPause).not.toHaveBeenCalled();
  });

  // ─── 修饰键严格匹配（matchKey L119/L120/L122 truthy arms）───
  describe('modifier strict matching', () => {
    it('does not trigger Space when Ctrl is held but not required (L119)', () => {
      const onPlayPause = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onPlayPause }));
      // Space has shortcut.ctrl=undefined; sending ctrl+Space must NOT trigger
      fireKey({ key: ' ', ctrl: true });
      expect(onPlayPause).not.toHaveBeenCalled();
    });

    it('does not trigger Space when Meta is held but not required (L120)', () => {
      const onPlayPause = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onPlayPause }));
      // Space has shortcut.meta=undefined; sending meta+Space must NOT trigger
      fireKey({ key: ' ', meta: true });
      expect(onPlayPause).not.toHaveBeenCalled();
    });

    it('does not trigger Space when Alt is held but not required (L122)', () => {
      const onPlayPause = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onPlayPause }));
      // Space has shortcut.alt=undefined; sending alt+Space must NOT trigger
      fireKey({ key: ' ', alt: true });
      expect(onPlayPause).not.toHaveBeenCalled();
    });

    it('does not trigger Space when Shift is held but not required (sanity for L121)', () => {
      const onPlayPause = vi.fn();
      renderHook(() => useKeyboardShortcuts({ onPlayPause }));
      // Space has shortcut.shift=undefined; sending shift+Space must NOT trigger
      fireKey({ key: ' ', shift: true });
      expect(onPlayPause).not.toHaveBeenCalled();
    });
  });

  // ─── 帮助文档导出 ──────────────────────────────────
  it('exports KEYBOARD_SHORTCUTS_HELP with categories', () => {
    expect(Array.isArray(KEYBOARD_SHORTCUTS_HELP)).toBe(true);
    expect(KEYBOARD_SHORTCUTS_HELP.length).toBeGreaterThan(0);
    for (const group of KEYBOARD_SHORTCUTS_HELP) {
      expect(group).toHaveProperty('category');
      expect(group).toHaveProperty('items');
      expect(Array.isArray(group.items)).toBe(true);
    }
  });
});
