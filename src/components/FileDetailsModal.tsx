import { FileItem } from '@/types';
import { TagBadge } from './TagBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileText, Folder, Heart, Download, Share, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDetailsModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
}

const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getFileIcon = (file: FileItem) => {
  if (file.type === 'folder') {
    return <Folder className="h-12 w-12 text-primary" />;
  }
  return <FileText className="h-12 w-12 text-muted-foreground" />;
};

export function FileDetailsModal({ file, isOpen, onClose, onToggleFavorite }: FileDetailsModalProps) {
  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getFileIcon(file)}
            <div>
              <h2 className="text-xl font-semibold">{file.name}</h2>
              {file.extension && (
                <p className="text-sm text-muted-foreground uppercase mt-1">
                  Fichier {file.extension}
                </p>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            Détails et informations du {file.type === 'folder' ? 'dossier' : 'fichier'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFavorite}
              className="flex items-center gap-2"
            >
              <Heart className={cn(
                "h-4 w-4",
                file.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
              )} />
              {file.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Télécharger
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Share className="h-4 w-4" />
              Partager
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Renommer
            </Button>
          </div>

          <Separator />

          {/* Tags */}
          {file.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {file.tags.map((tag) => (
                  <TagBadge key={tag.id} tag={tag} />
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Informations détaillées */}
          <div className="grid gap-4">
            <h3 className="text-sm font-medium text-foreground">Informations</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p className="font-medium mt-1">
                  {file.type === 'folder' ? 'Dossier' : `Fichier ${file.extension?.toUpperCase() || ''}`}
                </p>
              </div>
              
              {file.size && (
                <div>
                  <span className="text-muted-foreground">Taille:</span>
                  <p className="font-medium mt-1">{formatFileSize(file.size)}</p>
                </div>
              )}
              
              <div>
                <span className="text-muted-foreground">Dernière modification:</span>
                <p className="font-medium mt-1">{formatDate(file.dateModified)}</p>
              </div>
              
              <div>
                <span className="text-muted-foreground">Statut:</span>
                <p className="font-medium mt-1">
                  {file.isFavorite ? 'Favori' : 'Normal'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}