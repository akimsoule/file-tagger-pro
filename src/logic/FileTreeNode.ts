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

public static buildRootTree(documents: Document[], folders: Folder[]): FileTreeNode {
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

    const result = root.printTree();
    console.log(result);

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

    const processNode = (node: FileTreeNode) => {
      for (const tag of node.tags) {
        const info = tagsMap.get(tag.id) || { id: tag.id, name: tag.name, count: 0 };
        info.count++;
        tagsMap.set(tag.id, info);
      }
    };

    // Parcourir l'arbre avec une pile
    const stack: FileTreeNode[] = [this];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const node = stack.pop()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);

      processNode(node);
      stack.push(...node.children.map(child => child as FileTreeNode));
    }

    return Array.from(tagsMap.values());
  }

  public filter(predicate: (node: FileTreeNode) => boolean): FileTreeNode {
    // On crée un nouveau nœud avec les mêmes données
    const filtered = new FileTreeNode(
      this.id,
      this.name,
      this.type,
      { ...this.data },
      { ...this.stats } as FileNodeStats,
      this.parentId
    );
    
    // On filtre les enfants récursivement
    filtered.children = this.children
      .filter(child => predicate(child as FileTreeNode))
      .map(child => {
        const filteredChild = (child as FileTreeNode).filter(predicate);
        filteredChild.parent = filtered;
        return filteredChild;
      });

    return filtered;
  } 

   public printTree(indent: string = ''): string {
    // Informations de base du nœud
    let output = `${indent}${this.type === 'folder' ? '📁' : '📄'} ${this.name} (${this.id})\n`;
    
    // Ajouter les tags s'il y en a
    // if (this.tags.length > 0) {
    //   output += `${indent}  🏷️ Tags: ${this.tags.map(t => t.name).join(', ')}\n`;
    // }
    
    // Ajouter les stats
    // if (this.type === 'file') {
    //   const stats = this.stats as FileNodeStats;
    //   output += `${indent}  📊 Taille: ${stats.totalSize} octets\n`;
    // } else {
    //   const stats = this.stats as FileNodeStats;
    //   output += `${indent}  📊 Stats: ${stats.filesCount} fichiers, ` +
    //             `${stats.foldersCount} dossiers, ` +
    //             `${stats.totalSize} octets au total\n`;
    // }
    
    // Récursivement afficher les enfants
    if (this.children.length > 0) {
      output += `${indent}  📁 Contenu:\n`;
      this.children.forEach((child, index) => {
        const isLast = index === this.children.length - 1;
        const childIndent = `${indent}  ${isLast ? '└─' : '├─'}`;
        output += (child as FileTreeNode).printTree(childIndent);
      });
    }
    
    return output;
  }
}
