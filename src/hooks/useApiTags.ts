import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listTags, getTag, deleteTag } from '@/lib/api/api-tags';

export function useTagsList(search?: string) {
  return useQuery({ queryKey: ['tags', search || 'all'], queryFn: () => listTags(search), staleTime: 60_000 });
}

export function useTag(name?: string) {
  return useQuery({ queryKey: ['tag', name], queryFn: () => getTag(name!), enabled: !!name });
}

export function useTagDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteTag(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] })
  });
}
