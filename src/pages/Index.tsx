import { useCallback, useEffect, useMemo, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FileManagerSidebar } from "@/components/FileManagerSidebar";
import { SearchBar } from "@/components/SearchBar";
import { FileCard } from "@/components/FileCard";
import { FileDetailsModal } from "@/components/FileDetailsModal";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useFileContext } from "@/hooks/useFileContext";
import { useFilteredNodes } from "@/hooks/useFilteredNodes";
import { useQuery } from "@/hooks/useQuery";
import { useTags } from "@/hooks/useTags";
import {
  Folder as FolderIcon,
  FileText,
  ChevronLeft,
  Plus,
  Upload,
  RefreshCcw,
  Settings as SettingsIcon,
} from "lucide-react";
import { CreateFolderModal } from "@/components/CreateFolderModal";
import { UploadDocumentModal } from "@/components/UploadDocumentModal";
import { StatsBar } from "@/components/StatsBar";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { FolderCardSkeleton } from "@/components/skeletons/FolderCardSkeleton";
import { useTotalSize } from "@/hooks/useTotalSize";
import { FolderCard } from "@/components/FolderCard";
import { FileTreeNode } from "@/logic/local/FileTreeNode";
import type { Document, Folder } from "@/contexts/file";
import { useUiCommands } from "@/contexts/ui/useUiCommands";
import { SettingsModal } from "@/components/SettingsModal";
// Command palette is now global

const Index = () => {
  const {
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    getFilteredContent,
    getSortedContent,
  } = useQuery();

  const {
    currentNode,
    selectedNode,
    setCurrentNode,
    setSelectedNode,
    updateNode,
    loadingTree,
    reloadTree,
  } = useFileContext();

  const { selectedTags, toggleTagSelection: toggleTag, tags } = useTags();

  // IDs -> noms (tags dans les données sont stockés comme noms)
  const selectedTagNames = useMemo(
    () =>
      selectedTags.map((id) => {
        const t = tags.find((tag) => tag.id === id);
        if (t) return t.name;
        return id.replace(/^tag-/, "");
      }),
    [selectedTags, tags]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSortBy("date");
    if (selectedTags.length > 0) {
      selectedTags.forEach((tagId) => toggleTag(tagId));
    }
  }, [setSearchQuery, setSortBy, selectedTags, toggleTag]);

  const { documents: documentNodes, folders: folderNodes } =
    useFilteredNodes(currentNode);
  const content = { documents: documentNodes, folders: folderNodes };

  const navigateUp = useCallback(() => {
    if (currentNode?.parent) {
      setCurrentNode(currentNode.parent as FileTreeNode);
    }
  }, [currentNode, setCurrentNode]);

  const totalSize = useTotalSize(content.documents);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  // Global command palette handles shortcuts

  // Shortcuts handled globally in GlobalCommand

  // Register global UI command triggers
  const { setOpenCreateFolder, setOpenUpload } = useUiCommands();
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    setOpenCreateFolder(() => setCreateFolderOpen(true));
    setOpenUpload(() => setUploadOpen(true));
    return () => {
      setOpenCreateFolder(undefined);
      setOpenUpload(undefined);
    };
  }, [setOpenCreateFolder, setOpenUpload]);

  return (
    <>
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <FileManagerSidebar
            onNavigateToFolder={(node) => setCurrentNode(node as FileTreeNode)}
            currentNode={currentNode}
          />

          <main className="flex-1 flex flex-col min-w-0 w-full min-h-0">
            <header className="flex items-center gap-1 sm:gap-4 p-1 sm:p-4 border-b border-border bg-card/50">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="shrink-0" />
                {currentNode?.parent && (
                  <button
                    onClick={navigateUp}
                    className="p-1 sm:p-2 hover:bg-accent rounded-lg"
                    aria-label="Back"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3">
                <div className="p-1 sm:p-2 rounded-lg bg-primary-gradient">
                  <FolderIcon className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base sm:text-2xl font-bold flex items-center gap-1.5 sm:gap-2 mb-0 sm:mb-2 leading-none">
                    {currentNode ? currentNode.name : "Root Folder"}
                    {loadingTree && <LoadingSpinner size={16} />}
                    <button
                      onClick={() => reloadTree && reloadTree()}
                      className="ml-1 p-1 rounded hover:bg-accent text-muted-foreground"
                      title="Recharger"
                      aria-label="Recharger"
                      disabled={loadingTree}
                    >
                      <RefreshCcw
                        className={`h-4 w-4 ${loadingTree ? "opacity-50" : ""}`}
                      />
                    </button>
                  </h1>
                  <p className="hidden sm:block text-muted-foreground text-sm">
                    {(currentNode?.getData() as Folder)?.description ||
                      "This is the root folder of your files."}
                  </p>
                </div>
              </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-accent text-muted-foreground"
                    title="Paramètres"
                    aria-label="Paramètres"
                  >
                    <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
            </header>
            {/* Modal simple Paramètres */}
            <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

            <div className="flex flex-1 flex-col min-h-0 p-3 gap-2 sm:gap-4 md:gap-6">
              <Breadcrumb />
              <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                sortBy={sortBy}
                onSortChange={setSortBy}
                selectedTags={selectedTags}
                onClearFilters={clearFilters}
                toggleTagSelection={toggleTag}
                tags={tags}
              />
              {/* Zone scrollable principale */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-2 sm:p-4 md:p-6 pb-10">
                  <StatsBar
                    folders={content.folders.length}
                    documents={content.documents.length}
                    sizeBytes={totalSize}
                    loading={loadingTree}
                  />

                  {loadingTree ? (
                    <div
                      className={
                        viewMode === "grid"
                          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                          : "space-y-2"
                      }
                    >
                      {Array.from({ length: viewMode === "grid" ? 8 : 5 }).map(
                        (_, i) =>
                          viewMode === "grid" ? (
                            <FolderCardSkeleton key={i} />
                          ) : (
                            <div
                              key={i}
                              className="rounded-md border border-border p-4 animate-pulse h-16 flex flex-col gap-2"
                            >
                              <div className="h-4 w-1/3 bg-muted rounded" />
                              <div className="h-3 w-1/2 bg-muted rounded" />
                            </div>
                          )
                      )}
                    </div>
                  ) : content.folders.length === 0 &&
                    content.documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
                      <div className="p-5 rounded-full bg-muted/60 mb-2">
                        <FileText className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <div className="space-y-2 max-w-sm">
                        <h3 className="text-xl font-semibold text-foreground">
                          Dossier vide
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          Vous n'avez encore ajouté aucun élément ici. Créez un
                          dossier pour organiser vos fichiers ou uploadez
                          directement votre premier document.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => setCreateFolderOpen(true)}
                          className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <Plus className="h-4 w-4" /> Nouveau dossier
                        </button>
                        <button
                          onClick={() => setUploadOpen(true)}
                          className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          <Upload className="h-4 w-4" /> Uploader un fichier
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Astuce: vous pouvez aussi glisser-déposer un fichier ici
                        (à implémenter).
                      </p>
                    </div>
                  ) : (
                    <div
                      className={
                        viewMode === "grid"
                          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                          : "space-y-2"
                      }
                    >
                      {content.folders.map((folderNode) => (
                        <FolderCard
                          key={folderNode.id}
                          node={folderNode}
                          onClick={() => setCurrentNode(folderNode)}
                        />
                      ))}

                      {content.documents.map((docNode) => (
                        <FileCard
                          key={docNode.id}
                          node={docNode}
                          onClick={() => setSelectedNode(docNode)}
                          onToggleFavorite={() => {
                            const doc = docNode.getData() as Document;
                            const updatedDoc = {
                              ...doc,
                              isFavorite: !doc.isFavorite,
                            };
                            updateNode(docNode.id, updatedDoc);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>

          <FileDetailsModal
            document={
              selectedNode ? (selectedNode.getData() as Document) : null
            }
            isOpen={!!selectedNode}
            onClose={() => setSelectedNode(null)}
            onToggleFavorite={() => {
              if (selectedNode) {
                const doc = selectedNode.getData() as Document;
                const updatedDoc = { ...doc, isFavorite: !doc.isFavorite };
                updateNode(selectedNode.id, updatedDoc);
              }
            }}
            onTagClick={toggleTag}
            selectedTags={selectedTags}
          />
        </div>

  {/* FAB global géré dans App via GlobalFab */}

        <CreateFolderModal
          open={createFolderOpen}
          onClose={() => setCreateFolderOpen(false)}
          parentId={currentNode?.id}
        />
        <UploadDocumentModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
        />
      </SidebarProvider>
    </>
  );
};

export default Index;
