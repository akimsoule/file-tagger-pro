import type { Tag, Document, Folder } from "@/contexts/file";

export interface TagTreeNode {
  id: string;
  type: string;
  tags: { id: string; name: string }[];
  children: unknown[]; // compatible avec TreeNode[]
  getRoot(): TagTreeNode;
  findChildById(id: string): TagTreeNode | undefined;
  getData(): Document | Folder;
  updateData(updates: Partial<Document | Folder>): void;
}

function iterate(root: TagTreeNode): Generator<TagTreeNode> {
  const stack: TagTreeNode[] = [root];
  const seen = new Set<TagTreeNode>();
  return (function* () {
    while (stack.length) {
      const n = stack.pop()!;
      if (seen.has(n)) continue;
      seen.add(n);
      yield n;
      const children = n.children as TagTreeNode[];
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        if (child) stack.push(child);
      }
    }
  })();
}

export function computeTagStatsUtil(
  node: TagTreeNode,
  previousTags: Tag[],
  customTags: Tag[],
  palette: string[]
): Tag[] {
  const root = node.getRoot();
  const countMap = new Map<string, number>();
  for (const n of iterate(root)) {
    const raw = (n.getData().tags || '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    for (const name of raw) {
      countMap.set(name, (countMap.get(name) || 0) + 1);
    }
  }
  const prevColor = new Map<string, string>();
  previousTags.forEach(t => prevColor.set(t.name, t.color));
  const result: Tag[] = [];
  [...countMap.keys()].forEach((name, idx) => {
    result.push({
      id: `tag-${name}`,
      name,
      color: prevColor.get(name) || palette[idx % palette.length],
      count: countMap.get(name) || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
  customTags.forEach(ct => { if(!result.some(t => t.id === ct.id)) result.push(ct); });
  result.sort((a,b)=> b.count - a.count || a.name.localeCompare(b.name));
  // Logs de debug supprimés (ancien comptage 'work')
  return result;
}

export function addTagUtil(root: TagTreeNode, nodeId: string, tagName: string): boolean {
  const target = root.getRoot().findChildById(nodeId);
  if(!target) return false;
  const data = target.getData();
  const existing = (data.tags || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
  if (existing.includes(tagName)) return false;
  existing.push(tagName);
  target.updateData({ tags: existing.join(',') });
  return true;
}

export function removeTagUtil(root: TagTreeNode, nodeId: string, tagName: string): boolean {
  const target = root.getRoot().findChildById(nodeId);
  if(!target) return false;
  const data = target.getData();
  const filtered = (data.tags || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .filter(t => t !== tagName);
  const original = (data.tags || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .join(',');
  if (filtered.join(',') === original) return false;
  target.updateData({ tags: filtered.join(',') });
  return true;
}

export function purgeTagUtil(root: TagTreeNode, tagName: string): number {
  const r = root.getRoot();
  let changed = 0;
  for (const n of iterate(r)) {
    const data = n.getData();
    const parts = (data.tags || '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    const filtered = parts.filter(t => t !== tagName);
    if (filtered.length !== parts.length) {
      n.updateData({ tags: filtered.join(',') });
      changed++;
    }
  }
  return changed;
}
