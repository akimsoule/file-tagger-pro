import { FileTreeNode } from "../local/FileTreeNode";
import type { Document, Folder, Tag } from "@/contexts/file";
import { updateDocument, deleteDocument } from "@/lib/api/api-documents";
import {
  updateFolder,
  deleteFolder,
  moveDocument,
} from "@/lib/api/api-folders";
import type { FolderDTO } from "@/lib/api/api-folders";
import type { DocumentDTO } from "@/lib/api/api-documents";
import { nodeCache } from "./cache";
import { getFullTree } from "@/lib/api/api-tree";
import type { TreeFolderDTO } from "@/lib/api/api-tree";

// Stratégie simple:
// - On garde EXACTEMENT les signatures synchrones de FileTreeNode (contrat inchangé)
// - Mise à jour optimiste locale immédiatement
// - Appel API asynchrone en arrière‑plan
// - En cas d'échec: rollback via snapshot + (optionnel) console.error
// - Pas d'attente côté UI => réactivité, mais cohérence garantie par rollback

type RemoteOp = () => Promise<unknown>;

export class FileTreeNodeApi extends FileTreeNode {
  private rollbackListeners: ((info: {
    nodeId: string;
    reason: unknown;
  }) => void)[] = [];

  public onRollback(cb: (info: { nodeId: string; reason: unknown }) => void) {
    this.rollbackListeners.push(cb);
    return () => {
      this.rollbackListeners = this.rollbackListeners.filter((l) => l !== cb);
    };
  }
  private optimistic<T>(
    nodeId: string,
    localMutate: () => T,
    remote?: RemoteOp
  ): T {
    const root = this.getRoot() as FileTreeNode;
    const node = root.findChildById(nodeId) as FileTreeNode | undefined;
    if (node) nodeCache.take(node);
    const result = localMutate();
    if (remote) {
      remote().catch((err) => {
        console.error("[FileTreeNodeApi] remote op failed -> rollback", err);
        this.rollback(nodeId);
        this.rollbackListeners.forEach((l) => l({ nodeId, reason: err }));
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
    node.tags = snapshot.tags.map((t) => ({ ...t } as Tag));
    if (snapshot.parentId !== node.parentId) {
      // Restaurer position si déplacé
      if (node.parent) node.parent.removeChild(node.id);
      if (snapshot.parentId) {
        const oldParent = root.findChildById(snapshot.parentId) as
          | FileTreeNode
          | undefined;
        oldParent?.addChild(node);
      } else {
        // replacer sous la racine
        (root as FileTreeNode).addChild(node);
      }
    }
    node.updateStats();
  }

  // === Mutations conservant les signatures ===
  public override updateNodeFields(
    nodeId: string,
    updates: Partial<Document | Folder>
  ): boolean {
    return this.optimistic<boolean>(
      nodeId,
      () => super.updateNodeFields(nodeId, updates),
      () => {
        const isFile =
          (this.findChildById(nodeId) as FileTreeNode | undefined)?.type ===
          "file";
        if (isFile) {
          const docPayload: Partial<DocumentDTO> = {};
          const allowed: (keyof DocumentDTO)[] = [
            "name",
            "type",
            "description",
            "tags",
            "isFavorite",
          ];
          for (const k of allowed) {
            if (Object.prototype.hasOwnProperty.call(updates, k)) {
              const value = updates[k as keyof (Document | Folder)] as unknown;
              (docPayload as Record<string, unknown>)[k] = value;
            }
          }
          return updateDocument(nodeId, docPayload as Partial<DocumentDTO>);
        } else {
          const folderPayload: Partial<FolderDTO> = {};
          const allowedF: (keyof FolderDTO)[] = [
            "name",
            "description",
            "color",
            "parentId",
            "tags",
          ];
          for (const k of allowedF) {
            if (Object.prototype.hasOwnProperty.call(updates, k)) {
              const value = updates[k as keyof (Document | Folder)] as unknown;
              (folderPayload as Record<string, unknown>)[k] = value;
            }
          }
          return updateFolder(nodeId, folderPayload as Partial<FolderDTO>);
        }
      }
    );
  }

  public override toggleFavorite(nodeId: string, favorite: boolean): boolean {
    return this.optimistic<boolean>(
      nodeId,
      () => super.toggleFavorite(nodeId, favorite),
      () => {
        return updateDocument(nodeId, { isFavorite: favorite });
      }
    );
  }

  public override relocateNode(
    nodeId: string,
    targetFolderId: string | null
  ): boolean {
    const isFile =
      (this.findChildById(nodeId) as FileTreeNode | undefined)?.type === "file";
    return this.optimistic<boolean>(
      nodeId,
      () => super.relocateNode(nodeId, targetFolderId),
      () => {
        return isFile
          ? moveDocument(nodeId, targetFolderId || undefined)
          : updateFolder(nodeId, {
              parentId: targetFolderId || undefined,
            } as Partial<FolderDTO>);
      }
    );
  }

  public override addTagToNode(nodeId: string, tagName: string): boolean {
    return this.optimistic<boolean>(
      nodeId,
      () => super.addTagToNode(nodeId, tagName),
      async () => {
        const node = this.findChildById(nodeId) as FileTreeNode | undefined;
        if (!node) return;
        const raw = (node.getData() as Document | Folder).tags || "";
        const tags = raw.split(",").filter(Boolean);
        if (!tags.includes(tagName)) tags.push(tagName);
        const newCsv = tags.join(",");
        if (node.type === "file")
          await updateDocument(nodeId, { tags: newCsv });
        else await updateFolder(nodeId, { tags: newCsv } as Partial<FolderDTO>);
      }
    );
  }

  public override removeTagFromNode(nodeId: string, tagName: string): boolean {
    return this.optimistic<boolean>(
      nodeId,
      () => super.removeTagFromNode(nodeId, tagName),
      async () => {
        const node = this.findChildById(nodeId) as FileTreeNode | undefined;
        if (!node) return;
        const raw = (node.getData() as Document | Folder).tags || "";
        const tags = raw
          .split(",")
          .filter(Boolean)
          .filter((t) => t !== tagName);
        const newCsv = tags.join(",");
        if (node.type === "file")
          await updateDocument(nodeId, { tags: newCsv });
        else await updateFolder(nodeId, { tags: newCsv } as Partial<FolderDTO>);
      }
    );
  }

  public override deleteTagReferences(tagName: string): number {
    const impacted: string[] = [];
    for (const n of FileTreeNode.iterate(this.getRoot() as FileTreeNode)) {
      if (n.tags.some((t) => t.name === tagName)) impacted.push(n.id);
    }
    impacted.forEach((id) => {
      const node = (this.getRoot() as FileTreeNode).findChildById(id) as
        | FileTreeNode
        | undefined;
      if (node) nodeCache.take(node);
    });
    const count = super.deleteTagReferences(tagName);
    // Remote batch en arrière-plan
    (async () => {
      try {
        for (const id of impacted) {
          const node = (this.getRoot() as FileTreeNode).findChildById(id) as
            | FileTreeNode
            | undefined;
          if (!node) continue;
          const raw = (node.getData() as Document | Folder).tags || "";
          const tags = raw
            .split(",")
            .filter(Boolean)
            .filter((t) => t !== tagName);
          const newCsv = tags.join(",");
          if (node.type === "file") await updateDocument(id, { tags: newCsv });
          else await updateFolder(id, { tags: newCsv } as Partial<FolderDTO>);
        }
      } catch (e) {
        console.error(
          "[FileTreeNodeApi] deleteTagReferences failed -> rollback",
          e
        );
        impacted.forEach((id) => this.rollback(id));
        impacted.forEach((id) =>
          this.rollbackListeners.forEach((l) => l({ nodeId: id, reason: e }))
        );
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
        if (node.type === "file") await deleteDocument(nodeId);
        else await deleteFolder(nodeId);
      } catch (e) {
        console.error("[FileTreeNodeApi] deleteNode failed -> rollback", e);
        if (parent) parent.addChild(node);
        this.rollbackListeners.forEach((l) => l({ nodeId, reason: e }));
      }
    })();
    return true;
  }

  // === Outils d'inspection du cache (debug/observabilité) ===
  public static cacheSize(): number {
    return nodeCache.size();
  }
  public static cacheKeys(): string[] {
    return nodeCache.keys();
  }
  public static cacheSummary(): ReadonlyArray<{
    id: string;
    parentId?: string;
    tagCount: number;
  }> {
    return nodeCache.summary();
  }

  // === Chargement complet de l'arbre depuis l'API ===
  public static async buildFromRemoteTree(
    ownerId: string
  ): Promise<FileTreeNodeApi | null> {
    // Prepare to rollback cache on failure
    const prevCache = nodeCache.entries();
    try {
      const res = await getFullTree();
      if (!res.tree) return null;

      const apiTreeRoot = res.tree;
    const makeFolderData = (f: TreeFolderDTO): Folder => ({
      id: f.id,
      name: f.name,
      description: f.description || "",
      color: f.color || "#000000",
      ownerId,
      parentId: f.parentId || undefined,
      children: [],
      documents: [],
      tags: f.tags || "",
      createdAt: new Date(f.createdAt),
      updatedAt: new Date(f.updatedAt),
    });

    if (apiTreeRoot.isRoot && apiTreeRoot.parentId == null) {
      const rootApi = new FileTreeNodeApi(
        apiTreeRoot.id,
        apiTreeRoot.name,
        "folder",
        makeFolderData(apiTreeRoot),
        {
          totalSize: 0,
          tagsCount: 0,
          totalItems: 0,
          filesCount: 0,
          foldersCount: 0,
        },
        undefined
      );

      interface StackItem {
        dto: TreeFolderDTO;
        node: FileTreeNodeApi;
      }
      const stack: StackItem[] = [{ dto: apiTreeRoot, node: rootApi }];
      while (stack.length) {
        const { dto, node } = stack.pop()!;
        // Documents
        for (const d of dto.documents) {
          const doc: Document = {
            id: d.id,
            name: d.name,
            type: d.type,
            size: d.size,
            description: d.description || "",
            tags: d.tags || "",
            fileId: d.id,
            hash: "",
            ownerId,
            folderId: d.folderId || undefined,
            isFavorite: d.isFavorite,
            createdAt: new Date(d.createdAt),
            modifiedAt: new Date(d.modifiedAt),
          };
          node.addChild(FileTreeNode.createDocument(doc));
        }
        // Sous-dossiers
        for (let i = dto.folders.length - 1; i >= 0; i--) {
          const childDto = dto.folders[i];
          const folderData = makeFolderData(childDto);
          const folderNode = FileTreeNode.createFolder(folderData);
          node.addChild(folderNode);
          stack.push({ dto: childDto, node: folderNode as FileTreeNodeApi });
        }
      }
  rootApi.updateStats();
  // Success: reset cache to a lean initial state and snapshot the new root
  nodeCache.clear();
  nodeCache.take(rootApi);
  return rootApi;
    }

    // Fallback: reconstruire via méthode générique (synthetic root)
    const folders: Folder[] = [];
    const documents: Document[] = [];
    const stack: TreeFolderDTO[] = [apiTreeRoot];
    while (stack.length) {
      const f = stack.pop()!;
      folders.push({
        id: f.id,
        name: f.name,
        description: f.description || "",
        color: f.color || "#000000",
        ownerId,
        parentId: f.parentId || undefined,
        children: [],
        documents: [],
        tags: f.tags || "",
        createdAt: new Date(f.createdAt),
        updatedAt: new Date(f.updatedAt),
      });
      for (const d of f.documents) {
        documents.push({
          id: d.id,
          name: d.name,
          type: d.type,
          size: d.size,
          description: d.description || "",
          tags: d.tags || "",
          fileId: d.id,
          hash: "",
          ownerId,
          folderId: d.folderId || undefined,
          isFavorite: d.isFavorite,
          createdAt: new Date(d.createdAt),
          modifiedAt: new Date(d.modifiedAt),
        });
      }
      for (let i = f.folders.length - 1; i >= 0; i--) stack.push(f.folders[i]);
    }
      const syntheticRoot = FileTreeNode.buildRootTree(documents, folders);
      const apiRoot = new FileTreeNodeApi(
        syntheticRoot.id,
        syntheticRoot.name,
        syntheticRoot.type,
        syntheticRoot.getData() as Folder,
        syntheticRoot.stats,
        syntheticRoot.parentId
      );
      for (const child of syntheticRoot.children) apiRoot.addChild(child);
      apiRoot.updateStats();
      // Success: reset cache to a lean initial state and snapshot the synthetic root
      nodeCache.clear();
      nodeCache.take(apiRoot);
      return apiRoot;
    } catch (e) {
      // Restore previous cache state to allow rollbacks of in-flight mutations
      nodeCache.restore(prevCache);
      // Emit a global rollback-like notification via console for visibility
      console.error('[FileTreeNodeApi] buildFromRemoteTree failed -> cache restored', e);
      return null;
    }
  }
}
