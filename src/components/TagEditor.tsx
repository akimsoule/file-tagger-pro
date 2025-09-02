import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileContext } from '@/hooks/use-files';

interface TagEditorProps {
  isOpen: boolean;
  onClose: () => void;
  currentTags: string;
  onSave: (newTags: string) => void;
  title?: string;
}

export function TagEditor({
  isOpen,
  onClose,
  currentTags,
  onSave,
  title = "Modifier les tags"
}: TagEditorProps) {
  const { getAllTags, getTagCount } = useFileContext();
  const [tags, setTags] = useState(() => 
    currentTags.split(',')
      .map(tag => tag.trim())
      .filter(Boolean)
  );
  const [inputValue, setInputValue] = useState('');

  const allTags = getAllTags();

  const handleAddTag = useCallback((newTag: string) => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags(prev => [...prev, trimmedTag]);
    }
    setInputValue('');
  }, [tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  const handleSave = () => {
    onSave(tags.join(', '));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Input
              placeholder="Ajouter un tag..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-8"
            />
            {inputValue && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => handleAddTag(inputValue)}
              >
                <Tag className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Tags actuels */}
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span
                key={tag}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm",
                  "bg-primary/10 text-primary"
                )}
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-primary/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Suggestions de tags */}
          <ScrollArea className="h-[200px] pr-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Tags suggérés
              </h4>
              <div className="flex flex-wrap gap-2">
                {allTags
                  .filter(tag => !tags.includes(tag))
                  .map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleAddTag(tag)}
                      className={cn(
                        "inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm",
                        "bg-muted/50 hover:bg-muted transition-colors"
                      )}
                    >
                      <span>{tag}</span>
                      <span className="text-xs text-muted-foreground">
                        {getTagCount(tag)}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              Sauvegarder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
