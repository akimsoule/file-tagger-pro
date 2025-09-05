import { FC } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Folder, ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileContext } from '@/hooks/useFileContext';
import { FileTreeNode } from '@/logic/local/FileTreeNode';

interface FolderPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string | null) => void;
  currentFolderId?: string;
  excludeFolderId?: string;
  title?: string;
}

export const FolderPicker: FC<FolderPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentFolderId,
  excludeFolderId,
  title = 'Choisir un dossier'
}) => {
  const { currentNode } = useFileContext();

  const handleSelect = (folderId: string | null) => {
    onSelect(folderId);
    onClose();
  };

  const renderFolder = (node: FileTreeNode, level: number = 0) => {
    if (node.id === excludeFolderId) return null;
    if (node.type !== 'folder') return null;

  const folderData = node.getData() as { color: string; name: string }; // Partial Folder fields needed
  const subFolders = (node.children as FileTreeNode[]).filter(n => n.type === 'folder');
    const hasSubFolders = subFolders.length > 0;

    return (
      <div key={node.id} className="w-full">
        <button
          onClick={() => handleSelect(node.id)}
          className={cn(
            "w-full flex items-center gap-2 p-2 hover:bg-accent rounded-lg transition-colors",
            "text-left text-sm",
            currentFolderId === node.id && "bg-accent"
          )}
          style={{ paddingLeft: `${(level + 1) * 1}rem` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 p-1 rounded" style={{ backgroundColor: folderData.color + '20' }}>
              <Folder className="h-4 w-4" style={{ color: folderData.color }} />
            </div>
            <span className="truncate">{node.name}</span>
          </div>
          {hasSubFolders && <ChevronRight className="h-4 w-4 ml-auto opacity-50" />}
        </button>
        {hasSubFolders && (
          <div className="w-full">
            {subFolders.map(sub => renderFolder(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-1">
              <button
                onClick={() => handleSelect(null)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 hover:bg-accent rounded-lg transition-colors",
                  "text-left text-sm",
                  !currentFolderId && "bg-accent"
                )}
              >
                <Home className="h-4 w-4" />
                <span>Racine</span>
              </button>

              {/* Parcourt les enfants racine depuis currentNode=null => racine réelle */}
              {(currentNode ? (currentNode.children as FileTreeNode[]) : [])
                .filter(node => node.type === 'folder')
                .map(folderNode => renderFolder(folderNode as FileTreeNode))}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={() => handleSelect(currentFolderId || null)}>
              Déplacer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
