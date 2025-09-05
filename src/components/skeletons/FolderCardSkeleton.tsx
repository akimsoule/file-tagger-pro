import React from 'react';

export const FolderCardSkeleton: React.FC = () => (
  <div className="rounded-lg border border-border bg-card p-4 animate-pulse flex flex-col gap-3 h-32">
    <div className="h-6 w-6 rounded-md bg-muted" />
    <div className="h-3 w-3/4 bg-muted rounded" />
    <div className="h-3 w-1/2 bg-muted rounded" />
  </div>
);
