import type { Document, Folder } from '../file/def';

export type ViewMode = 'grid' | 'list';
export type SortBy = 'name' | 'date' | 'type' | 'size';

export interface QueryFilters {
  showFavorites: boolean;
  showHidden: boolean;
  selectedTags: string[];
}

export interface QueryContextType {
  searchQuery: string;
  sortBy: SortBy;
  viewMode: ViewMode;
  filters: QueryFilters;

  // Filtering & Sorting
  getFilteredContent: (content: Document[]) => Document[];
  getSortedContent: (content: Document[]) => Document[];
  getFilteredAndSortedFavorites: (documents: Document[]) => Document[];
  
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: SortBy) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleFavoriteFilter: () => void;
  toggleHiddenFilter: () => void;
  clearFilters: () => void;
}
