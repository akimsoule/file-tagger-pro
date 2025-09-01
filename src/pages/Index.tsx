import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { FileManagerSidebar } from '@/components/FileManagerSidebar';
import { SearchBar } from '@/components/SearchBar';
import { FileCard } from '@/components/FileCard';
import { FolderStats } from '@/components/FolderStats';
import { FileDetailsModal } from '@/components/FileDetailsModal';
import { useFiles } from '@/hooks/use-files';
import { Folder as FolderIcon, FileText } from 'lucide-react';

const Index = () => {
  const { 
    toggleFavorite,
    getDocumentById,
    getFolderById,
    getSortedContent,
    searchQuery,
    setSearchQuery,
    selectedTags,
    toggleTag,
    clearFilters,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    selectedDocumentId,
    selectDocument,
    currentFolderId,
    navigateToFolder
  } = useFiles();

  const content = getSortedContent(currentFolderId || undefined);

  const handleNavigateBack = () => {
    if (currentFolderId) {
      const currentFolder = getFolderById(currentFolderId);
      navigateToFolder(currentFolder?.parentId || null);
    }
  };

  const selectedDocument = selectedDocumentId ? getDocumentById(selectedDocumentId) : null;
  const currentFolder = currentFolderId ? getFolderById(currentFolderId) : null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FileManagerSidebar 
          onNavigateToFolder={navigateToFolder}
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
                  {currentFolder ? currentFolder.name : 'Mes Documents'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {currentFolder?.description || 'Organisez vos documents avec des tags intelligents'}
                </p>
              </div>
            </div>
          </header>

          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortBy={sortBy}
            onSortChange={setSortBy}
            selectedTags={selectedTags}
            onClearFilters={clearFilters}
            onNavigateBack={currentFolderId ? handleNavigateBack : undefined}
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
                {(content.documents.reduce((acc, doc) => acc + doc.size, 0) / (1024 * 1024)).toFixed(2)} Mo
              </span>
            </div>

            {content.folders.length === 0 && content.documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Dossier vide
                </h3>
                <p className="text-muted-foreground max-w-sm">
                  Ce dossier est vide ou aucun élément ne correspond à vos critères de recherche.
                </p>
              </div>
            ) : (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'space-y-2'
              }>
                {content.folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="p-4 rounded-lg border border-border hover:border-primary/20 cursor-pointer transition-all"
                    onClick={() => navigateToFolder(folder.id)}
                  >
                    <div className="flex flex-col gap-3 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 p-2 rounded-lg" style={{ backgroundColor: folder.color + '20' }}>
                          <FolderIcon className="h-5 w-5" style={{ color: folder.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium truncate">{folder.name}</h3>
                          {folder.description && (
                            <p className="text-sm text-muted-foreground truncate">{folder.description}</p>
                          )}
                        </div>
                      </div>
                      <FolderStats folderId={folder.id} />
                    </div>
                  </div>
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