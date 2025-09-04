// Utilitaires de formatage réutilisables

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

export function formatDate(date: Date | string | number, locale = 'fr-FR'): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function truncate(text: string, max = 40): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}
