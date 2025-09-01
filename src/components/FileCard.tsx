import { FileItem } from '@/types';
import { TagBadge } from './TagBadge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Folder, Heart, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileCardProps {
  file: FileItem;
  onClick?: () => void;
  onToggleFavorite?: () => void;
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
    month: 'short',
    year: 'numeric',
  });
};

const getFileIcon = (file: FileItem) => {
  if (file.type === 'folder') {
    return <Folder className="h-8 w-8 text-primary" />;
  }
  return <FileText className="h-8 w-8 text-muted-foreground" />;
};

export function FileCard({ file, onClick, onToggleFavorite }: FileCardProps) {
  return (
    <Card 
      className={cn(
        "group relative p-4 cursor-pointer transition-all duration-200 hover:shadow-card-hover border-border/50",
        "hover:border-primary/20 hover:-translate-y-0.5"
      )}
      onClick={onClick}
    >
      {/* Header avec icône et actions */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {getFileIcon(file)}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">
              {file.name}
            </h3>
            {file.extension && (
              <p className="text-xs text-muted-foreground uppercase">
                {file.extension}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.();
            }}
          >
            <Heart className={cn(
              "h-4 w-4",
              file.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
            )} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tags */}
      {file.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {file.tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
          {file.tags.length > 3 && (
            <span className="text-xs text-muted-foreground px-2 py-1">
              +{file.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Métadonnées */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatDate(file.dateModified)}</span>
        {file.size && (
          <span>{formatFileSize(file.size)}</span>
        )}
      </div>
    </Card>
  );
}