import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { FileManagerSidebar } from '@/components/FileManagerSidebar';
import { SearchBar } from '@/components/SearchBar';
import { FileCard } from '@/components/FileCard';
import { Heart } from 'lucide-react';
import { useFileContext } from '@/hooks/useFileContext';

const Favorites = () => {
  const {
    getFilteredAndSortedFavorites,
    toggleFavorite,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    selectedTags,
    clearFilters
  } = useFileContext();

  const filteredAndSortedDocuments = getFilteredAndSortedFavorites();

  // Plus besoin de handleClearFilters car on utilise clearFilters du contexte

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FileManagerSidebar />
        
        <main className="flex-1 flex flex-col">
          {/* Header avec trigger de sidebar et titre */}
          <header className="flex items-center gap-4 p-4 border-b border-border bg-card/50">
            <SidebarTrigger className="shrink-0" />
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-pink-600">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Documents Favoris
                </h1>
                <p className="text-sm text-muted-foreground">
                  Vos documents favoris
                </p>
              </div>
            </div>
          </header>

          {/* Barre de recherche et filtres */}
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortBy={sortBy}
            onSortChange={setSortBy}
            selectedTags={selectedTags}
            onClearFilters={clearFilters}
          />

          {/* Zone de contenu principal */}
          <div className="flex-1 p-6">
            {/* Statistiques */}
            <div className="mb-6 flex items-center gap-4 text-sm text-muted-foreground">
              <span>{filteredAndSortedDocuments.length} documents favoris</span>
              <span>•</span>
              <span>
                {filteredAndSortedDocuments.reduce((acc, doc) => acc + doc.size, 0) / (1024 * 1024)} Mo
              </span>
            </div>

            {/* Grille de documents */}
            {filteredAndSortedDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Heart className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Aucun document favori
                </h3>
                <p className="text-muted-foreground max-w-sm">
                  Ajoutez des documents à vos favoris en cliquant sur l'icône cœur.
                </p>
              </div>
            ) : (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'space-y-2'
              }>
                {filteredAndSortedDocuments.map((doc) => (
                  <FileCard
                    key={doc.id}
                    document={doc}
                    onClick={() => console.log('Open document:', doc.name)}
                    onToggleFavorite={() => toggleFavorite(doc.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Favorites;