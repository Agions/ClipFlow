import { vi } from 'vitest';
import type { UseVideoUploadReturn } from '@/pages/workspace/edit-step/use-video-upload';
import type { VideoUploadState } from '@/pages/workspace/edit-step/video-upload-reducer';
import type { WorkflowState } from '@/core/workflow';

export interface MockVideoUploadOptions {
  state?: Partial<VideoUploadState>;
  projectState?: Partial<WorkflowState>;
}

export function createMockVideoUpload(options: MockVideoUploadOptions = {}): UseVideoUploadReturn {
  const {
    state = {},
    projectState = {},
  } = options;

  const defaultState: VideoUploadState = {
    uploading: false,
    uploadProgress: 0,
    dragActive: false,
    uploadStatus: 'idle',
    currentFile: null,
  };

  // WorkflowState 字段较多，允许部分覆盖，其他字段通过 cast 补充
  const defaultProjectState = {
    currentVideo: null,
    ...projectState,
    stepStatus: { 'project-create': true as boolean, ...projectState?.stepStatus },
  } as WorkflowState;

  return {
    state: { ...defaultState, ...state },
    projectState: defaultProjectState as WorkflowState,
    validateFile: vi.fn(() => ({ valid: true })),
    handleUpload: vi.fn(),
    handlePauseResume: vi.fn(),
    handleDelete: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDrop: vi.fn(),
    handleClick: vi.fn(),
    handleFileChange: vi.fn(),
    goToNextStep: vi.fn(),
  } as UseVideoUploadReturn;
}
