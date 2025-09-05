import React from 'react';

export const FileCardSkeleton: React.FC = () => (
  <div className="rounded-lg border border-border bg-card p-3 animate-pulse flex flex-col gap-2 h-28">
    <div className="h-5 w-5 rounded bg-muted" />
    <div className="h-3 w-2/3 bg-muted rounded" />
    <div className="h-3 w-1/3 bg-muted rounded" />
  </div>
);
