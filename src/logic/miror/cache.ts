// Cache simple pour stocker les états précédents de nœuds avant mutation distante
// Permet un rollback en cas d'échec d'un appel API

import { FileTreeNode } from "../local/FileTreeNode";
import type { Document, Folder } from "@/contexts/file";

export interface Snapshot {
  id: string;
  data: Document | Folder; // Snapshot des données métier
  tags: {
    id: string;
    name: string;
    color: string;
    count: number;
    createdAt: Date;
    updatedAt: Date;
  }[];
  parentId?: string;
}

class NodeCache {
  private map = new Map<string, Snapshot>();

  take(node: FileTreeNode) {
    this.map.set(node.id, {
      id: node.id,
      data: { ...node.getData() },
      tags: node.tags.map((t) => ({ ...t })),
      parentId: node.parentId,
    });
  }

  get(id: string): Snapshot | undefined {
    return this.map.get(id);
  }

  pop(id: string): Snapshot | undefined {
    const snap = this.map.get(id);
    if (snap) this.map.delete(id);
    return snap;
  }

  clear() {
    this.map.clear();
  }
}

export const nodeCache = new NodeCache();
