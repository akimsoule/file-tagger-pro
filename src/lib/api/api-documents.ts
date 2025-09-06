import { api, loadStoredToken } from "./api";


export interface DocumentDTO {
  id: string;
  name: string;
  type: string;
  size: number;
  description?: string;
  tags: string; // CSV
  ownerId: string;
  folderId?: string | null;
  isFavorite: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface PaginatedDocuments {
  documents: DocumentDTO[];
  total: number;
  page: number;
  limit: number;
}

export function listDocuments(params: { page?: number; limit?: number; search?: string; tag?: string; userId?: string } = {}) {
  return api<PaginatedDocuments>(`/documents`, { query: params, auth: true });
}

export function getDocument(id: string) {
  return api<DocumentDTO>(`/documents/${id}`, { auth: true });
}

export function createDocument(data: { name: string; type?: string; description?: string; tags?: string; folderId?: string }) {
  return api<DocumentDTO>(`/documents`, { method: 'POST', body: JSON.stringify(data), auth: true });
}

export function uploadDocument(file: File, extra: { name?: string; description?: string; tags?: string; type?: string; folderId?: string } = {}) {
  const form = new FormData();
  form.append('file', file, file.name);
  if (extra.name) form.append('name', extra.name);
  if (extra.description) form.append('description', extra.description);
  if (extra.tags) form.append('tags', extra.tags);
  if (extra.type) form.append('type', extra.type);
  if (extra.folderId) form.append('folderId', extra.folderId);
  return fetch('/api/documents', { // redirect géré par netlify
    method: 'POST',
    headers: authHeaders(),
    body: form
  }).then(r => r.json());
}

export function updateDocument(id: string, data: Partial<Pick<DocumentDTO,'name'|'type'|'description'|'tags'|'isFavorite'>>) {
  return api<DocumentDTO>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data), auth: true });
}

export function deleteDocument(id: string) {
  return api<{ message: string }>(`/documents/${id}`, { method: 'DELETE', auth: true });
}

export function syncMega(folderId?: string) {
  return api<{ message: string; syncedCount: number; updatedCount: number }>(`/documents/sync-mega`, { method: 'POST', body: JSON.stringify({ folderId }), auth: true });
}

export function getSimilarDocuments(documentId: string, limit = 5) {
  return api<{ documentId: string; limit: number; results: DocumentDTO[] }>(`/semantic/similar`, {
    auth: true,
    query: { documentId, limit }
  });
}

export function reindexDocumentEmbeddings(documentId: string) {
  return api<{ message: string }>(`/semantic/reindex`, {
    method: 'POST',
    body: JSON.stringify({ documentId }),
    auth: true,
  });
}

function authHeaders() {
  const t = loadStoredToken();
  return t ? { Authorization: 'Bearer ' + t } : {};
}
