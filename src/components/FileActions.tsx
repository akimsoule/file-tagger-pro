import { Button } from "@/components/ui/button";
import { Heart, MoreHorizontal, FolderOutput, Tags, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import React from "react";

interface FileActionsProps {
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenMove: () => void;
  onOpenTagEditor: () => void; // kept for compatibility, now no-op in callers
  onDelete: () => void;
}

export const FileActions: React.FC<FileActionsProps> = ({
  isFavorite,
  onToggleFavorite,
  onOpenMove,
  onOpenTagEditor,
  onDelete,
}) => {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={(e) => { stop(e); onToggleFavorite(); }}
        aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      >
        <Heart
          className={cn(
            "h-4 w-4 transition-colors",
            isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
          )}
        />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={stop}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Actions fichier">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { stop(e); onOpenMove(); }}>
            <FolderOutput className="h-4 w-4 mr-2" />
            Déplacer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { stop(e); onOpenTagEditor(); }}>
            <Tags className="h-4 w-4 mr-2" />
            Modifier les tags
          </DropdownMenuItem>
          {onDelete && (
            <DropdownMenuItem
              className="text-red-600 focus:text-red-700"
              onClick={(e) => {
                stop(e);
                onDelete?.();
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Supprimer
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
