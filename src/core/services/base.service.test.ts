/**
 * base.service 测试
 */

import { describe, it, expect } from 'vitest';
import { ServiceError } from './base.service';

describe('ServiceError', () => {
  describe('constructor', () => {
    it('should create error with message only', () => {
      const error = new ServiceError('Something went wrong');
      expect(error.message).toBe('Something went wrong');
      expect(error.name).toBe('ServiceError');
      expect(error instanceof Error).toBe(true);
    });

    it('should create error with code', () => {
      const error = new ServiceError('Not found', 'NOT_FOUND');
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create error with status code', () => {
      const error = new ServiceError('Bad request', 'BAD_REQUEST', 400);
      expect(error.statusCode).toBe(400);
    });

    it('should capture original error', () => {
      const original = new Error('Original error');
      const error = new ServiceError('Wrapped error', 'WRAPPED', 500, original);
      expect(error.originalError).toBe(original);
    });

    it('should mark as retryable', () => {
      const error = new ServiceError('Network error', 'NETWORK', 503, undefined, true);
      expect(error.retryable).toBe(true);
    });

    it('should not be retryable by default', () => {
      const error = new ServiceError('Error');
      expect(error.retryable).toBeUndefined();
    });
  });

  describe('stack trace', () => {
    it('should have a stack trace', () => {
      const error = new ServiceError('Test error');
      expect(error.stack).toBeDefined();
    });
  });
});
