import { createContext } from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  documents: Document[];
  folders: Folder[];
}

export interface UserMegaConfig {
  id: string;
  userId: string;
  email: string;
  password: string;
  isActive: boolean;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  color: string;
  ownerId: string;
  parentId?: string;
  children: Folder[];
  documents: Document[];
  tags: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  description?: string;
  tags: string;
  fileId: string;
  hash: string;
  ownerId: string;
  folderId?: string;
  isFavorite: boolean;
  createdAt: Date;
  modifiedAt: Date;
}

export interface Log {
  id: string;
  action: string;
  entity: "USER" | "DOCUMENT" | "FOLDER";
  entityId: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  documentId?: string;
  folderId?: string;
  createdAt: Date;
}

export type ViewMode = "grid" | "list";
export type SortBy = "name" | "date" | "size" | "type";

export interface FileContextType {
  // State
  currentUser: User | undefined;
  userConfig: UserMegaConfig | undefined;
  documents: Document[];
  folders: Folder[];
  currentFolderId: string | null;
  selectedDocumentId: string | null;
  selectedTags: string[];
  currentPath: Folder[];
  searchQuery: string;
  viewMode: ViewMode;
  sortBy: SortBy;

  // State setters
  setCurrentFolderId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sort: SortBy) => void;

  // Document operations
  getDocumentById: (id: string) => Document | undefined;
  getFavoriteDocuments: () => Document[];
  getFilteredAndSortedFavorites: () => Document[];
  updateDocument: (id: string, updates: Partial<Document>) => void;
  toggleFavorite: (id: string) => void;
  selectDocument: (id: string | null) => void;
  moveDocument: (documentId: string, targetFolderId: string | null) => void;

  // Folder operations
  getFolderById: (id: string) => Folder | undefined;
  getFolderContent: (folderId?: string) => {
    documents: Document[];
    subFolders: Folder[];
  };
  getFolderStats: (folderId: string) => {
    totalItems: number;
    totalSize: number;
  };
  moveFolder: (folderId: string, targetFolderId: string | null) => void;
  getFolderHierarchy: () => Folder[];
  getFolderPath: (folderId?: string) => Folder[];
  updateFolder: (id: string, updates: Partial<Folder>) => void;

  // Tag operations
  getAllTags: () => string[];
  getTagCount: (tag: string) => number;
  getTagCounts: () => Map<string, number>;
  toggleTag: (tag: string) => void;

  // Filtering & Sorting
  getFilteredContent: (folderId?: string) => {
    documents: Document[];
    subFolders: Folder[];
  };
  getSortedContent: (folderId?: string) => {
    documents: Document[];
    folders: Folder[];
  };
  clearFilters: () => void;

  // Logging
  addLog: (logData: Omit<Log, 'id' | 'createdAt'>) => void;
};

export const FileContext = createContext<FileContextType | undefined>(
  undefined
);
