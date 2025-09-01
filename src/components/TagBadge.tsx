import { cn } from '@/lib/utils';
import { Tag } from '@/types';

interface TagBadgeProps {
  tag: Tag;
  size?: 'sm' | 'md';
  showCount?: boolean;
  onClick?: () => void;
  className?: string;
}

const colorClasses = {
  blue: 'bg-tag-blue/10 text-tag-blue border-tag-blue/20 hover:bg-tag-blue/20',
  green: 'bg-tag-green/10 text-tag-green border-tag-green/20 hover:bg-tag-green/20',
  orange: 'bg-tag-orange/10 text-tag-orange border-tag-orange/20 hover:bg-tag-orange/20',
  purple: 'bg-tag-purple/10 text-tag-purple border-tag-purple/20 hover:bg-tag-purple/20',
  pink: 'bg-tag-pink/10 text-tag-pink border-tag-pink/20 hover:bg-tag-pink/20',
  yellow: 'bg-tag-yellow/10 text-tag-yellow border-tag-yellow/20 hover:bg-tag-yellow/20',
};

export function TagBadge({ tag, size = 'sm', showCount = false, onClick, className }: TagBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium transition-colors',
        sizeClasses[size],
        colorClasses[tag.color],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {tag.name}
      {showCount && tag.count && (
        <span className="ml-1 opacity-70">
          {tag.count}
        </span>
      )}
    </span>
  );
}