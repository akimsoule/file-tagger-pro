import { FileTreeNode } from "../local/FileTreeNode";
import type { Document, Folder } from "@/contexts/file";
import { createFolder as apiCreateFolder, updateFolder as apiUpdateFolder, deleteFolder as apiDeleteFolder, moveDocument as apiMoveDocument } from "@/lib/api/api-folders";
import { createDocument as apiCreateDocument, updateDocument as apiUpdateDocument, deleteDocument as apiDeleteDocument } from "@/lib/api/api-documents";

/**
 * Surcharge minimale des méthodes d'écriture du TreeNode pour ajouter
 * la synchronisation API (optimiste) sans multiplier les méthodes.
 * Toutes les méthodes restent synchrones (interface identique) et déclenchent
 * une requête asynchrone; en cas d'échec on tente un rollback.
 */
export class FileTreeNodeApi extends FileTreeNode {
    private isTemp(id: string) { return id.startsWith('tmp_'); }

    /** Génère un ID temporaire si besoin (utilisable par le code appelant) */
    public static tempId(kind: 'folder' | 'doc') {
        return `tmp_${kind}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    }

    // --- ADD CHILD ---
    public override addChild(child: FileTreeNode): boolean {
        const wasTemp = this.isTemp(child.id);
        const parentBefore = child.parent?.id;
        const ok = super.addChild(child);
        if (!ok) return false;

        // Création distante uniquement si nouvel élément (id temporaire)
        if (wasTemp) {
            const data = (child as FileTreeNode).getData();
            if (child.type === 'folder') {
                const f = data as Folder;
                apiCreateFolder({
                    name: f.name,
                    description: f.description,
                    color: f.color,
                    parentId: f.parentId || undefined
                }).then(dto => {
                    // Mise à jour ID + data
                        child.updateId(dto.id);
                        if ((child as FileTreeNode).updateData) {
                            (child as FileTreeNode).updateData({
                                name: dto.name,
                                description: dto.description,
                                color: (dto as { color?: string }).color,
                                parentId: dto.parentId || undefined
                            } as Partial<Folder>);
                        }
                }).catch(err => {
                    // rollback suppression si échec
                    this.removeChild(child.id);
                    console.error('createFolder failed, rollback', err);
                });
            } else if (child.type === 'file') {
                const d = data as Document;
                apiCreateDocument({
                    name: d.name,
                    description: d.description,
                    tags: d.tags,
                    type: d.type,
                    folderId: d.folderId || undefined
                }).then(dto => {
                    child.updateId(dto.id);
                    if ((child as FileTreeNode).updateData) {
                        (child as FileTreeNode).updateData({
                            name: dto.name,
                            type: dto.type,
                            description: dto.description,
                            tags: dto.tags,
                            folderId: dto.folderId || undefined
                        } as Partial<Document>);
                    }
                }).catch(err => {
                    this.removeChild(child.id);
                    console.error('createDocument failed, rollback', err);
                });
            }
        }
        return true;
    }

    // --- REMOVE CHILD ---
    public override removeChild(childId: string): boolean {
        const root = this.getRoot();
        const node = root.findChildById(childId) as FileTreeNode | undefined;
        if (!node) return false;
        const parent = node.parent as FileTreeNode | undefined;
        const snapshot = node.toJSON();
        const ok = super.removeChild(childId);
        if (!ok) return false;

        // Ignorer les IDs temporaires (jamais persistés)
        if (this.isTemp(childId)) return true;

        if (node.type === 'folder') {
            apiDeleteFolder(childId).catch(err => {
                // rollback
                if (parent) {
                    const restored = FileTreeNode.fromJSON(snapshot) as FileTreeNode;
                    parent.addChild(restored);
                }
                console.error('deleteFolder failed, rollback', err);
            });
        } else if (node.type === 'file') {
            apiDeleteDocument(childId).catch(err => {
                if (parent) {
                    const restored = FileTreeNode.fromJSON(snapshot) as FileTreeNode;
                    parent.addChild(restored);
                }
                console.error('deleteDocument failed, rollback', err);
            });
        }
        return true;
    }

    // --- MOVE NODE ---
    public override moveNodeFrom(oldParentId: string, newParentId: string, childId: string): boolean {
        const root = this.getRoot();
        const node = root.findChildById(childId) as FileTreeNode | undefined;
        if (!node) return false;
        const ok = super.moveNodeFrom(oldParentId, newParentId, childId);
        if (!ok) return false;

        // Ne pas déplacer si non persisté encore
        if (this.isTemp(childId)) return true;

        const rollback = () => {
            super.moveNodeFrom(newParentId, oldParentId, childId);
        };

        if (node.type === 'file') {
            apiMoveDocument(childId, newParentId === 'root' ? undefined : newParentId)
                .catch(err => { rollback(); console.error('moveDocument failed, rollback', err); });
        } else if (node.type === 'folder') {
            apiUpdateFolder(childId, { parentId: newParentId === 'root' ? undefined : newParentId })
                .catch(err => { rollback(); console.error('moveFolder failed, rollback', err); });
        }
        return true;
    }

    // --- UPDATE ID ---
    public override updateId(newId: string): void {
        // L'API ne supporte pas le changement d'ID (générés côté backend).
        // On interdit le changement d'un ID déjà persisté.
        if (!this.isTemp(this.id)) {
            console.warn('updateId ignoré: ID déjà persisté');
            return;
        }
        super.updateId(newId);
    }
}

