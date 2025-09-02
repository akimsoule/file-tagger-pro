import { useContext } from 'react';
import { TagContext } from '../contexts/tag/context';

export function useTags() {
  const context = useContext(TagContext);
  if (!context) {
    throw new Error('useTags must be used within a TagProvider');
  }
  return context;
}
