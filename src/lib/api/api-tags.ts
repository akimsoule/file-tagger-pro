import { api } from './api';

export interface TagDTO {
  name: string;
  count: number;
  createdAt?: string;
  updatedAt?: string;
}

export function listTags(search?: string) {
  const query = search ? { q: search } : undefined;
  return api<TagDTO[]>(`/tags`, { auth: true, query });
}

export function getTag(name: string) {
  return api<TagDTO>(`/tags/${encodeURIComponent(name)}`, { auth: true });
}

export function deleteTag(name: string) {
  return api<{ message: string; updatedDocuments: number }>(`/tags/${encodeURIComponent(name)}`, { method: 'DELETE', auth: true });
}
