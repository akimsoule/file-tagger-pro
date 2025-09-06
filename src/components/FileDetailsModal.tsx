import { Document } from "@/contexts/file";
import { formatFileSize, formatDate } from "@/lib/format";
import { TagBadge } from "./TagBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, Heart, Download, Share, Edit, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { getDocumentPreview } from "@/lib/api/api-documents";
import { useFileContext } from "@/hooks/useFileContext";
import { useToast } from "@/hooks/useToast";

interface FileDetailsModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
  onTagClick?: (tag: string) => void;
  selectedTags?: string[];
}

// Suppression des implémentations locales de formatage au profit d'utilitaires globaux

const getFileIcon = (doc: Document) => {
  return <FileText className="h-12 w-12 text-muted-foreground" />;
};

export function FileDetailsModal({
  document: doc,
  isOpen,
  onClose,
  onToggleFavorite,
  onTagClick,
  selectedTags = [],
}: FileDetailsModalProps) {
  // Les hooks doivent être avant tout return conditionnel
  // L'état de prévisualisation est indépendant et sera (ré)initialisé sur changement d'open/doc

  // Aperçu: charge dataUrl et type
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!isOpen || !doc?.id) {
      setPreviewUrl(null);
      setPreviewType(null);
      setPreviewError(null);
      return;
    }
    setLoadingPreview(true);
    setPreviewError(null);
    getDocumentPreview(doc.id)
      .then((res) => {
        if (!active) return;
        setPreviewUrl(res.dataUrl);
        setPreviewType(res.type);
      })
      .catch((e) => {
        if (!active) return;
        setPreviewError(e?.message || "Impossible de charger l'aperçu");
      })
      .finally(() => active && setLoadingPreview(false));
    return () => {
      active = false;
    };
  }, [doc?.id, isOpen]);

  const effectiveType = useMemo(() => {
    // 1) Tenter depuis la data URL
    if (previewUrl) {
      const m = /^data:([^;]+);base64,/i.exec(previewUrl);
      if (m && m[1]) return m[1].toLowerCase();
    }
    // 2) Type retourné par l'API files
    if (previewType) return previewType.toLowerCase();
    // 3) Type connu sur le doc
    const docType = doc ? (doc.type as string | undefined) : undefined; // heuristique
    if (docType) return docType.toLowerCase();
    // 4) Déduire depuis l'extension
    const name = doc ? (doc.name as string | undefined) : undefined;
    const ext = name?.split(".").pop()?.toLowerCase();
    const map: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      txt: "text/plain",
      md: "text/markdown",
      json: "application/json",
      csv: "text/csv",
      xml: "application/xml",
      js: "application/javascript",
      ts: "application/typescript",
      css: "text/css",
      html: "text/html",
    };
    return ext && map[ext] ? map[ext] : null;
  }, [previewUrl, previewType, doc]);

  const isImage = useMemo(
    () => !!effectiveType && effectiveType.startsWith("image/"),
    [effectiveType]
  );
  const isPdf = useMemo(
    () => effectiveType === "application/pdf",
    [effectiveType]
  );
  const isText = useMemo(() => {
    if (!effectiveType) return false;
    if (effectiveType.startsWith("text/")) return true;
    return [
      "application/json",
      "application/xml",
      "application/javascript",
      "application/typescript",
    ].includes(effectiveType);
  }, [effectiveType]);

  // Tags affichés (synchro depuis doc, mis à jour après sauvegarde)
  const [currentTags, setCurrentTags] = useState<string[]>(() =>
    (doc?.tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
  );
  useEffect(() => {
    setCurrentTags(
      (doc?.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    );
  }, [doc?.id, doc?.tags]);

  // Édition des tags
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editTags, setEditTags] = useState<string[]>(currentTags);
  const [newTag, setNewTag] = useState("");
  useEffect(() => {
    if (isEditingTags) setEditTags(currentTags);
  }, [isEditingTags, currentTags]);

  const { updateNode } = useFileContext();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  if (!doc) return null;

  const extension = doc.name.split(".").pop()?.toUpperCase();

  const addTag = (value: string) => {
    const v = value.trim();
    if (!v) return;
    const exists = editTags.some((t) => t.toLowerCase() === v.toLowerCase());
    if (!exists) setEditTags((prev) => [...prev, v]);
  };
  const removeTag = (name: string) => {
    setEditTags((prev) =>
      prev.filter((t) => t.toLowerCase() !== name.toLowerCase())
    );
  };
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (newTag) {
        addTag(newTag);
        setNewTag("");
      }
    }
    if (e.key === "Backspace" && !newTag && editTags.length) {
      // Backspace supprime le dernier
      setEditTags((prev) => prev.slice(0, -1));
    }
  };
  const saveTags = async () => {
    const cleaned = editTags.map((t) => t.trim()).filter(Boolean);
    // dédupliquer par lower-case mais garder le premier casing
    const seen = new Set<string>();
    const unique = cleaned.filter((t) => {
      const k = t.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const csv = unique.join(",");
    try {
      setIsSaving(true);
      await updateNode(doc.id, { tags: csv });
      setCurrentTags(unique);
      setIsEditingTags(false);
      toast({ title: "Tags mis à jour" });
      // En cas d’échec distant, un rollback est géré par FileProvider (toast automatique)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Échec de la mise à jour",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="w-screen h-screen max-w-[100vw] p-0 sm:rounded-none overflow-hidden">
        <div className="flex flex-col h-full min-h-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-start gap-4">
              <div className="shrink-0">{getFileIcon(doc)}</div>
              <div className="min-w-0">
                <DialogTitle className="text-xl mb-1 truncate">
                  {doc.name}
                </DialogTitle>
                <DialogDescription asChild>
                  <div>
                    <span className="text-sm">
                      Type : {extension || "Document"}
                    </span>
                    {doc.description && (
                      <p className="mt-1 text-sm line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                  </div>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Contenu scrollable: Aperçu + métadonnées + tags */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Aperçu du fichier */}
            <div className="px-6 py-4">
              <h4 className="text-sm text-muted-foreground mb-2">Aperçu</h4>
              <div className="rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden h-[55vh]">
                {loadingPreview && (
                  <div className="p-6 text-sm text-muted-foreground">
                    Chargement…
                  </div>
                )}
                {!loadingPreview && previewError && (
                  <div className="p-6 text-sm text-red-500">{previewError}</div>
                )}
                {!loadingPreview && !previewError && previewUrl && (
                  <div className="w-full h-full">
                    {isImage && (
                      <img
                        src={previewUrl}
                        alt={doc.name}
                        className="w-full h-full object-contain"
                      />
                    )}
                    {isPdf && (
                      <iframe
                        title="aperçu-pdf"
                        src={previewUrl}
                        className="w-full h-full"
                      />
                    )}
                    {isText && (
                      <iframe
                        title="aperçu-texte"
                        src={previewUrl}
                        className="w-full h-full bg-background"
                      />
                    )}
                    {!isImage && !isPdf && !isText && (
                      <div className="p-6 text-sm text-muted-foreground">
                        Aucun aperçu disponible pour ce type de fichier.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Métadonnées du fichier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 px-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Taille</p>
                <p className="font-medium">{formatFileSize(doc.size)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Dernière modification
                </p>
                <p className="font-medium text-sm">
                  {formatDate(doc.modifiedAt)}
                </p>
              </div>
            </div>

            {/* Tags */}
            <>
              <Separator className="my-4 mx-6" />
              <div className="px-6 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm text-muted-foreground">Tags</h4>
                  {!isEditingTags ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingTags(true)}
                    >
                      Modifier
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveTags} disabled={isSaving}>
                        Enregistrer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsEditingTags(false);
                          setEditTags(currentTags);
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  )}
                </div>

                {!isEditingTags && (
                  <div className="flex flex-wrap gap-1.5">
                    {currentTags.length === 0 && (
                      <span className="text-sm text-muted-foreground">
                        Aucun tag
                      </span>
                    )}
                    {currentTags.map((tag) => (
                      <TagBadge
                        key={tag}
                        name={tag}
                        size="md"
                        onClick={onTagClick ? () => onTagClick(tag) : undefined}
                        className={cn(
                          "cursor-pointer hover:ring-2 hover:ring-offset-1",
                          selectedTags?.includes(tag) && "ring-2 ring-offset-1"
                        )}
                      />
                    ))}
                  </div>
                )}

                {isEditingTags && (
                  <div className="flex flex-wrap items-center gap-2">
                    {editTags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm"
                      >
                        <span className="truncate max-w-[160px]" title={t}>
                          {t}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          className="rounded-full p-0.5 hover:bg-muted"
                          aria-label={`Retirer ${t}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                    <input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={onInputKeyDown}
                      onBlur={() => {
                        if (newTag.trim()) {
                          addTag(newTag);
                          setNewTag("");
                        }
                      }}
                      placeholder="Ajouter un tag…"
                      className="h-8 px-3 py-1 text-sm border rounded-md outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                )}
              </div>
            </>
          </div>

          {/* Actions (footer) */}
          <div className="mt-auto px-6 py-4 border-t flex flex-wrap gap-2 justify-end bg-background">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none gap-2 min-w-[120px]"
              onClick={onToggleFavorite}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  doc.isFavorite
                    ? "fill-red-500 text-red-500"
                    : "text-muted-foreground"
                )}
              />
              <span className="truncate">
                {doc.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none gap-2 min-w-[120px]"
              onClick={() => {
                if (previewUrl) {
                  const a = window.document.createElement("a");
                  a.href = previewUrl;
                  a.download = doc.name;
                  a.click();
                  return;
                }
              }}
            >
              <Download className="h-4 w-4" />
              <span className="truncate">Télécharger</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none gap-2 min-w-[120px]"
            >
              <Share className="h-4 w-4" />
              <span className="truncate">Partager</span>
            </Button>
            <Button
              size="sm"
              className="flex-1 sm:flex-none gap-2 min-w-[120px]"
            >
              <Edit className="h-4 w-4" />
              <span className="truncate">Modifier</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
