import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Scissors,
  GitMerge,
  Trash2,
  TestTube,
  CheckCircle,
} from 'lucide-react';
import type { ClipAnalysisResult } from '@/core/services/aiClip.service';
import styles from '../index.module.less';

interface SuggestionsStepProps {
  analysisResult: ClipAnalysisResult | null;
  selectedSuggestions: Set<string>;
  onToggleSuggestion: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onApply: () => void;
}

const SuggestionsStep: React.FC<SuggestionsStepProps> = ({
  analysisResult,
  selectedSuggestions,
  onToggleSuggestion,
  onSelectAll,
  onDeselectAll,
  onApply
}) => {
  if (!analysisResult?.suggestions.length) {
    return (
      <Card className={styles.suggestionsCard}>
        <CardContent className="py-12 text-center text-muted-foreground">
          暂无剪辑建议
        </CardContent>
      </Card>
    );
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'trim': return <Scissors size={16} />;
      case 'merge': return <GitMerge size={16} />;
      case 'cut': return <Trash2 size={16} />;
      case 'effect': return <TestTube size={16} />;
      default: return null;
    }
  };

  return (
    <Card className={styles.suggestionsCard}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">
            共 {analysisResult.suggestions.length} 条建议，已选中 {selectedSuggestions.size} 条
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onDeselectAll}>
              取消全选
            </Button>
            <Button variant="outline" size="sm" onClick={onSelectAll}>
              全选
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="flex flex-col gap-2">
            {analysisResult.suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`${styles.suggestionItem} flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedSuggestions.has(suggestion.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => onToggleSuggestion(suggestion.id)}
              >
                <Checkbox
                  checked={selectedSuggestions.has(suggestion.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={styles.suggestionIcon}>
                      {getSuggestionIcon(suggestion.type)}
                    </div>
                    <span className="font-semibold text-sm">{suggestion.description}</span>
                    {suggestion.autoApplicable && (
                      <Badge variant="default" className="bg-green-600 text-xs">可自动应用</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{suggestion.reason}</p>
                </div>
                <Badge
                  variant="secondary"
                  className="shrink-0"
                  style={{
                    backgroundColor:
                      suggestion.confidence > 0.8
                        ? '#52c41a'
                        : suggestion.confidence > 0.5
                        ? '#faad14'
                        : '#ff4d4f',
                    color: '#fff'
                  }}
                >
                  {Math.round(suggestion.confidence * 100)}%
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className={styles.actionButtons}>
          <Button
            className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white"
            onClick={onApply}
            disabled={selectedSuggestions.size === 0}
          >
            <CheckCircle size={14} className="mr-1" />
            应用选中的建议 ({selectedSuggestions.size})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SuggestionsStep;
