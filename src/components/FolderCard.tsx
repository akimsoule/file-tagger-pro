import { useState, useCallback } from 'react';
import { FileTreeNode } from '@/logic/FileTreeNode';
import { Folder } from '@/contexts/file/def';
import { TagBadge } from './TagBadge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, FolderIcon, FolderOutput, Tags } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { FolderPicker } from './FolderPicker';
import { TagEditor } from './TagEditor';
import { useFileContext } from '@/hooks/useFileContext';

interface FolderCardProps {
  node: FileTreeNode;
  onClick?: () => void;
}

export function FolderCard({ node, onClick }: FolderCardProps) {
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false);
  const { moveNode, updateNode, getNodeStats } = useFileContext();
  
  const folderData = node.getData() as Folder;
  // findNodeById n'est pas nécessaire ici, on utilise directement l'id cible
  const tagList = node.tags.map(tag => tag.name);
  const stats = getNodeStats(node);

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleMove = useCallback((targetFolderId: string | null) => {
    if (targetFolderId !== node.parentId) {
      moveNode(node.id, targetFolderId);
    }
  }, [node, moveNode]);

  const handleUpdateTags = useCallback((newTags: string) => {
    updateNode(node.id, { tags: newTags });
  }, [node, updateNode]);

  if (!node || node.type !== 'folder') {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "group p-4 rounded-lg border border-border transition-all",
          "hover:border-primary/20 hover:shadow-card-hover cursor-pointer"
        )}
        onClick={onClick}
      >
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 p-2 rounded-lg"
              style={{ backgroundColor: folderData.color + '20' }}
            >
              <FolderIcon
                className="h-5 w-5"
                style={{ color: folderData.color }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">
                {node.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {stats.totalItems} éléments • {(stats.totalSize / (1024 * 1024)).toFixed(1)} Mo
              </p>
            </div>
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={handleAction}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFolderPickerOpen(true);
                    }}
                  >
                    <FolderOutput className="h-4 w-4 mr-2" />
                    Déplacer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTagEditorOpen(true);
                    }}
                  >
                    <Tags className="h-4 w-4 mr-2" />
                    Modifier les tags
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tags */}
          {tagList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tagList.slice(0, 3).map((tagName) => (
                <TagBadge
                  key={tagName}
                  name={tagName}
                  className="max-w-[150px]"
                />
              ))}
              {tagList.length > 3 && (
                <span className="text-xs text-muted-foreground px-2 py-1 whitespace-nowrap">
                  +{tagList.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <FolderPicker
        isOpen={isFolderPickerOpen}
        onClose={() => setIsFolderPickerOpen(false)}
        onSelect={handleMove}
        currentFolderId={node.id}
        excludeFolderId={node.id}
        title="Déplacer le dossier vers"
      />

      <TagEditor
        isOpen={isTagEditorOpen}
        onClose={() => setIsTagEditorOpen(false)}
        currentTags={node.tags.map(t => t.name).join(',')}
        onSave={handleUpdateTags}
        title="Modifier les tags du dossier"
      />
    </>
  );
}
