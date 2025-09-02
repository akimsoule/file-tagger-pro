import { useCallback, useState } from 'react';
import { mockDocuments, mockFolders } from '@/data/mockData';
import type { Document, Folder, FileContextType } from './def';
import { FileContext } from './context';

export function FileProvider({ children }: { children: React.ReactNode }) {
  // État
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [folders, setFolders] = useState<Folder[]>(mockFolders);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Opérations sur les tags
  const getDocumentsWithTags = useCallback((tagIds: string[]) => {
    console.log('=== getDocumentsWithTags ===');
    console.log('tagIds reçus:', tagIds);
    
    // Si aucun tag n'est sélectionné, retourner tous les documents
    if (!tagIds.length) {
      console.log('Aucun tag sélectionné, retour de tous les documents');
      return documents;
    }

    console.log('Documents disponibles:', documents.map(d => ({
      id: d.id,
      name: d.name,
      tags: d.tags.split(',').map(t => t.trim())
    })));
    
    const filteredDocs = documents.filter((doc: Document) => {
      const docTags = doc.tags.split(',').map(t => t.trim());
      console.log(`Vérification du document ${doc.name}:`, {
        docTags,
        tagIds,
        matches: tagIds.every(tag => docTags.includes(tag))
      });
      return tagIds.every(tag => docTags.includes(tag));
    });

    console.log('Documents filtrés:', filteredDocs.map(d => d.name));
    return filteredDocs;
  }, [documents]);

  const getFoldersWithTags = useCallback((tagIds: string[]) => {
    // Si aucun tag n'est sélectionné, retourner tous les dossiers
    if (!tagIds.length) return folders;

    const folderIdsWithTags = new Set<string>();
    
    // Ajouter les dossiers qui ont directement les tags
    folders.forEach((folder: Folder) => {
      if (tagIds.every(tag => folder.tags.split(',').map(t => t.trim()).includes(tag))) {
        folderIdsWithTags.add(folder.id);
      }
    });

    // Ajouter les dossiers qui ont des documents avec les tags
    documents.forEach((doc: Document) => {
      if (doc.folderId && tagIds.every(tag => doc.tags.split(',').map(t => t.trim()).includes(tag))) {
        let currentFolderId: string | undefined = doc.folderId;
        // Ajouter tous les dossiers parents
        while (currentFolderId) {
          folderIdsWithTags.add(currentFolderId);
          const parentFolder = folders.find((f: Folder) => f.id === currentFolderId);
          currentFolderId = parentFolder?.parentId;
        }
      }
    });

    return folders.filter((folder: Folder) => folderIdsWithTags.has(folder.id));
  }, [documents, folders]);

  // Opérations sur les dossiers
  const getFolders = useCallback((parentId: string | null) => {
    return folders.filter((folder: Folder) => folder.parentId === parentId);
  }, [folders]);

  const getFolderContent = useCallback((folderId?: string) => {
    // Si folderId est undefined, on retourne le contenu racine
    if (typeof folderId === 'undefined') {
      return {
        documents: documents.filter((doc: Document) => !doc.folderId),
        subFolders: folders.filter((folder: Folder) => !folder.parentId)
      };
    }
    
    // Si on a un folderId, on retourne le contenu de ce dossier
    return {
      documents: documents.filter((doc: Document) => doc.folderId === folderId),
      subFolders: folders.filter((folder: Folder) => folder.parentId === folderId)
    };
  }, [documents, folders]);

  const getFolderPath = useCallback((folderId?: string) => {
    const path: Folder[] = [];
    let currentFolder = folders.find((f: Folder) => f.id === folderId);
    
    while (currentFolder) {
      path.unshift(currentFolder);
      currentFolder = folders.find((f: Folder) => f.id === currentFolder?.parentId);
    }
    
    return path;
  }, [folders]);

  const updateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    setFolders(prev => prev.map(folder => 
      folder.id === id ? { ...folder, ...updates } : folder
    ));
  }, []);

  const addFolder = useCallback((folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newFolder = {
      ...folder,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setFolders(prev => [...prev, newFolder]);
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders(prev => prev.filter(folder => folder.id !== id));
    // Optionally, you might want to handle orphaned documents and subfolders here
  }, []);

  const moveFolder = useCallback((folderId: string, targetFolderId: string | null) => {
    setFolders(prev =>
      prev.map(folder =>
        folder.id === folderId ? { ...folder, parentId: targetFolderId } : folder
      )
    );
  }, []);

  const getFolderHierarchy = useCallback(() => {
    const buildHierarchy = (parentId: string | null): Folder[] => {
      return folders
        .filter((folder: Folder) => folder.parentId === parentId)
        .map((folder: Folder) => ({
          ...folder,
          children: buildHierarchy(folder.id)
        }));
    };
    
    return buildHierarchy(null);
  }, [folders]);

  const getFolderStats = useCallback((folderId: string) => {
    const docs = documents.filter((doc: Document) => doc.folderId === folderId);
    const totalItems = docs.length;
    const totalSize = docs.reduce((sum, doc) => sum + doc.size, 0);
    return { totalItems, totalSize };
  }, [documents]);

  // Opérations sur les documents
  const findDocumentById = useCallback((id: string) => {
    return documents.find((doc: Document) => doc.id === id);
  }, [documents]);

  const getDocumentsByFolder = useCallback((folderId: string | null) => {
    return documents.filter((doc: Document) => doc.folderId === folderId);
  }, [documents]);

  const updateDocument = useCallback((id: string, updates: Partial<Document>) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, ...updates } : doc
    ));
  }, []);

  const addDocument = useCallback((document: Omit<Document, 'id' | 'createdAt' | 'modifiedAt'>) => {
    const newDoc = {
      ...document,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
    setDocuments(prev => [...prev, newDoc]);
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  }, []);

  const moveDocument = useCallback((documentId: string, targetFolderId: string | null) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === documentId ? { ...doc, folderId: targetFolderId } : doc
      )
    );
  }, []);

  const toggleFavorite = useCallback((documentId: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === documentId ? { ...doc, isFavorite: !doc.isFavorite } : doc
      )
    );
  }, []);

  const selectDocument = useCallback((id: string | null) => {
    setSelectedDocumentId(id);
  }, []);

  const value: FileContextType = {
    documents,
    folders,
    currentFolderId,
    selectedDocumentId,
    setCurrentFolderId,
    findDocumentById,
    getDocumentsByFolder,
    updateDocument,
    addDocument,
    deleteDocument,
    moveDocument,
    selectDocument,
    toggleFavorite,
    getFolderPath,
    updateFolder,
    addFolder,
    deleteFolder,
    moveFolder,
    getFolderHierarchy,
    getFolderStats,
    getFolderContent,
    getFolders,
    getDocumentsWithTags,
    getFoldersWithTags
  };

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
}
