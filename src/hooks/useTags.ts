import { useContext } from 'react';
import { FileContext } from '../contexts/file/context';

export function useTags() {
  const {
    tags,
    selectedTags,
    toggleTagSelection,
    clearTagSelection,
    getTagById,
    addTag,
    updateTag,
    deleteTag,
    setSelectedTags,
    getAllTags,
    getTagsByIds,
    getTagCount
  } = useContext(FileContext);

  if (!tags) {
    throw new Error('useTags must be used within a FileProvider');
  }

  return {
    tags,
    selectedTags,
    toggleTagSelection,
    clearTagSelection,
    getTagById,
    addTag,
    updateTag,
    deleteTag,
    setSelectedTags,
    getAllTags,
    getTagsByIds,
    getTagCount
  };
}
