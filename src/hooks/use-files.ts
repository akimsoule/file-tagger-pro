import { useContext } from 'react';
import { FileContext, FileContextType } from '@/contexts/file-context-def';

export function useFiles() {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFiles must be used within a FileProvider');
  }
  return context;
}
