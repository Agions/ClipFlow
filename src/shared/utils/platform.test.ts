/**
 * isTauriEnv — 单元测试
 */
import { describe, it, expect, afterEach } from 'vitest';
import { isTauriEnv } from './platform';

describe('isTauriEnv', () => {
  const originalTauri = (window as unknown as { __TAURI__?: unknown }).__TAURI__;

  afterEach(() => {
    if (originalTauri === undefined) {
      delete (window as unknown as { __TAURI__?: unknown }).__TAURI__;
    } else {
      (window as unknown as { __TAURI__?: unknown }).__TAURI__ = originalTauri;
    }
  });

  it('returns true when __TAURI__ is present on window', () => {
    (window as unknown as { __TAURI__?: unknown }).__TAURI__ = { invoke: () => {} };
    expect(isTauriEnv()).toBe(true);
  });

  it('returns false when window is undefined', () => {
    const originalWindow = globalThis.window;
    (globalThis as unknown as { window: unknown }).window = undefined;
    try {
      expect(isTauriEnv()).toBe(false);
    } finally {
      (globalThis as unknown as { window: unknown }).window = originalWindow;
    }
  });

  it('returns false when __TAURI__ is absent', () => {
    delete (window as unknown as { __TAURI__?: unknown }).__TAURI__;
    expect(isTauriEnv()).toBe(false);
  });
});
