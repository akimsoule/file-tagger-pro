import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
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
  // ==================== État ====================
  const [rootNode] = useState(() => FileTreeNode.buildRootTree(mockDocuments, mockFolders));
  // Navigation basée sur références directes (évite collisions d'IDs entre dossiers et documents)
  const [currentNodeRef, setCurrentNodeRef] = useState<FileTreeNode | null>(rootNode);
  const [selectedNodeRef, setSelectedNodeRef] = useState<FileTreeNode | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<Tag[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [treeVersion, setTreeVersion] = useState(0);

  // Gestion de l'arbre
  

  // Récupérer tous les nœuds
  const getAllNodes = useCallback(() => {
    const rootIndex = rootNode.getRootIndex();
    if (!rootIndex) {
      console.error("Index racine non trouvé");
      return [];
    }
    return Array.from(rootIndex.values()) as FileTreeNode[];
  }, [rootNode]);

  // État : nœud courant et sélectionné
  const currentNode = currentNodeRef;
  const selectedNode = selectedNodeRef;

  // Navigation et contenu
  const getCurrentContent = useCallback(() => {
    const node = currentNodeRef || rootNode;
    return node.children.map(c => c as FileTreeNode);
  }, [currentNodeRef, rootNode]);

  // Opérations sur les documents
  const findDocumentById = useCallback((id: string) => {
    const node = rootNode.findChildById(id) as FileTreeNode | undefined;
    return node?.type === 'file' ? node.getData() as Document : undefined;
  }, [rootNode]);

  const getFolderContent = useCallback((folderId?: string) => {
    // Si pas d'ID fourni, retourner le contenu de la racine
    if (!folderId) {
      return {
        documents: rootNode.children
          .filter((child): child is FileTreeNode => child instanceof FileTreeNode && child.type === 'file')
          .map(node => node.getData() as Document),
        subFolders: rootNode.children
          .filter((child): child is FileTreeNode => child instanceof FileTreeNode && child.type === 'folder')
          .map(node => {
            const folderData = node.getData() as Folder;
            // S'assurer que les enfants sont correctement remplis
            folderData.children = node.children
              .filter(child => child.type === 'folder')
              .map(child => (child as FileTreeNode).getData() as Folder);
            folderData.documents = node.children
              .filter(child => child.type === 'file')
              .map(child => (child as FileTreeNode).getData() as Document);
            return folderData;
          })
      };
    }

    // Chercher le nœud
    const node = rootNode.findChildById(folderId) as FileTreeNode;
    if (!node || !(node instanceof FileTreeNode)) {
      return { documents: [], subFolders: [] };
    }

    // Si c'est un fichier, retourner des listes vides
    if (node.type === 'file') {
      return { documents: [], subFolders: [] };
    }

    // Fonction pour vérifier les tags
    const hasMatchingTags = (node: FileTreeNode) => {
      if (selectedTags.length === 0) return true;
      const nodeTags = node.tags.map(tag => tag.id);
      return selectedTags.every(tagId => nodeTags.includes(tagId));
    };

    // Récupérer tous les enfants récursivement
    const getAllChildren = (node: FileTreeNode): FileTreeNode[] => {
      const result: FileTreeNode[] = [];
      const stack = [node];
      
      while (stack.length > 0) {
        const current = stack.pop()!;
        current.children.forEach(child => {
          const fileChild = child as FileTreeNode;
          if (hasMatchingTags(fileChild)) {
            result.push(fileChild);
            if (fileChild.type === 'folder') {
              stack.push(fileChild);
            }
          }
        });
      }
      
      return result;
    };

    // Récupérer tous les enfants
    const allChildren = getAllChildren(node);

    // Filtrer et mapper les documents et sous-dossiers
    const documents = allChildren
      .filter(child => child.type === 'file')
      .map(child => child.getData() as Document);

    const subFolders = allChildren
      .filter(child => child.type === 'folder')
      .map(child => {
        const folderData = child.getData() as Folder;
        // S'assurer que les enfants sont correctement remplis
        folderData.children = child.children
          .filter(c => c.type === 'folder')
          .map(c => (c as FileTreeNode).getData() as Folder);
        folderData.documents = child.children
          .filter(c => c.type === 'file')
          .map(c => (c as FileTreeNode).getData() as Document);
        return folderData;
      });

    return { documents, subFolders };
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

  // Mise à jour des tags
  const customTagsRef = useRef(customTags);
  useEffect(() => {
    customTagsRef.current = customTags;
  }, [customTags]);

  const updateTags = useCallback(() => {
    const tagsInfo = rootNode.getTagsInfo();
    
    const newTags: Tag[] = tagsInfo.map((info, index) => ({
      id: `tag-${info.name}`,
      name: info.name,
      color: defaultColors[index % defaultColors.length],
      count: info.count,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    setTags(prevTags => {
      const mergedTags = [...newTags];
      // Ajouter uniquement les custom tags qui n'existent pas déjà
      customTagsRef.current.forEach(customTag => {
        if (!mergedTags.some(tag => tag.id === customTag.id)) {
          mergedTags.push(customTag);
        }
      });
      return mergedTags;
    });
  }, [rootNode]);

  useEffect(() => {
    updateTags();
  }, [updateTags, treeVersion]); // Ajout de treeVersion comme dépendance

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
    const folderNode = rootNode.findChildById(folderId) as FileTreeNode | null;
    if (!folderNode) return;
    rootNode.moveNodeFrom(folderNode.parent?.id || 'root', targetFolderId || 'root', folderId);
    setTreeVersion(v => v + 1);

  }, [rootNode]);

  // Déplacer un document
  // Mise à jour d'un document
  const updateDocument = useCallback((documentId: string, updates: Partial<Document>) => {
    const sourceNode = rootNode.findChildById(documentId) as FileTreeNode;
    if (!sourceNode || sourceNode.type !== 'file') return;

    if ('tags' in updates) {
      const tags = updates.tags!
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .join(',');
      
      sourceNode.updateData({ ...updates, tags });
      updateTags();
      setTreeVersion(v => v + 1);
    } else {
      sourceNode.updateData(updates);
      setTreeVersion(v => v + 1);
    }
  }, [rootNode, updateTags]);

  const moveDocument = useCallback((documentId: string, targetFolderId: string | null) => {
    const sourceNode = rootNode.findChildById(documentId) as FileTreeNode;
    if (!sourceNode || sourceNode.type !== 'file') {
      console.error(`Document source non trouvé ou invalide: ${documentId}`);
      return;
    }

    const targetNode = targetFolderId ? rootNode.findChildById(targetFolderId) as FileTreeNode : rootNode;
    if (targetFolderId && (!targetNode || targetNode.type !== 'folder')) {
      console.error(`Dossier de destination non trouvé ou invalide: ${targetFolderId}`);
      return;
    }

    // Utiliser la méthode moveNodeFrom intégrée
  rootNode.moveNodeFrom(sourceNode.parent?.id || 'root', targetFolderId || 'root', documentId);
    setTreeVersion(v => v + 1);
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
        currentNode,
        selectedNode,
        tags,
        selectedTags,
  setCurrentNode: (node: FileTreeNode | null) => setCurrentNodeRef(node || rootNode),
  setSelectedNode: (node: FileTreeNode | null) => setSelectedNodeRef(node),
        setSelectedTags,
        findNodeById: (id: string) => rootNode.findChildById(id) as FileTreeNode | null,
        getNodeContent: (node: FileTreeNode | null) => {
          if (!node) return rootNode.children as FileTreeNode[];
          return node.children as FileTreeNode[];
        },
        getNodePath: (node: FileTreeNode) => {
          const path: FileTreeNode[] = [];
          let current: FileTreeNode | null = node;
          while (current) {
            path.unshift(current);
            current = current.parent as FileTreeNode | null;
          }
          return path;
        },
        getNodeStats: (node: FileTreeNode) => node.stats,
        getNodeHierarchy: () => rootNode.children as FileTreeNode[],
        getTagsByIds,
        getAllTags,
        getTagCount,
        toggleTagSelection,
  updateNode: async (nodeId: string, updates: Partial<Document | Folder>) => {
          const node = rootNode.findChildById(nodeId) as FileTreeNode | null;
          if (!node) return;
          node.updateData(updates);
          updateTags();
          setTreeVersion(v => v + 1);
        },
        addToFavorites: async (nodeId: string) => {
          const node = rootNode.findChildById(nodeId) as FileTreeNode | null;
          if (!node || node.type !== 'file') return;
          const data = node.getData() as Document;
          node.updateData({ isFavorite: true });
          updateTags();
          setTreeVersion(v => v + 1);
        },
        removeFromFavorites: async (nodeId: string) => {
          const node = rootNode.findChildById(nodeId) as FileTreeNode | null;
          if (!node || node.type !== 'file') return;
            node.updateData({ isFavorite: false });
            updateTags();
            setTreeVersion(v => v + 1);
        },
        updateTag: async () => {},
        createTag: async () => {},
        deleteTag: async () => {},
        addNodeTag: (node: FileTreeNode, tagName: string) => {
          const currentTags = node.getData().tags.split(',').map(t => t.trim()).filter(Boolean);
          if (!currentTags.includes(tagName)) {
            const newTags = [...currentTags, tagName].join(',');
            node.updateData({ tags: newTags });
            updateTags();
          }
        },
        removeNodeTag: (node: FileTreeNode, tagName: string) => {
          const currentTags = node.getData().tags.split(',').map(t => t.trim()).filter(Boolean);
          const newTags = currentTags.filter(tag => tag !== tagName).join(',');
          node.updateData({ tags: newTags });
          updateTags();
        },
  moveNode: async (nodeId: string, targetFolderId: string | null) => {
          const node = rootNode.findChildById(nodeId) as FileTreeNode | null;
          if (!node) return;
          rootNode.moveNodeFrom(node.parent?.id || 'root', targetFolderId || 'root', node.id);
          setTreeVersion(v => v + 1);
        }
      }}
    >
      {children}
    </FileContext.Provider>
  );
}
