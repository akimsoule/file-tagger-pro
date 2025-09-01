import { createContext } from 'react';
import { FileItem } from '@/types';

export interface FileContextType {
  files: FileItem[];
  updateFile: (fileId: string, updates: Partial<FileItem>) => void;
  toggleFavorite: (fileId: string) => void;
  getFileById: (fileId: string) => FileItem | undefined;
  getFavoriteFiles: () => FileItem[];
}

export const FileContext = createContext<FileContextType | undefined>(undefined);
