import { api, loadStoredToken } from "./api";
import { createResourceCache, type CacheOptions } from "./resource-cache";


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

export interface FilePreviewDTO {
  documentId: string;
  name: string;
  type: string;
  dataUrl: string;
  size: number;
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

// Cache mémoire pour les aperçus (base64 potentiellement volumineux)
const previewCache = createResourceCache<FilePreviewDTO>(10 * 60 * 1000);

/**
 * Récupère l'aperçu base64 d'un document, avec cache mémoire.
 * @param id ID du document
 * @param opts.force si true, ignore le cache
 * @param opts.ttlMs durée de vie du cache en ms (par défaut 10 min)
 */
export function getDocumentPreview(id: string, opts?: CacheOptions) {
  return previewCache.get(
    id,
    () => api<FilePreviewDTO>(`/files/${id}`, { auth: true, query: { type: "base64" } }),
    opts
  );
}

/**
 * Invalide le cache des aperçus (tout ou par id)
 */
export function invalidateDocumentPreviewCache(id?: string) {
  previewCache.invalidate(id);
}

// --- Similarité & embeddings (endpoints exposés par la fonction `search`) ---

export interface SimilarDocumentsResponse {
  documentId: string;
  results: DocumentDTO[];
}

export function getSimilarDocuments(documentId: string, limit = 5) {
  return api<SimilarDocumentsResponse>(`/search/similar`, {
    auth: true,
    query: { documentId, limit }
  });
}

export function reindexDocumentEmbeddings(documentId: string) {
  // Implémentation côté serveur non bloquante (stub) qui renvoie un message de succès
  return api<{ message: string }>(`/search/reindex-document`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ documentId })
  });
}

function authHeaders() {
  const t = loadStoredToken();
  return t ? { Authorization: 'Bearer ' + t } : {};
}
