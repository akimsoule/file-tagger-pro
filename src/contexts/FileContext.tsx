import { useState, ReactNode } from 'react';
import { FileItem } from '@/types';
import { mockFiles } from '@/data/mockData';
import { FileContext } from './file-context-def';

export function FileProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<FileItem[]>(mockFiles);

  const updateFile = (fileId: string, updates: Partial<FileItem>) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, ...updates } : file
    ));
  };

  const toggleFavorite = (fileId: string) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, isFavorite: !file.isFavorite } : file
    ));
  };

  const getFileById = (fileId: string) => {
    return files.find(file => file.id === fileId);
  };

  const getFavoriteFiles = () => {
    return files.filter(file => file.isFavorite);
  };

  return (
    <FileContext.Provider value={{
      files,
      updateFile,
      toggleFavorite,
      getFileById,
      getFavoriteFiles,
    }}>
      {children}
    </FileContext.Provider>
  );
}

