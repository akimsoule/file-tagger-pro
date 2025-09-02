import { useState, ReactNode, useCallback } from 'react';
import { FileContext, Document, Folder, User, UserMegaConfig, Log, ViewMode, SortBy } from './file-context-def';
import { mockDocuments, mockFolders, mockUser } from '@/data/mockData';

export function FileProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | undefined>(mockUser);
  const [userConfig, setUserConfig] = useState<UserMegaConfig | undefined>();
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [folders, setFolders] = useState<Folder[]>(mockFolders);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Document operations
  const getDocumentById = useCallback((id: string) => {
    return documents.find(doc => doc.id === id);
  }, [documents]);

  const getFavoriteDocuments = useCallback(() => {
    return documents.filter(doc => doc.isFavorite);
  }, [documents]);

  const getFilteredAndSortedFavorites = useCallback(() => {
    let filtered = getFavoriteDocuments();

    // Filtrage par recherche
    if (searchQuery) {
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrage par tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(doc =>
        selectedTags.some(tag => doc.tags.includes(tag))
      );
    }

    // Tri
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return b.modifiedAt.getTime() - a.modifiedAt.getTime();
        case 'size':
          return b.size - a.size;
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });
  }, [getFavoriteDocuments, searchQuery, selectedTags, sortBy]);

  const updateDocument = useCallback((id: string, updates: Partial<Document>) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, ...updates, modifiedAt: new Date() } : doc
    ));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, isFavorite: !doc.isFavorite, modifiedAt: new Date() } : doc
    ));
  }, []);

  // Folder operations
  const getFolderById = useCallback((id: string) => {
    return folders.find(folder => folder.id === id);
  }, [folders]);

  const getFolderContent = useCallback((folderId?: string) => {
    const docs = documents.filter(doc => doc.folderId === folderId);
    const subFolders = folders.filter(folder => folder.parentId === folderId);
    return { documents: docs, subFolders };
  }, [documents, folders]);

  const getFolderStats = useCallback((folderId: string) => {
    const { documents: docs, subFolders } = getFolderContent(folderId);
    
    let totalSize = docs.reduce((acc, doc) => acc + doc.size, 0);
    let totalItems = docs.length + subFolders.length;

    // Calcul récursif pour les sous-dossiers
    const calculateSubFolderStats = (folders: Folder[]) => {
      folders.forEach(folder => {
        const subStats = getFolderContent(folder.id);
        totalItems += subStats.documents.length + subStats.subFolders.length;
        totalSize += subStats.documents.reduce((acc, doc) => acc + doc.size, 0);
        calculateSubFolderStats(subStats.subFolders);
      });
    };

    calculateSubFolderStats(subFolders);

    return { totalItems, totalSize };
  }, [getFolderContent]);

  const updateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    setFolders(prev => prev.map(folder => 
      folder.id === id ? { ...folder, ...updates, updatedAt: new Date() } : folder
    ));
  }, []);

  // Tag operations
  const getAllTags = useCallback(() => {
    // Première passe : collecter les tags uniques et leurs occurrences
    const tagOccurrences = new Map<string, number>();
    
    documents.forEach(doc => {
      doc.tags.split(',').forEach(tag => {
        const trimmedTag = tag.trim();
        if (trimmedTag) {
          tagOccurrences.set(
            trimmedTag, 
            (tagOccurrences.get(trimmedTag) || 0) + 1
          );
        }
      });
    });

    // Convertir en tableau et trier
    return Array.from(tagOccurrences.entries())
      .sort((a, b) => {
        // Tri par nombre d'occurrences décroissant
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }
        // En cas d'égalité, tri alphabétique
        return a[0].localeCompare(b[0]);
      })
      .map(([tag]) => tag); // Ne retourner que les tags, sans les compteurs
  }, [documents]);

  const getTagCount = useCallback((tag: string) => {
    return documents.filter(doc => doc.tags.includes(tag)).length;
  }, [documents]);

  const getTagCounts = useCallback(() => {
    const counts = new Map<string, number>();
    const allTagsList = getAllTags();
    allTagsList.forEach(tag => {
      counts.set(tag, getTagCount(tag));
    });
    return counts;
  }, [getAllTags, getTagCount]);

  // Filtering operations
  const toggleTag = useCallback((tag: string) => {
    console.log("Toggling tag:", tag);
    setSelectedTags(current => 
      current.includes(tag) 
        ? current.filter(t => t !== tag)
        : [...current, tag]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTags([]);
    setSearchQuery('');
  }, []);

  const getFilteredContent = useCallback((folderId?: string) => {
    const { documents: docs, subFolders } = getFolderContent(folderId);
    
    let filteredDocs = docs;
    let filteredFolders = subFolders;

    // Filtrage par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredDocs = filteredDocs.filter(doc =>
        doc.name.toLowerCase().includes(query)
      );
      filteredFolders = filteredFolders.filter(folder =>
        folder.name.toLowerCase().includes(query)
      );
    }

    // Filtrage par tags (seulement pour les documents)
    if (selectedTags.length > 0) {
      filteredDocs = filteredDocs.filter(doc =>
        selectedTags.every(tag => doc.tags.split(',').map(t => t.trim()).includes(tag))
      );
    }

    return { documents: filteredDocs, subFolders: filteredFolders };
  }, [getFolderContent, searchQuery, selectedTags]);

  // Sorting operations
  const getSortedContent = useCallback((folderId?: string) => {
    const { documents: docs, subFolders } = getFilteredContent(folderId);
    
    const sortItems = (items: Array<Document | Folder>) => {
      return [...items].sort((a, b) => {
        switch (sortBy) {
          case 'name': {
            return a.name.localeCompare(b.name);
          }
          case 'date': {
            const aDate = 'modifiedAt' in a ? a.modifiedAt : a.createdAt;
            const bDate = 'modifiedAt' in b ? b.modifiedAt : b.createdAt;
            return bDate.getTime() - aDate.getTime();
          }
          case 'size': {
            if ('size' in a && 'size' in b) {
              return b.size - a.size;
            }
            return 0;
          }
          default: {
            return 0;
          }
        }
      });
    };

    return {
      folders: sortItems(subFolders) as Folder[],
      documents: sortItems(docs) as Document[]
    };
  }, [getFilteredContent, sortBy]);

  // Navigation operations
  const selectDocument = useCallback((id: string | null) => {
    setSelectedDocumentId(id);
  }, []);

  const navigateToFolder = useCallback((id: string | null) => {
    setCurrentFolderId(id);
  }, []);

  // Log operations
  const addLog = useCallback((logData: Omit<Log, 'id' | 'createdAt'>) => {
    // Dans une application réelle, ceci serait géré par une API
    console.log('New log:', {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      ...logData
    });
  }, []);

  return (
    <FileContext.Provider value={{
      // State
      currentUser,
      userConfig,
      documents,
      folders,
      selectedTags,
      searchQuery,
      viewMode,
      sortBy,
      selectedDocumentId,
      currentFolderId,

      // Document operations
      getDocumentById,
      getFavoriteDocuments,
      getFilteredAndSortedFavorites,
      updateDocument,
      toggleFavorite,

      // Folder operations
      getFolderById,
      getFolderContent,
      getFolderStats,
      updateFolder,

      // Tag operations
      getAllTags,
      getTagCount,
      getTagCounts,

      // Filtering operations
      getFilteredContent,
      setSearchQuery,
      toggleTag,
      clearFilters,

      // View & Sort operations
      setViewMode,
      setSortBy,
      getSortedContent,

      // Navigation operations
      selectDocument,
      navigateToFolder,

      // Logging
      addLog
    }}>
      {children}
    </FileContext.Provider>
  );
}

