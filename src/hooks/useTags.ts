import { useContext } from 'react';
import { FileContext } from '../contexts/file';

// Accès simplifié aux données/méthodes tags exposées par FileContext
export function useTags() {
  const ctx = useContext(FileContext);
  if (!ctx) throw new Error('useTags must be used within a FileProvider');
  const { tags, selectedTags, toggleTagSelection, setSelectedTags, getAllTags, getTagsByIds, getTagCount } = ctx;
  return { tags, selectedTags, toggleTagSelection, setSelectedTags, getAllTags, getTagsByIds, getTagCount };
}
