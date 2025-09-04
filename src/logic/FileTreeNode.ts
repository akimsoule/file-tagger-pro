import TreeNode from './TreeNode';
import type { Document, Folder, Tag } from '@/contexts/file/def';
import type { TreeNodeType } from '@/types';

interface FileNodeStats {
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
}
