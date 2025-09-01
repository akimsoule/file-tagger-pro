import { cn } from '@/lib/utils';

interface TagBadgeProps {
  name: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

const colorFromString = (str: string): string => {
  const colors = ['blue', 'green', 'orange', 'purple', 'pink', 'yellow'];
  // Utiliser une somme de caractères pour générer un index stable
  const hash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const colorClasses = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
};

export function TagBadge({ name, size = 'sm', onClick, className }: TagBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium transition-colors',
        'max-w-full overflow-hidden',
        sizeClasses[size],
        colorClasses[colorFromString(name)],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      title={name}
    >
      <span className="truncate">{name}</span>
    </span>
  );
}