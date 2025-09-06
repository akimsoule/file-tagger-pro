import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Grid3X3, List, SortAsc, X } from 'lucide-react';
import { ViewMode, SortBy } from '@/types';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortBy;
  onSortChange: (sort: SortBy) => void;
  selectedTags: string[];
  onClearFilters: () => void;
  toggleTagSelection: (tagId: string) => void;
  tags: Array<{ id: string; name: string; count?: number }>;
}

export function SearchBar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  selectedTags,
  onClearFilters,
  toggleTagSelection,
  tags,
}: SearchBarProps) {
  // filtre avancé désactivé pour le moment

  const sortOptions = [
    { value: 'name' as SortBy, label: 'Nom' },
    { value: 'date' as SortBy, label: 'Date de modification' },
    { value: 'size' as SortBy, label: 'Taille' },
    { value: 'type' as SortBy, label: 'Type' },
  ];

  return (
    <div className="flex flex-col gap-2 p-2 sm:p-4 bg-background border-b border-border">
      {/* Première ligne : barre de recherche */}
      <div className="w-full">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 bg-accent/50 border-border focus-visible:ring-primary w-full"
          />
        </div>
      </div>

      {/* Deuxième ligne : filtres actifs */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedTags.map((tagId) => {
            const tag = tags.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <Badge
                key={tagId}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1 h-6"
              >
                <span>{tag.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleTagSelection(tagId)}
                  className="h-4 w-4 p-0 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Retirer le tag {tag.name}</span>
                </Button>
              </Badge>
            );
          })}
          {selectedTags.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-xs h-6 px-2"
            >
              Tout effacer
            </Button>
          )}
        </div>
      )}

      {/* Troisième ligne : contrôles */}
      <div className="flex items-center justify-between gap-2">

        {/* Contrôles de droite */}
        <div className="flex items-center gap-2">
          {/* Bouton de tri */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <SortAsc className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onSortChange(option.value)}
                  className={cn(
                    sortBy === option.value && 'bg-accent'
                  )}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Boutons de vue */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden h-8">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onViewModeChange('grid')}
              className="rounded-none border-0 h-8 w-8"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onViewModeChange('list')}
              className="rounded-none border-0 border-l border-border h-8 w-8"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}