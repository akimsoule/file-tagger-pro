import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listDocuments, getDocument, createDocument, uploadDocument, updateDocument, deleteDocument, syncMega, DocumentDTO, PaginatedDocuments } from '@/lib/api/api-documents';

const DOCS_KEY = (params?: any) => ['documents', params]; // eslint-disable-line @typescript-eslint/no-explicit-any

export function useDocuments(params: { page?: number; limit?: number; search?: string; tag?: string; userId?: string } = {}) {
  return useQuery({ queryKey: DOCS_KEY(params), queryFn: () => listDocuments(params), staleTime: 30_000 });
}

export function useDocument(id?: string) {
  return useQuery({ queryKey: ['document', id], queryFn: () => getDocument(id!), enabled: !!id });
}

export function useDocumentMutations() {
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: (data: { name: string; type?: string; description?: string; tags?: string; folderId?: string }) => createDocument(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] })
  });

  const uploadMut = useMutation({
    mutationFn: (args: { file: File; extra?: { name?: string; description?: string; tags?: string; type?: string } }) => uploadDocument(args.file, args.extra),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] })
  });

  const updateMut = useMutation({
    mutationFn: (args: { id: string; data: Partial<Pick<DocumentDTO,'name'|'type'|'description'|'tags'|'isFavorite'>> }) => updateDocument(args.id, args.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['document', vars.id] });
      qc.invalidateQueries({ queryKey: ['documents'] });
    }
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] })
  });

  const syncMut = useMutation({
    mutationFn: (folderId?: string) => syncMega(folderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] })
  });

  return { createMut, uploadMut, updateMut, deleteMut, syncMut };
}
