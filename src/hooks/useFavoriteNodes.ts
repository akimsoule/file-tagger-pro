import { useMemo } from 'react';
import { useFileContext } from '@/hooks/useFileContext';
import { useQuery } from '@/hooks/useQuery';
import { useTags } from '@/hooks/useTags';
import { FileTreeNode } from '@/logic/local/FileTreeNode';
import type { Document } from '@/contexts/file';

interface UseFavoriteNodesResult {
  favoriteNodes: FileTreeNode[];
  totalSize: number; // octets cumulés
}

export function useFavoriteNodes(): UseFavoriteNodesResult {
  const { currentNode } = useFileContext();
  const { getFilteredContent, getSortedContent } = useQuery();
  const { selectedTags, tags } = useTags();

  // Traduire les IDs de tags en noms (documents stockent les noms des tags, pas les IDs)
  const selectedTagNames = useMemo(() => selectedTags.map(id => {
    const t = tags.find(tag => tag.id === id);
    return t ? t.name : id.replace(/^tag-/, '');
  }), [selectedTags, tags]);

  return useMemo(() => {
  // On part de la racine implicite: remonter jusqu'au parent null depuis currentNode si dispo
  let root: FileTreeNode | null = currentNode || null;
  while (root && root.parent) root = root.parent as FileTreeNode;
  if (!root) return { favoriteNodes: [], totalSize: 0 };

  // Collecter toutes les feuilles fichiers favorites (parcours itératif pour éviter récursion profonde)
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

  const totalSize = sorted.reduce((acc, d) => acc + (d.size || 0), 0);

    return { favoriteNodes: sortedNodes, totalSize };
  }, [currentNode, getFilteredContent, getSortedContent]);
}
