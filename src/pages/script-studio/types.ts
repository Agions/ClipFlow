export type ScriptBlockType = 'hook' | 'act' | 'climax' | 'ending';

export interface ScriptBlock {
  id: string;
  type: ScriptBlockType;
  title: string;
  content: string;
  durationEstimate: number;
  linkedClipIds: string[];
  collapsed: boolean;
  isAiGenerated: boolean;
}

export interface CharacterItem {
  id: string;
  name: string;
  role: string;
  avatarBg: string;
}
