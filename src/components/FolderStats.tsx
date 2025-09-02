import { useFileContext } from '@/hooks/use-files';

type FolderStatsProps = {
  folderId: string;
};

export const FolderStats = ({ folderId }: FolderStatsProps) => {
  const { getFolderStats } = useFileContext();
  const stats = getFolderStats(folderId);

  // Fonction pour formater la taille en Mo ou Go
  const formatSize = (bytes: number) => {
    const MB = bytes / (1024 * 1024);
    if (MB >= 1024) {
      return `${(MB / 1024).toFixed(2)} Go`;
    }
    return `${MB.toFixed(2)} Mo`;
  };

  return (
    <div className="flex gap-2 text-xs text-muted-foreground">
      <span>{stats.totalItems} éléments</span>
      <span>•</span>
      <span>{formatSize(stats.totalSize)}</span>
    </div>
  );
};
