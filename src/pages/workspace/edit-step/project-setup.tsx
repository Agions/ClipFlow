/**
 * 步骤1: 创建项目 — AI Cinema Studio Redesign
 * 数据输出: project (ProjectData)
 * 流转到: VideoUpload
 */
import React, { useState, memo } from 'react';
import { useProjectStore } from '@/stores';
import type { ProjectData } from '@/types';
import { saveProjectToFile } from '@/core/services/project/project-file-service';
import { notify } from '@/shared';
import { useAppStore } from '@/stores/app-store';
import styles from './project-setup.module.less';
import { ArrowRight, User, PenTool, Grid3x3, Plus } from 'lucide-react';
import { OUT_SUBTITLE_FG, OUT_SUBTITLE_BG, OUT_SUBTITLE_STROKE } from '@/core/video/output-colors';

interface ProjectCreateProps {
  onNext?: () => void;
}

// 三种创作模式配置
const MODE_OPTIONS = [
  {
    id: 'first-person',
    name: 'AI第一人称',
    desc: '以第一人称视角，像主播一样与观众互动',
    icon: <User size={22} />,
  },
  {
    id: 'narration',
    name: 'AI解说',
    desc: '对视频内容进行专业解说，适合教程和科普',
    icon: <PenTool size={22} />,
  },
  {
    id: 'remix',
    name: 'AI混剪',
    desc: '自动识别精彩片段，生成节奏感强的混剪',
    icon: <Grid3x3 size={22} />,
  },
];

// 项目模板（内部使用，不对外展示）
const PROJECT_TEMPLATES_INTERNAL = {
  'first-person': {
    videoQuality: 'high' as const,
    outputFormat: 'mp4' as const,
    resolution: '1080p' as const,
    frameRate: 30 as 24 | 30 | 60,
    subtitleEnabled: true,
  },
  narration: {
    videoQuality: 'high' as const,
    outputFormat: 'mp4' as const,
    resolution: '1080p' as const,
    frameRate: 30 as 24 | 30 | 60,
    subtitleEnabled: true,
  },
  remix: {
    videoQuality: 'medium' as const,
    outputFormat: 'mp4' as const,
    resolution: '1080p' as const,
    frameRate: 30 as 24 | 30 | 60,
    subtitleEnabled: true,
  },
};

const normalizeText = (value?: string) => value?.trim().replace(/\s+/g, ' ') || '';

const createDefaultProjectName = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `未命名项目-${timestamp}`;
};

const ProjectCreate: React.FC<ProjectCreateProps> = memo(({ onNext }) => {
  const { state, setProject, goToNextStep } = useProjectStore();
  const { addRecentProject } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string>('first-person');
  const [projectName, setProjectName] = useState<string>(() => createDefaultProjectName());
  const [description, setDescription] = useState<string>('');

  const handleCreateProject = async () => {
    if (loading) return;

    const normalizedName = normalizeText(projectName) || createDefaultProjectName();
    const normalizedDescription = normalizeText(description);
    const template =
      PROJECT_TEMPLATES_INTERNAL[selectedMode as keyof typeof PROJECT_TEMPLATES_INTERNAL] ||
      PROJECT_TEMPLATES_INTERNAL.narration;

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const newProject: ProjectData = {
        id: `project_${Date.now()}`,
        name: normalizedName,
        templateId: selectedMode,
        templateName: MODE_OPTIONS.find(m => m.id === selectedMode)?.name || 'AI解说',
        description: normalizedDescription || undefined,
        status: 'draft',
        videos: [],
        scripts: [],
        createdAt: now,
        updatedAt: now,
        settings: {
          ...template,
          audioCodec: 'aac',
          videoCodec: 'h264',
          subtitleStyle: {
            fontFamily: '思源黑体',
            fontSize: 24,
            color: OUT_SUBTITLE_FG,
            backgroundColor: OUT_SUBTITLE_BG,
            outline: true,
            outlineColor: OUT_SUBTITLE_STROKE,
            position: 'bottom',
            alignment: 'center',
          },
        },
      };

      await saveProjectToFile(newProject.id, newProject);
      addRecentProject(newProject.id);
      setProject(newProject);
      setProjectName(normalizedName);
      notify.success('项目创建成功');

      if (onNext) {
        onNext();
      } else {
        goToNextStep();
      }
    } catch (error) {
      notify.error(error, '项目创建失败');
    } finally {
      setLoading(false);
    }
  };

  // 已有项目时显示信息卡
  if (state.project) {
    const mode = MODE_OPTIONS.find(m => m.id === state.project?.templateId) || MODE_OPTIONS[1];
    const templateSettings =
      PROJECT_TEMPLATES_INTERNAL[
        state.project.templateId as keyof typeof PROJECT_TEMPLATES_INTERNAL
      ] || PROJECT_TEMPLATES_INTERNAL.narration;

    return (
      <div className={styles.stepContent}>
        <div className={styles.stepTitle}>
          <h2>当前项目</h2>
          <p>项目已创建，可以继续下一步或重新创建</p>
        </div>

        <div className={styles.projectCard}>
          <div className={styles.projectHeader}>
            <div className={styles.projectIconBox}>{mode.icon}</div>
            <div className={styles.projectMeta}>
              <div className={styles.projectName}>{state.project.name}</div>
              {state.project.description && (
                <div className={styles.projectDesc}>{state.project.description}</div>
              )}
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>创作模式</span>
              <span className={styles.infoValue}>{mode.name}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>创建时间</span>
              <span className={styles.infoValue}>
                {new Date(state.project.createdAt ?? Date.now()).toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>输出格式</span>
              <span className={styles.infoValue}>
                {templateSettings.outputFormat.toUpperCase()}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>分辨率</span>
              <span className={styles.infoValue}>{templateSettings.resolution}</span>
            </div>
          </div>

          <button className={styles.nextBtn} onClick={goToNextStep}>
            下一步：上传视频
            <ArrowRight className={styles.nextBtnArrow} size={16} />
          </button>
        </div>
      </div>
    );
  }

  // 创建项目表单
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepTitle}>
        <h2>创建新项目</h2>
        <p>选择创作模式，为你的视频选择最适合的 AI 表达方式</p>
      </div>

      {/* 模式选择 */}
      <div className={styles.modeSection}>
        <span className={styles.modeLabel}>选择创作模式</span>
        <div className={styles.modeGrid}>
          {MODE_OPTIONS.map(mode => (
            <div
              key={mode.id}
              className={`${styles.modeCard} ${selectedMode === mode.id ? styles.modeActive : ''}`}
              onClick={() => setSelectedMode(mode.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setSelectedMode(mode.id)}
              aria-pressed={selectedMode === mode.id}
            >
              <div className={styles.modeCheckIcon}>
                <div className={styles.modeCheckDot} />
              </div>
              <span className={styles.modeIcon}>{mode.icon}</span>
              <span className={styles.modeName}>{mode.name}</span>
              <span className={styles.modeDesc}>{mode.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 玻璃拟态表单卡片 */}
      <div className={styles.formCard}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="projectName">
            项目名称
          </label>
          <div className={styles.inputWrapper}>
            <input
              id="projectName"
              className={styles.textInput}
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="例如：产品宣传视频"
              maxLength={50}
              aria-label="项目名称"
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="projectDesc">
            项目描述（可选）
          </label>
          <div className={styles.inputWrapper}>
            <textarea
              id="projectDesc"
              className={styles.textareaInput}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="简要描述项目的目标和内容..."
              maxLength={200}
              rows={3}
              aria-label="项目描述"
            />
          </div>
        </div>

        <button
          className={styles.createBtn}
          onClick={handleCreateProject}
          disabled={loading}
          aria-busy={loading}
        >
          <Plus className={styles.createBtnIcon} size={16} />
          <span className={styles.createBtnText}>{loading ? '创建中...' : '创建项目'}</span>
        </button>
      </div>

      <div className={styles.hintAlert}>
        <strong>
          <span aria-hidden="true">💡</span> 提示：
        </strong>{' '}
        选择创作模式后，AI 将根据该模式生成最适合的文案和效果
      </div>
    </div>
  );
});

ProjectCreate.displayName = 'ProjectCreate';
export default ProjectCreate;
