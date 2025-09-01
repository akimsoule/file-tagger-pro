export interface Tag {
  id: string;
  name: string;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'yellow';
  count?: number;
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

export type ViewMode = 'grid' | 'list';
export type SortBy = 'name' | 'date' | 'size' | 'type';