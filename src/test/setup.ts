import '@testing-library/jest-dom';

// ─── jsdom PointerEvent polyfill ─────────────────────────────────────────────
// jsdom does not implement PointerEvent; base-ui Checkbox relies on it.
// Adding the constructor to globalThis enables testing-library/user-event clicks.
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    pointerId: number;
    width: number;
    height: number;
    pressure: number;
    tangentialPressure: number;
    tiltX: number;
    tiltY: number;
    twist: number;
    pointerType: string;
    isPrimary: boolean;
    constructor(type: string, init?: PointerEventInit) {
      super(type, init);
      this.pointerId   = init?.pointerId   ?? 0;
      this.width      = init?.width      ?? 1;
      this.height     = init?.height     ?? 1;
      this.pressure   = init?.pressure   ?? 0;
      this.tangentialPressure = init?.tangentialPressure ?? 0;
      this.tiltX      = init?.tiltX      ?? 0;
      this.tiltY      = init?.tiltY      ?? 0;
      this.twist      = init?.twist      ?? 0;
      this.pointerType = init?.pointerType ?? 'mouse';
      this.isPrimary  = init?.isPrimary  ?? true;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).PointerEvent = PointerEvent;
}
