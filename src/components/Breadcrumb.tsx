import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Folder } from '@/contexts/file/def';
import { useFileContext } from '@/hooks/useFileContext';

export function Breadcrumb() {
  const { currentFolderId, setCurrentFolderId, getFolderPath } = useFileContext();

  // Obtenir le chemin actuel en utilisant le hook useFolderManager
  const currentPath = getFolderPath(currentFolderId || undefined);

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
