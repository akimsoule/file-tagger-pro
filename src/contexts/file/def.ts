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

export interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

import type { FileTreeNode } from '../../logic/FileTreeNode';

export interface FileContextType {
  // État principal
  documents: Document[];
  folders: Folder[];
  currentFolderId: string | null;
  selectedDocumentId: string | null;
  tags: Tag[];
  selectedTags: string[];

  // Setters
  setCurrentFolderId: (id: string | null) => void;
  selectDocument: (id: string | null) => void;
  setSelectedTags: (tagIds: string[]) => void;

  // Opérations sur les fichiers et dossiers
  findDocumentById: (id: string) => Document | undefined;
  getFolderContent: (folderId?: string) => { 
    documents: Document[],
    subFolders: Folder[]
  };
  getCurrentContent: () => FileTreeNode[];
  getFolders: (parentId?: string | null, selectedTags?: string[]) => Folder[];
  getFolderPath: (folderId?: string) => FileTreeNode[];
  getFolderStats: (folderId: string) => { totalItems: number; totalSize: number };
  getFolderHierarchy: () => FileTreeNode[];
  getTagsByIds: (ids: string[]) => Tag[];
  getAllTags: () => Tag[];
  getTagCount: (tagId: string) => number;
  toggleTagSelection: (tagId: string) => void;
  updateFolder: (folderId: string, updates: Partial<Folder>) => void;
}
