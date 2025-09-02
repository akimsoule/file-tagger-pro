import { useCallback, useState } from 'react';
import type { Tag, TagContextType } from './def';
import { TagContext } from './context';

// Données mockées pour le développement
const mockTags: Tag[] = [
  {
    id: '1',
    name: 'Important',
    color: 'red',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Personnel',
    color: 'blue',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export function TagProvider({ children }: { children: React.ReactNode }) {
  const [tags, setTags] = useState<Tag[]>(mockTags);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const addTag = useCallback((tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTag: Tag = {
      ...tag,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTags(prev => [...prev, newTag]);
  }, []);

  const updateTag = useCallback((id: string, updates: Partial<Tag>) => {
    setTags(prev => prev.map(tag =>
      tag.id === id ? { ...tag, ...updates, updatedAt: new Date() } : tag
    ));
  }, []);

  const deleteTag = useCallback((id: string) => {
    setTags(prev => prev.filter(tag => tag.id !== id));
    setSelectedTags(prev => prev.filter(tagId => tagId !== id));
  }, []);

  const toggleTagSelection = useCallback((tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  }, []);

  const clearTagSelection = useCallback(() => {
    setSelectedTags([]);
  }, []);

  const getTagById = useCallback((id: string) => {
    return tags.find(tag => tag.id === id);
  }, [tags]);

  const getTagsByIds = useCallback((ids: string[]) => {
    return tags.filter(tag => ids.includes(tag.id));
  }, [tags]);

  const getAllTags = useCallback(() => {
    return tags;
  }, [tags]);

  const getTagCount = useCallback((tagId: string) => {
    // Pour l'instant, retourne un nombre aléatoire comme exemple
    // TODO: Implémenter le vrai comptage quand on aura la logique des documents
    return Math.floor(Math.random() * 20);
  }, []);

  const getTagCounts = useCallback(() => {
    // Pour l'instant, retourne des nombres aléatoires comme exemple
    // TODO: Implémenter le vrai comptage quand on aura la logique des documents
    return tags.reduce((acc, tag) => ({
      ...acc,
      [tag.id]: Math.floor(Math.random() * 20)
    }), {});
  }, [tags]);

  const value: TagContextType = {
    tags,
    selectedTags,
    addTag,
    updateTag,
    deleteTag,
    setSelectedTags,
    toggleTagSelection,
    clearTagSelection,
    getTagById,
    getTagsByIds,
    getAllTags,
    getTagCount,
    getTagCounts
  };

  return (
    <TagContext.Provider value={value}>
      {children}
    </TagContext.Provider>
  );
}
