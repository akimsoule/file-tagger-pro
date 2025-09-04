import React from 'react';
import { formatFileSize } from '@/lib/format';

interface StatsBarProps {
  folders: number;
  documents: number;
  sizeBytes: number;
  className?: string;
}

export const StatsBar: React.FC<StatsBarProps> = ({ folders, documents, sizeBytes, className }) => {
  return (
    <div className={`mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground ${className || ''}`}>
      <span className="whitespace-nowrap">{folders} dossiers</span>
      <span className="hidden sm:inline">•</span>
      <span className="whitespace-nowrap">{documents} documents</span>
      <span className="hidden sm:inline">•</span>
      <span className="whitespace-nowrap">{formatFileSize(sizeBytes)}</span>
    </div>
  );
};
