import type { Document, Folder } from '@/contexts/file/def';
import type { SortBy } from '@/contexts/query/def';

export function sortDocuments(docs: Document[], sortBy: SortBy): Document[] {
  return [...docs].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'type':
        return (a.type || '').localeCompare(b.type || '');
      case 'size':
        return a.size - b.size; // ascendant
      case 'date':
        return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(); // récent d'abord
      default:
        return 0;
    }
  });
}

export function sortFolders(folders: Folder[], sortBy: SortBy, getFolderSize?: (folder: Folder) => number): Folder[] {
  return [...folders].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'type':
        return a.name.localeCompare(b.name); // type unique
      case 'size': {
        const aSize = getFolderSize ? getFolderSize(a) : 0;
        const bSize = getFolderSize ? getFolderSize(b) : 0;
        return aSize - bSize; // ascendant
      }
      case 'date':
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      default:
        return 0;
    }
  });
}
