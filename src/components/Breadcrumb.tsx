import React from 'react';
import { ChevronRight, Home, FolderIcon } from 'lucide-react';
import { Button } from './ui/button';
import { useFileContext } from '@/hooks/useFileContext';
import { FileTreeNode } from '@/logic/FileTreeNode';

export function Breadcrumb() {
  const { currentNode, setCurrentNode, getNodePath } = useFileContext();

  const fullPathRaw = currentNode ? getNodePath(currentNode) : [];
  // On exclut explicitement le nœud racine interne (id 'root') pour ne pas l'afficher (le bouton Home suffit)
  const fullPath: (FileTreeNode | { id: string; name: string })[] = fullPathRaw.filter(n => (n as FileTreeNode).id !== 'root');

  const showFullPath = fullPath.length <= 2;
  const visiblePath = showFullPath
    ? fullPath
    : [
        ...(fullPath.length > 0 ? [fullPath[0]] : []),
        ...(fullPath.length > 2 ? [{ id: 'ellipsis', name: '...' }] : []),
        ...(fullPath.length > 1 ? [fullPath[fullPath.length - 1]] : [])
      ];

  const handleNavigate = (nodeId: string | null) => {
    if (!nodeId) {
      setCurrentNode(null); // retour racine
      return;
    }
    // On recherche dans fullPathRaw (inclut root) au lieu de path ancien
    const target = fullPathRaw.find(n => n.id === nodeId) || null;
    setCurrentNode(target);
  };

  return (
    <nav className="flex items-center space-x-1.5 text-sm text-muted-foreground overflow-x-auto overflow-y-hidden w-full scrollbar-none py-1 px-0.5">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 flex-shrink-0 p-0"
        onClick={() => handleNavigate(null)}
        title="Accueil"
      >
        <Home className="h-4 w-4" />
      </Button>
  {visiblePath.length > 0 && (
        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
      )}
      {visiblePath.map((folder, index) => (
        <React.Fragment key={folder.id}>
          {folder.id === 'ellipsis' ? (
            <span className="flex-shrink-0 px-1">{folder.name}</span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 flex-shrink-0 py-0 px-1.5"
              onClick={() => handleNavigate(folder.id)}
              title={folder.name}
            >
              <FolderIcon className="h-3.5 w-3.5 mr-1" />
              <span className="max-w-[80px] truncate">{folder.name}</span>
            </Button>
          )}
          {index < visiblePath.length - 1 && (
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
