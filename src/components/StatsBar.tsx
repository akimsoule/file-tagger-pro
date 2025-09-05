import React from 'react';
import { formatFileSize } from '@/lib/format';

interface StatsBarProps {
  folders: number;
  documents: number;
  sizeBytes: number;
  className?: string;
  loading?: boolean;
}

export const StatsBar: React.FC<StatsBarProps> = ({ folders, documents, sizeBytes, className, loading }) => {
  return (
    <div className={`mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground ${className || ''}`}>
      {loading ? (
        <>
          <span className="h-4 w-20 bg-muted rounded animate-pulse" />
          <span className="hidden sm:inline">•</span>
          <span className="h-4 w-24 bg-muted rounded animate-pulse" />
          <span className="hidden sm:inline">•</span>
          <span className="h-4 w-16 bg-muted rounded animate-pulse" />
        </>
      ) : (
        <>
          <span className="whitespace-nowrap">{folders} dossiers</span>
          <span className="hidden sm:inline">•</span>
          <span className="whitespace-nowrap">{documents} documents</span>
          <span className="hidden sm:inline">•</span>
          <span className="whitespace-nowrap">{formatFileSize(sizeBytes)}</span>
        </>
      )}
    </div>
  );
};
