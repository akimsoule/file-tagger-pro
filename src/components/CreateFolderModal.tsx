import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFolderMutations } from "@/hooks/useApiFolders";
import { useFileContext } from "@/hooks/useFileContext";

interface CreateFolderModalProps {
  open: boolean;
  parentId?: string;
  onClose: () => void;
  onCreated?: (folderId: string) => void;
}

export function CreateFolderModal({
  open,
  parentId,
  onClose,
  onCreated,
}: CreateFolderModalProps) {
  const { createMut } = useFolderMutations();
  const { createFolder, currentNode } = useFileContext();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
    }
  }, [open]);

  const disabled = createMut.isPending || name.trim().length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    try {
      const payload: {
        name: string;
        description?: string;
        color?: string;
        parentId?: string;
      } = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      };
      // Fallback: si parentId non fourni par le parent, utiliser le dossier courant du contexte
      const targetParentId = parentId ?? currentNode?.id;
      if (targetParentId && targetParentId !== "root")
        payload.parentId = targetParentId;
      const res = await createMut.mutateAsync(payload);
      if (createFolder) {
        createFolder({
          id: res.id,
          name: res.name,
          description: res.description,
          color: res.color || "#3B82F6",
          ownerId: res.ownerId,
          parentId: res.parentId || undefined,
          children: [],
          documents: [],
          tags: "",
          createdAt: new Date(res.createdAt),
          updatedAt: new Date(res.updatedAt),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
      if (onCreated) onCreated(res.id);
      onClose();
    } catch (err) {
      // TODO: toast error
      console.error("Erreur création dossier", err);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
            <DialogDescription>
              Créez un dossier pour organiser vos documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nom</label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du dossier"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description (optionnel)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Couleur</label>
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 p-1"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={disabled}>
              {createMut.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
