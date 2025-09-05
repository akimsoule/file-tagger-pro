import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listRootFolders, listSubFolders, getFolder, createFolder, updateFolder, deleteFolder, moveDocument, getFolderPath, FolderDTO } from '@/lib/api/api-folders';

export function useFolders(parentId?: string) {
  return useQuery({
    queryKey: parentId ? ['folders', parentId] : ['folders', 'root'],
    queryFn: () => parentId ? listSubFolders(parentId) : listRootFolders(),
    staleTime: 30_000
  });
}

export function useFolder(id?: string) {
  return useQuery({ queryKey: ['folder', id], queryFn: () => getFolder(id!), enabled: !!id });
}

export function useFolderPath(id?: string) {
  return useQuery({ queryKey: ['folderPath', id], queryFn: () => getFolderPath(id!), enabled: !!id });
}

export function useFolderMutations() {
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: (data: { name: string; description?: string; color?: string; parentId?: string }) => createFolder(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['folders', vars.parentId || 'root'] });
    }
  });

  const updateMut = useMutation({
    mutationFn: (args: { id: string; data: Partial<Pick<FolderDTO,'name'|'description'|'color'|'parentId'>> }) => updateFolder(args.id, args.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['folder', vars.id] });
      qc.invalidateQueries({ queryKey: ['folders'] });
    }
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] })
  });

  const moveDocMut = useMutation({
    mutationFn: (args: { documentId: string; folderId?: string }) => moveDocument(args.documentId, args.folderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] })
  });

  return { createMut, updateMut, deleteMut, moveDocMut };
}
