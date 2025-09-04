import { useMemo } from 'react';
import { FileTreeNode } from '@/logic/FileTreeNode';
import type { Document } from '@/contexts/file/def';

/**
 * Calcule la taille totale (octets) d'une collection de nœuds fichiers.
 * Mémorisé sur la liste d'IDs + tailles.
 */
export function useTotalSize(fileNodes: FileTreeNode[]): number {
  return useMemo(() => {
    if (!fileNodes || fileNodes.length === 0) return 0;
    return fileNodes.reduce((acc, n) => {
      if (n.type === 'file') {
        const d = n.getData() as Document;
        return acc + (d.size || 0);
      }
      return acc;
    }, 0);
  }, [fileNodes]);
}
