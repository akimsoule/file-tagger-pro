import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { FileManagerSidebar } from '@/components/FileManagerSidebar';
import { SearchBar } from '@/components/SearchBar';
import { FileCard } from '@/components/FileCard';
import { FileDetailsModal } from '@/components/FileDetailsModal';
import { Heart } from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { useFileContext } from '@/hooks/useFileContext';
import { useTags } from '@/hooks/useTags';
import { useFavoriteNodes } from '@/hooks/useFavoriteNodes';
import type { Document } from '@/contexts/file/def';
import React from 'react';

const Favorites = () => {
  const {
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    clearFilters,
  } = useQuery();
  const { updateNode, setSelectedNode, selectedNode } = useFileContext();
  const { selectedTags, toggleTagSelection: toggleTag, tags } = useTags();

  const { favoriteNodes: sortedFavoriteNodes, totalSize } = useFavoriteNodes();

  // Chargement paresseux: nombre d'éléments visibles
  const BATCH_GRID = 24;
  const BATCH_LIST = 40;
  const [visibleCount, setVisibleCount] = React.useState(() => (viewMode === 'grid' ? BATCH_GRID : BATCH_LIST));
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const isComplete = visibleCount >= sortedFavoriteNodes.length;

  // Réinitialiser le compteur quand les critères changent
  React.useEffect(() => {
    setVisibleCount(viewMode === 'grid' ? BATCH_GRID : BATCH_LIST);
  }, [viewMode, searchQuery, selectedTags, sortBy, sortedFavoriteNodes.length]);

  // IntersectionObserver pour charger plus d'éléments automatiquement
  React.useEffect(() => {
    if (!sentinelRef.current) return;
    if (isComplete) return; // Rien à observer si tout est chargé

    const node = sentinelRef.current;
    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setVisibleCount(c => {
            const increment = viewMode === 'grid' ? BATCH_GRID : BATCH_LIST;
            return Math.min(sortedFavoriteNodes.length, c + increment);
          });
        }
      },
      { rootMargin: '200px 0px 400px 0px', threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isComplete, viewMode, sortedFavoriteNodes.length]);

  const visibleNodes = React.useMemo(
    () => sortedFavoriteNodes.slice(0, visibleCount),
    [sortedFavoriteNodes, visibleCount]
  );

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
                  Favoris
                </h1>
                <p className="text-sm text-muted-foreground">
                  Vos fichiers favoris
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
            toggleTagSelection={toggleTag}
            tags={tags}
          />

          {/* Zone de contenu principal */}
          <div className="flex-1 p-2 sm:p-4 md:p-6">
            {/* Statistiques */}
            <div className="mb-6 flex items-center gap-4 text-sm text-muted-foreground">
              <span>{sortedFavoriteNodes.length} documents favoris</span>
              <span>•</span>
              <span>{(totalSize / (1024 * 1024)).toFixed(2)} Mo</span>
            </div>

            {/* Grille de documents */}
            {sortedFavoriteNodes.length === 0 ? (
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
                {visibleNodes.map(node => {
                  const doc = node.getData() as Document;
                  return (
                    <FileCard
                      key={node.id}
                      node={node}
                      onClick={() => setSelectedNode(node)}
                      onToggleFavorite={() => updateNode(node.id, { isFavorite: !doc.isFavorite })}
                    />
                  );
                })}
                {/* Sentinelle pour le chargement paresseux */}
                {!isComplete && (
                  <div
                    ref={sentinelRef}
                    className={
                      viewMode === 'grid'
                        ? 'h-24 col-span-full flex items-center justify-center'
                        : 'h-16 flex items-center justify-center'
                    }
                  >
                    <span className="text-xs text-muted-foreground animate-pulse">
                      Chargement…
                    </span>
                  </div>
                )}
              </div>
            )}
            {/* Bouton fallback d'accessibilité pour charger plus */}
            {!isComplete && sortedFavoriteNodes.length > 0 && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const inc = viewMode === 'grid' ? BATCH_GRID : BATCH_LIST;
                    setVisibleCount(c => Math.min(sortedFavoriteNodes.length, c + inc));
                  }}
                  className="px-4 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border transition"
                >
                  Charger plus ({visibleCount}/{sortedFavoriteNodes.length})
                </button>
              </div>
            )}
          </div>
          <FileDetailsModal
            document={selectedNode ? (selectedNode.getData() as Document) : null}
            isOpen={!!selectedNode}
            onClose={() => setSelectedNode(null)}
            onToggleFavorite={() => {
              if (selectedNode) {
                const doc = selectedNode.getData() as Document;
                updateNode(selectedNode.id, { isFavorite: !doc.isFavorite });
              }
            }}
            onTagClick={(tagId) => {/* tag interactions handled globally */}}
            selectedTags={selectedTags}
          />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Favorites;