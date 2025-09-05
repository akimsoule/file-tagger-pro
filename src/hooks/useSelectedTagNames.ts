import { useMemo } from 'react';
import { useTags } from '@/hooks/useTags';

/**
 * Mappe les IDs de tags sélectionnés vers leurs noms (fallback: suppression du préfixe tag-).
 */
export function useSelectedTagNames() {
  const { selectedTags, tags } = useTags();

  const selectedTagNames = useMemo(
    () => selectedTags.map(id => {
      const tag = tags.find(t => t.id === id);
      return tag ? tag.name : id.replace(/^tag-/, '');
    }),
    [selectedTags, tags]
  );

  const hasSelectedTags = selectedTagNames.length > 0;
  return { selectedTagNames, hasSelectedTags };
}
