import TreeNode from "./TreeNode";
import type { Document, Folder, Tag } from "@/contexts/file";
import {
  computeTagStatsUtil,
  addTagUtil,
  removeTagUtil,
  purgeTagUtil,
  TagTreeNode,
} from "./treeTags.ts";
import { printTreeUtil } from "./treePrint.ts";
import type { TreeNodeType } from "@/types";

export interface FileNodeStats {
  totalSize: number;
  tagsCount: number;
  totalItems?: number;
  filesCount?: number;
  foldersCount?: number;
}

export class FileTreeNode extends TreeNode implements TagTreeNode {
  // ==================== Données internes ====================
  private data: Document | Folder;

  constructor(
    id: string,
    name: string,
    type: TreeNodeType,
    data: Document | Folder,
    stats?: FileNodeStats,
    parentId?: string
  ) {
    const tags = data.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((tag) => ({
        id: `tag-${tag}`,
        name: tag,
        color: "#000000",
        count: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

    super(id, name, type, tags, stats, parentId);
    this.data = data;
  }

  public getData(): Document | Folder {
    return this.data;
  }

  // TagTreeNode interface (retours typés)
  public override getRoot(): FileTreeNode {
    return super.getRoot() as FileTreeNode;
  }
  public override findChildById(id: string): FileTreeNode | undefined {
    return super.findChildById(id) as FileTreeNode | undefined;
  }

  // ==================== Factory statiques ====================
  public static createDocument(doc: Document): FileTreeNode {
    return new FileTreeNode(
      doc.id,
      doc.name,
      "file",
      doc,
      { totalSize: doc.size, tagsCount: 0 },
      doc.folderId
    );
  }

  public static createFolder(folder: Folder): FileTreeNode {
    return new FileTreeNode(
      folder.id,
      folder.name,
      "folder",
      folder,
      {
        totalSize: 0,
        tagsCount: 0,
        totalItems: 0,
        filesCount: 0,
        foldersCount: 0,
      },
      folder.parentId
    );
  }

  /**
   * Construit l'arbre racine complet à partir de listes de documents & dossiers.
   * Pré-condition: le dossier racine est synthétique (id="root").
   */
  public static buildRootTree(
    documents: Document[],
    folders: Folder[],
    options?: { debug?: boolean }
  ): FileTreeNode {
    // Créer le dossier racine avec ses propriétés minimales requises
    const root = FileTreeNode.createFolder({
      id: "root",
      name: "root", // Le nom doit être "root" pour que l'index soit initialisé
      parentId: null,
      tags: "",
      description: "Dossier racine",
      color: "#000000",
      ownerId: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Folder);

    // Créer une map des dossiers pour un accès rapide
    const folderMap = new Map<string, FileTreeNode>();
    folderMap.set("root", root);

    // Créer les nœuds de dossier et les ajouter à la map
    folders.forEach((folder) => {
      const node = FileTreeNode.createFolder(folder);
      folderMap.set(folder.id, node);
    });

    // Établir les relations parent-enfant pour les dossiers
    folders.forEach((folder) => {
      const currentNode = folderMap.get(folder.id);
      if (!currentNode) return;

      const parentNode = folderMap.get(folder.parentId || "root");
      if (parentNode) {
        parentNode.addChild(currentNode);
      }
    });

    // Ajouter les documents aux dossiers appropriés
    documents.forEach((doc) => {
      const node = FileTreeNode.createDocument(doc);
      const parentFolder = folderMap.get(doc.folderId || "root");
      if (parentFolder) {
        parentFolder.addChild(node);
      }
    });

    // Mettre à jour les statistiques de l'arbre complet
    root.updateStats();

  // Option debug supprimée: utilisation éventuelle future d'un logger dédié

    return root;
  }

  // ==================== Mutation bas niveau ====================
  public updateData(updates: Partial<Document | Folder>): void {
    this.data = { ...this.data, ...updates };

    if ("tags" in updates) {
      const now = new Date();
      this.tags = updates.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((tag) => ({
          id: `tag-${tag}`,
          name: tag,
          color: "#000000",
          count: 0,
          createdAt: now,
          updatedAt: now,
        }));
    }

    this.updateStats();
  }

  public calculateStats(): FileNodeStats {
    if (this.type === "file") {
      const doc = this.data as Document;
      return {
        totalSize: doc.size,
        tagsCount: this.tags.length,
      };
    }

    const stats = {
      totalSize: 0,
      tagsCount: this.tags.length,
      totalItems: this.children.length,
      filesCount: 0,
      foldersCount: 0,
    };

    for (const child of this.children) {
      const childNode = child as FileTreeNode;
      stats.tagsCount += childNode.tags.length;

      if (childNode.type === "file") {
        stats.filesCount++;
        stats.totalSize += (childNode.data as Document).size;
      } else {
        stats.foldersCount++;
        const childStats = childNode.stats as FileNodeStats;
        stats.totalSize += childStats.totalSize;
        stats.totalItems! += childStats.totalItems!;
        stats.filesCount! += childStats.filesCount!;
        stats.foldersCount! += childStats.foldersCount!;
      }
    }

    return stats;
  }

  // ==================== Informations dérivées ====================
  public getTagsInfo(): { id: string; name: string; count: number }[] {
    const tagsMap = new Map<
      string,
      { id: string; name: string; count: number }
    >();
    for (const node of FileTreeNode.iterate(this)) {
      for (const tag of node.tags) {
        const entry = tagsMap.get(tag.id) || {
          id: tag.id,
          name: tag.name,
          count: 0,
        };
        entry.count++;
        tagsMap.set(tag.id, entry);
      }
    }
    return [...tagsMap.values()];
  }

  public printTree(): string {
    return printTreeUtil(this.toPrintable());
  }

  /**
   * Générateur itératif DFS (pré-ordre) sans récursivité.
   */
  // ==================== Itération ====================
  public static *iterate(root: FileTreeNode): Generator<FileTreeNode> {
    const stack: FileTreeNode[] = [root];
    const visited = new Set<FileTreeNode>();
    while (stack.length) {
      const node = stack.pop()!;
      if (visited.has(node)) continue;
      visited.add(node);
      yield node;
      // Empiler les enfants en ordre inverse pour garder l'ordre naturel
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i] as FileTreeNode);
      }
    }
  }

  // ==================== Tags (agrégation + mutations) ====================

  /**
   * Construit la liste des tags (avec comptage) à partir de tout l'arbre.
   * - Préserve les couleurs précédentes si elles existent (via previousTags)
   * - Ajoute les tags custom manquants (avec leurs couleurs)
   * - Assigne des couleurs depuis la palette pour les nouveaux tags
   * - Trie par (count desc, puis nom asc)
   */
  /**
   * Construit la liste des tags agrégés avec comptage.
   * Garde les couleurs précédentes, fusionne les customs, applique la palette.
   */
  public computeTagStats(
    previousTags: Tag[],
    customTags: Tag[],
    palette: string[]
  ): Tag[] {
    return computeTagStatsUtil(
      this.toTagTree(),
      previousTags,
      customTags,
      palette
    );
  }

  /** Ajoute un tag (nom simple sans préfixe) à un nœud fichier/dossier. Retourne true si ajouté. */
  /** Ajoute un tag (nom simple sans préfixe) à un nœud. */
  public addTagToNode(nodeId: string, tagName: string): boolean {
    return addTagUtil(this.toTagTree(), nodeId, tagName);
  }

  /** Retire un tag (nom simple) d'un nœud. Retourne true si retiré. */
  /** Retire un tag d'un nœud. */
  public removeTagFromNode(nodeId: string, tagName: string): boolean {
    return removeTagUtil(this.toTagTree(), nodeId, tagName);
  }

  /** Supprime les références d'un tag dans tout l'arbre. Retourne le nombre de nœuds modifiés. */
  /** Supprime toutes les références d'un tag dans l'arbre. */
  public deleteTagReferences(tagName: string): number {
    return purgeTagUtil(this.toTagTree(), tagName);
  }

  // ==================== Adaptateurs utilitaires ====================
  private toPrintable() {
    interface Printable {
      id: string;
      name: string;
      type: string;
      children: Printable[];
    }
    const map = (n: FileTreeNode): Printable => ({
      id: n.id,
      name: n.name,
      type: n.type,
      children: (n.children as FileTreeNode[]).map((c) =>
        map(c as FileTreeNode)
      ),
    });
    return map(this);
  }

  private toTagTree() {
    type Data = Document | Folder;
    interface TNode {
      id: string;
      type: string;
      tags: { id: string; name: string }[];
      children: TNode[];
      getRoot(): TNode;
      findChildById(id: string): TNode | undefined;
      getData(): Data;
      updateData(updates: Partial<Data>): void;
    }
    const root = this.getRoot() as FileTreeNode;
    const build = (n: FileTreeNode): TNode => ({
      id: n.id,
      type: n.type,
      tags: n.tags.map((t) => ({ id: t.id, name: t.name })),
      children: (n.children as FileTreeNode[]).map((c) =>
        build(c as FileTreeNode)
      ),
      getRoot: () => build(root),
      findChildById: (id: string) => {
        const found = root.findChildById(id) as FileTreeNode | undefined;
        return found ? build(found) : undefined;
      },
      getData: () => n.getData() as Data,
      updateData: (updates: Partial<Data>) => n.updateData(updates),
    });
    return build(this);
  }

  // ==================== CRUD haut niveau ====================
  /** Crée un dossier si absent et retourne son nœud */
  public createFolderNode(folder: Folder): FileTreeNode {
    const root = this.getRoot() as FileTreeNode;
    const existing = root.findChildById(folder.id) as FileTreeNode | undefined;
    if (existing) return existing;
    const node = FileTreeNode.createFolder({
      ...folder,
      children: folder.children || [],
      documents: folder.documents || [],
      tags: folder.tags || "",
    });
    const parent = folder.parentId
      ? (root.findChildById(folder.parentId) as FileTreeNode | undefined)
      : root;
    (parent || root).addChild(node);
    return node;
  }

  /** Crée un document si absent et retourne son nœud */
  public createDocumentNode(doc: Document): FileTreeNode {
    const root = this.getRoot() as FileTreeNode;
    const existing = root.findChildById(doc.id) as FileTreeNode | undefined;
    if (existing) return existing;
    const node = FileTreeNode.createDocument(doc);
    const parent = doc.folderId
      ? (root.findChildById(doc.folderId) as FileTreeNode | undefined)
      : root;
    (parent || root).addChild(node);
    return node;
  }

  /** Mise à jour (optimiste) des données d'un nœud */
  public updateNodeFields(
    nodeId: string,
    updates: Partial<Document | Folder>
  ): boolean {
    const root = this.getRoot() as FileTreeNode;
    const node = root.findChildById(nodeId) as FileTreeNode | undefined;
    if (!node) return false;
    node.updateData(updates);
    return true;
  }

  /** Marque/Démarque un document favori */
  public toggleFavorite(nodeId: string, favorite: boolean): boolean {
    const root = this.getRoot() as FileTreeNode;
    const node = root.findChildById(nodeId) as FileTreeNode | undefined;
    if (!node || node.type !== "file") return false;
    node.updateData({ isFavorite: favorite } as Partial<Document>);
    return true;
  }

  /** Déplace un nœud vers une nouvelle destination */
  public relocateNode(nodeId: string, targetFolderId: string | null): boolean {
    const root = this.getRoot() as FileTreeNode;
    const node = root.findChildById(nodeId) as FileTreeNode | undefined;
    if (!node) return false;
    const oldParentId = node.parent?.id || "root";
    const newParentId = targetFolderId || "root";
    if (oldParentId === newParentId) return true;
    return root.moveNodeFrom(oldParentId, newParentId, nodeId);
  }

  // ==================== Navigation / Recherche ====================

  /** Retourne le chemin depuis la racine jusqu'à ce nœud */
  public getPath(): FileTreeNode[] {
    const path: FileTreeNode[] = [];
    // Démarre depuis ce noeud sans aliaser directement 'this'
    let cursor = this as FileTreeNode | undefined;
    const visited = new Set<string>();
    while (cursor && !visited.has(cursor.id)) {
      path.unshift(cursor);
      visited.add(cursor.id);
      cursor = cursor.parent as FileTreeNode | undefined;
    }
    return path;
  }

  /** Liste les dossiers selon un parent (null = racine) + filtre tags éventuel */
  public listFolders(
    parentId: string | null = null,
    tagFilter: string[] = []
  ): Folder[] {
    const root = this.getRoot() as FileTreeNode;
    const index = root.getRootIndex();
    const all: FileTreeNode[] = index
      ? (Array.from(index.values()) as FileTreeNode[])
      : [...FileTreeNode.iterate(root)];
    return all
      .filter(
        (n) =>
          n.type === "folder" &&
          (parentId === null ? !n.parentId : n.parentId === parentId) &&
          (tagFilter.length === 0 ||
            tagFilter.every((t) => n.tags.some((tag) => tag.id === t)))
      )
      .map((n) => n.getData() as Folder);
  }

  /** Récupère récursivement documents + sous-dossiers (filtrage par tags optionnel) */
  public getRecursiveContent(
    folderId?: string,
    tagFilter: string[] = []
  ): { documents: Document[]; subFolders: Folder[] } {
    const root = this.getRoot() as FileTreeNode;
    const start: FileTreeNode | undefined = folderId
      ? (root.findChildById(folderId) as FileTreeNode)
      : root;
    if (!start || start.type === "file")
      return { documents: [], subFolders: [] };

    const hasTags = (node: FileTreeNode) => {
      if (tagFilter.length === 0) return true;
      const ids = node.tags.map((t) => t.id);
      return tagFilter.every((t) => ids.includes(t));
    };

    const stack: FileTreeNode[] = [start];
    const acc: FileTreeNode[] = [];
    while (stack.length) {
      const current = stack.pop()!;
      for (const child of current.children as FileTreeNode[]) {
        if (hasTags(child)) {
          acc.push(child);
          if (child.type === "folder") stack.push(child);
        }
      }
    }
    const documents = acc
      .filter((n) => n.type === "file")
      .map((n) => n.getData() as Document);
    const subFolders = acc
      .filter((n) => n.type === "folder")
      .map((n) => {
        const data = n.getData() as Folder;
        data.children = n.children
          .filter((c) => c.type === "folder")
          .map((c) => (c as FileTreeNode).getData() as Folder);
        data.documents = n.children
          .filter((c) => c.type === "file")
          .map((c) => (c as FileTreeNode).getData() as Document);
        return data;
      });
    return { documents, subFolders };
  }

  /** Statistiques simples d'un dossier (items + taille totale des fichiers descendants) */
  public computeFolderStats(folderId: string): {
    totalItems: number;
    totalSize: number;
  } {
    const { documents, subFolders } = this.getRecursiveContent(folderId);
    return {
      totalItems: documents.length + subFolders.length,
      totalSize: documents.reduce((acc, d) => acc + d.size, 0),
    };
  }
}
