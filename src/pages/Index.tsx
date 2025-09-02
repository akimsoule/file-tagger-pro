import { useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FileManagerSidebar } from "@/components/FileManagerSidebar";
import { SearchBar } from "@/components/SearchBar";
import { FileCard } from "@/components/FileCard";
import { FileDetailsModal } from "@/components/FileDetailsModal";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useFileContext } from "@/hooks/useFileContext";
import { useQuery } from "@/hooks/useQuery";
import { useTags } from "@/hooks/useTags";
import { Folder as FolderIcon, FileText } from "lucide-react";
import { FolderCard } from "@/components/FolderCard";

const Index = () => {
  const {
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    getFilteredContent,
    getSortedContent
  } = useQuery();
  
  const {
    documents,
    folders,
    currentFolderId,
    setCurrentFolderId,
    selectedDocumentId,
    selectDocument,
    findDocumentById,
    toggleFavorite,
    getFolderContent
  } = useFileContext();

  const { selectedTags, toggleTagSelection: toggleTag } = useTags();


  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSortBy("date");
  }, [setSearchQuery, setSortBy]);

  const folderContent = currentFolderId 
    ? getFolderContent(currentFolderId)
    : { documents: documents, subFolders: folders };

  const filteredDocuments = getFilteredContent(folderContent.documents);
  const sortedDocuments = getSortedContent(filteredDocuments);
  const content = {
    folders: folderContent.subFolders,
    documents: sortedDocuments
  };

  const handleNavigateBack = () => {
    if (currentFolderId) {
      const currentFolder = folders.find(f => f.id === currentFolderId);
      setCurrentFolderId(currentFolder?.parentId || null);
    }
  };

  const selectedDocument = selectedDocumentId
    ? findDocumentById(selectedDocumentId)
    : null;
  const currentFolder = currentFolderId 
    ? folders.find(f => f.id === currentFolderId)
    : null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FileManagerSidebar
          onNavigateToFolder={setCurrentFolderId}
          currentFolderId={currentFolderId}
        />

        <main className="flex-1 flex flex-col">
          <header className="flex items-center gap-4 p-4 border-b border-border bg-card/50">
            <SidebarTrigger className="shrink-0" />
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-gradient">
                <FolderIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {currentFolder ? currentFolder.name : "Root Folder"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {currentFolder?.description ||
                    "Organisez vos documents avec des tags intelligents"}
                </p>
              </div>
            </div>
          </header>

          <div className="flex flex-1 flex-col p-8 gap-8">
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
              onNavigateBack={handleNavigateBack}
            />

            <div className="flex-1 p-6">
              <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="whitespace-nowrap">
                  {content.folders.length} dossiers
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="whitespace-nowrap">
                  {content.documents.length} documents
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="whitespace-nowrap">
                  {(
                    content.documents.reduce((acc, doc) => acc + doc.size, 0) /
                    (1024 * 1024)
                  ).toFixed(2)}{" "}
                  Mo
                </span>
              </div>

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
                  {content.folders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onClick={() => setCurrentFolderId(folder.id)}
                    />
                  ))}

                  {content.documents.map((doc) => (
                    <FileCard
                      key={doc.id}
                      document={doc}
                      onClick={() => selectDocument(doc.id)}
                      onToggleFavorite={() => toggleFavorite(doc.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        <FileDetailsModal
          document={selectedDocument}
          isOpen={!!selectedDocumentId}
          onClose={() => selectDocument(null)}
          onToggleFavorite={() => {
            if (selectedDocumentId) {
              toggleFavorite(selectedDocumentId);
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
