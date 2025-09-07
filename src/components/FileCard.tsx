import { FileText } from "lucide-react";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { LIMITS } from "@/constants";
import { Document } from "@/contexts/file";
import { useFileContext } from "@/hooks/useFileContext";
import { cn } from "@/lib/utils";
import { FileTreeNode } from "@/logic/local/FileTreeNode";
// Utilisation des nouveaux utilitaires
import { createLogger, formatDate, formatFileSize, truncateText } from "@/utils";

import { ConfirmDialog } from "./ConfirmDialog";
import { FileActions } from "./FileActions";
import { FolderPicker } from "./FolderPicker";
import { TagBadge } from "./TagBadge";

interface FileCardProps {
  node: FileTreeNode;
  onClick?: () => void;
  onToggleFavorite?: () => void;
}

// Logger contextualisé
const logger = createLogger("FileCard");

// Utilitaires locaux améliorés
const getFileIcon = () => <FileText className="h-8 w-8 text-muted-foreground" />;

const getFileExtension = (filename: string): string | null => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toUpperCase() || null : null;
};

const parseTags = (tagsString: string): string[] => {
  return tagsString
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, LIMITS.MAX_TAGS_PER_ITEM); // Utilisation des constantes
};

const DISPLAY_CONFIG = {
  MAX_VISIBLE_TAGS: 3,
  MAX_FILENAME_LENGTH: 60,
} as const;

export function FileCard({ node, onClick, onToggleFavorite }: FileCardProps) {
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { moveNode, deleteNode } = useFileContext();

  // Validation early return
  if (!node || node.type !== "file") {
    logger.warn("FileCard rendu avec un nœud invalide", { nodeId: node?.id, nodeType: node?.type });
    return null;
  }

  const document = node.getData() as Document;

  // Données formatées
  const fileExtension = getFileExtension(document.name);
  const tags = parseTags(document.tags);
  const displayName = truncateText(document.name, DISPLAY_CONFIG.MAX_FILENAME_LENGTH);
  const formattedDate = formatDate(new Date(document.modifiedAt), "relative");
  const formattedSize = formatFileSize(document.size);

  // Tags visibles et compteur
  const visibleTags = tags.slice(0, DISPLAY_CONFIG.MAX_VISIBLE_TAGS);
  const hiddenTagsCount = Math.max(0, tags.length - DISPLAY_CONFIG.MAX_VISIBLE_TAGS);

  const handleMove = (targetFolderId: string | null) => {
    logger.info("Déplacement du document", {
      documentId: document.id,
      documentName: document.name,
      fromFolder: document.folderId || "racine",
      toFolder: targetFolderId || "racine",
    });

    try {
      moveNode(document.id, targetFolderId);
    } catch (error) {
      logger.error("Erreur lors du déplacement", error, {
        documentId: document.id,
        targetFolderId,
      });
    }
  };

  const handleDelete = () => {
    logger.debug("Ouverture de la confirmation de suppression", { documentId: document.id });
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    logger.info("Suppression du document confirmée", {
      documentId: document.id,
      documentName: document.name,
    });

    try {
      setConfirmOpen(false);
      deleteNode?.(document.id);
    } catch (error) {
      logger.error("Erreur lors de la suppression", error, { documentId: document.id });
    }
  };

  const handleCardClick = () => {
    logger.debug("Clic sur la carte du fichier", { documentId: document.id });
    onClick?.();
  };

  const handleToggleFavorite = () => {
    logger.debug("Basculement favori", {
      documentId: document.id,
      currentState: document.isFavorite,
    });
    onToggleFavorite?.();
  };

  return (
    <>
      <Card
        className={cn(
          "group relative p-4 cursor-pointer transition-all duration-200 hover:shadow-card-hover border-border/50",
          "hover:border-primary/20 hover:-translate-y-0.5",
        )}
        onClick={handleCardClick}
      >
        {/* Header avec icône et actions */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="shrink-0">{getFileIcon()}</div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <h3
                className="font-medium text-foreground truncate pr-2"
                title={document.name} // Affiche le nom complet au survol
              >
                {displayName}
              </h3>
              {fileExtension && (
                <p className="text-xs text-muted-foreground uppercase truncate">{fileExtension}</p>
              )}
            </div>
          </div>

          <FileActions
            isFavorite={document.isFavorite}
            onToggleFavorite={handleToggleFavorite}
            onOpenMove={() => setIsFolderPickerOpen(true)}
            onOpenTagEditor={() => {
              /* TagEditor supprimé */
            }}
            onDelete={handleDelete}
          />
        </div>

        {/* Tags avec gestion améliorée */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 max-w-full overflow-hidden">
            {visibleTags.map((tag) => (
              <TagBadge key={tag} name={tag} className="max-w-[120px] text-xs" />
            ))}
            {hiddenTagsCount > 0 && (
              <span
                className="text-xs text-muted-foreground px-2 py-1 whitespace-nowrap"
                title={`Tags cachés: ${tags.slice(DISPLAY_CONFIG.MAX_VISIBLE_TAGS).join(", ")}`}
              >
                +{hiddenTagsCount}
              </span>
            )}
          </div>
        )}

        {/* Métadonnées avec formatage amélioré */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span
            className="truncate flex-1 mr-2"
            title={formatDate(new Date(document.modifiedAt), "long")} // Format détaillé au survol
          >
            {formattedDate}
          </span>
          <span
            className="shrink-0"
            title={`Taille exacte: ${document.size.toLocaleString("fr-FR")} octets`}
          >
            {formattedSize}
          </span>
        </div>
      </Card>

      <FolderPicker
        isOpen={isFolderPickerOpen}
        onClose={() => setIsFolderPickerOpen(false)}
        onSelect={handleMove}
        currentFolderId={document.folderId || null}
        title="Déplacer le fichier vers"
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Supprimer le document ?"
        description={`Cette action est définitive. Le document "${displayName}" sera supprimé.`}
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
