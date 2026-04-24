/**
 * AISettings — AI 设置面板
 * API Key: shadcn Input (password type, masked)
 * Model selector: shadcn Select (DeepSeek/OpenAI/Claude/Qwen/Kimi)
 * Test connection button
 */
import React, { memo, useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface AISettingsProps {
  apiKey?: string;
  model?: string;
  onApiKeyChange?: (key: string) => void;
  onModelChange?: (model: string) => void;
}

const MODELS = [
  { value: 'gpt-5.5', label: 'GPT-5.5' },
  { value: 'deepseek-v4-flash', label: 'DeepSeek-V4-Flash (推荐)' },

  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4' },
  { value: 'qwen3-max', label: 'Qwen3-Max' },
  { value: 'kimi-k2-turbo-preview', label: 'Kimi K2.6' },
];

export const AISettings = memo<AISettingsProps>(({
  apiKey = '',
  model = 'deepseek-v4-flash',
  onApiKeyChange,
  onModelChange,
}) => {
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [showKey, setShowKey] = useState(false);

  const handleTest = async () => {
    setTestState('testing');
    // Simulate test
    setTimeout(() => setTestState('idle'), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* API Key */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-text-secondary">API Key</label>
        <div className="flex gap-2">
          <Input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => onApiKeyChange?.(e.target.value)}
            placeholder="sk-..."
            className="flex-1 h-8 text-xs bg-bg-tertiary border-border-subtle"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowKey((v) => !v)}
            className="h-8 px-2 text-xs text-text-secondary"
          >
            {showKey ? 'Hide' : 'Show'}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleTest}
            disabled={testState === 'testing'}
            className="h-8 px-3 text-xs bg-accent-primary hover:bg-accent-primary-hover"
          >
            {testState === 'testing' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : testState === 'success' ? (
              <CheckCircle2 className="size-3.5 text-accent-success" />
            ) : testState === 'error' ? (
              <XCircle className="size-3.5 text-accent-danger" />
            ) : (
              'Test'
            )}
          </Button>
        </div>
        <p className="text-[10px] text-text-disabled">Keys are stored locally only</p>
      </div>

      {/* Model selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-text-secondary">Default Model</label>
        <div className="grid grid-cols-2 gap-2">
          {MODELS.map((m) => (
            <button
              key={m.value}
              onClick={() => onModelChange?.(m.value)}
              className={`
                h-8 px-3 rounded-md border text-xs font-medium transition-colors
                ${model === m.value
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                  : 'border-border-subtle bg-bg-tertiary text-text-secondary hover:text-text-primary hover:border-border-default'
                }
              `}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

AISettings.displayName = 'AISettings';
