interface PrintableNode {
  id: string;
  name: string;
  type: string;
  children: PrintableNode[];
}

export function printTreeUtil(root: PrintableNode): string {
  let output = "";
  interface Frame {
    node: PrintableNode;
    prefix: string;
    isLast: boolean;
    isRoot: boolean;
  }
  const stack: Frame[] = [{ node: root, prefix: "", isLast: true, isRoot: true }];
  while (stack.length) {
    const { node, prefix, isLast, isRoot } = stack.pop()!;
    const connector = isRoot ? "" : isLast ? "└─" : "├─";
    output += `${prefix}${connector}${node.type === "folder" ? "📁" : "📄"} ${node.name} (${node.id})\n`;
    if (node.children.length) {
      const nextPrefix = prefix + (isRoot ? "" : isLast ? "   " : "│  ");
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        stack.push({
          node: child,
          prefix: nextPrefix,
          isLast: i === node.children.length - 1,
          isRoot: false,
        });
      }
    }
  }
  return output;
}
