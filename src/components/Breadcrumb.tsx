import React from 'react';
import { useFileContext } from '@/hooks/use-files';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumb() {
  const { currentPath, setCurrentFolderId } = useFileContext();

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
      <button 
        onClick={() => setCurrentFolderId(null)} 
        className="hover:text-primary flex items-center"
      >
        <Home className="h-4 w-4 mr-1" />
        Accueil
      </button>
      
      {currentPath.map((folder, index) => (
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
