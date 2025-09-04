import { useMemo } from 'react';
import { useFileContext } from '@/hooks/useFileContext';
import { useQuery } from '@/hooks/useQuery';
import { useTags } from '@/hooks/useTags';
import { FileTreeNode } from '@/logic/FileTreeNode';
import type { Document } from '@/contexts/file/def';

interface UseFavoriteNodesResult {
  favoriteNodes: FileTreeNode[];
  totalSize: number; // en octets
}

export function useFavoriteNodes(): UseFavoriteNodesResult {
  const { findNodeById } = useFileContext();
  const { getFilteredContent, getSortedContent, sortBy } = useQuery();
  const { selectedTags, tags } = useTags();

  // Traduire les IDs de tags en noms (documents stockent les noms)
  const selectedTagNames = useMemo(() => selectedTags.map(id => {
    const t = tags.find(tag => tag.id === id);
    return t ? t.name : id.replace(/^tag-/, '');
  }), [selectedTags, tags]);

  return useMemo(() => {
    const root = findNodeById('root') as FileTreeNode | null;
    if (!root) return { favoriteNodes: [], totalSize: 0 };

    // Collecter toutes les feuilles fichiers favorites
    const stack: FileTreeNode[] = [root];
    const favNodes: FileTreeNode[] = [];
    while (stack.length) {
      const node = stack.pop()!;
      if (node.type === 'file') {
        const doc = node.getData() as Document;
        if (doc.isFavorite) favNodes.push(node);
      }
      stack.push(...(node.children as FileTreeNode[]));
    }

    // Appliquer filtres (tags + recherche déjà géré côté getFilteredContent si query context utilise selectedTags & searchQuery)
    const docs = favNodes.map(n => n.getData() as Document);
    const filtered = getFilteredContent(docs).filter(doc => {
      // getFilteredContent applique déjà tags et search, mais il ne connaît que les noms -> déjà suffisant
      // On garde néanmoins ce hook prêt pour ajouter d'autres règles si besoin
      return true;
    });

    const sorted = getSortedContent(filtered);
    const sortedNodes = sorted
      .map(doc => favNodes.find(n => n.id === doc.id))
      .filter((n): n is FileTreeNode => !!n);

    const totalSize = sorted.reduce((acc, d) => acc + d.size, 0);

    return { favoriteNodes: sortedNodes, totalSize };
  }, [findNodeById, getFilteredContent, getSortedContent]);
}
