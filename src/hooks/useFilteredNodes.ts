import { useMemo, useCallback } from 'react';
import { useFileContext } from '@/hooks/useFileContext';
import { useQuery } from '@/hooks/useQuery';
import { FileTreeNode } from '@/logic/local/FileTreeNode';
import type { Document, Folder } from '@/contexts/file';
import type { FileNodeStats } from '@/logic/local/FileTreeNode';
import { useSelectedTagNames } from '@/hooks/useSelectedTagNames';
import { sortFolders } from '@/lib/sort';
import { resolveFolderSize } from '@/lib/size';

interface FilteredNodesResult {
  folders: FileTreeNode[];
  documents: FileTreeNode[];
  hasActiveFilter: boolean; // vrai si tags ou recherche actifs
}

export function useFilteredNodes(currentNode: FileTreeNode | null): FilteredNodesResult {
  const { currentNode: ctxCurrent } = useFileContext();
  const { getFilteredContent, getSortedContent, searchQuery, sortBy } = useQuery();
  const { selectedTagNames } = useSelectedTagNames();

  const hasActiveFilter = selectedTagNames.length > 0 || !!searchQuery; // vrai si tags ou recherche actifs

  // Collecte récursive seulement si filtrage actif
  const collectDescendants = useCallback((node: FileTreeNode): FileTreeNode[] => {
    const stack: FileTreeNode[] = [node];
    const collected: FileTreeNode[] = [];
    while (stack.length) {
      const n = stack.pop()!;
      if (n !== node) collected.push(n);
      if (n.children.length) stack.push(...(n.children as FileTreeNode[]));
    }
    return collected;
  }, []);

  return useMemo(() => {
    const target = currentNode || ctxCurrent;
    const baseNodes = target
      ? hasActiveFilter
        ? collectDescendants(target)
        : (target.children as FileTreeNode[])
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
      const folderData = filteredFolderNodes.map(f => f.getData() as Folder);
      const sortedFolderData = sortFolders(folderData, sortBy, folder => resolveFolderSize(folder, filteredFolderNodes));
      filteredFolderNodes = sortedFolderData.map(f => filteredFolderNodes.find(n => n.id === f.id)!)
    }

    return {
      folders: filteredFolderNodes,
      documents: filteredDocumentNodes,
      hasActiveFilter
    };
  }, [currentNode, ctxCurrent, hasActiveFilter, getFilteredContent, getSortedContent, selectedTagNames, searchQuery, sortBy, collectDescendants]);
}
