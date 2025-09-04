import { useMemo } from 'react';
import { useTags } from '@/hooks/useTags';

/**
 * Retourne les noms des tags sélectionnés (les documents stockent les noms, pas les IDs).
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

  return { selectedTagNames, hasSelectedTags: selectedTagNames.length > 0 };
}
