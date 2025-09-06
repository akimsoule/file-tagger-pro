import { useState, useCallback } from 'react';
import { FileTreeNode } from '@/logic/local/FileTreeNode';
import { Folder } from '@/contexts/file';
import { TagBadge } from './TagBadge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, FolderIcon, FolderOutput, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { FolderPicker } from './FolderPicker';
import { useFileContext } from '@/hooks/useFileContext';
import { ConfirmDialog } from './ConfirmDialog';

interface FolderCardProps {
  node: FileTreeNode;
  onClick?: () => void;
}

export function FolderCard({ node, onClick }: FolderCardProps) {
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { moveNode, deleteNode } = useFileContext();
  
  const folderData = node.getData() as Folder;
  // findNodeById n'est pas nécessaire ici, on utilise directement l'id cible
  const tagList = node.tags.map(tag => tag.name);
  // Recalcule stats locales minimalistes (évite dépendance contexte supprimé)
  const stats = {
    totalItems: (node.children?.length) || 0,
    totalSize: (node.children as FileTreeNode[] | undefined)?.reduce((acc, c) => {
      if (c.type === 'file') {
  const d = c.getData() as Folder | import('@/contexts/file').Document;
        return acc + ('size' in d ? d.size : 0);
      }
      return acc;
    }, 0) || 0
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleMove = useCallback((targetFolderId: string | null) => {
    if (targetFolderId !== node.parentId) {
      moveNode(node.id, targetFolderId);
    }
  }, [node, moveNode]);

  // L’édition des tags de dossier n’est pas supportée

  const handleDelete = useCallback(() => {
    setConfirmOpen(true);
  }, []);

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
                  {/* Pas d'éditeur de tags pour les dossiers */}
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Supprimer
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

  {/* TagEditor supprimé pour les dossiers */}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Supprimer le dossier ?"
        description={`Cette action est définitive. Le dossier "${node.name}" sera supprimé. Le dossier doit être vide.`}
        confirmLabel="Supprimer"
        onConfirm={() => {
          setConfirmOpen(false);
          deleteNode?.(node.id);
        }}
      />
    </>
  );
}
