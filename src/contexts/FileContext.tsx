import { createContext, useContext, useState, ReactNode } from 'react';
import { FileItem } from '@/types';
import { mockFiles } from '@/data/mockData';

interface FileContextType {
  files: FileItem[];
  updateFile: (fileId: string, updates: Partial<FileItem>) => void;
  toggleFavorite: (fileId: string) => void;
  getFileById: (fileId: string) => FileItem | undefined;
  getFavoriteFiles: () => FileItem[];
}

const FileContext = createContext<FileContextType | undefined>(undefined);

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

export function useFiles() {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFiles must be used within a FileProvider');
  }
  return context;
}