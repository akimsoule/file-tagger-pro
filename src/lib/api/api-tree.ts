import { api } from './api';

export interface TreeDocumentDTO {
  id: string; name: string; type: string; size: number; description?: string; tags: string; folderId?: string | null; isFavorite: boolean; createdAt: string; modifiedAt: string;
}
export interface TreeFolderStats { documents: number; folders: number; totalSize: number }
export interface TreeFolderDTO {
  id: string; name: string; description?: string; color?: string; parentId?: string | null; isRoot?: boolean; createdAt: string; updatedAt: string; folders: TreeFolderDTO[]; documents: TreeDocumentDTO[]; stats?: TreeFolderStats;
}
export interface TreeResponse { tree: TreeFolderDTO | null; stats: TreeFolderStats }

export function getFullTree() {
  return api<TreeResponse>('/tree', { auth: true });
}
