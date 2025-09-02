import { useState, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { useTags } from '../../hooks/useTags';
import { useFileContext } from '../../hooks/useFileContext';
import type { Document } from '../file/def';
import type { QueryContextType, SortBy, ViewMode } from './def';
import { QueryContext } from './context';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const { defaultViewMode, defaultSortBy } = useSettings();
  const { setSelectedTags } = useTags();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>(defaultSortBy);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [filters, setFilters] = useState({
    showFavorites: false,
    showHidden: false,
    selectedTags: [] as string[],
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
    setSortBy(defaultSortBy);
    setViewMode(defaultViewMode);
    setFilters({
      showFavorites: false,
      showHidden: false,
      selectedTags: [],
    });
    setSelectedTags([]);
  }, [defaultSortBy, defaultViewMode, setSelectedTags]);

  // Importer useFileContext
  const { getDocumentsWithTags, getFoldersWithTags } = useFileContext();

  const getFilteredContent = useCallback((content: Document[]) => {
    let filtered = [...content];

    if (filters.selectedTags.length > 0) {
      // Filtrer d'abord par tags tout en conservant le contexte du dossier courant
      const documentsWithTags = getDocumentsWithTags(filters.selectedTags);
      // On ne garde que les documents qui étaient dans le contenu initial
      filtered = documentsWithTags.filter(doc => content.some(c => c.id === doc.id));
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
  }, [filters.selectedTags, filters.showFavorites, searchQuery, getDocumentsWithTags]);

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
    if (filters.selectedTags.length > 0) {
      const documentsWithTags = getDocumentsWithTags(filters.selectedTags);
      filtered = filtered.filter(doc => documentsWithTags.some(d => d.id === doc.id));
    }

    // Appliquer la recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query) ||
        doc.tags.toLowerCase().includes(query)
      );
    }

    // Trier les résultats
    return getSortedContent(filtered);
  }, [filters.selectedTags, searchQuery, getSortedContent, getDocumentsWithTags]);

  const value: QueryContextType = {
    searchQuery,
    sortBy,
    viewMode,
    filters,
    setSearchQuery,
    setSortBy,
    setViewMode,
    toggleFavoriteFilter,
    toggleHiddenFilter,
    clearFilters,
    getFilteredContent,
    getSortedContent,
    getFilteredAndSortedFavorites
  };

  return <QueryContext.Provider value={value}>{children}</QueryContext.Provider>;
}
