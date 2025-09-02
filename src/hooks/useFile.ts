import { useContext } from 'react';
import { FileContext } from '@/contexts/file/context';

export function useFileContext() {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFileContext must be used within a FileProvider');
  }
  return context;
}
