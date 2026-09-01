/**
 * create-reducer 测试
 *
 * Stage 9 PR-8：通用 reducer 工厂核心覆盖
 */
import { describe, it, expect } from 'vitest';
import { createReducer } from './create-reducer';

interface State {
  count: number;
  name: string;
}

const handlers = {
  INC: (s: State) => ({ ...s, count: s.count + 1 }),
  DEC: (s: State) => ({ ...s, count: s.count - 1 }),
  SET_NAME: (s: State, name: string) => ({ ...s, name }),
  RESET: (s: State) => ({ ...s, count: 0 }),
};

const [reducer, initialState, actionTypes] = createReducer<State, typeof handlers>(
  'TEST',
  handlers,
  { count: 0, name: 'init' },
);

describe('createReducer', () => {
  describe('returns', () => {
    it('returns a 3-tuple [reducer, initialState, actionTypes]', () => {
      expect(typeof reducer).toBe('function');
      expect(initialState).toEqual({ count: 0, name: 'init' });
      expect(actionTypes).toBeDefined();
    });

    it('actionTypes maps each handler key to itself', () => {
      expect(actionTypes.INC).toBe('INC');
      expect(actionTypes.DEC).toBe('DEC');
      expect(actionTypes.SET_NAME).toBe('SET_NAME');
      expect(actionTypes.RESET).toBe('RESET');
    });
  });

  describe('reducer behavior', () => {
    it('returns initial state for unknown action', () => {
      const result = reducer({ count: 5, name: 'x' }, { type: 'UNKNOWN' as unknown as keyof typeof handlers, payload: undefined });
      expect(result).toEqual({ count: 5, name: 'x' });
    });

    it('handles INC action', () => {
      const result = reducer({ count: 5, name: 'x' }, { type: 'INC', payload: undefined });
      expect(result).toEqual({ count: 6, name: 'x' });
    });

    it('handles DEC action', () => {
      const result = reducer({ count: 5, name: 'x' }, { type: 'DEC', payload: undefined });
      expect(result).toEqual({ count: 4, name: 'x' });
    });

    it('passes payload to handler (SET_NAME)', () => {
      const result = reducer({ count: 5, name: 'x' }, { type: 'SET_NAME', payload: 'new' });
      expect(result.name).toBe('new');
    });

    it('RESET sets count to 0', () => {
      const result = reducer({ count: 99, name: 'x' }, { type: 'RESET', payload: undefined });
      expect(result.count).toBe(0);
    });

    it('preserves state immutability (returns new object)', () => {
      const original = { count: 1, name: 'x' };
      const result = reducer(original, { type: 'INC', payload: undefined });
      expect(result).not.toBe(original);
      expect(original.count).toBe(1); // unchanged
    });
  });

  describe('handler receives full action payload', () => {
    it('payload can be object (e.g., { delta: 5 })', () => {
      const objHandlers = {
        ADD: (s: State, payload: { delta: number }) => ({ ...s, count: s.count + payload.delta }),
      };
      const [objReducer] = createReducer('TEST', objHandlers, { count: 0, name: '' });
      const result = objReducer({ count: 10, name: 'x' }, { type: 'ADD', payload: { delta: 5 } });
      expect(result.count).toBe(15);
    });

    it('payload can be primitive (e.g., string for SET_NAME)', () => {
      const result = reducer({ count: 0, name: 'old' }, { type: 'SET_NAME', payload: 'new' });
      expect(result.name).toBe('new');
    });
  });

  describe('empty handlers edge case', () => {
    it('reducer with no handlers always returns current state', () => {
      type EmptyActionMap = Record<string, (state: State, payload: unknown) => State>;
      const [emptyReducer] = createReducer<State, EmptyActionMap>('EMPTY', {}, { count: 5, name: 'x' });
      const result = emptyReducer({ count: 5, name: 'x' }, { type: 'ANY', payload: undefined });
      expect(result).toEqual({ count: 5, name: 'x' });
    });
  });
});
