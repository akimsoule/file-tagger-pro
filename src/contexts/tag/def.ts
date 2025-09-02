export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TagContextType {
  // State
  tags: Tag[];
  selectedTags: string[];
  
  // Tag operations
  addTag: (tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  
  // Selection
  setSelectedTags: (tagIds: string[]) => void;
  toggleTagSelection: (tagId: string) => void;
  clearTagSelection: () => void;
  
  // Utilities
  getTagById: (id: string) => Tag | undefined;
  getTagsByIds: (ids: string[]) => Tag[];
  getAllTags: () => Tag[];
  getTagCount: (tagId: string) => number;
  getTagCounts: () => Record<string, number>;
}
