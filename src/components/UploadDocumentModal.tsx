import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadDocument as apiUploadDocument } from '@/lib/api/api-documents';
import { useFileContext } from '@/hooks/useFileContext';

interface UploadDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded?: (id: string) => void;
}

export function UploadDocumentModal({ open, onClose, onUploaded }: UploadDocumentModalProps) {
  const { currentNode, createDocument } = useFileContext() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // On capture le dossier cible à l'ouverture du modal pour éviter les déplacements ultérieurs
  const [capturedFolderId, setCapturedFolderId] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setName('');
      setDescription('');
      setCapturedFolderId(undefined);
    } else {
      // A l'ouverture, mémoriser le dossier courant (sauf racine)
      const id = currentNode?.id && currentNode.id !== 'root' ? currentNode.id : undefined;
      setCapturedFolderId(id);
    }
  }, [open, currentNode?.id]);

  const disabled = uploading || !file;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || !file) return;
    try {
    const targetFolderId = capturedFolderId;
    setUploading(true);
    const res = await apiUploadDocument(file, { name: name || file.name, description: description || undefined, folderId: targetFolderId } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (createDocument) {
        createDocument({
          id: res.id,
          name: res.name,
          type: res.type,
          size: res.size,
          description: res.description || '',
          tags: res.tags || '',
          fileId: res.fileId || '',
          hash: res.hash || '',
          ownerId: res.ownerId,
      // Fallback local si l'API ne renvoie pas folderId: utiliser le dossier capturé
      folderId: res.folderId || targetFolderId || undefined,
          isFavorite: res.isFavorite || false,
          createdAt: new Date(res.createdAt),
          modifiedAt: new Date(res.modifiedAt)
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
      if (onUploaded) onUploaded(res.id);
      onClose();
    } catch (err) {
      console.error('Erreur upload document', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Uploader un fichier</DialogTitle>
            <DialogDescription>Sélectionnez un fichier à ajouter à votre espace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Fichier</label>
            <Input type="file" onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              if (f && !name) setName(f.name);
            }} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nom (optionnel)</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom d'affichage" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optionnel)</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={disabled}>{uploading ? 'Upload...' : 'Uploader'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}