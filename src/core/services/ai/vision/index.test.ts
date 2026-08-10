import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmotionAnalysis, ObjectDetection, Scene, VideoInfo } from '@/types';

vi.mock('./scene-detection-service', () => ({
  sceneDetectionService: {
    segmentScenes: vi.fn(),
    classifyScenes: vi.fn(),
  },
}));

vi.mock('./object-detection-service', () => ({
  objectDetectionService: {
    detectObjectsInScenes: vi.fn(),
    groupObjectsByScene: vi.fn(),
  },
}));

vi.mock('./emotion-analysis-service', () => ({
  emotionAnalysisService: {
    analyzeEmotions: vi.fn(),
  },
}));

vi.mock('./analysis-report-service', () => ({
  analysisReportService: {
    generateSceneDescription: vi.fn(),
    generateReport: vi.fn(),
  },
}));

import { VisionService } from './index';
import { sceneDetectionService } from './scene-detection-service';
import { objectDetectionService } from './object-detection-service';
import { emotionAnalysisService } from './emotion-analysis-service';
import { analysisReportService } from './analysis-report-service';

const segmentScenes = vi.mocked(sceneDetectionService.segmentScenes);
const classifyScenes = vi.mocked(sceneDetectionService.classifyScenes);
const detectObjects = vi.mocked(objectDetectionService.detectObjectsInScenes);
const groupObjects = vi.mocked(objectDetectionService.groupObjectsByScene);
const analyzeEmotions = vi.mocked(emotionAnalysisService.analyzeEmotions);
const generateDescription = vi.mocked(analysisReportService.generateSceneDescription);
const generateReport = vi.mocked(analysisReportService.generateReport);

function makeVideo(overrides: Partial<VideoInfo> = {}): VideoInfo {
  return { id: 'video-1', path: '/video.mp4', duration: 100, ...overrides } as VideoInfo;
}

function makeScene(id: string, startTime: number, overrides: Partial<Scene> = {}): Scene {
  return {
    id,
    startTime,
    endTime: startTime + 5,
    type: 'action',
    score: 0,
    thumbnail: '',
    description: '',
    tags: [],
    confidence: 0,
    ...overrides,
  } as Scene;
}

describe('VisionService', () => {
  const service = new VisionService();
  const scenes = [makeScene('s1', 0), makeScene('s2', 20), makeScene('s3', 40)];
  const objects = [{ sceneId: 's1' }] as ObjectDetection[];
  const emotions = [{ sceneId: 's1', dominant: 'happy' }] as EmotionAnalysis[];

  beforeEach(() => {
    vi.clearAllMocks();
    segmentScenes.mockResolvedValue(scenes);
    classifyScenes.mockResolvedValue(scenes);
    detectObjects.mockResolvedValue(objects);
    analyzeEmotions.mockResolvedValue(emotions);
    groupObjects.mockReturnValue(new Map([['s1', objects]]));
    generateDescription.mockImplementation(scene => (scene.id ? `描述:${scene.id}` : ''));
  });

  it('analyzeVideo delegates to the advanced detection flow', async () => {
    const result = await service.analyzeVideo(makeVideo(), { minSceneDuration: 6 });

    expect(segmentScenes).toHaveBeenCalledWith(expect.anything(), 6);
    expect(result.scenes).toHaveLength(3);
  });

  it('runs scene, object and emotion analysis with default options', async () => {
    const result = await service.detectScenesAdvanced(makeVideo());

    expect(segmentScenes).toHaveBeenCalledWith(expect.anything(), 3);
    expect(classifyScenes).toHaveBeenCalledWith(scenes, expect.anything());
    expect(detectObjects).toHaveBeenCalledWith(scenes, expect.anything());
    expect(analyzeEmotions).toHaveBeenCalledWith(scenes);
    expect(result.objects).toBe(objects);
    expect(result.emotions).toBe(emotions);
  });

  it('skips optional object and emotion analysis', async () => {
    const result = await service.detectScenesAdvanced(makeVideo(), {
      detectObjects: false,
      detectEmotions: false,
    });

    expect(detectObjects).not.toHaveBeenCalled();
    expect(analyzeEmotions).not.toHaveBeenCalled();
    expect(result.objects).toEqual([]);
    expect(result.emotions).toEqual([]);
  });

  it('enriches scenes using matching object and emotion data', async () => {
    const result = await service.detectScenesAdvanced(makeVideo());

    expect(result.scenes[0]).toMatchObject({
      id: 's1',
      description: '描述:s1',
      objectCount: 1,
      dominantEmotion: 'happy',
    });
    expect(result.scenes[1]).toMatchObject({ objectCount: 0 });
    expect(generateDescription).toHaveBeenCalledWith(scenes[1], [], undefined);
  });

  it('extracts evenly sampled keyframes and applies fallbacks', async () => {
    const manyScenes = Array.from({ length: 10 }, (_, i) =>
      makeScene(i === 0 ? '' : `s${i}`, i * 10, {
        thumbnail: i === 0 ? undefined : `thumb-${i}`,
        description: i === 0 ? undefined : `desc-${i}`,
      })
    );
    segmentScenes.mockResolvedValue(manyScenes);
    classifyScenes.mockResolvedValue(manyScenes);
    groupObjects.mockReturnValue(new Map());

    const result = await service.extractKeyframes(makeVideo(), { maxFrames: 3 });

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: 'kf_0', timestamp: 0, thumbnail: '', description: '' });
    expect(result[1].timestamp).toBe(40);
    expect(segmentScenes).toHaveBeenCalledWith(expect.anything(), 1);
  });

  it('falls back to time sampling when keyframe detection fails', async () => {
    segmentScenes.mockRejectedValue(new Error('detect failed'));

    const result = await service.extractKeyframes(makeVideo({ duration: 8 }), { maxFrames: 4 });

    expect(result).toEqual([
      { id: 'kf_0', timestamp: 0, thumbnail: '', description: '' },
      { id: 'kf_1', timestamp: 2, thumbnail: '', description: '' },
      { id: 'kf_2', timestamp: 4, thumbnail: '', description: '' },
      { id: 'kf_3', timestamp: 6, thumbnail: '', description: '' },
    ]);
  });

  it('uses a one-second fallback interval for short videos', async () => {
    segmentScenes.mockRejectedValue(new Error('detect failed'));

    const result = await service.extractKeyframes(makeVideo({ duration: 2 }), { maxFrames: 4 });

    expect(result.map(frame => frame.timestamp)).toEqual([0, 1, 2, 3]);
  });

  it('delegates report generation to analysisReportService', async () => {
    const report = { videoId: 'video-1' } as never;
    generateReport.mockResolvedValue(report);

    await expect(
      service.generateAnalysisReport(makeVideo(), scenes, objects, emotions)
    ).resolves.toBe(report);
    expect(generateReport).toHaveBeenCalledWith(expect.anything(), scenes, objects, emotions);
  });
});
