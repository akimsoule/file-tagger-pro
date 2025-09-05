import { useCallback, useState, useEffect, useRef } from "react";
import { useUser } from "@/hooks/useUser";
import type { Document, Folder, Tag } from "./def";
import { FileContext } from "./context";
import { FileTreeNode } from "@/logic/local/FileTreeNode";
import { mockFolders, mockDocuments } from "@/data/mockData";
import { parseTags, joinTags } from "@/lib/tags"; // parse/join potentiellement à retirer si plus utilisés

// Couleurs par défaut pour les tags
const defaultColors = [
  "#DC2626",
  "#2563EB",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#8B5CF6",
  "#6B7280",
  "#EF4444",
  "#60A5FA",
  "#D946EF",
];

export function FileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useUser();

  const [rootNode] = useState(() =>
    FileTreeNode.buildRootTree(mockDocuments, mockFolders)
  );
  const [currentNodeRef, setCurrentNodeRef] = useState<FileTreeNode | null>(
    rootNode
  );
  const [selectedNodeRef, setSelectedNodeRef] = useState<FileTreeNode | null>(
    null
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<Tag[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [treeVersion, setTreeVersion] = useState(0);
  const customTagsRef = useRef(customTags);
  const currentNode = currentNodeRef;
  const selectedNode = selectedNodeRef;

  useEffect(() => {
    customTagsRef.current = customTags;
  }, [customTags]);

  const updateTags = useCallback(() => {
  setTags(prev => {
    const next = rootNode.computeTagStats(prev, customTagsRef.current, defaultColors);
    return next;
  });
  }, [rootNode]);

  const bumpTreeVersion = useCallback(() => {
    setTreeVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    updateTags();
  }, [updateTags, treeVersion]);

  const setCurrentNode = useCallback(
    (node: FileTreeNode | null) => {
      setCurrentNodeRef(node || rootNode);
    },
    [rootNode]
  );

  const setSelectedNode = useCallback((node: FileTreeNode | null) => {
    setSelectedNodeRef(node);
  }, []);

  const updateNode = useCallback(
    async (nodeId: string, updates: Partial<Document | Folder>) => {
      if (rootNode.updateNodeFields(nodeId, updates)) bumpTreeVersion();
    },
    [rootNode, bumpTreeVersion]
  );

  const addToFavorites = useCallback(
    async (nodeId: string) => {
      if (rootNode.toggleFavorite(nodeId, true)) bumpTreeVersion();
    },
    [rootNode, bumpTreeVersion]
  );

  const removeFromFavorites = useCallback(
    async (nodeId: string) => {
      if (rootNode.toggleFavorite(nodeId, false)) bumpTreeVersion();
    },
    [rootNode, bumpTreeVersion]
  );

  const updateTag = useCallback(
    async (tagId: string, updates: Partial<Tag>) => {
      setCustomTags((prev) => {
        const idx = prev.findIndex((t) => t.id === tagId);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], ...updates, updatedAt: new Date() };
        return next;
      });
      bumpTreeVersion();
    },
    [bumpTreeVersion]
  );

  const createTag = useCallback(
    async (tagInput: Omit<Tag, "id" | "count" | "createdAt" | "updatedAt">) => {
      const id = `tag-custom-${Date.now()}`;
      const newTag: Tag = {
        id,
        name: tagInput.name.trim(),
        color: tagInput.color,
        count: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setCustomTags((prev) => [...prev, newTag]);
      bumpTreeVersion();
    },
    [bumpTreeVersion]
  );

  const deleteTag = useCallback(async (tagId: string) => {
    setCustomTags(prev => prev.filter(t => t.id !== tagId));
    const tagName = tagId.startsWith('tag-') ? tagId.substring(4) : tagId;
    rootNode.deleteTagReferences(tagName);
    bumpTreeVersion();
  }, [rootNode, bumpTreeVersion]);

  const addNodeTag = useCallback((node: FileTreeNode, tagName: string) => {
    if (rootNode.addTagToNode(node.id, tagName)) bumpTreeVersion();
  }, [rootNode, bumpTreeVersion]);

  const removeNodeTag = useCallback((node: FileTreeNode, tagName: string) => {
    if (rootNode.removeTagFromNode(node.id, tagName)) bumpTreeVersion();
  }, [rootNode, bumpTreeVersion]);

  const moveNode = useCallback(
    async (nodeId: string, targetFolderId: string | null) => {
      if (rootNode.relocateNode(nodeId, targetFolderId)) bumpTreeVersion();
    },
    [rootNode, bumpTreeVersion]
  );

  const createFolder = useCallback((folder: Folder) => {
    const created = rootNode.createFolderNode(folder);
    if (created) bumpTreeVersion();
  }, [rootNode, bumpTreeVersion]);

  const createDocument = useCallback((doc: Document) => {
    const created = rootNode.createDocumentNode(doc);
    if (created) bumpTreeVersion();
  }, [rootNode, bumpTreeVersion]);

  // ==================== Helpers tags (après actions) ====================
  const getTagsByIds = useCallback((ids: string[]) => {
    return ids
      .map(id => tags.find(tag => tag.id === id))
      .filter((tag): tag is Tag => tag !== undefined);
  }, [tags]);

  const getAllTags = useCallback(() => tags, [tags]);

  const getTagCount = useCallback((tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    return tag?.count ?? 0;
  }, [tags]);

  const toggleTagSelection = useCallback((tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }, []);

  return (
    <FileContext.Provider
      value={{
        currentNode,
        selectedNode,
        tags,
        selectedTags,
        setCurrentNode,
        setSelectedNode,
        setSelectedTags,
        getTagsByIds,
        getAllTags,
        getTagCount,
        toggleTagSelection,
        updateNode,
        addToFavorites,
        removeFromFavorites,
        updateTag,
        createTag,
        deleteTag,
        customTags,
        addNodeTag,
        removeNodeTag,
        moveNode,
        createFolder,
        createDocument,
      }}
    >
      {children}
    </FileContext.Provider>
  );
}
