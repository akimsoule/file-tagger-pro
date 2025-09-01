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
  currentUser: User | undefined;
  userConfig: UserMegaConfig | undefined;
  documents: Document[];
  currentFolderId: string | null;
  selectedDocumentId: string | null;
  folders: Folder[];
  selectedTags: string[];
  searchQuery: string;
  viewMode: ViewMode;
  sortBy: SortBy;
  getDocumentById: (id: string) => Document | undefined;
  getFavoriteDocuments: () => Document[];
  getFilteredAndSortedFavorites: () => Document[];
  updateDocument: (id: string, updates: Partial<Document>) => void;
  toggleFavorite: (id: string) => void;
  getFolderById: (id: string) => Folder | undefined;
  getFolderContent: (folderId?: string) => {
    documents: Document[];
    subFolders: Folder[];
  };
  getFolderStats: (folderId: string) => {
    totalItems: number;
    totalSize: number;
  };
  getFilteredContent: (folderId?: string) => {
    documents: Document[];
    subFolders: Folder[];
  };
  getSortedContent: (folderId?: string) => {
    documents: Document[];
    folders: Folder[];
  };
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  addLog: (logData: Omit<Log, "id" | "createdAt">) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sort: SortBy) => void;
  toggleTag: (tag: string) => void;
  clearFilters: () => void;
  selectDocument: (id: string | null) => void;
  navigateToFolder: (id: string | null) => void;
}

export const FileContext = createContext<FileContextType | undefined>(
  undefined
);
