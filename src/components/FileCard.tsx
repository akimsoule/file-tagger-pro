import { useState } from "react";
import { Document } from "@/contexts/file/def";
import { TagBadge } from "./TagBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Heart, MoreHorizontal, FolderOutput, Tags } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { FolderPicker } from "./FolderPicker";
import { TagEditor } from "./TagEditor";
import { useFileContext } from "@/hooks/useFileContext";

import { FileTreeNode } from "@/logic/FileTreeNode";

interface FileCardProps {
  node: FileTreeNode;
  onClick?: () => void;
  onToggleFavorite?: () => void;
}

const formatFileSize = (bytes: number): string => {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getFileIcon = (type: string) => {
  return <FileText className="h-8 w-8 text-muted-foreground" />;
};

export function FileCard({
  node,
  onClick,
  onToggleFavorite,
}: FileCardProps) {
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false);
  const { moveDocument, updateDocument } = useFileContext();

  if (!node || node.type !== 'file') {
    return null;
  }

  const document = node.getData() as Document;

  const fileExtension = document.name.split(".").pop()?.toUpperCase();
  const tags = document.tags.split(",").filter((tag) => tag.trim() !== "");

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleMove = (targetFolderId: string | null) => {
    console.log('Déplacement du document :', {
      documentId: document.id,
      documentName: document.name,
      fromFolder: document.folderId || 'racine',
      toFolder: targetFolderId || 'racine'
    });
    moveDocument(document.id, targetFolderId);
  };

  const handleUpdateTags = (newTags: string) => {
    console.log('Mise à jour des tags du document', document.id, 'de', document.tags, 'vers', newTags);
    updateDocument(document.id, { tags: newTags });
  };

  return (
    <>
      <Card
        className={cn(
          "group relative p-4 cursor-pointer transition-all duration-200 hover:shadow-card-hover border-border/50",
          "hover:border-primary/20 hover:-translate-y-0.5"
        )}
        onClick={onClick}
      >
        {/* Header avec icône et actions */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="shrink-0">{getFileIcon(document.type)}</div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <h3 className="font-medium text-foreground truncate pr-2">
                {document.name}
              </h3>
              {fileExtension && (
                <p className="text-xs text-muted-foreground uppercase truncate">
                  {fileExtension}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.();
              }}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  document.isFavorite
                    ? "fill-red-500 text-red-500"
                    : "text-muted-foreground"
                )}
              />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={handleAction}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFolderPickerOpen(true);
                  }}
                >
                  <FolderOutput className="h-4 w-4 mr-2" />
                  Déplacer
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTagEditorOpen(true);
                  }}
                >
                  <Tags className="h-4 w-4 mr-2" />
                  Modifier les tags
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 max-w-full overflow-hidden">
            {tags.slice(0, 3).map((tag) => (
              <TagBadge key={tag} name={tag.trim()} className="max-w-[120px] text-xs" />
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-muted-foreground px-2 py-1 whitespace-nowrap">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Métadonnées */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate flex-1 mr-2">{formatDate(document.modifiedAt)}</span>
          <span className="shrink-0">{formatFileSize(document.size)}</span>
        </div>
      </Card>

      <FolderPicker
        isOpen={isFolderPickerOpen}
        onClose={() => setIsFolderPickerOpen(false)}
        onSelect={handleMove}
        currentFolderId={document.folderId || null}
        title="Déplacer le fichier vers"
      />

      <TagEditor
        isOpen={isTagEditorOpen}
        onClose={() => setIsTagEditorOpen(false)}
        currentTags={document.tags}
        onSave={handleUpdateTags}
        title="Modifier les tags du fichier"
      />
    </>
  );
}
