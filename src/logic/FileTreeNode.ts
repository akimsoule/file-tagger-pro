import TreeNode from './TreeNode';
import type { Document, Folder, Tag } from '@/contexts/file/def';
import type { TreeNodeType } from '@/types';

export interface FileNodeStats {
  totalSize: number;
  tagsCount: number;
  totalItems?: number;
  filesCount?: number;
  foldersCount?: number;
}

export class FileTreeNode extends TreeNode {
  private data: Document | Folder;

  constructor(
    id: string,
    name: string,
    type: TreeNodeType,
    data: Document | Folder,
    stats?: FileNodeStats,
    parentId?: string
  ) {
    const tags = data.tags.split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .map(tag => ({
        id: `tag-${tag}`,
        name: tag,
        color: '#000000',
        count: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    
    super(id, name, type, tags, stats, parentId);
    this.data = data;
  }

  public getData(): Document | Folder {
    return this.data;
  }

  public static createDocument(doc: Document): FileTreeNode {
    return new FileTreeNode(
      doc.id,
      doc.name,
      'file',
      doc,
      { totalSize: doc.size, tagsCount: 0 },
      doc.folderId
    );
  }

  public static createFolder(folder: Folder): FileTreeNode {
    return new FileTreeNode(
      folder.id,
      folder.name,
      'folder',
      folder,
      { 
        totalSize: 0, 
        tagsCount: 0,
        totalItems: 0,
        filesCount: 0,
        foldersCount: 0 
      },
      folder.parentId
    );
  }

public static buildRootTree(documents: Document[], folders: Folder[], options?: { debug?: boolean }): FileTreeNode {
    // Créer le dossier racine avec ses propriétés minimales requises
    const root = FileTreeNode.createFolder({
        id: 'root',
        name: 'root', // Le nom doit être "root" pour que l'index soit initialisé
        parentId: null,
        tags: '',
        description: 'Dossier racine',
        color: '#000000',
        ownerId: '',
        createdAt: new Date(),
        updatedAt: new Date()
    } as Folder);

    // Créer une map des dossiers pour un accès rapide
    const folderMap = new Map<string, FileTreeNode>();
    folderMap.set('root', root);

    // Créer les nœuds de dossier et les ajouter à la map
    folders.forEach(folder => {
        const node = FileTreeNode.createFolder(folder);
        folderMap.set(folder.id, node);
    });

    // Établir les relations parent-enfant pour les dossiers
    folders.forEach(folder => {
        const currentNode = folderMap.get(folder.id);
        if (!currentNode) return;

        const parentNode = folderMap.get(folder.parentId || 'root');
        if (parentNode) {
            parentNode.addChild(currentNode);
        }
    });

    // Ajouter les documents aux dossiers appropriés
    documents.forEach(doc => {
        const node = FileTreeNode.createDocument(doc);
        const parentFolder = folderMap.get(doc.folderId || 'root');
        if (parentFolder) {
            parentFolder.addChild(node);
        }
    });

    // Mettre à jour les statistiques de l'arbre complet
    root.updateStats();

    if (options?.debug) {
      console.log(root.printTree());
    }

  return root;
}

  public updateData(updates: Partial<Document | Folder>): void {
    this.data = { ...this.data, ...updates };
    
    if ('tags' in updates) {
      const now = new Date();
      this.tags = updates.tags.split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .map(tag => ({
          id: `tag-${tag}`,
          name: tag,
          color: '#000000',
          count: 0,
          createdAt: now,
          updatedAt: now
        }));
    }
    
    this.updateStats();
  }

  public calculateStats(): FileNodeStats {
    if (this.type === 'file') {
      const doc = this.data as Document;
      return {
        totalSize: doc.size,
        tagsCount: this.tags.length
      };
    }

    const stats = {
      totalSize: 0,
      tagsCount: this.tags.length,
      totalItems: this.children.length,
      filesCount: 0,
      foldersCount: 0
    };

    for (const child of this.children) {
      const childNode = child as FileTreeNode;
      stats.tagsCount += childNode.tags.length;
      
      if (childNode.type === 'file') {
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

  public getTagsInfo(): { id: string; name: string; count: number }[] {
    const tagsMap = new Map<string, { id: string; name: string; count: number }>();
    for (const node of FileTreeNode.iterate(this)) {
      for (const tag of node.tags) {
        const entry = tagsMap.get(tag.id) || { id: tag.id, name: tag.name, count: 0 };
        entry.count++;
        tagsMap.set(tag.id, entry);
      }
    }
    return [...tagsMap.values()];
  }

  public filter(predicate: (node: FileTreeNode) => boolean): FileTreeNode {
    // Création du nœud racine filtré
    const filteredRoot = new FileTreeNode(
      this.id,
      this.name,
      this.type,
      { ...this.data },
      { ...this.stats } as FileNodeStats,
      this.parentId
    );

    // Pile pour parcours itératif : original -> filtréParent
    const stack: Array<{ original: FileTreeNode; filteredParent: FileTreeNode }> = [];
    stack.push({ original: this, filteredParent: filteredRoot });

    while (stack.length) {
      const { original, filteredParent } = stack.pop()!;
      for (const child of original.children as FileTreeNode[]) {
        if (!predicate(child)) continue;
        const cloned = new FileTreeNode(
          child.id,
          child.name,
          child.type,
          { ...(child.getData() as Document | Folder) },
          { ...(child.stats as FileNodeStats) },
          child.parentId
        );
        cloned.parent = filteredParent;
        filteredParent.children.push(cloned);
        if (child.children.length > 0) {
          stack.push({ original: child, filteredParent: cloned });
        }
      }
    }

    return filteredRoot;
  }

  public printTree(): string {
    let output = '';
    interface Frame { node: FileTreeNode; prefix: string; isLast: boolean; isRoot: boolean; }
    const stack: Frame[] = [{ node: this, prefix: '', isLast: true, isRoot: true }];

    while (stack.length) {
      const { node, prefix, isLast, isRoot } = stack.pop()!;
      const connector = isRoot ? '' : (isLast ? '└─' : '├─');
      output += `${prefix}${connector}${node.type === 'folder' ? '📁' : '📄'} ${node.name} (${node.id})\n`;

      const children = node.children as FileTreeNode[];
      if (children.length > 0) {
        const nextPrefix = prefix + (isRoot ? '' : (isLast ? '   ' : '│  '));
        // Empiler en ordre inverse pour parcourir dans l'ordre original
        for (let i = children.length - 1; i >= 0; i--) {
          const child = children[i];
          stack.push({
            node: child,
            prefix: nextPrefix,
            isLast: i === children.length - 1,
            isRoot: false
          });
        }
      }
    }

    return output;
  }

  /**
   * Générateur itératif DFS (pré-ordre) sans récursivité.
   */
  public static *iterate(root: FileTreeNode): Generator<FileTreeNode> {
    const stack: FileTreeNode[] = [root];
    const visited = new Set<string>();
    while (stack.length) {
      const node = stack.pop()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      yield node;
      // Empiler les enfants en ordre inverse pour garder l'ordre naturel
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i] as FileTreeNode);
      }
    }
  }
}
