import { api } from "./api";


export interface FolderDTO {
  id: string;
  name: string;
  description?: string;
  color?: string;
  ownerId: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function listRootFolders() {
  return api<FolderDTO[]>(`/folders`, { auth: true });
}

export function getLogicalRootFolder() {
  return api<FolderDTO | null>(`/folders`, { auth: true, query: { isRoot: 1 } });
}

export function listSubFolders(parentId: string) {
  return api<FolderDTO[]>(`/folders`, { auth: true, query: { parentId } });
}

export function getFolder(id: string) {
  return api<FolderDTO>(`/folders/${id}`, { auth: true });
}

export function createFolder(data: { name: string; description?: string; color?: string; parentId?: string }) {
  return api<FolderDTO>(`/folders`, { method: 'POST', body: JSON.stringify(data), auth: true });
}

export function updateFolder(id: string, data: Partial<Pick<FolderDTO,'name'|'description'|'color'|'parentId'>>) {
  return api<FolderDTO>(`/folders/${id}`, { method: 'PUT', body: JSON.stringify(data), auth: true });
}

export function deleteFolder(id: string) {
  return api<{ message: string }>(`/folders/${id}`, { method: 'DELETE', auth: true });
}

export function moveDocument(documentId: string, folderId?: string) {
  return api(`/folders/move-document`, { method: 'POST', body: JSON.stringify({ documentId, folderId }), auth: true });
}

export function getFolderPath(id: string) {
  return api<{ path: FolderDTO[] }>(`/folders/${id}/path`, { auth: true });
}
