/**
 * FolderTree — 可展开的文件夹树
 * 使用 shadcn Collapsible
 * Lucide icons: Folder, FileVideo, FileAudio
 * 选中态: --accent-primary 浅色背景
 */
import React, { memo, useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';

interface FolderItem {
  id: string;
  name: string;
  parentId?: string;
}

interface FolderTreeProps {
  folders: FolderItem[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
}

export const FolderTree = memo<FolderTreeProps>(({
  folders,
  selectedFolderId,
  onSelectFolder,
}) => {
  // Simple top-level folders only for now
  const topFolders = folders.filter((f) => !f.parentId);

  if (folders.length === 0) {
    return (
      <div className="px-3 py-2 text-[11px] text-text-disabled">
        所有素材
      </div>
    );
  }

  return (
    <div className="p-1">
      {/* All files option */}
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-[11px] transition-colors ${
          selectedFolderId === null
            ? 'bg-accent-primary/10 text-accent-primary'
            : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
        }`}
        onClick={() => onSelectFolder(null)}
      >
        <FolderOpen className="size-3.5 shrink-0" />
        <span className="truncate">所有素材</span>
      </div>

      {topFolders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          allFolders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
        />
      ))}
    </div>
  );
});

const FolderNode = memo<{
  folder: FolderItem;
  allFolders: FolderItem[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
}>(({ folder, allFolders, selectedFolderId, onSelectFolder }) => {
  const [expanded, setExpanded] = useState(false);
  const children = allFolders.filter((f) => f.parentId === folder.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-[11px] transition-colors ${
          selectedFolderId === folder.id
            ? 'bg-accent-primary/10 text-accent-primary'
            : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
        }`}
        onClick={() => onSelectFolder(folder.id)}
      >
        {hasChildren ? (
          <button
            className="p-0 border-0 bg-transparent cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
          >
            {expanded ? (
              <ChevronDown className="size-3 text-text-disabled" />
            ) : (
              <ChevronRight className="size-3 text-text-disabled" />
            )}
          </button>
        ) : (
          <span className="w-3" />
        )}
        {expanded ? (
          <FolderOpen className="size-3.5 shrink-0" />
        ) : (
          <Folder className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{folder.name}</span>
      </div>

      {expanded && hasChildren && (
        <div className="ml-4">
          {children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              allFolders={allFolders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
});

FolderNode.displayName = 'FolderNode';
