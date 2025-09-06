import { useMemo } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Grid3X3,
  List,
  SortAsc,
  FolderPlus,
  Upload,
  RefreshCcw,
  Home,
  Star,
  Settings,
  Search,
  FileText,
  Folder as FolderIcon,
  Tag as TagIcon,
  Check,
} from "lucide-react";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFocusSearch: () => void;
  onToggleGrid: () => void;
  onToggleList: () => void;
  onSortBy: (sort: "name" | "date" | "size" | "type") => void;
  onNewFolder: () => void;
  onUpload: () => void;
  onReload: () => void;
  onGoRoot: () => void;
  onOpenSettings: () => void;
  onOpenFavorites: () => void;
  // Filtres globaux de tags (pour la recherche)
  filterTags?: Array<{ id: string; name: string; selected: boolean }>;
  onToggleFilterTag?: (id: string) => void;
  onClearFilterTags?: () => void;
  // Si vrai, fait défiler automatiquement la section Tags en vue
  autoScrollToTags?: boolean;
  quickItems?: Array<{
    id: string;
    type: "folder" | "document";
    name: string;
    subtitle?: string;
    onOpen: () => void;
  }>;
  selectedContext?: {
    name: string;
    isFavorite?: boolean;
    onOpen?: () => void;
    onToggleFavorite?: () => void;
    onRename?: () => void;
    onMove?: () => void;
  onDelete?: () => void;
  tags?: Array<{ id: string; name: string; selected: boolean }>;
  onToggleTag?: (name: string) => void;
  onCreateTag?: () => void;
  } | null;
}

export function CommandMenu({
  open,
  onOpenChange,
  onFocusSearch,
  onToggleGrid,
  onToggleList,
  onSortBy,
  onNewFolder,
  onUpload,
  onReload,
  onGoRoot,
  filterTags = [],
  onToggleFilterTag,
  onClearFilterTags,
  autoScrollToTags = false,
  quickItems = [],
  selectedContext = null,
  onOpenSettings,
  onOpenFavorites,
}: CommandMenuProps) {
  const tagsGroupRef = useMemo(() => ({ current: null as null | HTMLDivElement }), []);
  // Amener la section Tags en vue si demandé
  // NB: on utilise un ref sur un wrapper autour du groupe Tags
  // pour éviter d’attacher des refs internes aux composants Radix.
  if (autoScrollToTags && tagsGroupRef.current) {
    // Le rendu est synchrone ici, scroll immédiat
    const el = tagsGroupRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'start' });
    }
  }

  const sortOptions = useMemo(
    () =>
      [
        { value: "date", label: "Trier par date" },
        { value: "name", label: "Trier par nom" },
        { value: "size", label: "Trier par taille" },
        { value: "type", label: "Trier par type" },
      ] as Array<{ value: "name" | "date" | "size" | "type"; label: string }>,
    []
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Palette de commandes"
    >
      <CommandInput placeholder="Tapez une commande ou recherchez…" />
      <CommandList>
        <CommandEmpty>Aucune commande</CommandEmpty>

        {quickItems.length > 0 && (
          <>
            <CommandGroup heading="Ouvrir rapide">
              {quickItems.slice(0, 12).map((item) => (
                <CommandItem
                  key={`${item.type}-${item.id}`}
                  onSelect={() => {
                    item.onOpen();
                    onOpenChange(false);
                  }}
                >
                  {item.type === "folder" ? (
                    <FolderIcon className="mr-2 h-4 w-4" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.subtitle && (
                      <span className="text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => {
              onGoRoot();
              onOpenChange(false);
            }}
          >
            <Home className="mr-2 h-4 w-4" /> Aller à la racine
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenFavorites();
              onOpenChange(false);
            }}
          >
            <Star className="mr-2 h-4 w-4" /> Ouvrir Favoris
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenSettings();
              onOpenChange(false);
            }}
          >
            <Settings className="mr-2 h-4 w-4" /> Ouvrir Réglages
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              onNewFolder();
              onOpenChange(false);
            }}
          >
            <FolderPlus className="mr-2 h-4 w-4" /> Nouveau dossier
            <CommandShortcut>n</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onUpload();
              onOpenChange(false);
            }}
          >
            <Upload className="mr-2 h-4 w-4" /> Uploader un fichier
            <CommandShortcut>u</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onReload();
              onOpenChange(false);
            }}
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Recharger
            <CommandShortcut>r</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />

        {filterTags.length > 0 && (
          <>
            <div ref={(el) => (tagsGroupRef.current = el)}>
              <CommandGroup heading="Filtres: Tags">
              {filterTags.map((t) => (
                <CommandItem key={t.id} onSelect={() => onToggleFilterTag?.(t.id)}>
                  <TagIcon className="mr-2 h-4 w-4" /> {t.name}
                  {t.selected && <Check className="ml-auto h-4 w-4 opacity-70" />}
                </CommandItem>
              ))}
              {!!onClearFilterTags && filterTags.some((t) => t.selected) && (
                <CommandItem onSelect={() => onClearFilterTags?.()}>
                  <TagIcon className="mr-2 h-4 w-4" /> Effacer les filtres de tags
                </CommandItem>
              )}
              </CommandGroup>
            </div>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Affichage">
          <CommandItem
            onSelect={() => {
              onToggleGrid();
              onOpenChange(false);
            }}
          >
            <Grid3X3 className="mr-2 h-4 w-4" /> Vue grille
            <CommandShortcut>g</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onToggleList();
              onOpenChange(false);
            }}
          >
            <List className="mr-2 h-4 w-4" /> Vue liste
            <CommandShortcut>l</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Tri">
          {sortOptions.map((opt) => (
            <CommandItem
              key={opt.value}
              onSelect={() => {
                onSortBy(opt.value);
                onOpenChange(false);
              }}
            >
              <SortAsc className="mr-2 h-4 w-4" /> {opt.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Recherche">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onFocusSearch();
            }}
          >
            <Search className="mr-2 h-4 w-4" /> Focus sur la recherche
            <CommandShortcut>/</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {selectedContext && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Sélection: ${selectedContext.name}`}>
              {selectedContext.onOpen && (
                <CommandItem
                  onSelect={() => {
                    selectedContext.onOpen?.();
                    onOpenChange(false);
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" /> Afficher les détails
                </CommandItem>
              )}
              {selectedContext.onToggleFavorite && (
                <CommandItem
                  onSelect={() => {
                    selectedContext.onToggleFavorite?.();
                    onOpenChange(false);
                  }}
                >
                  <Star className="mr-2 h-4 w-4" />{" "}
                  {selectedContext.isFavorite
                    ? "Retirer des favoris"
                    : "Ajouter aux favoris"}
                </CommandItem>
              )}
              {selectedContext.onRename && (
                <CommandItem
                  onSelect={() => {
                    selectedContext.onRename?.();
                    onOpenChange(false);
                  }}
                >
                  <List className="mr-2 h-4 w-4" /> Renommer
                </CommandItem>
              )}
              {selectedContext.onMove && (
                <CommandItem
                  onSelect={() => {
                    selectedContext.onMove?.();
                    onOpenChange(false);
                  }}
                >
                  <FolderIcon className="mr-2 h-4 w-4" /> Déplacer vers…
                </CommandItem>
              )}
              {selectedContext.onDelete && (
                <CommandItem
                  onSelect={() => {
                    selectedContext.onDelete?.();
                    onOpenChange(false);
                  }}
                >
                  <FolderIcon className="mr-2 h-4 w-4" /> Supprimer
                </CommandItem>
              )}
            </CommandGroup>
            {!!(selectedContext.tags && selectedContext.tags.length) && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Tags">
                  {selectedContext.tags!.map((t) => (
                    <CommandItem key={t.id} onSelect={() => selectedContext.onToggleTag?.(t.name)}>
                      <TagIcon className="mr-2 h-4 w-4" /> {t.name}
                      {t.selected && <Check className="ml-auto h-4 w-4 opacity-70" />}
                    </CommandItem>
                  ))}
                  {selectedContext.onCreateTag && (
                    <CommandItem onSelect={() => selectedContext.onCreateTag?.()}>
                      <TagIcon className="mr-2 h-4 w-4" /> Ajouter un tag…
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export default CommandMenu;
