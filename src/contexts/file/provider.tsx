import { useCallback, useState, useEffect, useRef } from "react";
import { useUser } from "@/hooks/useUser";
import type { Document, Folder, Tag } from "./def";
import { FileContext } from "./context";
import { FileTreeNode } from "@/logic/local/FileTreeNode";
import { FileTreeNodeApi } from "@/logic/miror/FileTreeNodeApi";
import { mockFolders, mockDocuments } from "@/data/mockData";
import { toast } from "@/hooks/useToast";
import { TreeFolderDTO, TreeDocumentDTO } from "@/lib/api/api-tree";

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

  const [rootNode, setRootNode] = useState<FileTreeNode>(() => {
    // Placeholder initial (mocks) en attendant le fetch
    const baseRoot = FileTreeNode.buildRootTree(mockDocuments, mockFolders);
    return new FileTreeNodeApi(
      baseRoot.id,
      baseRoot.name,
      baseRoot.type,
      baseRoot.getData() as Folder,
      baseRoot.stats,
      baseRoot.parentId
    );
  });
  const [loadingTree, setLoadingTree] = useState<boolean>(false);
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
    setTags((prev) => {
      const next = rootNode.computeTagStats(
        prev,
        customTagsRef.current,
        defaultColors
      );
      return next;
    });
  }, [rootNode]);

  const bumpTreeVersion = useCallback(() => {
    setTreeVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    updateTags();
  }, [updateTags, treeVersion, rootNode]);

  // Chargement initial du tree depuis l'API
  const reloadTree = useCallback(async () => {
    // Attendre que l'utilisateur soit authentifié
    if (
      !session ||
      session.isLoading ||
      !session.isAuthenticated ||
      !session.user
    ) {
      return; // on ne lance pas tant que la session n'est pas prête
    }
    setLoadingTree(true);
    try {
      const apiRoot = await FileTreeNodeApi.buildFromRemoteTree(
        session.user.id
      );
      if (!apiRoot) {
        toast({
          title: "Aucun arbre",
          description: "Aucun dossier racine en base.",
          variant: "destructive",
        });
        return;
      }
      setRootNode(apiRoot);
      setCurrentNodeRef(apiRoot);
      bumpTreeVersion();
    } catch (e) {
      console.error("Erreur chargement arbre", e);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'arbre distant.",
        variant: "destructive",
      });
    } finally {
      setLoadingTree(false);
    }
  }, [session, bumpTreeVersion]);

  // Charger l'arbre seulement une fois la session authentifiée et stable
  useEffect(() => {
    if (session && !session.isLoading && session.isAuthenticated) {
      reloadTree();
    }
  }, [session, session?.isAuthenticated, session?.isLoading, reloadTree]);

  // Abonnement rollback pour feedback utilisateur
  useEffect(() => {
    if (!(rootNode instanceof FileTreeNodeApi)) return;
    const unsubscribe = rootNode.onRollback(({ nodeId }) => {
      toast({
        title: "Synchronisation annulée",
        description: `Les changements sur le nœud ${nodeId} ont été restaurés (échec serveur).`,
        variant: "destructive",
      });
      bumpTreeVersion();
    });
    return unsubscribe;
  }, [rootNode, bumpTreeVersion]);

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

  const deleteTag = useCallback(
    async (tagId: string) => {
      setCustomTags((prev) => prev.filter((t) => t.id !== tagId));
      const tagName = tagId.startsWith("tag-") ? tagId.substring(4) : tagId;
      rootNode.deleteTagReferences(tagName);
      bumpTreeVersion();
    },
    [rootNode, bumpTreeVersion]
  );

  const addNodeTag = useCallback(
    (node: FileTreeNode, tagName: string) => {
      if (rootNode.addTagToNode(node.id, tagName)) bumpTreeVersion();
    },
    [rootNode, bumpTreeVersion]
  );

  const removeNodeTag = useCallback(
    (node: FileTreeNode, tagName: string) => {
      if (rootNode.removeTagFromNode(node.id, tagName)) bumpTreeVersion();
    },
    [rootNode, bumpTreeVersion]
  );

  const moveNode = useCallback(
    async (nodeId: string, targetFolderId: string | null) => {
      if (rootNode.relocateNode(nodeId, targetFolderId)) bumpTreeVersion();
    },
    [rootNode, bumpTreeVersion]
  );

  const createFolder = useCallback(
    (folder: Folder) => {
      const created = rootNode.createFolderNode(folder);
      if (created) bumpTreeVersion();
    },
    [rootNode, bumpTreeVersion]
  );

  const createDocument = useCallback(
    (doc: Document) => {
      const created = rootNode.createDocumentNode(doc);
      if (created) bumpTreeVersion();
    },
    [rootNode, bumpTreeVersion]
  );

  // ==================== Helpers tags (après actions) ====================
  const getTagsByIds = useCallback(
    (ids: string[]) => {
      return ids
        .map((id) => tags.find((tag) => tag.id === id))
        .filter((tag): tag is Tag => tag !== undefined);
    },
    [tags]
  );

  const getAllTags = useCallback(() => tags, [tags]);

  const getTagCount = useCallback(
    (tagId: string) => {
      const tag = tags.find((t) => t.id === tagId);
      return tag?.count ?? 0;
    },
    [tags]
  );

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
        loadingTree,
        reloadTree,
      }}
    >
      {children}
    </FileContext.Provider>
  );
}
