import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useLocation, useNavigate } from "react-router-dom";
import CommandMenu from "@/components/CommandMenu";
import { useUiCommands } from "@/contexts/ui/useUiCommands";
import { FolderPicker } from "@/components/FolderPicker";
import { useFileContext } from "@/hooks/useFileContext";
import { useFilteredNodes } from "@/hooks/useFilteredNodes";
import { useQuery } from "@/hooks/useQuery";
import { useFavoriteNodes } from "@/hooks/useFavoriteNodes";
import type { Document } from "@/contexts/file";
import { FileTreeNode } from "@/logic/local/FileTreeNode";
import { useTags } from "@/hooks/useTags";

export default function GlobalCommand() {
  const navigate = useNavigate();
  const location = useLocation();
  const isFavorites = location.pathname.startsWith("/favorites");
  const ui = useUiCommands();
  const uiRef = useRef(ui);
  useEffect(() => {
    uiRef.current = ui;
  }, [ui]);

  const openWithRetry = (
    getFn: () => (() => void) | undefined,
    tries = 15,
    delayMs = 40
  ) => {
    const tryOpen = (remaining: number) => {
      const fn = getFn();
      if (fn) {
        fn();
      } else if (remaining > 0) {
        setTimeout(() => tryOpen(remaining - 1), delayMs);
      }
    };
    setTimeout(() => tryOpen(tries), 0);
  };

  const { viewMode, setViewMode, sortBy, setSortBy } = useQuery();
  const {
    currentNode,
    selectedNode,
    setCurrentNode,
    setSelectedNode,
    updateNode,
    moveNode,
    reloadTree,
    getAllTags,
    addNodeTag,
    removeNodeTag,
    deleteNode,
  } = useFileContext();

  const { documents: documentNodes, folders: folderNodes } =
    useFilteredNodes(currentNode);
  const { favoriteNodes } = useFavoriteNodes();
  const { tags, selectedTags, toggleTagSelection, setSelectedTags } = useTags();

  const [cmdOpen, setCmdOpen] = useState(false);
  const [scrollToTags, setScrollToTags] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<null | {
    id: string;
    name: string;
  }>(null);
  // TagEditor supprimé: raccourcis orientent vers la section Tags de la palette

  // Global hotkeys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = (target?.tagName || '').toLowerCase();
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        (target && (target as HTMLElement).isContentEditable);

      // Cmd/Ctrl+K -> open command menu
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
        return;
      }
      // / -> focus search
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key === "/") {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>(
          'input[placeholder="Rechercher..."]'
        );
        el?.focus();
        return;
      }
      // g -> grid, l -> list
      if (
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        (e.key === "g" || e.key === "l")
      ) {
        if (e.key === "g") setViewMode("grid");
        if (e.key === "l") setViewMode("list");
        return;
      }
      // r -> reload
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key === "r") {
        reloadTree?.();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.altKey && (e.code === "KeyT" || e.code === "KeyG")) {
        e.preventDefault();
        setScrollToTags(true);
        setCmdOpen(true);
        return;
      }

      // Backspace -> go to parent folder (or close preview if a document is selected)
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key === 'Backspace') {
        if (isEditable) return; // ne pas interférer avec la saisie
        e.preventDefault(); // empêcher le retour navigateur
        // Si un document est ouvert, fermer d'abord le modal
        if (selectedNode) {
          setSelectedNode(null as unknown as FileTreeNode);
          return;
        }
        // Sinon, remonter au dossier parent si possible
        if (currentNode && (currentNode as FileTreeNode).parent) {
          const parent = (currentNode as FileTreeNode).parent as FileTreeNode;
          setCurrentNode(parent);
        }
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reloadTree, setViewMode, selectedNode, currentNode, setCurrentNode, setSelectedNode]);

  // (TagEditor supprimé)

  const quickItems = useMemo(() => {
    if (isFavorites) {
      return favoriteNodes.slice(0, 20).map((n) => ({
        id: n.id,
        type: "document" as const,
        name: (n.getData() as Document).name,
        subtitle: new Date(
          (n.getData() as Document).modifiedAt
        ).toLocaleDateString(),
        onOpen: () => setSelectedNode(n),
      }));
    }
    return [
      ...folderNodes.slice(0, 8).map((f) => ({
        id: f.id,
        type: "folder" as const,
        name: f.name,
        subtitle: `${f.children?.length ?? 0} éléments`,
        onOpen: () => setCurrentNode(f),
      })),
      ...documentNodes.slice(0, 12).map((d) => ({
        id: d.id,
        type: "document" as const,
        name: (d.getData() as Document).name,
        subtitle: new Date(
          (d.getData() as Document).modifiedAt
        ).toLocaleDateString(),
        onOpen: () => setSelectedNode(d),
      })),
    ];
  }, [
    isFavorites,
    favoriteNodes,
    folderNodes,
    documentNodes,
    setCurrentNode,
    setSelectedNode,
  ]);

  const selectedContext = useMemo(() => {
    if (!selectedNode) return null;
    if (selectedNode.id === "root") return null; // aucune action sur root
    if (selectedNode.type !== "file") return null; // actions de sélection uniquement pour les fichiers
    const doc = selectedNode.getData() as Document;
    return {
      name: doc.name,
      isFavorite: doc.isFavorite,
      onOpen: () => setSelectedNode(selectedNode),
      onToggleFavorite: () =>
        updateNode(selectedNode.id, { ...doc, isFavorite: !doc.isFavorite }),
      onRename: () => {
        const name = window.prompt("Nouveau nom de fichier", doc.name);
        if (name && name.trim())
          updateNode(selectedNode.id, { ...doc, name: name.trim() });
      },
      onMove: () => setMoveOpen(true),
      onDelete: () => setConfirmOpen({ id: selectedNode.id, name: doc.name }),
      tags: getAllTags().map((t) => {
        const has = doc.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .includes(t.name);
        return { id: t.id, name: t.name, selected: has };
      }),
      onToggleTag: (name: string) => {
        const has = doc.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .includes(name);
        if (has) removeNodeTag(selectedNode, name);
        else addNodeTag(selectedNode, name);
      },
      onCreateTag: () => {
        const name = window.prompt("Nom du nouveau tag");
        if (!name || !name.trim()) return;
        addNodeTag(selectedNode, name.trim());
      },
    };
  }, [
    selectedNode,
    setSelectedNode,
    updateNode,
    getAllTags,
    addNodeTag,
    removeNodeTag,
  ]);

  return (
    <>
      <FolderPicker
        isOpen={moveOpen}
        onClose={() => setMoveOpen(false)}
        currentFolderId={moveTarget ?? undefined}
        excludeFolderId={selectedNode?.id}
        title="Déplacer vers…"
        onSelect={(folderId) => {
          if (selectedNode) {
            setMoveTarget(folderId);
            moveNode(selectedNode.id, folderId);
          }
        }}
      />
      <CommandMenu
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        autoScrollToTags={scrollToTags}
        onFocusSearch={() => {
          const el = document.querySelector<HTMLInputElement>(
            'input[placeholder="Rechercher..."]'
          );
          el?.focus();
        }}
        onToggleGrid={() => setViewMode("grid")}
        onToggleList={() => setViewMode("list")}
        onSortBy={(s) => setSortBy(s)}
        onNewFolder={() => {
          if (location.pathname !== "/") navigate("/");
          openWithRetry(() => uiRef.current.openCreateFolder);
        }}
        onUpload={() => {
          if (location.pathname !== "/") navigate("/");
          openWithRetry(() => uiRef.current.openUpload);
        }}
        onReload={() => reloadTree?.()}
        onGoRoot={() => {
          setCurrentNode(null as unknown as FileTreeNode);
          if (location.pathname !== "/") navigate("/");
        }}
  onOpenSettings={() => openWithRetry(() => uiRef.current.openSettings)}
        filterTags={tags.map((t) => ({
          id: t.id,
          name: t.name,
          selected: selectedTags.includes(t.id),
        }))}
        onToggleFilterTag={(id) => toggleTagSelection(id)}
        onClearFilterTags={() => setSelectedTags([])}
        quickItems={quickItems}
        selectedContext={selectedContext}
      />
  {/* TagEditor supprimé */}
      {cmdOpen === false && scrollToTags && setScrollToTags(false)}
      <ConfirmDialog
        open={!!confirmOpen}
        onOpenChange={(o) => !o && setConfirmOpen(null)}
        title="Supprimer l'élément ?"
        description={
          confirmOpen
            ? `Cette action est définitive. "${confirmOpen.name}" sera supprimé.`
            : ""
        }
        confirmLabel="Supprimer"
        onConfirm={() => {
          if (confirmOpen) deleteNode?.(confirmOpen.id);
          setConfirmOpen(null);
        }}
      />
    </>
  );
}
