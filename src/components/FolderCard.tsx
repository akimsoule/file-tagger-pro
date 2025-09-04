import { useState } from 'react';
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
  folder: Folder;
  onClick?: () => void;
}

export function FolderCard({ folder, onClick }: FolderCardProps) {
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false);
  const { moveFolder, updateFolder, getFolderStats } = useFileContext();

  const tags = folder.tags.split(',').filter(tag => tag.trim() !== '');
  const stats = getFolderStats(folder.id);

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleMove = (targetFolderId: string | null) => {
    if (targetFolderId !== folder.parentId) {
      moveFolder(folder.id, targetFolderId);
    }
  };

  const handleUpdateTags = (newTags: string) => {
    updateFolder(folder.id, { tags: newTags });
  };

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
              style={{ backgroundColor: folder.color + '20' }}
            >
              <FolderIcon
                className="h-5 w-5"
                style={{ color: folder.color }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">
                {folder.name}
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
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <TagBadge
                  key={tag}
                  name={tag.trim()}
                  className="max-w-[150px]"
                />
              ))}
              {tags.length > 3 && (
                <span className="text-xs text-muted-foreground px-2 py-1 whitespace-nowrap">
                  +{tags.length - 3}
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
        currentFolderId={folder.id}
        excludeFolderId={folder.id}
        title="Déplacer le dossier vers"
      />

      <TagEditor
        isOpen={isTagEditorOpen}
        onClose={() => setIsTagEditorOpen(false)}
        currentTags={folder.tags}
        onSave={handleUpdateTags}
        title="Modifier les tags du dossier"
      />
    </>
  );
}
