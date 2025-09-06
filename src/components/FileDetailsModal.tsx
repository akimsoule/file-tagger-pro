import { useEffect, useMemo, useRef, useState } from "react";
import { useCallback } from "react";
import { Document } from "@/contexts/file";
import { formatFileSize, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getDocumentPreview } from "@/lib/api/api-documents";
import { useFileContext } from "@/hooks/useFileContext";
import { useToast } from "@/hooks/useToast";
import {
  getSimilarDocuments,
  reindexDocumentEmbeddings,
  type DocumentDTO,
} from "@/lib/api/api-documents";
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
import {
  FileText,
  Heart,
  Download,
  Share,
  Edit,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
} from "lucide-react";
import type { FileTreeNode } from "@/logic/local/FileTreeNode";
import { useIsMobile } from "@/hooks/useMobile";

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
  const { updateNode, setSelectedNode, currentNode } = useFileContext();
  const [similarDocs, setSimilarDocs] = useState<DocumentDTO[] | null>(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  // Navigation dans les similaires
  const [similarFocusId, setSimilarFocusId] = useState<string | null>(null);

  // Aperçu
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // Fallback pour PDF lourds: créer une Blob URL à partir du data URL pour éviter les limites navigateur
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  // Zoom basique pour les images sur mobile
  const [imgScale, setImgScale] = useState(1);
  useEffect(() => {
    setImgScale(1);
  }, [doc?.id]);

  // Gestes swipe pour navigation similaire sur mobile
  const previewRef = useRef<HTMLDivElement | null>(null);
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const s = touchStart.current;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    const dt = Date.now() - s.t;
    touchStart.current = null;
    // Swipe horizontal franc
    if (
      dt < 600 &&
      Math.abs(dx) > 48 &&
      Math.abs(dx) > Math.abs(dy) &&
      similarDocs &&
      similarDocs.length
    ) {
      navigateSimilar(dx < 0 ? 1 : -1);
    }
  };

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

  // Générer une Blob URL pour les PDF, surtout sur mobile (iOS bloque souvent les data URL en iframe)
  useEffect(() => {
    let createdUrl: string | null = null;
    const doBlob = async () => {
      if (!isPdf || !previewUrl) {
        setObjectUrl(null);
        return;
      }
      if (previewUrl.startsWith("blob:")) {
        setObjectUrl(previewUrl);
        return;
      }
      // Sur mobile, forcer le Blob URL; sur desktop, seulement si très gros
      const approxLen = previewUrl.length;
      const SHOULD_BLOB = isMobile || approxLen > 1_000_000;
      if (previewUrl.startsWith("data:") && SHOULD_BLOB) {
        try {
          const res = await fetch(previewUrl);
          const blob = await res.blob();
          const url = URL.createObjectURL(
            new Blob([blob], { type: "application/pdf" })
          );
          createdUrl = url;
          setObjectUrl(url);
        } catch {
          setObjectUrl(null);
        }
      } else {
        setObjectUrl(null);
      }
    };
    doBlob();
    return () => {
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [isPdf, previewUrl, isMobile]);

  const addTag = (value: string) => {
    const v = value.trim();
    if (!v) return;
    const exists = editTags.some((t) => t.toLowerCase() === v.toLowerCase());
    if (!exists) setEditTags((prev) => [...prev, v]);
  };

  // Charger documents similaires quand doc change
  useEffect(() => {
    // Réinitialiser le focus similaire quand on change de document affiché
    setSimilarFocusId(null);
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

  // Ouvre un document similaire dans ce même modal
  const openSimilarById = useCallback(
    (id: string) => {
      try {
        const root = currentNode?.getRoot();
        const target = root?.findChildById(id);
        if (target) {
          setSimilarFocusId(id);
          setSelectedNode(target as FileTreeNode);
        } else {
          onClose();
        }
      } catch {
        onClose();
      }
    },
    [currentNode, setSelectedNode, onClose]
  );

  // Navigation relative dans la liste des similaires
  const navigateSimilar = useCallback(
    (delta: number) => {
      if (!similarDocs || similarDocs.length === 0) return;
      const len = similarDocs.length;
      const currentIndex = similarFocusId
        ? Math.max(
            -1,
            similarDocs.findIndex((d) => d.id === similarFocusId)
          )
        : -1;
      let targetIndex: number;
      if (currentIndex === -1) {
        targetIndex = delta > 0 ? 0 : len - 1; // premier/dernier si pas de focus
      } else {
        targetIndex = (currentIndex + delta + len) % len;
      }
      const target = similarDocs[targetIndex];
      if (target) openSimilarById(target.id);
    },
    [similarDocs, similarFocusId, openSimilarById]
  );

  // Gestion des flèches gauche/droite pour naviguer
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignorer si focus sur input/textarea ou contenteditable
      const t = e.target as HTMLElement | null;
      const tag = (t?.tagName || "").toLowerCase();
      const isEditable =
        tag === "input" ||
        tag === "textarea" ||
        (t && (t as HTMLElement).isContentEditable);
      if (isEditable) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        navigateSimilar(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigateSimilar(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, navigateSimilar]);

  // Réindexation des embeddings puis rafraîchissement des similaires
  const doReindex = useCallback(async () => {
    if (!doc?.id) return;
    try {
      setReindexing(true);
      await reindexDocumentEmbeddings(doc.id);
      toast({
        title: "Réindexation",
        description: "Réindexation lancée. Revenez dans quelques secondes.",
      });
      setTimeout(async () => {
        try {
          const res = await getSimilarDocuments(doc.id, 5);
          setSimilarDocs(res.results);
        } catch {
          /* noop */
        }
      }, 1200);
    } catch (e) {
      console.error(e);
      toast({
        title: "Erreur",
        description: "Impossible de lancer la réindexation",
        variant: "destructive",
      });
    } finally {
      setReindexing(false);
    }
  }, [doc?.id, toast]);
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
      toast({
        title: "Échec de la mise à jour",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const tags = currentTags;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="w-screen h-screen max-w-[100vw] p-0 sm:rounded-none overflow-hidden">
        <div className="flex flex-col h-full min-h-0">
          {!doc ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Aucun document sélectionné.
            </div>
          ) : (
            <>
              <DialogHeader
                className="px-6 py-4 border-b sticky top-0 z-20 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70"
                style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex items-start gap-4 min-w-0">
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    aria-label="Fermer"
                    onClick={onClose}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="px-6 py-4">
                  <h4 className="text-sm text-muted-foreground mb-2">Aperçu</h4>
                  <div
                    ref={previewRef}
                    className="relative group rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden h-[65vh] sm:h-[55vh]"
                    onTouchStart={isMobile ? onTouchStart : undefined}
                    onTouchEnd={isMobile ? onTouchEnd : undefined}
                    style={{
                      touchAction: isMobile ? "pan-x pan-y" : undefined,
                      overscrollBehavior: "contain",
                    }}
                  >
                    {/* Flèches overlay centrées verticalement */}
                    {similarDocs && similarDocs.length > 0 && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          title="Précédent (←)"
                          onClick={() => navigateSimilar(-1)}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          title="Suivant (→)"
                          onClick={() => navigateSimilar(1)}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </>
                    )}
                    {loadingPreview && (
                      <div className="p-6 text-sm text-muted-foreground">
                        Chargement…
                      </div>
                    )}
                    {!loadingPreview && previewError && (
                      <div className="p-6 text-sm text-red-500">
                        {previewError}
                      </div>
                    )}
                    {!loadingPreview && !previewError && previewUrl && (
                      <div className="w-full h-full relative">
                        {isImage && (
                          <div
                            className="w-full h-full overflow-auto"
                            style={{
                              touchAction: isMobile ? "pan-x pan-y" : undefined,
                            }}
                          >
                            <img
                              src={previewUrl}
                              alt={doc.name}
                              className="block"
                              style={{
                                width: "100%",
                                height: "auto",
                                transform: `scale(${imgScale})`,
                                transformOrigin: "center center",
                              }}
                            />
                          </div>
                        )}
                        {isPdf && (
                          <object
                            data={objectUrl || previewUrl || undefined}
                            type="application/pdf"
                            className="w-full h-full"
                          >
                            <div className="p-4 text-sm">
                              <p className="mb-2">
                                PDF non pris en charge en aperçu sur cet
                                appareil.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const url = objectUrl || previewUrl || "";
                                  if (url) window.open(url, "_blank");
                                }}
                              >
                                Ouvrir dans un onglet
                              </Button>
                            </div>
                          </object>
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
                        {/* Controls zoom, épinglés au conteneur de prévisualisation (pas au scroll interne) */}
                        {isMobile && isImage && (
                          <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-background/70 backdrop-blur rounded-full p-1 shadow">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setImgScale((s) =>
                                  Math.max(1, +(s - 0.25).toFixed(2))
                                )
                              }
                              aria-label="Zoom -"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="text-xs w-10 text-center">
                              {Math.round(imgScale * 100)}%
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setImgScale((s) =>
                                  Math.min(3, +(s + 0.25).toFixed(2))
                                )
                              }
                              aria-label="Zoom +"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
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
                    <p className="text-sm text-muted-foreground mb-1">
                      Dernière modification
                    </p>
                    <p className="font-medium text-sm">
                      {formatDate(doc.modifiedAt)}
                    </p>
                  </div>
                </div>

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
                          <Button
                            size="sm"
                            onClick={saveTags}
                            disabled={isSaving}
                          >
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
                          <span className="text-sm text-muted-foreground">
                            Aucun tag
                          </span>
                        )}
                        {tags.map((tag) => (
                          <TagBadge
                            key={tag}
                            name={tag}
                            size="md"
                            onClick={
                              onTagClick ? () => onTagClick(tag) : undefined
                            }
                            className={cn(
                              "cursor-pointer hover:ring-2 hover:ring-offset-1",
                              selectedTags?.includes(tag) &&
                                "ring-2 ring-offset-1"
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

                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm text-muted-foreground">
                      Similaires
                    </h4>
                    <div className="flex items-center gap-3">
                      {similarDocs && similarDocs.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {(() => {
                            const idx =
                              similarFocusId && similarDocs
                                ? similarDocs.findIndex(
                                    (d) => d.id === similarFocusId
                                  )
                                : -1;
                            const cur = idx >= 0 ? idx + 1 : 0;
                            const total = similarDocs?.length || 0;
                            return `${cur}/${total} • utilisez ← →`;
                          })()}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reindexing}
                        onClick={doReindex}
                      >
                        {reindexing ? "Réindexation…" : "Réindexer"}
                      </Button>
                    </div>
                  </div>
                  {loadingSimilar ? (
                    <p className="text-sm text-muted-foreground">Chargement…</p>
                  ) : similarDocs && similarDocs.length > 0 ? (
                    <ul className="space-y-2">
                      {similarDocs.map((s) => (
                        <li
                          key={s.id}
                          className={cn(
                            "flex items-center justify-between rounded-md px-2 py-1",
                            similarFocusId === s.id
                              ? "bg-accent/40 ring-1 ring-accent"
                              : "hover:bg-accent/20"
                          )}
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(s.size)} •{" "}
                              {formatDate(s.modifiedAt)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openSimilarById(s.id)}
                          >
                            Ouvrir
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Aucun résultat.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div
                className="mt-auto px-6 py-4 border-t flex flex-wrap gap-2 justify-end bg-background sticky bottom-0 z-20"
                style={{
                  paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
                }}
              >
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
                    {doc.isFavorite
                      ? "Retirer des favoris"
                      : "Ajouter aux favoris"}
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
