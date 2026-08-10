/**
 * object-detection-service — 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { objectDetectionService } from './object-detection-service';
import type { Scene, ObjectDetection } from '@/types';

describe('objectDetectionService', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // 全部走最小值分支
  });

  describe('detectObjectsInScenes', () => {
    it('returns at least one object per scene (deterministic count with random=0)', async () => {
      const scenes: Scene[] = [
        { id: 's1', startTime: 0, endTime: 10, type: 'action', score: 0.9 },
        { id: 's2', startTime: 10, endTime: 20, type: 'dialog', score: 0.8 },
      ];
      const objects = await objectDetectionService.detectObjectsInScenes(scenes, {} as never);
      // random=0 → numObjects = floor(0*3)+1 = 1，每个场景至少 1 个
      expect(objects.length).toBe(2);
      expect(objects[0].sceneId).toBe('s1');
      expect(objects[1].sceneId).toBe('s2');
    });

    it('object shape: id/sceneId/label/confidence/bbox/category', async () => {
      const scenes: Scene[] = [{ id: 's1', startTime: 0, endTime: 10, type: 'dialog', score: 0.9 }];
      const objects = await objectDetectionService.detectObjectsInScenes(scenes, {} as never);
      const obj = objects[0];
      expect(obj.id).toMatch(/^obj_s1_0$/);
      expect(typeof obj.category).toBe('string');
      expect(obj.label).toMatch(/^.+ 1$/);
      expect(obj.confidence).toBeGreaterThanOrEqual(0.7);
      expect(obj.bbox).toHaveLength(4);
    });

    it('returns empty array for empty scenes', async () => {
      const objects = await objectDetectionService.detectObjectsInScenes([], {} as never);
      expect(objects).toEqual([]);
    });

    it('id is unique per (sceneId, index) pair', async () => {
      const scenes: Scene[] = [
        { id: 'a', startTime: 0, endTime: 5, type: 'dialog', score: 0.9 },
        { id: 'b', startTime: 5, endTime: 10, type: 'dialog', score: 0.9 },
      ];
      const objects = await objectDetectionService.detectObjectsInScenes(scenes, {} as never);
      const ids = new Set(objects.map(o => o.id));
      expect(ids.size).toBe(objects.length);
    });
  });

  describe('groupObjectsByScene', () => {
    it('groups by sceneId', () => {
      const objects: ObjectDetection[] = [
        {
          id: '1',
          sceneId: 's1',
          category: 'cat',
          label: '',
          confidence: 0.9,
          bbox: [0, 0, 0.1, 0.1],
        },
        {
          id: '2',
          sceneId: 's1',
          category: 'dog',
          label: '',
          confidence: 0.9,
          bbox: [0, 0, 0.1, 0.1],
        },
        {
          id: '3',
          sceneId: 's2',
          category: 'cat',
          label: '',
          confidence: 0.9,
          bbox: [0, 0, 0.1, 0.1],
        },
      ];
      const map = objectDetectionService.groupObjectsByScene(objects);
      expect(map.get('s1')).toHaveLength(2);
      expect(map.get('s2')).toHaveLength(1);
    });

    it('skips objects with nullish sceneId', () => {
      const objects: ObjectDetection[] = [
        {
          id: '1',
          sceneId: null,
          category: 'cat',
          label: '',
          confidence: 0.9,
          bbox: [0, 0, 0.1, 0.1],
        } as unknown as ObjectDetection,
      ];
      const map = objectDetectionService.groupObjectsByScene(objects);
      expect(map.size).toBe(0);
    });

    it('returns empty map for empty input', () => {
      const map = objectDetectionService.groupObjectsByScene([]);
      expect(map.size).toBe(0);
    });
  });

  describe('getObjectCategoryStats', () => {
    it('counts occurrences of each category', () => {
      const objects: ObjectDetection[] = [
        {
          id: '1',
          sceneId: 's1',
          category: 'cat',
          label: '',
          confidence: 0.9,
          bbox: [0, 0, 0.1, 0.1],
        },
        {
          id: '2',
          sceneId: 's1',
          category: 'cat',
          label: '',
          confidence: 0.9,
          bbox: [0, 0, 0.1, 0.1],
        },
        {
          id: '3',
          sceneId: 's1',
          category: 'dog',
          label: '',
          confidence: 0.9,
          bbox: [0, 0, 0.1, 0.1],
        },
      ];
      const stats = objectDetectionService.getObjectCategoryStats(objects);
      expect(stats).toEqual({ cat: 2, dog: 1 });
    });

    it('uses "unknown" as fallback for missing/empty category', () => {
      const objects: ObjectDetection[] = [
        {
          id: '1',
          sceneId: 's1',
          category: '' as never,
          label: '',
          confidence: 0.9,
          bbox: [0, 0, 0.1, 0.1],
        },
      ];
      const stats = objectDetectionService.getObjectCategoryStats(objects);
      expect(stats).toEqual({ unknown: 1 });
    });

    it('takes first array element when category is an array', () => {
      const objects: ObjectDetection[] = [
        {
          id: '1',
          sceneId: 's1',
          category: ['cat', 'tabby'] as never,
          label: '',
          confidence: 0.9,
          bbox: [0, 0, 0.1, 0.1],
        },
        {
          id: '2',
          sceneId: 's1',
          category: ['dog', 'poodle'] as never,
          label: '',
          confidence: 0.9,
          bbox: [0, 0, 0.1, 0.1],
        },
      ];
      const stats = objectDetectionService.getObjectCategoryStats(objects);
      expect(stats).toEqual({ cat: 1, dog: 1 });
    });
  });
});
