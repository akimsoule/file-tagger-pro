import { FileTreeNode } from "../local/FileTreeNode";
import type { Document, Folder, Tag } from "@/contexts/file";
import { updateDocument, deleteDocument } from "@/lib/api/api-documents";
import { updateFolder, deleteFolder, moveDocument } from "@/lib/api/api-folders";
import type { FolderDTO } from "@/lib/api/api-folders";
import type { DocumentDTO } from "@/lib/api/api-documents";
import { nodeCache } from "./cache";

// Stratégie simple:
// - On garde EXACTEMENT les signatures synchrones de FileTreeNode (contrat inchangé)
// - Mise à jour optimiste locale immédiatement
// - Appel API asynchrone en arrière‑plan
// - En cas d'échec: rollback via snapshot + (optionnel) console.error
// - Pas d'attente côté UI => réactivité, mais cohérence garantie par rollback

type RemoteOp = () => Promise<unknown>;

export class FileTreeNodeApi extends FileTreeNode {
  private rollbackListeners: ((info: { nodeId: string; reason: unknown }) => void)[] = [];

  public onRollback(cb: (info: { nodeId: string; reason: unknown }) => void) {
    this.rollbackListeners.push(cb);
    return () => {
      this.rollbackListeners = this.rollbackListeners.filter(l => l !== cb);
    };
  }
  private optimistic<T>(nodeId: string, localMutate: () => T, remote?: RemoteOp): T {
    const root = this.getRoot() as FileTreeNode;
    const node = root.findChildById(nodeId) as FileTreeNode | undefined;
    if (node) nodeCache.take(node);
    const result = localMutate();
    if (remote) {
      remote().catch(err => {
  console.error('[FileTreeNodeApi] remote op failed -> rollback', err);
  this.rollback(nodeId);
  this.rollbackListeners.forEach(l => l({ nodeId, reason: err }));
      });
    }
    return result;
  }

  private rollback(nodeId: string) {
    const root = this.getRoot() as FileTreeNode;
    const node = root.findChildById(nodeId) as FileTreeNode | undefined;
    const snapshot = nodeCache.pop(nodeId);
    if (!node || !snapshot) return;
    node.updateData(snapshot.data as Partial<Document | Folder>);
    node.tags = snapshot.tags.map(t => ({ ...t } as Tag));
    if (snapshot.parentId !== node.parentId) {
      // Restaurer position si déplacé
      if (node.parent) node.parent.removeChild(node.id);
      if (snapshot.parentId) {
        const oldParent = root.findChildById(snapshot.parentId) as FileTreeNode | undefined;
        oldParent?.addChild(node);
      } else {
        // replacer sous la racine
        (root as FileTreeNode).addChild(node);
      }
    }
    node.updateStats();
  }

  // === Mutations conservant les signatures ===
  public override updateNodeFields(nodeId: string, updates: Partial<Document | Folder>): boolean {
    return this.optimistic<boolean>(nodeId, () => super.updateNodeFields(nodeId, updates), () => {
      const isFile = (this.findChildById(nodeId) as FileTreeNode | undefined)?.type === 'file';
      if (isFile) {
        const docPayload: Partial<DocumentDTO> = {};
        const allowed: (keyof DocumentDTO)[] = ['name','type','description','tags','isFavorite'];
        for (const k of allowed) {
          if (Object.prototype.hasOwnProperty.call(updates, k)) {
            const value = updates[k as keyof (Document | Folder)] as unknown;
            (docPayload as Record<string, unknown>)[k] = value;
          }
        }
        return updateDocument(nodeId, docPayload as Partial<DocumentDTO>);
      } else {
        const folderPayload: Partial<FolderDTO> = {};
  const allowedF: (keyof FolderDTO)[] = ['name','description','color','parentId','tags'];
        for (const k of allowedF) {
          if (Object.prototype.hasOwnProperty.call(updates, k)) {
            const value = updates[k as keyof (Document | Folder)] as unknown;
            (folderPayload as Record<string, unknown>)[k] = value;
          }
        }
        return updateFolder(nodeId, folderPayload as Partial<FolderDTO>);
      }
    });
  }

  public override toggleFavorite(nodeId: string, favorite: boolean): boolean {
    return this.optimistic<boolean>(nodeId, () => super.toggleFavorite(nodeId, favorite), () => {
      return updateDocument(nodeId, { isFavorite: favorite });
    });
  }

  public override relocateNode(nodeId: string, targetFolderId: string | null): boolean {
    const isFile = (this.findChildById(nodeId) as FileTreeNode | undefined)?.type === 'file';
    return this.optimistic<boolean>(nodeId, () => super.relocateNode(nodeId, targetFolderId), () => {
      return isFile
        ? moveDocument(nodeId, targetFolderId || undefined)
        : updateFolder(nodeId, { parentId: targetFolderId || undefined } as Partial<FolderDTO>);
    });
  }

  public override addTagToNode(nodeId: string, tagName: string): boolean {
    return this.optimistic<boolean>(nodeId, () => super.addTagToNode(nodeId, tagName), async () => {
      const node = this.findChildById(nodeId) as FileTreeNode | undefined;
      if (!node) return;
      const raw = (node.getData() as Document | Folder).tags || '';
      const tags = raw.split(',').filter(Boolean);
      if (!tags.includes(tagName)) tags.push(tagName);
      const newCsv = tags.join(',');
      if (node.type === 'file') await updateDocument(nodeId, { tags: newCsv });
      else await updateFolder(nodeId, { tags: newCsv } as Partial<FolderDTO>);
    });
  }

  public override removeTagFromNode(nodeId: string, tagName: string): boolean {
    return this.optimistic<boolean>(nodeId, () => super.removeTagFromNode(nodeId, tagName), async () => {
      const node = this.findChildById(nodeId) as FileTreeNode | undefined;
      if (!node) return;
      const raw = (node.getData() as Document | Folder).tags || '';
      const tags = raw.split(',').filter(Boolean).filter(t => t !== tagName);
      const newCsv = tags.join(',');
      if (node.type === 'file') await updateDocument(nodeId, { tags: newCsv });
      else await updateFolder(nodeId, { tags: newCsv } as Partial<FolderDTO>);
    });
  }

  public override deleteTagReferences(tagName: string): number {
    const impacted: string[] = [];
    for (const n of FileTreeNode.iterate(this.getRoot() as FileTreeNode)) {
      if (n.tags.some(t => t.name === tagName)) impacted.push(n.id);
    }
    impacted.forEach(id => {
      const node = (this.getRoot() as FileTreeNode).findChildById(id) as FileTreeNode | undefined;
      if (node) nodeCache.take(node);
    });
    const count = super.deleteTagReferences(tagName);
    // Remote batch en arrière-plan
    (async () => {
      try {
        for (const id of impacted) {
          const node = (this.getRoot() as FileTreeNode).findChildById(id) as FileTreeNode | undefined;
          if (!node) continue;
            const raw = (node.getData() as Document | Folder).tags || '';
            const tags = raw.split(',').filter(Boolean).filter(t => t !== tagName);
            const newCsv = tags.join(',');
            if (node.type === 'file') await updateDocument(id, { tags: newCsv });
            else await updateFolder(id, { tags: newCsv } as Partial<FolderDTO>);
        }
      } catch (e) {
        console.error('[FileTreeNodeApi] deleteTagReferences failed -> rollback', e);
        impacted.forEach(id => this.rollback(id));
  impacted.forEach(id => this.rollbackListeners.forEach(l => l({ nodeId: id, reason: e })));
      }
    })();
    return count;
  }

  public deleteNode(nodeId: string): boolean {
    const root = this.getRoot() as FileTreeNode;
    const node = root.findChildById(nodeId) as FileTreeNode | undefined;
    if (!node) return false;
    nodeCache.take(node);
    const parent = node.parent as FileTreeNode | undefined;
    const removed = parent?.removeChild(nodeId) ?? false;
    if (!removed) return false;
    (async () => {
      try {
        if (node.type === 'file') await deleteDocument(nodeId);
        else await deleteFolder(nodeId);
      } catch (e) {
        console.error('[FileTreeNodeApi] deleteNode failed -> rollback', e);
        if (parent) parent.addChild(node);
  this.rollbackListeners.forEach(l => l({ nodeId, reason: e }));
      }
    })();
    return true;
  }
}

