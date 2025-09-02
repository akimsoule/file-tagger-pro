import { useState, ReactNode, useCallback, useEffect } from "react";
import {
  FileContext,
  FileContextType,
  Document,
  Folder,
  User,
  UserMegaConfig,
  Log,
  ViewMode,
  SortBy,
} from "./file-context-def";
import { mockDocuments, mockFolders, mockUser } from "@/data/mockData";

export function FileProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | undefined>(mockUser);
  const [userConfig, setUserConfig] = useState<UserMegaConfig | undefined>();
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [folders, setFolders] = useState<Folder[]>(mockFolders);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null
  );
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<Folder[]>([]);

  const getFolderPath = useCallback((folderId?: string): Folder[] => {
    if (!folderId) return [];

    const path: Folder[] = [];
    let currentFolder = folders.find((f) => f.id === folderId);

    while (currentFolder) {
      path.unshift(currentFolder);
      currentFolder = currentFolder.parentId
        ? folders.find((f) => f.id === currentFolder.parentId)
        : undefined;
    }

    return path;
  }, [folders]);

  // Met à jour le chemin quand le dossier change
  useEffect(() => {
    const path = getFolderPath(currentFolderId || undefined);
    setCurrentPath(path);
  }, [currentFolderId, getFolderPath]);

  // Document operations
  const getDocumentById = useCallback(
    (id: string) => {
      return documents.find((doc) => doc.id === id);
    },
    [documents]
  );

  const getFavoriteDocuments = useCallback(() => {
    return documents.filter((doc) => doc.isFavorite);
  }, [documents]);

  const getFilteredAndSortedFavorites = useCallback(() => {
    let filtered = getFavoriteDocuments();

    // Filtrage par recherche
    if (searchQuery) {
      filtered = filtered.filter((doc) =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrage par tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((doc) =>
        selectedTags.some((tag) => doc.tags.includes(tag))
      );
    }

    // Tri
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "date":
          return b.modifiedAt.getTime() - a.modifiedAt.getTime();
        case "size":
          return b.size - a.size;
        case "type":
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });
  }, [getFavoriteDocuments, searchQuery, selectedTags, sortBy]);

  const updateDocument = useCallback(
    (id: string, updates: Partial<Document>) => {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === id ? { ...doc, ...updates, modifiedAt: new Date() } : doc
        )
      );
    },
    []
  );

  const toggleFavorite = useCallback((id: string) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? { ...doc, isFavorite: !doc.isFavorite, modifiedAt: new Date() }
          : doc
      )
    );
  }, []);

  // Folder operations
  const getFolderById = useCallback(
    (id: string) => {
      return folders.find((folder) => folder.id === id);
    },
    [folders]
  );

  const getFolderContent = useCallback(
    (folderId?: string) => {
      const docs = documents.filter((doc) => doc.folderId === folderId);
      const subFolders = folders.filter(
        (folder) => folder.parentId === folderId
      );
      return { documents: docs, subFolders };
    },
    [documents, folders]
  );

  const getFolderStats = useCallback(
    (folderId: string) => {
      const { documents: docs, subFolders } = getFolderContent(folderId);

      let totalSize = docs.reduce((acc, doc) => acc + doc.size, 0);
      let totalItems = docs.length + subFolders.length;

      // Calcul récursif pour les sous-dossiers
      const calculateSubFolderStats = (folders: Folder[]) => {
        folders.forEach((folder) => {
          const subStats = getFolderContent(folder.id);
          totalItems += subStats.documents.length + subStats.subFolders.length;
          totalSize += subStats.documents.reduce(
            (acc, doc) => acc + doc.size,
            0
          );
          calculateSubFolderStats(subStats.subFolders);
        });
      };

      calculateSubFolderStats(subFolders);

      return { totalItems, totalSize };
    },
    [getFolderContent]
  );

  const updateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    setFolders((prev) =>
      prev.map((folder) =>
        folder.id === id
          ? { ...folder, ...updates, updatedAt: new Date() }
          : folder
      )
    );
  }, []);

  // Tag operations
  const getAllTags = useCallback(() => {
    // Première passe : collecter les tags uniques et leurs occurrences
    const tagOccurrences = new Map<string, number>();

    // Collecter les tags des documents
    documents.forEach((doc) => {
      doc.tags.split(",").forEach((tag) => {
        const trimmedTag = tag.trim();
        if (trimmedTag) {
          tagOccurrences.set(
            trimmedTag,
            (tagOccurrences.get(trimmedTag) || 0) + 1
          );
        }
      });
    });

    // Collecter les tags des dossiers
    folders.forEach((folder) => {
      folder.tags.split(",").forEach((tag) => {
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
  }, [documents, folders]);

  const getTagCount = useCallback(
    (tag: string) => {
      const docCount = documents.filter((doc) =>
        doc.tags
          .split(",")
          .map((t) => t.trim())
          .includes(tag)
      ).length;

      const folderCount = folders.filter((folder) =>
        folder.tags
          .split(",")
          .map((t) => t.trim())
          .includes(tag)
      ).length;

      return docCount + folderCount;
    },
    [documents, folders]
  );

  const getTagCounts = useCallback(() => {
    const counts = new Map<string, number>();
    const allTagsList = getAllTags();
    allTagsList.forEach((tag) => {
      counts.set(tag, getTagCount(tag));
    });
    return counts;
  }, [getAllTags, getTagCount]);

  // Filtering operations
  const toggleTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim();
    console.log("Toggling tag:", { tag: trimmedTag });
    setSelectedTags((current) => {
      const isSelected = current.some((t) => t.trim() === trimmedTag);
      console.log("Current selected tags:", current);
      console.log("Tag was selected:", isSelected);
      const newTags = isSelected
        ? current.filter((t) => t.trim() !== trimmedTag)
        : [...current, trimmedTag];
      console.log("New selected tags:", newTags);
      return newTags;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTags([]);
    setSearchQuery("");
  }, []);

  const getFilteredContent = useCallback(
    (folderId?: string) => {
      console.log("Getting filtered content, selected tags:", selectedTags);

      const normalizedSelectedTags = selectedTags.map((tag) => tag.trim());
      const hasActiveFilters = normalizedSelectedTags.length > 0;
      console.log("Has active filters:", hasActiveFilters);

      // Si on a des filtres actifs, on montre tous les documents/dossiers qui correspondent
      if (hasActiveFilters) {
        const filteredDocuments = documents.filter(
          (doc) =>
            doc.tags &&
            doc.tags
              .split(",")
              .some((tag) => normalizedSelectedTags.includes(tag.trim()))
        );

        const filteredFolders = folders.filter(
          (folder) =>
            folder.tags &&
            folder.tags
              .split(",")
              .some((tag) => normalizedSelectedTags.includes(tag.trim()))
        );

        console.log("Filtered results (with tags):", {
          documents: filteredDocuments.length,
          subFolders: filteredFolders.length,
        });

        return { documents: filteredDocuments, subFolders: filteredFolders };
      }

      // Sans filtre, on respecte la hiérarchie
      const filteredDocuments = documents.filter(
        (doc) => doc.folderId === folderId
      );

      const filteredFolders = folders.filter(
        (folder) => folder.parentId === folderId
      );

      console.log("Filtered results (hierarchical):", {
        documents: filteredDocuments.length,
        subFolders: filteredFolders.length,
      });

      return { documents: filteredDocuments, subFolders: filteredFolders };
    },
    [selectedTags, documents, folders]
  );

  // Sorting operations
  const getSortedContent = useCallback(
    (folderId?: string) => {
      const { documents: docs, subFolders } = getFilteredContent(folderId);

      const sortItems = (items: Array<Document | Folder>) => {
        return [...items].sort((a, b) => {
          switch (sortBy) {
            case "name": {
              return a.name.localeCompare(b.name);
            }
            case "date": {
              const aDate = "modifiedAt" in a ? a.modifiedAt : a.createdAt;
              const bDate = "modifiedAt" in b ? b.modifiedAt : b.createdAt;
              return bDate.getTime() - aDate.getTime();
            }
            case "size": {
              if ("size" in a && "size" in b) {
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
        documents: sortItems(docs) as Document[],
      };
    },
    [getFilteredContent, sortBy]
  );

  // Log operations
  const addLog = useCallback((logData: Omit<Log, 'id' | 'createdAt'>) => {
    // Dans une application réelle, ceci serait géré par une API
    console.log('New log:', {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      ...logData
    });
  }, []);

  // Navigation operations
  const selectDocument = useCallback((id: string | null) => {
    setSelectedDocumentId(id);
  }, []);

  const moveDocument = useCallback((documentId: string, targetFolderId: string | null) => {
    setDocuments(prev => prev.map(doc =>
      doc.id === documentId
        ? { ...doc, folderId: targetFolderId, modifiedAt: new Date() }
        : doc
    ));

    // Log the action
    addLog({
      action: "MOVE",
      entity: "DOCUMENT",
      entityId: documentId,
      details: `Moved to folder: ${targetFolderId || 'root'}`,
    });
  }, [addLog]);

  const moveFolder = useCallback((folderId: string, targetFolderId: string | null) => {
    // Vérifie qu'on ne déplace pas un dossier dans un de ses descendants
    const isValidMove = (sourceId: string, targetId: string | null): boolean => {
      if (targetId === null) return true;
      if (sourceId === targetId) return false;
      
      const targetFolder = folders.find(f => f.id === targetId);
      if (!targetFolder) return true;
      
      return isValidMove(sourceId, targetFolder.parentId);
    };

    if (targetFolderId && !isValidMove(folderId, targetFolderId)) {
      console.error("Cannot move a folder into its own descendant");
      return;
    }

    setFolders(prev => prev.map(folder =>
      folder.id === folderId
        ? { ...folder, parentId: targetFolderId, updatedAt: new Date() }
        : folder
    ));

    // Log the action
    addLog({
      action: "MOVE",
      entity: "FOLDER",
      entityId: folderId,
      details: `Moved to folder: ${targetFolderId || 'root'}`,
    });
  }, [folders, addLog]);

  const getFolderHierarchy = useCallback(() => {
    const buildHierarchy = (parentId: string | undefined = undefined): Folder[] => {
      return folders
        .filter(folder => folder.parentId === parentId)
        .map(folder => ({
          ...folder,
          children: buildHierarchy(folder.id)
        }));
    };

    return buildHierarchy();
  }, [folders]);

  const contextValue: FileContextType = {
    // State
    currentUser,
    userConfig,
    documents,
    folders,
    currentFolderId,
    selectedDocumentId,
    selectedTags,
    currentPath,
    searchQuery,
    viewMode,
    sortBy,

    // State setters
    setCurrentFolderId,
    setSearchQuery,
    setViewMode,
    setSortBy,

    // Document operations
    getDocumentById,
    getFavoriteDocuments,
    getFilteredAndSortedFavorites,
    updateDocument,
    toggleFavorite,
    selectDocument,

    // Folder operations
    getFolderById,
    getFolderContent,
    getFolderStats,
    getFolderPath,
    updateFolder,

    // Tag operations
    getAllTags,
    getTagCount,
    getTagCounts,
    toggleTag,

    // Filtering & Sorting
    getFilteredContent,
    getSortedContent,
    clearFilters,

    // Logging
    addLog,

    // Move operations
    moveDocument,
    moveFolder,
    getFolderHierarchy,
  };

  return (
    <FileContext.Provider value={contextValue}>{children}</FileContext.Provider>
  );
}
