import { useCallback, useState, useEffect, useMemo } from 'react';
import { mockDocuments, mockFolders } from '../../data/mockData';
import type { Document, Folder, Tag } from './def';
import { FileContext } from './context';
import { Tree, TreeNode } from '../../logic/Tree';

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
  const [tree] = useState(() => {
    const newTree = new Tree();
    newTree.build(mockFolders, mockDocuments);
    debugger;
    return newTree;
  });

  // Debug des nœuds de l'arbre
  useEffect(() => {
    console.log('=== Tree State ===');
    console.log('Mock Folders:', mockFolders);
    console.log('All Tree Nodes:', tree.getAllNodes());
    console.log('Root Nodes:', tree.getAllNodes().filter(node => !node.parentId));
  }, [tree]);

  // Obtenir tous les nœuds de l'arbre
  const treeNodes = useMemo(() => tree.getAllNodes(), [tree]);

  // État dérivé : documents et dossiers
  const documents = useMemo(() => 
    treeNodes.filter(node => node.type === 'document').map(node => node.data as Document),
    [treeNodes]
  );

  const folders = useMemo(() => 
    treeNodes.filter(node => node.type === 'folder').map(node => node.data as Folder),
    [treeNodes]
  );

  // Filtrage par tags
  const getFilteredTree = useCallback(() => {
    if (!selectedTags.length) return tree;

    return tree.filter(node => {
      const nodeTags = node.data.tags.split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .map(t => `tag-${t}`);

      return selectedTags.every(tagId => nodeTags.includes(tagId));
    });
  }, [tree, selectedTags]);

  // Navigation et contenu
  const getCurrentPath = useCallback(() => {
    if (!currentFolderId) return [];
    return tree.getPath(currentFolderId);
  }, [currentFolderId, tree]);

  const getCurrentContent = useCallback(() => {
    if (!currentFolderId) {
      return tree.getAllNodes().filter(node => !node.parentId);
    }
    const currentNode = tree.findNode(currentFolderId);
    return currentNode?.children || [];
  }, [currentFolderId, tree]);

  const getFilteredContent = useCallback(() => {
    const filteredTree = getFilteredTree();
    
    return currentFolderId ? 
      filteredTree.findNode(currentFolderId)?.children || [] :
      filteredTree.getAllNodes().filter(node => !node.parentId);
  }, [currentFolderId, getFilteredTree]);

  // Gestion des tags
  useEffect(() => {
    const tagsInfo = tree.getTagsInfo();
    
    const newTags: Tag[] = tagsInfo.map((info, index) => ({
      id: info.id,
      name: info.name,
      color: defaultColors[index % defaultColors.length],
      count: info.count,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    setTags([...newTags, ...customTags]);
  }, [tree, customTags]);

  // Opérations sur les documents
  const findDocumentById = useCallback((id: string) => {
    const node = tree.findNode(id);
    return node?.type === 'document' ? node.data as Document : undefined;
  }, [tree]);

  const getFolderContent = useCallback((folderId?: string, selectedTags: string[] = []): { documents: Document[], subFolders: Folder[] } => {
    console.log('=== getFolderContent ===');
    console.log('folderId:', folderId);
    console.log('selectedTags:', selectedTags);
    
    // Si pas de folderId, on retourne les nœuds racine de l'arbre
    if (!folderId) {
      const rootNodes = tree.getAllNodes()
        .filter(node => !node.parentId)
        .filter(node => node.type === 'folder')
        .map(node => node.data as Folder);
      
      const rootDocs = tree.getAllNodes()
        .filter(node => !node.parentId && node.type === 'document')
        .map(node => node.data as Document);
        
      console.log('Root nodes:', { folders: rootNodes, documents: rootDocs });
      return {
        documents: rootDocs,
        subFolders: rootNodes
      };
    }
    
    const currentNode = tree.findNode(folderId);
    console.log('currentNode:', currentNode);
    
    if (!currentNode) {
      console.log('Node not found:', folderId);
      return { documents: [], subFolders: [] };
    }
    
    const nodes = currentNode.children || [];
    console.log('Initial nodes:', nodes);

    // Pour les documents, on applique le filtre des tags
    const filteredDocuments = nodes
      .filter(node => node.type === 'document')
      .filter(node => {
        if (selectedTags.length === 0) return true;
        const nodeTags = node.data.tags.split(',')
          .map(t => t.trim())
          .filter(Boolean)
          .map(t => `tag-${t}`);
        return selectedTags.every(tagId => nodeTags.includes(tagId));
      })
      .map(node => node.data as Document);

    // Pour les dossiers, on les garde tous au niveau racine
    const folders = nodes
      .filter(node => node.type === 'folder')
      .map(node => node.data as Folder);

    const result = {
      documents: filteredDocuments,
      subFolders: folders
    };
    
    console.log('=== getFolderContent Result ===');
    console.log('filteredDocuments:', filteredDocuments);
    console.log('folders:', folders);
    
    return result;
  }, [tree]);

  const updateDocument = useCallback((id: string, updates: Partial<Document>) => {
    tree.updateDocument(id, updates);
    // Force une mise à jour du state pour rafraîchir l'UI
    setTags(prev => [...prev]);
  }, [tree]);

  const addDocument = useCallback((doc: Omit<Document, 'id' | 'createdAt' | 'modifiedAt'>) => {
    tree.addDocument(doc, doc.folderId);
    // Force une mise à jour du state pour rafraîchir l'UI
    setTags(prev => [...prev]);
  }, [tree]);

  const deleteDocument = useCallback((id: string) => {
    tree.deleteDocument(id);
    if (selectedDocumentId === id) {
      setSelectedDocumentId(null);
    }
    // Force une mise à jour du state pour rafraîchir l'UI
    setTags(prev => [...prev]);
  }, [tree, selectedDocumentId]);

  const moveDocument = useCallback((documentId: string, targetFolderId: string | null) => {
    tree.updateDocument(documentId, { folderId: targetFolderId });
    // Force une mise à jour du state pour rafraîchir l'UI
    setTags(prev => [...prev]);
  }, [tree]);

  const toggleFavorite = useCallback((documentId: string) => {
    const node = tree.findNode(documentId);
    if (node?.type === 'document') {
      const doc = node.data as Document;
      tree.updateDocument(documentId, { isFavorite: !doc.isFavorite });
      // Force une mise à jour du state pour rafraîchir l'UI
      setTags(prev => [...prev]);
    }
  }, [tree]);

  // Opérations sur les dossiers
  const getFolderPath = useCallback((folderId?: string): TreeNode[] => {
    if (!folderId) return [];
    return tree.getPath(folderId);
  }, [tree]);

  const addFolder = useCallback((folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'children' | 'documents'>) => {
    tree.addFolder(folder, folder.parentId);
    // Force une mise à jour du state pour rafraîchir l'UI
    setTags(prev => [...prev]);
  }, [tree]);

  const updateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    tree.updateFolder(id, updates);
    // Force une mise à jour du state pour rafraîchir l'UI
    setTags(prev => [...prev]);
  }, [tree]);

  const deleteFolder = useCallback((id: string) => {
    tree.deleteFolder(id);
    if (currentFolderId === id) {
      setCurrentFolderId(null);
    }
    // Force une mise à jour du state pour rafraîchir l'UI
    setTags(prev => [...prev]);
  }, [tree, currentFolderId]);

  const moveFolder = useCallback((folderId: string, targetFolderId: string | null) => {
    // Vérifier qu'on ne déplace pas dans un descendant
    let current = targetFolderId;
    while (current) {
      if (current === folderId) return; // Éviter les boucles
      const parent = tree.findNode(current);
      current = parent?.parentId ?? null;
    }
    
    tree.updateFolder(folderId, { parentId: targetFolderId });
    // Force une mise à jour du state pour rafraîchir l'UI
    setTags(prev => [...prev]);
  }, [tree]);

  const getFolderStats = useCallback((folderId: string) => {
    const { documents, subFolders } = getFolderContent(folderId);
    return {
      totalItems: documents.length + subFolders.length,
      totalSize: documents.reduce((acc, doc) => acc + doc.size, 0)
    };
  }, [getFolderContent]);

  // Opérations sur les tags
  const toggleTagSelection = useCallback((tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId)
      ? prev.filter(id => id !== tagId)
      : [...prev, tagId]
    );
  }, []);

  const clearTagSelection = useCallback(() => {
    setSelectedTags([]);
  }, []);

  const getTagById = useCallback((id: string) => {
    return tags.find(tag => tag.id === id);
  }, [tags]);

  const getTagsByIds = useCallback((ids: string[]) => {
    return ids.map(id => tags.find(tag => tag.id === id)).filter((tag): tag is Tag => tag !== undefined);
  }, [tags]);

  const getAllTags = useCallback(() => {
    return tags;
  }, [tags]);

  const getTagCount = useCallback((tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    return tag?.count ?? 0;
  }, [tags]);

  const getFolders = useCallback((parentId: string | null = null, selectedTags: string[] = []) => {
    let nodes = tree.getAllNodes();

    // Filtrer par tags si nécessaire
    if (selectedTags.length > 0) {
      nodes = nodes.filter(node => {
        const nodeTags = node.data.tags.split(',')
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

    return nodes.map(node => node.data as Folder);
  }, [tree]);

  const getFolderHierarchy = useCallback(() => {
    // Récupérer les dossiers racines (sans parent)
    return tree.getAllNodes().filter(node => 
      node.type === 'folder' && !node.parentId
    );
  }, [tree]);

  const addTag = useCallback((tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt' | 'count'>) => {
    const now = new Date();
    const newTag: Tag = {
      ...tag,
      id: `tag-${tag.name}`,
      count: 0,
      createdAt: now,
      updatedAt: now
    };
    setCustomTags(prev => [...prev, newTag]);
  }, []);

  const updateTag = useCallback((id: string, updates: Partial<Tag>) => {
    setCustomTags(prev => prev.map(tag =>
      tag.id === id
        ? { ...tag, ...updates, updatedAt: new Date() }
        : tag
    ));
  }, []);

  const deleteTag = useCallback((id: string) => {
    setCustomTags(prev => prev.filter(tag => tag.id !== id));
    setSelectedTags(prev => prev.filter(tagId => tagId !== id));
  }, []);

  return (
    <FileContext.Provider
      value={{
        // État principal
        documents,
        folders,
        currentFolderId,
        selectedDocumentId,
        treeNodes,

        // État des tags
        tags,
        selectedTags,

        // Navigation dans l'arbre
        getCurrentPath,
        getCurrentContent,
        getFilteredContent,

        // Setters principaux
        setCurrentFolderId,
        selectDocument: setSelectedDocumentId,
        setSelectedTags,

        // Opérations sur les documents
        findDocumentById,
        getFolderContent,
        updateDocument,
        addDocument,
        deleteDocument,
        moveDocument,
        toggleFavorite,
        
        // Opérations sur les tags
        toggleTagSelection,
        clearTagSelection,
        getTagById,
        getAllTags,
        getTagCount,
        addTag,
        updateTag,
        deleteTag,

        // Opérations sur les dossiers
        getFolderPath,
        updateFolder,
        addFolder,
        deleteFolder,
        moveFolder,
        getFolderStats,
        getFolders,
        getFolderHierarchy,
        getTagsByIds,
      }}
    >
      {children}
    </FileContext.Provider>
  );
}
