import prisma from './database';
import { LogService } from './logService';

export interface TagStats {
  name: string;
  count: number;
  color?: string;
}

export interface TagAnalytics {
  totalTags: number;
  mostUsedTags: { name: string; count: number }[];
  tagsByType: { type: string; tags: string[] }[];
  recentTags: string[];
}

export class TagService {
  private logService: LogService;

  constructor(logService: LogService) {
    this.logService = logService;
  }

  /**
   * Récupère tous les tags uniques avec leurs statistiques
   */
  async getAllTags(userId: string): Promise<TagStats[]> {
    // Récupérer les tags relationnels (nouveau modèle)
    const relationalTags = await prisma.tag.findMany({
      where: { userId },
      include: {
        documents: true,
        folders: true,
      },
      orderBy: { name: 'asc' }
    });

    if (relationalTags.length > 0) {
      return relationalTags.map(t => ({
        name: t.name,
        count: t.documents.length + t.folders.length,
        color: t.color
      })).sort((a,b) => b.count - a.count);
    }

    // Fallback rétro-compat: calculer depuis CSV des documents (avant migration complète)
    const documents = await prisma.document.findMany({
      where: { ownerId: userId },
      select: { tags: true }
    });
    const tagCounts = new Map<string, number>();
    documents.forEach(doc => {
      if (doc.tags && doc.tags.trim()) {
        const tags = doc.tags.split(',').map(t => t.trim()).filter(Boolean);
        tags.forEach(t => tagCounts.set(t, (tagCounts.get(t) || 0) + 1));
      }
    });
    const colorPalette = [ '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1' ];
    return Array.from(tagCounts.entries()).map(([name,count], idx) => ({
      name,
      count,
      color: this.getTagColor(name, colorPalette, idx)
    })).sort((a,b)=> b.count - a.count);
  }

  /**
   * Récupère les tags les plus populaires
   */
  async getPopularTags(userId: string, limit = 10): Promise<TagStats[]> {
    const allTags = await this.getAllTags(userId);
    return allTags.slice(0, limit);
  }

  /**
   * Cherche des tags par nom
   */
  async searchTags(query: string, userId: string): Promise<TagStats[]> {
    const allTags = await this.getAllTags(userId);
    return allTags.filter(tag => 
      tag.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * Ajoute ou met à jour les tags d'un document
   */
  async updateDocumentTags(documentId: string, tags: string[]): Promise<void> {
    const tagsString = tags
      .map(tag => tag.trim())
      .filter(tag => tag)
      .join(',');

    await prisma.document.update({
      where: { id: documentId },
      data: { tags: tagsString }
    });

    await this.logService.log({
      action: 'DOCUMENT_UPDATE',
      entity: 'DOCUMENT',
      entityId: documentId,
      details: `Tags mis à jour: ${tagsString}`,
      userId: ''
    });
  }

  /**
   * Ajoute un tag à un document
   */
  async addTagToDocument(documentId: string, newTag: string): Promise<void> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { tags: true }
    });

    if (!document) {
      throw new Error('Document introuvable');
    }

    const existingTags = document.tags 
      ? document.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      : [];

    if (!existingTags.includes(newTag.trim())) {
      existingTags.push(newTag.trim());
      await this.updateDocumentTags(documentId, existingTags);
    }
  }

  /**
   * Supprime un tag d'un document
   */
  async removeTagFromDocument(documentId: string, tagToRemove: string): Promise<void> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { tags: true }
    });

    if (!document) {
      throw new Error('Document introuvable');
    }

    const existingTags = document.tags 
      ? document.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      : [];

    const updatedTags = existingTags.filter(tag => tag !== tagToRemove.trim());
    await this.updateDocumentTags(documentId, updatedTags);
  }

  /**
   * Obtient les statistiques des tags
   */
  async getTagAnalytics(userId: string): Promise<TagAnalytics> {
    const allTags = await this.getAllTags(userId);
    
    // Grouper par type de document
  const documents = await prisma.document.findMany({
      select: {
        type: true,
        tags: true,
        createdAt: true
      }
    });

    const tagsByType = new Map<string, Set<string>>();
    const recentTags = new Set<string>();

    // Calculer les tags récents (derniers 30 jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    documents.forEach(doc => {
      if (doc.tags && doc.tags.trim()) {
        const tags = doc.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        // Grouper par type
        if (!tagsByType.has(doc.type)) {
          tagsByType.set(doc.type, new Set());
        }
        tags.forEach(tag => {
          tagsByType.get(doc.type)!.add(tag);
          
          // Tags récents
          if (doc.createdAt >= thirtyDaysAgo) {
            recentTags.add(tag);
          }
        });
      }
    });

    return {
      totalTags: allTags.length,
      mostUsedTags: allTags.slice(0, 10).map(tag => ({
        name: tag.name,
        count: tag.count
      })),
      tagsByType: Array.from(tagsByType.entries()).map(([type, tags]) => ({
        type,
        tags: Array.from(tags)
      })),
      recentTags: Array.from(recentTags).slice(0, 20)
    };
  }

  /**
   * Renomme un tag dans tous les documents
   */
  async renameTag(oldTag: string, newTag: string, userId: string): Promise<number> {
    // Mise à jour du Tag relationnel
    const updated = await prisma.tag.updateMany({
      where: { userId, name: oldTag },
      data: { name: newTag }
    });
    await this.logService.log({
      action: 'TAG_UPDATE',
      entity: 'TAG',
      entityId: oldTag,
      details: `Tag renommé de "${oldTag}" vers "${newTag}" (${updated.count} entrées)`,
      userId
    });
    return updated.count;
  }

  /**
   * Supprime un tag de tous les documents
   */
  async deleteTag(tagToDelete: string, userId: string): Promise<number> {
    const deleted = await prisma.tag.deleteMany({ where: { userId, name: tagToDelete } });
    await this.logService.log({
      action: 'TAG_DELETE',
      entity: 'TAG',
      entityId: tagToDelete,
      details: `Tag supprimé: "${tagToDelete}" (${deleted.count} enregistrements)` ,
      userId
    });
    return deleted.count;
  }

  /**
   * Obtient une couleur pour un tag
   */
  private getTagColor(tagName: string, colorPalette: string[], index: number): string {
    // Tags spéciaux avec couleurs fixes
    const specialColors: Record<string, string> = {
      'Archive': '#6B7280',
      'Favoris': '#F59E0B',
      'documents': '#3B82F6',
      'images': '#10B981',
      'vidéos': '#EF4444',
      'audio': '#8B5CF6',
      'synced': '#06B6D4',
      'nouveau': '#84CC16'
    };

    if (specialColors[tagName]) {
      return specialColors[tagName];
    }

    return colorPalette[index % colorPalette.length];
  }
}

export default TagService;
