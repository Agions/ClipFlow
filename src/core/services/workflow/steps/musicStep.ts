/**
 * 音乐处理步骤
 * 自动配乐工作流步骤
 * 支持用户自主上传音乐
 */
import { logger } from '@/utils/logger';
import { autoMusicService, type MusicTrack } from '../auto-music.service';
import type { MusicRecommendation } from '../auto-music.service';
import type { MusicGenre, MusicMood } from '../../auto-music.service';

export interface MusicStepInput {
  videoDuration: number;
  preferredGenre?: MusicGenre;
  preferredMood?: MusicMood;
  /** 用户上传的音乐文件 */
  userUploadedTracks?: MusicTrack[];
  /** 是否跳过配乐 */
  skipMusic?: boolean;
}

export interface MusicStepOutput {
  tracks: MusicRecommendation[];
  totalDuration: number;
  recommendations: MusicTrack[];
  usedSource: 'preset' | 'upload' | 'ai' | 'none';
  /** 是否需要用户交互 */
  requiresUserAction: boolean;
}

/**
 * 音乐处理步骤
 * 返回是否需要用户上传音乐
 */
export async function musicStep(input: MusicStepInput): Promise<MusicStepOutput> {
  logger.info('[MusicStep] 开始处理配乐', { input });

  // 如果用户选择跳过配乐
  if (input.skipMusic) {
    return {
      tracks: [],
      totalDuration: 0,
      recommendations: [],
      usedSource: 'none',
      requiresUserAction: false,
    };
  }

  try {
    // 优先使用用户上传的音乐
    if (input.userUploadedTracks && input.userUploadedTracks.length > 0) {
      logger.info('[MusicStep] 使用用户上传的音乐', {
        count: input.userUploadedTracks.length,
      });

      const tracks: MusicRecommendation[] = input.userUploadedTracks.map((track, index) => ({
        track: { ...track, id: track.id || `track_${index}` },
        matchScore: 1.0,
        reason: 'user_uploaded',
      }));

      return {
        tracks,
        totalDuration: tracks.reduce((sum, t) => sum + t.track.duration, 0),
        recommendations: tracks.map(t => t.track),
        usedSource: 'upload',
        requiresUserAction: false,
      };
    }

    // 尝试从预设库推荐
    const recommendations = await autoMusicService.recommendMusic({
      duration: input.videoDuration,
      genre: input.preferredGenre,
      mood: input.preferredMood,
    });

    // 如果有推荐结果，直接使用
    if (recommendations.length > 0) {
      const tracks = recommendations.map(r => r.track);
      const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0);
      logger.info('[MusicStep] 配乐推荐完成', {
        trackCount: recommendations.length,
        totalDuration,
      });

      return {
        tracks: recommendations,  // MusicRecommendation[] has track field
        totalDuration,
        recommendations: recommendations.map(r => r.track),
        usedSource: 'preset',
        requiresUserAction: false,
      };
    }

    // 没有可用音乐，需要用户上传
    logger.warn('[MusicStep] 没有可用音乐，需要用户上传');
    return {
      tracks: [],
      totalDuration: 0,
      recommendations: [],
      usedSource: 'none',
      requiresUserAction: true,
    };
  } catch (error) {
    logger.error('[MusicStep] 配乐处理失败', error);
    // 出错时也需要用户介入
    return {
      tracks: [],
      totalDuration: 0,
      recommendations: [],
      usedSource: 'none',
      requiresUserAction: true,
    };
  }
}

/**
 * 获取可用的音乐库（用于UI展示）
 */
export async function getMusicLibrary() {
  const presets = await autoMusicService.getPresetTracks();
  return {
    presets,
    userUploaded: [],
  };
}

/**
 * 上传用户音乐
 */
export async function uploadUserMusic(file: File, metadata: {
  name?: string;
  genre?: MusicGenre;
  mood?: MusicMood[];
  tags?: string[];
}): Promise<MusicTrack> {
  // Placeholder - actual upload not implemented in stub service
  return {
    id: `uploaded_${Date.now()}`,
    name: metadata.name || file.name,
    duration: 0,
    genre: metadata.genre,
    mood: (metadata.mood || []).join(','),
  };
}

export default musicStep;
