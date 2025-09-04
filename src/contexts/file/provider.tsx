import { useCallback, useState, useEffect, useMemo } from 'react';
import { mockDocuments, mockFolders } from '../../data/mockData';
import type { Document, Folder, Tag } from './def';
import { FileContext } from './context';
import { FileTreeNode } from '@/logic/FileTreeNode';

// Couleurs par défaut pour les tags
const defaultColors = [
  '#DC2626', '#2563EB', '#EC4899', '#F59E0B', '#10B981',
  '#8B5CF6', '#6B7280', '#EF4444', '#60A5FA', '#D946EF'
];

export function FileProvider({ children }: { children: React.ReactNode }) {
  // État de l'interface
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<Tag[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Gestion de l'arbre
  const [rootNode] = useState(() => {
    // Créer le nœud racine
    const root = FileTreeNode.createFolder({
      id: 'root',
      name: 'root',
      description: '',
      color: '#000000',
      ownerId: '',
      children: [],
      documents: [],
      tags: '',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Ajouter les dossiers
    for (const folder of mockFolders) {
      const folderNode = FileTreeNode.createFolder(folder);
      if (!folder.parentId) {
        root.addChild(folderNode);
      } else {
        const parentNode = root.findChildById(folder.parentId);
        if (parentNode) {
          parentNode.addChild(folderNode);
        }
      }
    }

    // Ajouter les documents
    for (const doc of mockDocuments) {
      const docNode = FileTreeNode.createDocument(doc);
      if (!doc.folderId) {
        root.addChild(docNode);
      } else {
        const parentNode = root.findChildById(doc.folderId);
        if (parentNode) {
          parentNode.addChild(docNode);
        }
      }
    }

    return root;
  });

  // Récupérer tous les nœuds
  const getAllNodes = useCallback(() => {
    const nodes: FileTreeNode[] = [];
    const stack = [rootNode];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      nodes.push(current);
      stack.push(...current.children.map(child => child as FileTreeNode));
    }

    return nodes;
  }, [rootNode]);

  // État dérivé : documents et dossiers
  const documents = useMemo(() => 
    getAllNodes()
      .filter(node => node.type === 'file')
      .map(node => (node as FileTreeNode).getData() as Document),
    [getAllNodes]
  );

  const folders = useMemo(() => 
    getAllNodes()
      .filter(node => node.type === 'folder')
      .map(node => (node as FileTreeNode).getData() as Folder),
    [getAllNodes]
  );

  // Navigation et contenu
  const getCurrentContent = useCallback(() => {
    if (!currentFolderId) {
      return rootNode.children.map(child => child as FileTreeNode);
    }
    const currentNode = rootNode.findChildById(currentFolderId);
    return currentNode?.children.map(child => child as FileTreeNode) || [];
  }, [currentFolderId, rootNode]);

  // Opérations sur les documents
  const findDocumentById = useCallback((id: string) => {
    const node = rootNode.findChildById(id) as FileTreeNode | undefined;
    return node?.type === 'file' ? node.getData() as Document : undefined;
  }, [rootNode]);

    const getFolderContent = useCallback((folderId?: string) => {
    const currentNode = folderId ? rootNode.findChildById(folderId) as FileTreeNode : rootNode;
    if (!currentNode) return { documents: [], subFolders: [] };
    
    // Fonction pour vérifier si un nœud correspond aux tags sélectionnés
    const matchesTags = (node: FileTreeNode) => {
      if (selectedTags.length === 0) return true;
      
      console.log('Node:', node.name);
      console.log('Node tags:', node.tags);
      console.log('Selected tags:', selectedTags);
      
      const nodeTags = node.tags.map(tag => tag.id);
      console.log('Node tag IDs:', nodeTags);
      
      const matches = selectedTags.every(tagId => nodeTags.includes(tagId));
      console.log('Matches:', matches);
      
      return matches;
    };
    
    let nodesToFilter: FileTreeNode[];
    
    if (selectedTags.length > 0) {
      // Si des tags sont sélectionnés, on fait une recherche dans l'arbre
      const stack = currentNode.children.map(child => child as FileTreeNode);
      const allNodes: FileTreeNode[] = [];
      
      while (stack.length > 0) {
        const node = stack.pop()!;
        allNodes.push(node);
        for (const child of node.children) {
          stack.push(child as FileTreeNode);
        }
      }
      
      nodesToFilter = allNodes;
    } else {
      // Sinon, on ne prend que les enfants directs
      nodesToFilter = currentNode.children.map(child => child as FileTreeNode);
    }
    
    const filteredNodes = nodesToFilter.filter(matchesTags);
    console.log('Filtered nodes:', filteredNodes.map(n => n.name));

    const matchingDocuments = filteredNodes
      .filter(node => node.type === 'file')
      .map(node => node.getData() as Document);
    
    const matchingFolders = filteredNodes
      .filter(node => node.type === 'folder')
      .map(node => node.getData() as Folder);
    
    console.log('Matching documents:', matchingDocuments.map(d => d.name));
    console.log('Matching folders:', matchingFolders.map(f => f.name));
    
    return {
      documents: matchingDocuments,
      subFolders: matchingFolders
    };
  }, [rootNode, selectedTags]);

  // Opérations sur les dossiers
  const getFolders = useCallback((parentId: string | null = null, selectedTags: string[] = []) => {
    let nodes = getAllNodes();

    // Filtrer par tags si nécessaire
    if (selectedTags.length > 0) {
      nodes = nodes.filter(node => {
        const nodeTags = (node as FileTreeNode).getData().tags.split(',')
          .map(t => t.trim())
          .filter(Boolean)
          .map(t => `tag-${t}`);
        return selectedTags.every(tagId => nodeTags.includes(tagId));
      });
    }

    // Filtrer par type et parentId
    nodes = nodes.filter(node => 
      node.type === 'folder' && 
      (parentId === null ? !node.parentId : node.parentId === parentId)
    );

    return nodes.map(node => (node as FileTreeNode).getData() as Folder);
  }, [getAllNodes]);

  const getFolderPath = useCallback((folderId?: string) => {
    if (!folderId) return [];
    
    const path: FileTreeNode[] = [];
    let current = rootNode.findChildById(folderId);
    
    while (current) {
      path.unshift(current as FileTreeNode);
      const parentId = current.parentId;
      if (!parentId) break;
      current = rootNode.findChildById(parentId);
    }
    
    return path;
  }, [rootNode]);

  const getFolderStats = useCallback((folderId: string) => {
    const currentNode = rootNode.findChildById(folderId);
    if (!currentNode) return { totalItems: 0, totalSize: 0 };

    const { documents, subFolders } = getFolderContent(folderId);
    return {
      totalItems: documents.length + subFolders.length,
      totalSize: documents.reduce((acc, doc) => acc + doc.size, 0)
    };
  }, [getFolderContent, rootNode]);

  const getFolderHierarchy = useCallback(() => {
    // Retourner les dossiers racine (sans parent)
    return getAllNodes()
      .filter(node => node.type === 'folder' && !node.parentId)
      .map(node => node as FileTreeNode);
  }, [getAllNodes]);

  // Opérations sur les tags

  const getTagsByIds = useCallback((ids: string[]) => {
    return ids.map(id => tags.find(tag => tag.id === id))
              .filter((tag): tag is Tag => tag !== undefined);
  }, [tags]);

  const getAllTags = useCallback(() => {
    return tags;
  }, [tags]);

  const getTagCount = useCallback((tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    return tag?.count ?? 0;
  }, [tags]);

  const toggleTagSelection = useCallback((tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  }, []);
  const updateTags = useCallback(() => {
    const tagsInfo = rootNode.getTagsInfo();
    
    const newTags: Tag[] = tagsInfo.map((info, index) => ({
      id: `tag-${info.name}`, // Utiliser le même format que dans FileTreeNode
      name: info.name,
      color: defaultColors[index % defaultColors.length],
      count: info.count,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    setTags([...newTags, ...customTags]);
  }, [customTags, rootNode]);

  // Mettre à jour les tags quand l'arbre change
  useEffect(() => {
    updateTags();
  }, [updateTags]);

  // Ajouter un tag à un dossier
  const addFolderTag = useCallback((folderId: string, tagName: string) => {
    const node = rootNode.findChildById(folderId) as FileTreeNode;
    if (!node || node.type !== 'folder') return;

    const currentTags = node.getData().tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    // Vérifier si le tag existe déjà
    if (!currentTags.includes(tagName)) {
      const newTags = [...currentTags, tagName].join(',');
      node.updateData({ tags: newTags });
      updateTags();
    }
  }, [rootNode, updateTags]);

  // Supprimer un tag d'un dossier
  const removeFolderTag = useCallback((folderId: string, tagName: string) => {
    const node = rootNode.findChildById(folderId) as FileTreeNode;
    if (!node || node.type !== 'folder') return;

    const currentTags = node.getData().tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const newTags = currentTags
      .filter(tag => tag !== tagName)
      .join(',');

    node.updateData({ tags: newTags });
    updateTags();
  }, [rootNode, updateTags]);

  // Déplacer un dossier
  const moveFolder = useCallback((folderId: string, targetFolderId: string | null) => {
    const node = rootNode.findChildById(folderId) as FileTreeNode;
    const targetNode = targetFolderId ? rootNode.findChildById(targetFolderId) as FileTreeNode : rootNode;
    
    if (!node || node.type !== 'folder') return;
    if (targetFolderId && (!targetNode || targetNode.type !== 'folder')) return;

    // Vérifier qu'on ne déplace pas dans un descendant
    let parent = targetNode;
    while (parent) {
      if (parent.id === folderId) return; // Éviter les cycles
      parent = parent.parent as FileTreeNode;
    }

    // Retirer le nœud de son parent actuel
    const oldParent = node.parent as FileTreeNode;
    if (oldParent) {
      oldParent.children = oldParent.children.filter(child => child.id !== folderId);
    }

    // Mettre à jour le parentId du nœud
    node.updateData({ parentId: targetFolderId || undefined });
    node.parent = targetNode;

    // Ajouter le nœud à son nouveau parent
    targetNode.addChild(node);

  }, [rootNode]);

  // Mise à jour d'un dossier
  const updateFolder = useCallback((folderId: string, updates: Partial<Folder>) => {
    const node = rootNode.findChildById(folderId) as FileTreeNode;
    if (!node || node.type !== 'folder') return;

    // Si la mise à jour concerne les tags, assurons-nous qu'ils sont au bon format
    if ('tags' in updates) {
      const tags = updates.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .join(',');
      
      node.updateData({ ...updates, tags });
    } else {
      node.updateData(updates);
    }

    // Mettre à jour les tags après la modification
    updateTags();
  }, [rootNode, updateTags]);

  return (
    <FileContext.Provider
      value={{
        documents,
        folders,
        currentFolderId,
        selectedDocumentId,
        tags,
        selectedTags,
        setCurrentFolderId,
        selectDocument: setSelectedDocumentId,
        setSelectedTags,
        findDocumentById,
        getFolderContent,
        getCurrentContent,
        getFolders,
        getFolderPath,
        getFolderStats,
        getFolderHierarchy,
        getTagsByIds,
        getAllTags,
        getTagCount,
        toggleTagSelection,
        updateFolder,
        addFolderTag,
        removeFolderTag,
        moveFolder
      }}
    >
      {children}
    </FileContext.Provider>
  );
}
