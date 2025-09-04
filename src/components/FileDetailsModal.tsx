import { Document } from '@/contexts/file/def';
import { formatFileSize, formatDate } from '@/lib/format';
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
  selectedTags = []
}: FileDetailsModalProps) {
  if (!doc) return null;

  const extension = doc.name.split('.').pop()?.toUpperCase();
  const tags = doc.tags.split(',').filter(tag => tag.trim() !== '');

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              {getFileIcon(doc)}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl mb-1 truncate">
                {doc.name}
              </DialogTitle>
              <DialogDescription asChild>
                <div>
                  <span className="text-sm">Type : {extension || 'Document'}</span>
                  {doc.description && (
                    <p className="mt-1 text-sm line-clamp-2">{doc.description}</p>
                  )}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Métadonnées du fichier */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <p className="font-medium text-sm">
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
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <TagBadge
                    key={tag}
                    name={tag.trim()}
                    size="md"
                    onClick={onTagClick ? () => onTagClick(tag.trim()) : undefined}
                    className={cn(
                      'cursor-pointer hover:ring-2 hover:ring-offset-1',
                      selectedTags?.includes(tag.trim()) && 'ring-2 ring-offset-1'
                    )}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <Separator className="my-4" />
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none gap-2 min-w-[120px]"
            onClick={onToggleFavorite}
          >
            <Heart className={cn(
              "h-4 w-4",
              doc.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
            )} />
            <span className="truncate">{doc.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none gap-2 min-w-[120px]"
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
      </DialogContent>
    </Dialog>
  );
}