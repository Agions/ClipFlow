import { videoService } from '../../video.service';
import { storageService } from '../../storage.service';
import type { VideoInfo } from '@/core/types';

export interface UploadStepResult {
  videoInfo: VideoInfo;
  projectId: string;
}

export async function executeUploadStep(
  projectId: string,
  videoFile: File,
  updateProgress: (progress: number) => void = () => {}
): Promise<UploadStepResult> {
  updateProgress(6);
  const videoPath = (videoFile as File & { path?: string }).path ?? videoFile.name;
  const videoInfo = await videoService.getVideoInfo(videoPath);
  const thumbnail = await videoService.generateThumbnail(videoInfo.path, { timestamp: 0 }).catch(() => '');
  updateProgress(12);

  const enrichedVideoInfo: VideoInfo = {
    ...videoInfo,
    thumbnail: thumbnail || undefined,
  };

  // 保存到项目
  const project = storageService.projects.getById(projectId);
  if (project) {
    project.videos.push(enrichedVideoInfo);
    storageService.projects.save(project);
  }

  return { videoInfo: enrichedVideoInfo, projectId };
}
