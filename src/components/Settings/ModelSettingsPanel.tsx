/**
 * 模型设置面板
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, Zap, DollarSign } from 'lucide-react';
import { AI_MODELS, MODEL_VERIFICATION, MODEL_CATALOG_VERIFIED_AT } from '@/core/config/models.config';
import { PROVIDER_NAMES } from '@/constants/models';
import type { AIModel } from '@/core/types';

interface ModelSettingsPanelProps {
  defaultModel: string;
  availableModels: AIModel[];
  onModelChange: (model: string) => void;
}

const ModelSettingsPanel: React.FC<ModelSettingsPanelProps> = ({
  defaultModel,
  availableModels,
  onModelChange,
}) => {
  const selectedModel = availableModels.find(m => m.id === defaultModel) || availableModels[0];
  const isModelSelectable = availableModels.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bot size={16} />
          AI 模型设置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isModelSelectable && (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm">
            <p className="font-medium text-yellow-500 mb-1">暂无可选模型</p>
            <p className="text-muted-foreground text-xs">请先在 API 密钥管理中配置至少一个提供商的 API 密钥，模型列表将自动同步。</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">默认模型（核验日期：{MODEL_CATALOG_VERIFIED_AT}）</span>
          <Select
            value={selectedModel?.id}
            onValueChange={(val: string) => val && onModelChange(val)}
            disabled={!isModelSelectable}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择默认 AI 模型" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    <span>{model.name}</span>
                    <Badge variant="secondary" className="text-xs">{PROVIDER_NAMES[model.provider as keyof typeof PROVIDER_NAMES]}</Badge>
                    {MODEL_VERIFICATION[model.id]?.verified ? (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/40 text-xs">已核验</Badge>
                    ) : (
                      <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/40 text-xs">需手动确认</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedModel && (
          <>
            <div className="h-px bg-border" />
            <div className="rounded-md border border-accent-primary/30 bg-accent-primary/5 px-4 py-3 text-sm space-y-2">
              <p className="font-medium text-text-primary">{selectedModel.name}</p>
              <p className="text-muted-foreground text-xs">{selectedModel.description}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <Zap size={10} />
                  最大 {(selectedModel.tokenLimit ?? 4096).toLocaleString()} tokens
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <DollarSign size={10} />
                  {PROVIDER_NAMES[selectedModel.provider as keyof typeof PROVIDER_NAMES]}
                </Badge>
                <Badge
                  variant="secondary"
                  className={`text-xs ${MODEL_VERIFICATION[selectedModel.id]?.verified ? 'bg-green-500/20 text-green-500 border-green-500/40' : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/40'}`}
                >
                  核验日期 {MODEL_VERIFICATION[selectedModel.id]?.checkedAt || '待确认'}
                </Badge>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ModelSettingsPanel;
