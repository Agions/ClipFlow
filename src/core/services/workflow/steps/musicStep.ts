/**
 * 音乐处理步骤
 * 自动配乐工作流步骤
 * 支持用户自主上传音乐
 */
import { logger } from '@/utils/logger';
import { autoMusicService, type MusicTrack, type MusicMatchResult, type MusicGenre, type MusicMood } from '../auto-music.service';

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
  tracks: MusicMatchResult[];
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
  logger.info('[MusicStep] 开始处理配乐', input);

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

      const tracks: MusicMatchResult[] = input.userUploadedTracks.map((track, index) => ({
        track,
        score: 1.0,
        startTime: index * track.duration,
        fadeIn: 2,
        fadeOut: index === input.userUploadedTracks!.length - 1 ? 3 : 0,
        volume: 0.5,
      }));

      return {
        tracks,
        totalDuration: tracks.reduce((sum, t) => sum + t.track.duration, 0),
        recommendations: input.userUploadedTracks,
        usedSource: 'upload',
        requiresUserAction: false,
      };
    }

    // 尝试从预设库推荐
    const result = await autoMusicService.recommendMusic({
      videoDuration: input.videoDuration,
      preferredGenre: input.preferredGenre,
      preferredMood: input.preferredMood,
    });

    // 如果有推荐结果，直接使用
    if (result.recommendations.length > 0) {
      logger.info('[MusicStep] 配乐推荐完成', {
        trackCount: result.recommendations.length,
        totalDuration: result.totalDuration,
      });

      return {
        tracks: result.tracks,
        totalDuration: result.totalDuration,
        recommendations: result.recommendations,
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
export function getMusicLibrary() {
  return {
    presets: autoMusicService.getPresetLibrary(),
    userUploaded: autoMusicService.getUserLibrary(),
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
  return autoMusicService.uploadMusic({
    file,
    name: metadata.name,
    genre: metadata.genre ?? 'electronic',
    mood: metadata.mood ?? ['neutral'],
    tags: metadata.tags,
  });
}

export default musicStep;
