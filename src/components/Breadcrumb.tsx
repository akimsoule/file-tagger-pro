import React from 'react';
import { ChevronRight, Home, FolderIcon } from 'lucide-react';
import { Button } from './ui/button';
import { useFileContext } from '@/hooks/useFileContext';
import { Folder } from '@/contexts/file/def';

export function Breadcrumb() {
  const { currentFolderId, setCurrentFolderId, getFolderPath } = useFileContext();

  // Obtenir le chemin actuel en utilisant le hook useFileContext
  const currentPath = getFolderPath(currentFolderId || undefined);

  const handleNavigate = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  // Ne montrer que le dernier dossier sur mobile, tout sur desktop
  const showFullPath = currentPath.length <= 2;
  const visiblePath = showFullPath ? currentPath : [
    ...(currentPath.length > 0 ? [currentPath[0]] : []),
    ...(currentPath.length > 2 ? [{ id: 'ellipsis', name: '...' }] : []),
    ...(currentPath.length > 1 ? [currentPath[currentPath.length - 1]] : [])
  ];

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
