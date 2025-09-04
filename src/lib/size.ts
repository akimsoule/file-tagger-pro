import { FileTreeNode } from '@/logic/FileTreeNode';
import type { Document, Folder } from '@/contexts/file/def';
import type { FileNodeStats } from '@/logic/FileTreeNode';

/**
 * Retourne la taille (octets) d'un nœud fichier.
 */
export function getFileNodeSize(node: FileTreeNode): number {
  const data = node.getData() as Document;
  return data.size || 0;
}

/**
 * Calcule récursivement la taille d'un dossier si les stats ne sont pas déjà présentes.
 */
function computeFolderSizeRecursively(node: FileTreeNode): number {
  let total = 0;
  for (const child of node.children as FileTreeNode[]) {
    if (child.type === 'file') {
      total += getFileNodeSize(child);
    } else {
      // Utiliser stats si disponibles pour éviter descente récursive complète
      const stats = child.stats as FileNodeStats | undefined;
      if (stats && typeof stats.totalSize === 'number') {
        total += stats.totalSize;
      } else {
        total += computeFolderSizeRecursively(child);
      }
    }
  }
  return total;
}

/**
 * Retourne la taille (octets) d'un nœud dossier (agrégée) en utilisant stats si disponibles, sinon recalcul.
 */
export function getFolderNodeSize(node: FileTreeNode): number {
  const stats = node.stats as FileNodeStats | undefined;
  if (stats && typeof stats.totalSize === 'number') {
    return stats.totalSize;
  }
  return computeFolderSizeRecursively(node);
}

/**
 * Abstraction unique pour récupérer la taille d'un nœud (fichier ou dossier).
 */
export function getNodeSize(node: FileTreeNode): number {
  return node.type === 'file' ? getFileNodeSize(node) : getFolderNodeSize(node);
}

/**
 * Helper pour récupérer la taille d'un Folder (objet data) en recherchant son nœud.
 * On passe la liste des nœuds dossiers correspondants.
 */
export function resolveFolderSize(folder: Folder, folderNodes: FileTreeNode[]): number {
  const node = folderNodes.find(n => n.id === folder.id);
  if (!node) return 0;
  return getFolderNodeSize(node);
}
