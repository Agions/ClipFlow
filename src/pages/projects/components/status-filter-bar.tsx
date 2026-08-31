import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { ProjectStatusFilter } from '@/types/project';

interface StatusFilter {
  label: string;
  value: number;
  /** CSS color expression (hex / rgb / var(--token)) */
  color: string;
  filter: ProjectStatusFilter;
}

interface StatusFilterBarProps {
  statusFilters: StatusFilter[];
  currentFilter: ProjectStatusFilter;
  onFilterChange: (filter: ProjectStatusFilter) => void;
}

export const StatusFilterBar = React.memo<StatusFilterBarProps>(
  ({ statusFilters, currentFilter, onFilterChange }) => (
    <div className="flex flex-wrap gap-2 mb-4">
      {statusFilters.map((item, idx) => {
        const isActive = currentFilter === item.filter;
        return (
          <Badge
            key={idx}
            variant={isActive ? 'default' : 'outline'}
            className="cursor-pointer px-3 py-1.5 text-sm"
            style={{
              // 使用 color-mix 而非 hex+15 拼接，自动响应主题
              background: isActive
                ? `color-mix(in srgb, ${item.color} 15%, transparent)`
                : undefined,
              borderColor: isActive ? item.color : undefined,
              color: isActive ? item.color : undefined,
            }}
            onClick={() => onFilterChange(item.filter)}
          >
            {item.label} <strong>{item.value}</strong>
          </Badge>
        );
      })}
    </div>
  )
);

StatusFilterBar.displayName = 'StatusFilterBar';
