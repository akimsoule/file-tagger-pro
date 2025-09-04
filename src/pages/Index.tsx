import { useCallback, useMemo } from "react";
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
import { Folder as FolderIcon, FileText, ChevronLeft } from "lucide-react";
import { formatFileSize } from '@/lib/format';
import { StatsBar } from '@/components/StatsBar';
import { useTotalSize } from '@/hooks/useTotalSize';
import { FolderCard } from "@/components/FolderCard";
import { FileTreeNode } from "@/logic/FileTreeNode";
import type { Document, Folder } from "@/contexts/file/def";

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
    getNodeContent,
    updateNode,
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

  const { documents: documentNodes, folders: folderNodes } = useFilteredNodes(currentNode);
  const content = { documents: documentNodes, folders: folderNodes };

  const navigateUp = useCallback(() => {
    if (currentNode?.parent) {
      setCurrentNode(currentNode.parent as FileTreeNode);
    }
  }, [currentNode, setCurrentNode]);

  const totalSize = useTotalSize(content.documents);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <FileManagerSidebar
          onNavigateToFolder={(node) => setCurrentNode(node as FileTreeNode)}
          currentNode={currentNode}
        />

        <main className="flex-1 flex flex-col min-w-0 w-full">
          <header className="flex items-center gap-4 p-4 border-b border-border bg-card/50">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="shrink-0" />
              {currentNode?.parent && (
                <button
                  onClick={navigateUp}
                  className="p-2 hover:bg-accent rounded-lg"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-gradient">
                <FolderIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
                  <FolderIcon className="w-6 h-6" />
                  {currentNode ? currentNode.name : "Root Folder"}
                </h1>
                <p className="text-muted-foreground">
                  {(currentNode?.getData() as Folder)?.description ||
                    "This is the root folder of your files."}
                </p>
              </div>
            </div>
          </header>

          <div className="flex flex-1 flex-col p-3 sm:p-6 md:p-8 gap-4 sm:gap-6 md:gap-8 overflow-y-auto">
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

            <div className="flex-1 p-2 sm:p-4 md:p-6">
              <StatsBar
                folders={content.folders.length}
                documents={content.documents.length}
                sizeBytes={totalSize}
              />

              {content.folders.length === 0 &&
              content.documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Dossier vide
                  </h3>
                  <p className="text-muted-foreground max-w-sm">
                    Ce dossier est vide ou aucun élément ne correspond à vos
                    critères de recherche.
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
        </main>

        <FileDetailsModal
          document={selectedNode ? (selectedNode.getData() as Document) : null}
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
    </SidebarProvider>
  );
};

export default Index;
