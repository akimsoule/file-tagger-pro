import { useContext } from 'react';
import { FileContext } from '@/contexts/file-context-def';

export function useFileContext() {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFileContext must be used within a FileProvider');
  }
  return context;
}

// Pour la rétrocompatibilité
export const useFiles = useFileContext;
