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

  // Document operations
  const findDocumentById = useCallback((id: string) => {
    return documents.find(doc => doc.id === id);
  }, [documents]);

  const getDocumentsByFolder = useCallback((folderId: string | null) => {
    return documents.filter(doc => doc.folderId === folderId);
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

  // Folder operations
  const getFolderPath = useCallback((folderId?: string) => {
    const path: Folder[] = [];
    let currentFolder = folders.find(f => f.id === folderId);
    
    while (currentFolder) {
      path.unshift(currentFolder);
      currentFolder = folders.find(f => f.id === currentFolder?.parentId);
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
        .filter(folder => folder.parentId === parentId)
        .map(folder => ({
          ...folder,
          children: buildHierarchy(folder.id)
        }));
    };
    
    return buildHierarchy(null);
  }, [folders]);

  const getFolderStats = useCallback((folderId: string) => {
    const docs = documents.filter(doc => doc.folderId === folderId);
    const totalItems = docs.length;
    const totalSize = docs.reduce((sum, doc) => sum + doc.size, 0);
    return { totalItems, totalSize };
  }, [documents]);

  const getFolderContent = useCallback((folderId?: string) => {
    const targetFolderId = folderId ?? currentFolderId;
    const docs = getDocumentsByFolder(targetFolderId);
    const subFolders = folders.filter(folder => folder.parentId === targetFolderId);
    return { documents: docs, subFolders };
  }, [folders, getDocumentsByFolder, currentFolderId]);

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
    getFolderContent
  };

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
}
