import { useMemo } from 'react';
import { FileTreeNode } from '@/logic/local/FileTreeNode';
import type { Document } from '@/contexts/file';

/**
 * Calcule la taille totale (octets) d'une collection de nœuds fichiers.
 * Optimisation: mémorisation basée sur la référence du tableau et les tailles.
 */
export function useTotalSize(fileNodes: FileTreeNode[]): number {
  return useMemo(() => {
    if (!fileNodes || fileNodes.length === 0) return 0;
    return fileNodes.reduce((acc, n) => {
      if (n.type !== 'file') return acc;
      const d = n.getData() as Document;
      return acc + (d.size || 0);
    }, 0);
  }, [fileNodes]);
}
