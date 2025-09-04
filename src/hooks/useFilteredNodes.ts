import { useMemo } from 'react';
import { useFileContext } from '@/hooks/useFileContext';
import { useQuery } from '@/hooks/useQuery';
import { useTags } from '@/hooks/useTags';
import { FileTreeNode } from '@/logic/FileTreeNode';
import type { Document, Folder } from '@/contexts/file/def';
import type { FileNodeStats } from '@/logic/FileTreeNode';

interface FilteredNodesResult {
  folders: FileTreeNode[];
  documents: FileTreeNode[];
  hasActiveFilter: boolean;
}

export function useFilteredNodes(currentNode: FileTreeNode | null): FilteredNodesResult {
  const { getNodeContent } = useFileContext();
  const { getFilteredContent, getSortedContent, searchQuery, sortBy } = useQuery();
  const { selectedTags, tags } = useTags();

  const selectedTagNames = useMemo(() => selectedTags.map(id => {
    const t = tags.find(tag => tag.id === id);
    return t ? t.name : id.replace(/^tag-/, '');
  }), [selectedTags, tags]);

  const hasActiveFilter = selectedTagNames.length > 0 || !!searchQuery;

  // Collecte récursive seulement si filtrage actif
  const collectDescendants = (node: FileTreeNode): FileTreeNode[] => {
    const stack: FileTreeNode[] = [node];
    const collected: FileTreeNode[] = [];
    while (stack.length) {
      const n = stack.pop()!;
      if (n !== node) collected.push(n);
      stack.push(...(n.children as FileTreeNode[]));
    }
    return collected;
  };

  return useMemo(() => {
    const baseNodes = currentNode
      ? hasActiveFilter
        ? collectDescendants(currentNode)
        : (getNodeContent(currentNode) as FileTreeNode[])
      : [];

    const documentNodes = baseNodes.filter(n => n.type === 'file') as FileTreeNode[];
    const folderNodes = baseNodes.filter(n => n.type === 'folder') as FileTreeNode[];

    // Filtrage documents via contexte
    const docData = documentNodes.map(n => n.getData() as Document);
    const filteredDocData = getFilteredContent(docData);
    const sortedDocs = getSortedContent(filteredDocData);
    const filteredDocumentNodes = sortedDocs
      .map(doc => documentNodes.find(n => n.id === doc.id))
      .filter((n): n is FileTreeNode => !!n);

    // Filtrage dossiers
    let filteredFolderNodes = folderNodes;
    if (selectedTagNames.length > 0 || searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredFolderNodes = folderNodes.filter(node => {
        const data = node.getData() as Folder;
        if (selectedTagNames.length > 0) {
          const folderTags = (data.tags || '').split(',').map(t => t.trim()).filter(Boolean);
            if (!selectedTagNames.every(tag => folderTags.includes(tag))) return false;
        }
        if (searchQuery) {
          const nameMatch = data.name.toLowerCase().includes(q);
          const descMatch = data.description?.toLowerCase().includes(q);
          if (!nameMatch && !descMatch) return false;
        }
        return true;
      });
    }

    // Tri des dossiers (même logique que documents, mais adapté aux champs Folder)
    if (filteredFolderNodes.length > 1) {
      filteredFolderNodes = [...filteredFolderNodes].sort((a, b) => {
        const aData = a.getData() as Folder;
        const bData = b.getData() as Folder;
        switch (sortBy) {
          case 'name':
            return aData.name.localeCompare(bData.name);
          case 'type':
            // On peut considérer tous les dossiers comme même type → fallback tri par nom
            return aData.name.localeCompare(bData.name);
          case 'size': {
            const aSize = ((a.stats as FileNodeStats)?.totalSize) || 0;
            const bSize = ((b.stats as FileNodeStats)?.totalSize) || 0;
            return aSize - bSize; // cohérent avec documents (ascendant)
          }
          case 'date': {
            const aDate = new Date(aData.updatedAt || aData.createdAt).getTime();
            const bDate = new Date(bData.updatedAt || bData.createdAt).getTime();
            return bDate - aDate; // plus récent d'abord (cohérent avec documents)
          }
          default:
            return 0;
        }
      });
    }

    return {
      folders: filteredFolderNodes,
      documents: filteredDocumentNodes,
      hasActiveFilter
    };
  }, [currentNode, hasActiveFilter, getNodeContent, getFilteredContent, getSortedContent, selectedTagNames, searchQuery, sortBy]);
}
