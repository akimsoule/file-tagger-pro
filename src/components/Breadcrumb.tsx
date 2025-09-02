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

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8"
        onClick={() => handleNavigate(null)}
      >
        <Home className="h-4 w-4" />
      </Button>
      {currentPath.length > 0 && (
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
      )}
      {currentPath.map((folder: Folder, index: number) => (
        <React.Fragment key={folder.id}>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleNavigate(folder.id)}
          >
            <FolderIcon className="h-4 w-4" />
            <span className="max-w-[150px] truncate">{folder.name}</span>
          </Button>
          {index < currentPath.length - 1 && (
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
      <button 
        onClick={() => setCurrentFolderId(null)} 
        className="hover:text-primary flex items-center"
      >
        <Home className="h-4 w-4 mr-1" />
        Accueil
      </button>
      
      {currentPath.map((folder : Folder) => (
        <React.Fragment key={folder.id}>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <button
            onClick={() => setCurrentFolderId(folder.id)}
            className="hover:text-primary"
          >
            {folder.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
