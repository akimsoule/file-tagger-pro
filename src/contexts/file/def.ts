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

import type { TreeNode } from '../../logic/Tree';

export interface FileContextType {
  // Document & Folder State
  documents: Document[];
  folders: Folder[];
  currentFolderId: string | null;
  selectedDocumentId: string | null;
  treeNodes: TreeNode[];

  // Tag State
  tags: Tag[];
  selectedTags: string[];

  // State setters
  setCurrentFolderId: (id: string | null) => void;
  selectDocument: (id: string | null) => void;
  setSelectedTags: (tagIds: string[]) => void;

  // Navigation dans l'arbre
  getCurrentPath: () => TreeNode[];
  getCurrentContent: () => TreeNode[];
  getFilteredContent: () => TreeNode[];

  // Document operations
  findDocumentById: (id: string) => Document | undefined;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  addDocument: (document: Omit<Document, 'id' | 'createdAt' | 'modifiedAt'>) => void;
  deleteDocument: (id: string) => void;
  moveDocument: (documentId: string, targetFolderId: string | null) => void;
  toggleFavorite: (documentId: string) => void;

  // Tag operations
  toggleTagSelection: (tagId: string) => void;
  clearTagSelection: () => void;
  getTagById: (id: string) => Tag | undefined;
  getAllTags: () => Tag[];
  getTagsByIds: (ids: string[]) => Tag[];
  getTagCount: (tagId: string) => number;
  addTag: (tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt' | 'count'>) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;

  // Folder operations
  getFolderPath: (folderId?: string) => TreeNode[];
  getFolderContent: (folderId?: string, selectedTags?: string[]) => { 
    documents: Document[],
    subFolders: Folder[]
  };
  getFolders: (parentId?: string | null, selectedTags?: string[]) => Folder[];
  getFolderHierarchy: () => TreeNode[];
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  addFolder: (folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'children' | 'documents'>) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (folderId: string, targetFolderId: string | null) => void;
  getFolderStats: (folderId: string) => { totalItems: number; totalSize: number }
}
