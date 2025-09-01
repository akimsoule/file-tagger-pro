import { useState, useMemo } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { FileManagerSidebar } from '@/components/FileManagerSidebar';
import { SearchBar } from '@/components/SearchBar';
import { FileCard } from '@/components/FileCard';
import { FileDetailsModal } from '@/components/FileDetailsModal';
import { useFiles } from '@/hooks/use-files';
import { ViewMode, SortBy } from '@/types';
import { Folder, FileText } from 'lucide-react';

const Index = () => {
  const { files, toggleFavorite, getFileById } = useFiles();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Filtrage et tri des fichiers
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = files;

    // Filtrage par recherche
    if (searchQuery) {
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrage par tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(file =>
        file.tags.some(tag => selectedTags.includes(tag.id))
      );
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return b.dateModified.getTime() - a.dateModified.getTime();
        case 'size':
          return (b.size || 0) - (a.size || 0);
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchQuery, selectedTags, sortBy, files]);

  const handleClearFilters = () => {
    setSelectedTags([]);
    setSearchQuery('');
  };

  const handleFileClick = (fileId: string) => {
    setSelectedFileId(fileId);
  };

  const handleCloseModal = () => {
    setSelectedFileId(null);
  };

  const selectedFile = selectedFileId ? getFileById(selectedFileId) : null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FileManagerSidebar />
        
        <main className="flex-1 flex flex-col">
          {/* Header avec trigger de sidebar et titre */}
          <header className="flex items-center gap-4 p-4 border-b border-border bg-card/50">
            <SidebarTrigger className="shrink-0" />
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-gradient">
                <Folder className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Gestionnaire de Fichiers
                </h1>
                <p className="text-sm text-muted-foreground">
                  Organisez vos fichiers avec des tags intelligents
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
            onClearFilters={handleClearFilters}
          />

          {/* Zone de contenu principal */}
          <div className="flex-1 p-6">
            {/* Statistiques */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{filteredAndSortedFiles.length} éléments</span>
                <span>•</span>
                <span>
                  {filteredAndSortedFiles.filter(f => f.type === 'folder').length} dossiers
                </span>
                <span>•</span>
                <span>
                  {filteredAndSortedFiles.filter(f => f.type === 'file').length} fichiers
                </span>
              </div>
            </div>

            {/* Grille de fichiers */}
            {filteredAndSortedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Aucun fichier trouvé
                </h3>
                <p className="text-muted-foreground max-w-sm">
                  Essayez de modifier vos critères de recherche ou effacez les filtres actifs.
                </p>
              </div>
            ) : (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'space-y-2'
              }>
                {filteredAndSortedFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onClick={() => handleFileClick(file.id)}
                    onToggleFavorite={() => toggleFavorite(file.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Modal de détails du fichier */}
        <FileDetailsModal
          file={selectedFile}
          isOpen={!!selectedFileId}
          onClose={handleCloseModal}
          onToggleFavorite={() => {
            if (selectedFileId) {
              toggleFavorite(selectedFileId);
            }
          }}
        />
      </div>
    </SidebarProvider>
  );
};

export default Index;
