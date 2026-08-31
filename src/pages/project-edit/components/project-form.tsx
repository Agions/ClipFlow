/**
 * 剧工 (Fablr) — 项目基本信息表单卡片
 */
import React from 'react';
import { Film } from 'lucide-react';
import styles from '@/pages/project-edit/index.module.less';

interface ProjectFormProps {
  name: string;
  description: string;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
}

const PRESET_TOPICS = ['战神归来·龙帅逆袭', '悬疑反转·极限破案', '都市神医·隐世宗师', '硬核科幻·星际漫游', '经典港片·深度拆解'];

export const ProjectForm = React.memo<ProjectFormProps>(({
  name,
  description,
  onNameChange,
  onDescriptionChange,
}) => (
  <div className={styles.infoCard}>
    <div className={styles.formRow}>
      <div className={styles.formLabel}>
        <div className="flex items-center gap-1.5">
          <Film size={14} className="text-purple-400" />
          <span>工程项目名称</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {PRESET_TOPICS.slice(0, 3).map((topic, i) => (
              <button
                key={i}
                type="button"
                className="text-[10px] text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                onClick={() => onNameChange(`${topic}-${new Date().toISOString().slice(0, 10)}`)}
              >
                + {topic.split('·')[0]}
              </button>
            ))}
          </div>
          <span className={styles.charCount}>{(name || '').length}/100</span>
        </div>
      </div>
      <input
        type="text"
        placeholder="例如：九霄战神：隐龙出渊-20260821"
        maxLength={100}
        value={name}
        onChange={e => onNameChange(e.target.value)}
        className={styles.darkInput}
      />
    </div>

    <div className={styles.formRow}>
      <div className={styles.formLabel}>
        <span>项目剧情概述与创作要点 (选填)</span>
        <span className={styles.charCount}>{(description || '').length}/500</span>
      </div>
      <textarea
        className={styles.darkTextarea}
        placeholder="简要填写剧情主线梗概，AI 智能拆条与剧本工坊将据此为您匹配最佳节奏与黄金倒叙 Hook..."
        rows={2}
        maxLength={500}
        value={description}
        onChange={e => onDescriptionChange(e.target.value)}
      />
    </div>
  </div>
));

ProjectForm.displayName = 'ProjectForm';
