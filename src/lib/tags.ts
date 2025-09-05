// Utilitaires centralisés pour gérer la chaîne de tags CSV

export function parseTags(csv: string | undefined | null): string[] {
  if (!csv) return [];
  return csv.split(',').map(t => t.trim()).filter(Boolean);
}

export function joinTags(tags: string[]): string {
  return Array.from(new Set(tags.map(t => t.trim()).filter(Boolean))).join(',');
}

export function addTag(csv: string, tag: string): string {
  const current = parseTags(csv);
  if (!current.includes(tag)) current.push(tag);
  return joinTags(current);
}

export function removeTag(csv: string, tag: string): string {
  return joinTags(parseTags(csv).filter(t => t !== tag));
}

export function hasAllTags(csv: string, required: string[]): boolean {
  const set = new Set(parseTags(csv));
  return required.every(t => set.has(t));
}
