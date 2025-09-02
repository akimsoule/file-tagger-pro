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

export interface FileContextType {
  // State
  documents: Document[];
  folders: Folder[];
  currentFolderId: string | null;
  selectedDocumentId: string | null;

  // State setters
  setCurrentFolderId: (id: string | null) => void;
  selectDocument: (id: string | null) => void;

  // Document operations
  findDocumentById: (id: string) => Document | undefined;
  getDocumentsByFolder: (folderId: string | null) => Document[];
  updateDocument: (id: string, updates: Partial<Document>) => void;
  addDocument: (document: Omit<Document, 'id' | 'createdAt' | 'modifiedAt'>) => void;
  deleteDocument: (id: string) => void;
  moveDocument: (documentId: string, targetFolderId: string | null) => void;
  toggleFavorite: (documentId: string) => void;

  // Folder operations
  getFolderPath: (folderId?: string) => Folder[];
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  addFolder: (folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (folderId: string, targetFolderId: string | null) => void;
  getFolderHierarchy: () => Folder[];
  getFolderStats: (folderId: string) => { totalItems: number; totalSize: number };
  getFolderContent: (folderId?: string) => { documents: Document[]; subFolders: Folder[] };
  getFolders: (parentId: string | null) => Folder[];
  getDocumentsWithTags: (tagIds: string[]) => Document[];
  getFoldersWithTags: (tagIds: string[]) => Folder[];
}
