import { useCallback, useState, useEffect } from 'react';
import type { Tag, TagContextType } from './def';
import { TagContext } from './context';
import { useFileContext } from '@/hooks/useFileContext';

// Couleurs par défaut pour les tags
const defaultColors = [
  '#DC2626', '#2563EB', '#EC4899', '#F59E0B', '#10B981',
  '#8B5CF6', '#6B7280', '#EF4444', '#60A5FA', '#D946EF'
];

export function TagProvider({ children }: { children: React.ReactNode }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { documents, folders } = useFileContext();
  const [tags, setTags] = useState<Tag[]>([]);

  // Extrait tous les tags uniques des documents et dossiers
  useEffect(() => {
    // Extraire et compter tous les tags
    const tagCounts: Record<string, number> = {};
    const allTagNames = new Set<string>();
    
    // Fonction pour traiter les tags d'un élément
    const processTags = (item: { tags: string }) => {
      item.tags.split(',').forEach(tag => {
        const trimmedTag = tag.trim();
        if (trimmedTag) {
          allTagNames.add(trimmedTag);
          tagCounts[trimmedTag] = (tagCounts[trimmedTag] || 0) + 1;
        }
      });
    };
    
    // Traiter les documents et les dossiers
    [...documents, ...folders].forEach(processTags);

    // Convertir en tableau de tags avec des couleurs
    const tagArray = Array.from(allTagNames);
    
    // Trier les noms de tags par leur compte puis alphabétiquement
    tagArray.sort((a, b) => {
      const countDiff = tagCounts[b] - tagCounts[a];
      return countDiff !== 0 ? countDiff : a.localeCompare(b);
    });

    // Créer les tags triés
    const newTags: Tag[] = tagArray.map((name, index) => ({
      id: crypto.randomUUID(),
      name,
      color: defaultColors[index % defaultColors.length],
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    setTags(newTags);
  }, [documents, folders]);

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
    console.log('=== toggleTagSelection ===');
    console.log('tagId à toggler:', tagId);
    console.log('tags actuellement sélectionnés:', selectedTags);
    
    setSelectedTags(prev => {
      const newSelection = prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId];
      
      console.log('nouvelle sélection:', newSelection);
      console.log('tags correspondants:', tags.filter(tag => newSelection.includes(tag.id)).map(t => t.name));
      return newSelection;
    });
  }, [tags]);

  const clearTagSelection = useCallback(() => {
    setSelectedTags([]);
  }, []);

  const getTagById = useCallback((id: string) => {
    return tags.find(tag => tag.id === id);
  }, [tags]);

  const getTagsByIds = useCallback((ids: string[]) => {
    return tags.filter(tag => ids.includes(tag.id));
  }, [tags]);

  const getTagCounts = useCallback(() => {
    const counts: Record<string, number> = {};
    
    // Compter les occurrences dans les documents et les dossiers
    [...documents, ...folders].forEach(item => {
      const itemTags = item.tags.toLowerCase().split(',').map(t => t.trim());
      tags.forEach(tag => {
        if (itemTags.includes(tag.name.toLowerCase())) {
          counts[tag.id] = (counts[tag.id] || 0) + 1;
        }
      });
    });
    
    return counts;
  }, [documents, folders, tags]);

  const getTagCount = useCallback((tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    if (!tag) return 0;
    
    return [...documents, ...folders].filter(item => 
      item.tags.toLowerCase().split(',').map(t => t.trim())
        .includes(tag.name.toLowerCase())
    ).length;
  }, [documents, folders, tags]);

  const getAllTags = useCallback(() => {
    // Les tags sont déjà triés dans le state
    return tags;
  }, [documents, folders, tags]);

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
