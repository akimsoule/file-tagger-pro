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

import type { FileTreeNode } from '@/logic/FileTreeNode';
import { FileNodeStats } from "@/logic/FileTreeNode";

export interface FileContextType {
  // État principal
  currentNode: FileTreeNode | null;
  selectedNode: FileTreeNode | null;
  tags: Tag[];
  selectedTags: string[];

  // Setters
  setCurrentNode: (node: FileTreeNode | null) => void;
  setSelectedNode: (node: FileTreeNode | null) => void;
  setSelectedTags: (tags: string[]) => void;

  // Opérations sur les nœuds
  getNodeContent: (node: FileTreeNode | null) => FileTreeNode[];
  findNodeById: (id: string) => FileTreeNode | null;
  getNodePath: (node: FileTreeNode) => FileTreeNode[];
  getNodeStats: (node: FileTreeNode) => FileNodeStats;
  getNodeHierarchy: () => FileTreeNode[];

  // Gestion des fichiers
  moveNode: (nodeId: string, targetFolderId: string | null) => Promise<void>;
  updateNode: (nodeId: string, data: Partial<Document | Folder>) => Promise<void>;
  addToFavorites: (nodeId: string) => Promise<void>;
  removeFromFavorites: (nodeId: string) => Promise<void>;

  // Gestion des tags
  getTagsByIds: (ids: string[]) => Tag[];
  getAllTags: () => Tag[];
  getTagCount: (tagId: string) => number;
  toggleTagSelection: (tagId: string) => void;
  updateTag: (tagId: string, updates: Partial<Tag>) => Promise<void>;
  createTag: (tag: Omit<Tag, 'id' | 'count'>) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;

  // Recherche & filtrage
  searchNodes?: (query: string) => FileTreeNode[];
  filterNodes?: (criteria: { tags?: string[]; favorite?: boolean }) => FileTreeNode[];
  addNodeTag?: (node: FileTreeNode, tagName: string) => void;
  removeNodeTag?: (node: FileTreeNode, tagName: string) => void;
}
