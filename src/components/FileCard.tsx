import { useState } from "react";
import { Document } from "@/contexts/file";
import { TagBadge } from "./TagBadge";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { FileActions } from "./FileActions";
import { cn } from "@/lib/utils";
import { FolderPicker } from "./FolderPicker";
import { useFileContext } from "@/hooks/useFileContext";
import { ConfirmDialog } from "./ConfirmDialog";

import { FileTreeNode } from "@/logic/local/FileTreeNode";
import { formatFileSize, formatDate } from "@/lib/format";

interface FileCardProps {
  node: FileTreeNode;
  onClick?: () => void;
  onToggleFavorite?: () => void;
}

const getFileIcon = () => <FileText className="h-8 w-8 text-muted-foreground" />;

export function FileCard({ node, onClick, onToggleFavorite }: FileCardProps) {
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { moveNode, updateNode, deleteNode } = useFileContext();

  if (!node || node.type !== "file") {
    return null;
  }

  const document = node.getData() as Document;

  const fileExtension = document.name.split(".").pop()?.toUpperCase();
  const tags = document.tags.split(",").map(t => t.trim()).filter(Boolean);

  const handleMove = (targetFolderId: string | null) => {
    console.log("Déplacement du document :", {
      documentId: document.id,
      documentName: document.name,
      fromFolder: document.folderId || "racine",
      toFolder: targetFolderId || "racine",
    });
    moveNode(document.id, targetFolderId);
  };

  const handleUpdateTags = (newTags: string) => {
    console.log(
      "Mise à jour des tags du document",
      document.id,
      "de",
      document.tags,
      "vers",
      newTags
    );
    updateNode(document.id, { tags: newTags });
  };

  const handleDelete = () => setConfirmOpen(true);

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
            <div className="shrink-0">{getFileIcon()}</div>
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

          <FileActions
            isFavorite={document.isFavorite}
            onToggleFavorite={() => onToggleFavorite?.()}
            onOpenMove={() => setIsFolderPickerOpen(true)}
            onOpenTagEditor={() => { /* TagEditor supprimé */ }}
            onDelete={handleDelete}
          />
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 max-w-full overflow-hidden">
            {tags.slice(0, 3).map((tag) => (
              <TagBadge
                key={tag}
                name={tag.trim()}
                className="max-w-[120px] text-xs"
              />
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
          <span className="truncate flex-1 mr-2">
            {formatDate(document.modifiedAt)}
          </span>
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

  {/* TagEditor supprimé */}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Supprimer le document ?"
        description={`Cette action est définitive. Le document "${document.name}" sera supprimé.`}
        confirmLabel="Supprimer"
        onConfirm={() => {
          setConfirmOpen(false);
          deleteNode?.(document.id);
        }}
      />
    </>
  );
}
