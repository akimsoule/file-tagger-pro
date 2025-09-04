import { FolderStats, Stats, Tag, TreeNodeType } from "@/types";

interface TreeNodeJSON {
  id: string;
  name: string;
  type: TreeNodeType;
  tags: Tag[];
  stats: Stats;
  parentId?: string;
  children: TreeNodeJSON[];
}

export default class TreeNode {
  public id: string;
  public name: string;
  public type: TreeNodeType;
  public tags: Tag[] = [];
  public stats: Stats;
  public parentId?: string;
  public children: TreeNode[] = [];
  public parent?: TreeNode;
  private rootIndex?: Map<string, TreeNode>; // uniquement pour le noeud racine

  constructor(
    id: string,
    name: string,
    type: TreeNodeType,
    tags: Tag[] = [],
    stats?: Stats,
    parentId?: string
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.tags = [...tags];
    this.stats = stats || this.createDefaultStats();
    this.parentId = parentId;
    
    if (name === "root") {
      this.rootIndex = new Map();
      this.rootIndex.set(this.id, this);
    }
  }

  // === PROPRIÉTÉS ET UTILITAIRES DE BASE ===

  public isRoot(): boolean {
    return this.rootIndex !== undefined;
  }

  public getRoot(): TreeNode {
    if (!this.parent) return this;
    
    const visited = new Set<string>();
    let parent = this.parent;
    
    while (parent.parent && !visited.has(parent.id)) {
      visited.add(parent.id);
      parent = parent.parent;
    }
    
    return parent;
  }

  private createDefaultStats(): Stats {
    return this.type === "file" 
      ? { totalSize: 0, tagsCount: 0 } as Stats
      : { totalSize: 0, tagsCount: 0, totalItems: 0, filesCount: 0, foldersCount: 0 } as FolderStats;
  }

  private indexNode(node: TreeNode): void {
    const root = this.getRoot();
    if (root.rootIndex) {
      root.rootIndex.set(node.id, node);
    }
  }

  private removeFromIndex(node: TreeNode): void {
    const root = this.getRoot();
    if (!root.rootIndex) return;

    const stack = [node];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      root.rootIndex.delete(current.id);
      stack.push(...current.children.filter(child => !visited.has(child.id)));
    }
  }

  // === RECHERCHE ===

  private findChild(predicate: (node: TreeNode) => boolean): TreeNode | undefined {
    if (predicate(this)) return this;

    // Optimisation avec index si disponible et recherche par ID
    const root = this.getRoot();
    if (root.rootIndex && this.isRoot()) {
      for (const [id, node] of root.rootIndex) {
        if (predicate(node)) return node;
      }
      return undefined;
    }

    const stack: TreeNode[] = [...this.children];
    const visited = new Set<string>([this.id]);

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      if (predicate(current)) return current;
      
      stack.push(...current.children.filter(child => !visited.has(child.id)));
    }

    return undefined;
  }

  public findChildById(childId: string): TreeNode | undefined {
    return this.findChild(node => node.id === childId);
  }

  public findChildByName(childName: string): TreeNode | undefined {
    return this.findChild(node => node.name === childName);
  }

  // === VALIDATION ET SÉCURITÉ ===

  private wouldCreateCycle(potentialChild: TreeNode): boolean {
    // Vérification directe
    if (this.id === potentialChild.id) return true;
    
    // Vérifier si potentialChild a this comme descendant
    if (potentialChild.findChildById(this.id)) return true;
    
    // Vérifier si this est descendant de potentialChild via la hiérarchie parent
    if (!this.parent) return false;
    
    const visited = new Set<string>();
    let currentParent = this.parent;
    
    while (currentParent && !visited.has(currentParent.id)) {
      if (currentParent.id === potentialChild.id) return true;
      visited.add(currentParent.id);
      currentParent = currentParent.parent;
    }
    
    return false;
  }

  private isDuplicate(child: TreeNode): boolean {
    return this.children.some(c => c.id === child.id) || child.parent === this;
  }

  private validateTag(tag: Tag): boolean {
    return tag && typeof tag.id === "string" && tag.id.trim().length > 0;
  }

  // === GESTION DES ENFANTS ===

  private detachFromOldParent(child: TreeNode): void {
    if (!child.parent) return;
    
    child.parent.children = child.parent.children.filter(c => c !== child);
    child.parent.updateStats();
    child.parent = undefined;
  }

  private attachChild(child: TreeNode): void {
    child.parentId = this.id;
    child.parent = this;
    this.children.push(child);
    
    // Indexer le nœud et ses descendants
    this.indexNodeRecursively(child);
  }

  private indexNodeRecursively(node: TreeNode): void {
    const root = this.getRoot();
    if (!root.rootIndex) return;

    const stack = [node];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      root.rootIndex.set(current.id, current);
      stack.push(...current.children.filter(child => !visited.has(child.id)));
    }
  }

  public addChild(child: TreeNode): boolean {
    if (this.wouldCreateCycle(child)) return false;
    if (this.isDuplicate(child)) return false;
    
    this.detachFromOldParent(child);
    this.attachChild(child);
    this.updateStats();
    
    return true;
  }

  public removeChild(childId: string): boolean {
    const childIndex = this.children.findIndex(child => child.id === childId);
    if (childIndex === -1) return false;

    const child = this.children[childIndex];
    child.parent = undefined;
    
    this.removeFromIndex(child);
    this.children.splice(childIndex, 1);
    this.updateStats();

    return true;
  }

  public moveNodeFrom(oldParentId: string, newParentId: string, childId: string): boolean {
    const root = this.getRoot();
    const oldParent = root.findChildById(oldParentId);
    const newParent = root.findChildById(newParentId);
    const child = oldParent?.children.find(c => c.id === childId);

    if (!oldParent || !newParent || !child) return false;

    return newParent.addChild(child);
  }

  // === GESTION DES PROPRIÉTÉS ===

  public updateId(newId: string): void {
    const root = this.getRoot();
    if (root.rootIndex) {
      root.rootIndex.delete(this.id);
      root.rootIndex.set(newId, this);
    }
    this.id = newId;
  }

  public updateName(newName: string): void {
    this.name = newName;
  }

  // === GESTION DES TAGS ===

  public addTag(tag: Tag): boolean {
    if (!this.validateTag(tag)) return false;
    if (this.tags.some(t => t.id === tag.id)) return false;
    
    this.tags.push(tag);
    this.updateStats();
    return true;
  }

  public removeTag(tag: Tag): boolean {
    if (!this.validateTag(tag)) return false;
    
    const initialLength = this.tags.length;
    this.tags = this.tags.filter(t => t.id !== tag.id);
    
    if (this.tags.length < initialLength) {
      this.updateStats();
      return true;
    }
    return false;
  }

  // === GESTION DES STATISTIQUES ===

  private calculateFolderStats(): FolderStats {
    const initial: FolderStats = {
      totalSize: 0,
      tagsCount: this.tags.length,
      totalItems: this.children.length,
      filesCount: 0,
      foldersCount: 0
    };

    return this.children.reduce((acc, child) => {
      acc.tagsCount += child.tags.length;
      
      if (child.type === "file") {
        acc.filesCount++;
        acc.totalSize += (child.stats as Stats).totalSize;
      } else {
        acc.foldersCount++;
        const folderStats = child.stats as FolderStats;
        acc.totalSize += folderStats.totalSize;
        acc.totalItems += folderStats.totalItems;
        acc.filesCount += folderStats.filesCount;
        acc.foldersCount += folderStats.foldersCount;
      }
      
      return acc;
    }, initial);
  }

  public updateStats(): void {
    if (this.type === "file") {
      this.stats = { totalSize: 0, tagsCount: this.tags.length } as Stats;
    } else {
      this.stats = this.calculateFolderStats();
    }
  }

  public setParent(parentId: string): void {
    this.parentId = parentId;
  }

  // === UTILITAIRES DE MANIPULATION ===

  public clone(newId?: string, newParentId?: string): TreeNode {
    const clonedId = newId || `${this.id}_clone`;
    const cloned = new TreeNode(
      clonedId,
      this.name,
      this.type,
      [...this.tags],
      { ...this.stats },
      newParentId || this.parentId
    );

    const stack: { original: TreeNode; cloned: TreeNode }[] = [
      { original: this, cloned }
    ];

  // Conserver une référence à l'ID de la racine clonée pour générer
  // des identifiants plats du type <root>_clone_<originalId>
  const rootBaseId = clonedId;

    while (stack.length > 0) {
      const { original, cloned: currentCloned } = stack.pop()!;

      for (const child of original.children) {
        // Nouveau schéma d'ID : racineClone + _clone_ + idOriginal
        const childCloneId = `${rootBaseId}_clone_${child.id}`;
        const clonedChild = new TreeNode(
          childCloneId,
          child.name,
          child.type,
          [...child.tags],
          { ...child.stats },
          currentCloned.id
        );

        currentCloned.children.push(clonedChild);
        clonedChild.parent = currentCloned;

        if (child.children.length > 0) {
          stack.push({ original: child, cloned: clonedChild });
        }
      }
    }

    return cloned;
  }

  // === SÉRIALISATION ===

  public toJSON(): TreeNodeJSON {
    const createJsonNode = (node: TreeNode): TreeNodeJSON => ({
      id: node.id,
      name: node.name,
      type: node.type,
      tags: node.tags,
      stats: node.stats,
      parentId: node.parentId,
      children: [] as TreeNodeJSON[]
    });

    const result = createJsonNode(this);
    const stack: { node: TreeNode; jsonNode: TreeNodeJSON }[] = [
      { node: this, jsonNode: result }
    ];

    while (stack.length > 0) {
      const { node, jsonNode } = stack.pop()!;

      for (const child of node.children) {
        const childJson = createJsonNode(child);
        jsonNode.children.push(childJson);

        if (child.children.length > 0) {
          stack.push({ node: child, jsonNode: childJson });
        }
      }
    }

    return result;
  }

  public static fromJSON(json: TreeNodeJSON): TreeNode {
    const node = new TreeNode(
      json.id,
      json.name,
      json.type,
      json.tags,
      json.stats,
      json.parentId
    );

    if (!Array.isArray(json.children)) return node;

    const stack: { jsonNode: TreeNodeJSON; parentNode: TreeNode }[] = [
      { jsonNode: json, parentNode: node }
    ];

    while (stack.length > 0) {
      const { jsonNode, parentNode } = stack.pop()!;

      if (Array.isArray(jsonNode.children)) {
        for (const childJson of jsonNode.children) {
          const childNode = new TreeNode(
            childJson.id,
            childJson.name,
            childJson.type,
            childJson.tags,
            childJson.stats,
            parentNode.id
          );

          parentNode.children.push(childNode);
          childNode.parent = parentNode;

          if (Array.isArray(childJson.children) && childJson.children.length > 0) {
            stack.push({ jsonNode: childJson, parentNode: childNode });
          }
        }
      }
    }

    return node;
  }
}