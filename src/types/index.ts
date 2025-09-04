export interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  extension?: string;
  size?: number;
  tags: Tag[];
  dateModified: Date;
  thumbnail?: string;
  isFavorite: boolean;
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

export type TreeNodeType = "folder" | "file";

export interface Stats {
  totalSize: number;
  tagsCount: number;
}

export interface FolderStats extends Stats {
  totalItems: number;
  filesCount: number;
  foldersCount: number;
}


export type ViewMode = 'grid' | 'list';
export type SortBy = 'name' | 'date' | 'size' | 'type';