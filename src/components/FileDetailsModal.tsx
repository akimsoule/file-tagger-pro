import { Document } from '@/contexts/file/def';
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
import { FileText, Heart, Download, Share, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDetailsModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
  onTagClick?: (tag: string) => void;
  selectedTags?: string[];
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

const getFileIcon = (doc: Document) => {
  return <FileText className="h-12 w-12 text-muted-foreground" />;
};

export function FileDetailsModal({ 
  document: doc, 
  isOpen, 
  onClose, 
  onToggleFavorite,
  onTagClick,
  selectedTags = []
}: FileDetailsModalProps) {
  if (!doc) return null;

  const extension = doc.name.split('.').pop()?.toUpperCase();
  const tags = doc.tags.split(',').filter(tag => tag.trim() !== '');

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {getFileIcon(doc)}
            <div>
              <DialogTitle className="text-xl mb-1">
                {doc.name}
              </DialogTitle>
              <DialogDescription asChild>
                <div>
                  <span>Type : {extension || 'Document'}</span>
                  {doc.description && (
                    <p className="mt-1 text-sm">{doc.description}</p>
                  )}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Métadonnées du fichier */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Taille
            </p>
            <p className="font-medium">
              {formatFileSize(doc.size)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Dernière modification
            </p>
            <p className="font-medium">
              {formatDate(doc.modifiedAt)}
            </p>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
              <h4 className="text-sm text-muted-foreground mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <TagBadge
                    key={tag}
                    name={tag.trim()}
                    size="md"
                    onClick={onTagClick ? () => onTagClick(tag.trim()) : undefined}
                    className={cn(
                      'cursor-pointer hover:ring-2 hover:ring-offset-2',
                      selectedTags?.includes(tag.trim()) && 'ring-2 ring-offset-2'
                    )}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <TagBadge key={tag} name={tag.trim()} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <Separator className="my-4" />
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onToggleFavorite}
          >
            <Heart className={cn(
              "h-4 w-4",
              doc.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
            )} />
            {doc.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Télécharger
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Share className="h-4 w-4" />
            Partager
          </Button>
          <Button
            size="sm"
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Modifier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}