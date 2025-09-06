import { useEffect, useMemo, useState } from "react";
import { Document } from "@/contexts/file";
import { formatFileSize, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getDocumentPreview } from "@/lib/api/api-documents";
import { useFileContext } from "@/hooks/useFileContext";
import { useToast } from "@/hooks/useToast";
import { getSimilarDocuments, reindexDocumentEmbeddings, type DocumentDTO } from "@/lib/api/api-documents";
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

interface FileDetailsModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
  onTagClick?: (tag: string) => void;
  selectedTags?: string[];
}

function getFileIcon(doc: Document) {
  const name = doc.name || "";
  // Personnaliser par extension si besoin
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

export function FileDetailsModal({
  document: doc,
  isOpen,
  onClose,
  onToggleFavorite,
  onTagClick,
  selectedTags = [],
}: FileDetailsModalProps) {
  const { updateNode } = useFileContext();
  const [similarDocs, setSimilarDocs] = useState<DocumentDTO[] | null>(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const { toast } = useToast();

  // Aperçu
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // Fallback pour PDF lourds: créer une Blob URL à partir du data URL pour éviter les limites navigateur
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

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
    if (previewUrl) {
      const m = /^data:([^;]+);base64,/i.exec(previewUrl);
      if (m && m[1]) return m[1].toLowerCase();
    }
    if (previewType) return previewType.toLowerCase();
    const docType = doc ? (doc.type as string | undefined) : undefined;
    if (docType) return docType.toLowerCase();
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

  const isImage = useMemo(() => !!effectiveType && effectiveType.startsWith("image/"), [effectiveType]);
  const isPdf = useMemo(() => effectiveType === "application/pdf", [effectiveType]);
  const isText = useMemo(() => {
    if (!effectiveType) return false;
    if (effectiveType.startsWith("text/")) return true;
    return ["application/json", "application/xml", "application/javascript", "application/typescript"].includes(
      effectiveType
    );
  }, [effectiveType]);

  // Tags (édition inline)
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

  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editTags, setEditTags] = useState<string[]>(currentTags);
  const [newTag, setNewTag] = useState("");
  useEffect(() => {
    if (isEditingTags) setEditTags(currentTags);
  }, [isEditingTags, currentTags]);

  const [isSaving, setIsSaving] = useState(false);

  const extension = doc?.name.split(".").pop()?.toUpperCase();

  // Générer une Blob URL pour les PDF si nécessaire (Safari/limites data URL)
  useEffect(() => {
    // Un seul cycle par changement de previewUrl/isPdf; crée une Blob URL si besoin et la nettoie au cleanup
    let createdUrl: string | null = null;
    if (isPdf && previewUrl?.startsWith("data:")) {
      const approxLen = previewUrl.length;
      const SHOULD_BLOB = approxLen > 1_000_000; // ~1MB de texte base64 (~750KB binaire)
      if (SHOULD_BLOB) {
        fetch(previewUrl)
          .then((r) => r.blob())
          .then((blob) => {
            const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            createdUrl = url;
            setObjectUrl(url);
          })
          .catch(() => {
            setObjectUrl(null);
          });
      } else {
        setObjectUrl(null);
      }
    } else {
      setObjectUrl(null);
    }
    return () => {
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [isPdf, previewUrl]);

  const addTag = (value: string) => {
    const v = value.trim();
    if (!v) return;
    const exists = editTags.some((t) => t.toLowerCase() === v.toLowerCase());
    if (!exists) setEditTags((prev) => [...prev, v]);
  };

  // Charger documents similaires quand doc change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!doc?.id) return;
      try {
        setLoadingSimilar(true);
        const res = await getSimilarDocuments(doc.id, 5);
        if (!cancelled) setSimilarDocs(res.results);
      } catch (e) {
        if (!cancelled) setSimilarDocs([]);
      } finally {
        if (!cancelled) setLoadingSimilar(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc?.id]);
  const removeTag = (name: string) => {
    setEditTags((prev) => prev.filter((t) => t.toLowerCase() !== name.toLowerCase()));
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
      setEditTags((prev) => prev.slice(0, -1));
    }
  };

  const saveTags = async () => {
    const cleaned = editTags.map((t) => t.trim()).filter(Boolean);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Échec de la mise à jour", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const tags = currentTags;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="w-screen h-screen max-w-[100vw] p-0 sm:rounded-none overflow-hidden">
        <div className="flex flex-col h-full min-h-0">
          {!doc ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Aucun document sélectionné.
            </div>
          ) : (<>
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-start gap-4">
              <div className="shrink-0">{getFileIcon(doc)}</div>
              <div className="min-w-0">
                <DialogTitle className="text-xl mb-1 truncate">{doc.name}</DialogTitle>
                <DialogDescription asChild>
                  <div>
                    <span className="text-sm">Type : {extension || "Document"}</span>
                    {doc.description && <p className="mt-1 text-sm line-clamp-2">{doc.description}</p>}
                  </div>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-6 py-4">
              <h4 className="text-sm text-muted-foreground mb-2">Aperçu</h4>
              <div className="rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden h-[55vh]">
                {loadingPreview && (
                  <div className="p-6 text-sm text-muted-foreground">Chargement…</div>
                )}
                {!loadingPreview && previewError && (
                  <div className="p-6 text-sm text-red-500">{previewError}</div>
                )}
                {!loadingPreview && !previewError && previewUrl && (
                  <div className="w-full h-full">
                    {isImage && (
                      <img src={previewUrl} alt={doc.name} className="w-full h-full object-contain" />
                    )}
                    {isPdf && (
                      <iframe
                        title="aperçu-pdf"
                        src={objectUrl || previewUrl || undefined}
                        className="w-full h-full"
                        loading="lazy"
                      />
                    )}
                    {isText && (
                      <iframe title="aperçu-texte" src={previewUrl} className="w-full h-full bg-background" />
                    )}
                    {!isImage && !isPdf && !isText && (
                      <div className="p-6 text-sm text-muted-foreground">Aucun aperçu disponible pour ce type de fichier.</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 px-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Taille</p>
                <p className="font-medium">{formatFileSize(doc.size)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Dernière modification</p>
                <p className="font-medium text-sm">{formatDate(doc.modifiedAt)}</p>
              </div>
            </div>

            <>
              <Separator className="my-4 mx-6" />
              <div className="px-6 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm text-muted-foreground">Tags</h4>
                  {!isEditingTags ? (
                    <Button size="sm" variant="outline" onClick={() => setIsEditingTags(true)}>
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
                    {tags.length === 0 && (
                      <span className="text-sm text-muted-foreground">Aucun tag</span>
                    )}
                    {tags.map((tag) => (
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
                      <span key={t} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm">
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

            <div className="px-6 py-4">
              <h4 className="text-sm text-muted-foreground mb-2">Similaires</h4>
              {loadingSimilar ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : similarDocs && similarDocs.length > 0 ? (
                <ul className="space-y-2">
                  {similarDocs.map((s) => (
                    <li key={s.id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(s.size)} • {formatDate(s.modifiedAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/documents/${s.id}`, "_blank")}
                      >
                        Ouvrir
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Aucun résultat.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reindexing}
                    onClick={async () => {
                      if (!doc?.id) return;
                      try {
                        setReindexing(true);
                        await reindexDocumentEmbeddings(doc.id);
                        toast({ title: "Réindexation", description: "Réindexation lancée. Revenez dans quelques secondes." });
                        // Optionnel: recharger après un court délai
                        setTimeout(async () => {
                          try {
                            const res = await getSimilarDocuments(doc.id, 5);
                            setSimilarDocs(res.results);
                          } catch {
                            /* noop */
                          }
                        }, 1200);
                      } catch (e: unknown) {
                        console.error(e);
                        toast({ title: "Erreur", description: "Impossible de lancer la réindexation", variant: "destructive" });
                      } finally {
                        setReindexing(false);
                      }
                    }}
                  >
                    {reindexing ? "Réindexation…" : "Réindexer"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto px-6 py-4 border-t flex flex-wrap gap-2 justify-end bg-background">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none gap-2 min-w-[120px]"
              onClick={onToggleFavorite}
            >
              <Heart
                className={cn("h-4 w-4", doc.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground")}
              />
              <span className="truncate">{doc.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}</span>
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
                }
              }}
            >
              <Download className="h-4 w-4" />
              <span className="truncate">Télécharger</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none gap-2 min-w-[120px]">
              <Share className="h-4 w-4" />
              <span className="truncate">Partager</span>
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none gap-2 min-w-[120px]">
              <Edit className="h-4 w-4" />
              <span className="truncate">Modifier</span>
            </Button>
          </div>
          </>)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
