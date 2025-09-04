import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { useTags } from '../../hooks/useTags';
import { useFileContext } from '../../hooks/useFileContext';
import type { Document } from '../file/def';
import type { QueryContextType, SortBy, ViewMode } from './def';
import { QueryContext } from './context';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings } = useSettings();
  const { setSelectedTags } = useTags();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>(settings.defaultSortBy);
  const [viewMode, setViewMode] = useState<ViewMode>(settings.defaultViewMode);

  // Effet pour synchroniser le mode de vue avec les settings
  useEffect(() => {
    setViewMode(settings.defaultViewMode);
  }, [settings.defaultViewMode]);

  // Wrapper pour mettre à jour le mode de vue
  const handleViewModeChange = useCallback((newMode: ViewMode) => {
    setViewMode(newMode);
    updateSettings({ defaultViewMode: newMode });
  }, [updateSettings]);

  // Utiliser les tags sélectionnés du contexte Tag
  const [filters, setFilters] = useState({
    showFavorites: false,
    showHidden: false
  });

  const toggleFavoriteFilter = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      showFavorites: !prev.showFavorites,
    }));
  }, []);

  const toggleHiddenFilter = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      showHidden: !prev.showHidden,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSortBy(settings.defaultSortBy);
    setViewMode(settings.defaultViewMode);
    setFilters({
      showFavorites: false,
      showHidden: false
    });
    setSelectedTags([]);
  }, [settings.defaultSortBy, settings.defaultViewMode, setSelectedTags]);

  const { selectedTags, tags: allTags } = useTags();

  // Convertir les IDs sélectionnés en noms de tags (les documents stockent les noms)
  const selectedTagNames = useMemo(() => {
    return selectedTags.map(id => {
      const tagObj = allTags.find(t => t.id === id);
      if (tagObj) return tagObj.name;
      // Fallback: retirer éventuel préfixe 'tag-'
      return id.replace(/^tag-/, '');
    });
  }, [selectedTags, allTags]);

  const getFilteredContent = useCallback((content: Document[]) => {
    let filtered = [...content];

  if (selectedTagNames.length > 0) {
      // Filtrer par tags en vérifiant les tags des documents
      filtered = filtered.filter(doc => {
        const docTags = doc.tags.split(',').map(t => t.trim());
    return selectedTagNames.every(tagName => docTags.includes(tagName));
      });
    }

    if (filters.showFavorites) {
      filtered = filtered.filter(doc => doc.isFavorite);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [selectedTagNames, filters.showFavorites, searchQuery]);

  const getSortedContent = useCallback((content: Document[]) => {
    return [...content].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        case 'size':
          return a.size - b.size;
        case 'date':
          return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
        default:
          return 0;
      }
    });
  }, [sortBy]);

  const getFilteredAndSortedFavorites = useCallback((documents: Document[]) => {
    // Commencer avec uniquement les favoris
    let filtered = documents.filter(doc => doc.isFavorite);

    // Appliquer les autres filtres
  if (selectedTagNames.length > 0) {
      filtered = filtered.filter(doc => {
        const docTags = doc.tags.split(',').map(t => t.trim());
    return selectedTagNames.every(tagName => docTags.includes(tagName));
      });
    }

    // Appliquer la recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
      );
    }

    // Trier les résultats
    return getSortedContent(filtered);
  }, [selectedTagNames, searchQuery, getSortedContent]);

  const value: QueryContextType = {
    searchQuery,
    sortBy,
    viewMode,
    filters: {
      ...filters,
      selectedTags: selectedTags
    },
    setSearchQuery,
    setSortBy,
    setViewMode: handleViewModeChange,
    toggleFavoriteFilter,
    toggleHiddenFilter,
    clearFilters,
    getFilteredContent,
    getSortedContent,
    getFilteredAndSortedFavorites
  };

  return <QueryContext.Provider value={value}>{children}</QueryContext.Provider>;
}
