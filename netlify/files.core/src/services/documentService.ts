import prisma from "./database";
import { LogService } from "./logService";
import * as megaStorage from "./megaStorage";
import fs from "fs";
import path from "path";
import { MegaStorageService } from "./megaStorage";
import crypto from "crypto";
import { EmbeddingGenerator } from "./embeddingGenerator";

export interface CreateDocumentData {
  name: string;
  type: string;
  description?: string;
  tags?: string; // Tags séparés par des virgules
  ownerId?: string;
  ownerEmail?: string;
  folderId?: string; // Dossier cible (optionnel)
  filePath?: string;
  testFolderId?: string; // ID du dossier MEGA pour les tests
  file?: {
    name: string; // Nom du fichier
    buffer: Buffer; // Contenu du fichier
    mimeType: string; // Type MIME du fichier
  };
}

export interface UpdateDocumentData {
  name?: string;
  type?: string;
  description?: string;
  tags?: string; // Tags séparés par des virgules
  isFavorite?: boolean;
}

export class DocumentService {
  private megaStorageService: megaStorage.MegaStorageService;
  private logService: LogService;

  constructor(megaStorageService: MegaStorageService, logService: LogService) {
    this.megaStorageService = megaStorageService;
    this.logService = logService;
  }

  /**
   * Détermine le type de document basé sur le nom du fichier et éventuellement le type MIME
   * @param fileName - Nom du fichier avec extension
   * @param mimeType - Type MIME optionnel
   * @returns Type de document standardisé
   */
  private getDocumentTypeFromFile(fileName: string, mimeType?: string): string {
    const extension = fileName.split(".").pop()?.toLowerCase() || "";

    // Types basés sur l'extension du fichier
    const typeMapping: Record<string, string> = {
      // Documents
      pdf: "document",
      doc: "document",
      docx: "document",
      txt: "document",
      rtf: "document",
      odt: "document",

      // Feuilles de calcul
      xls: "spreadsheet",
      xlsx: "spreadsheet",
      csv: "spreadsheet",
      ods: "spreadsheet",

      // Présentations
      ppt: "presentation",
      pptx: "presentation",
      odp: "presentation",

      // Images
      jpg: "image",
      jpeg: "image",
      png: "image",
      gif: "image",
      bmp: "image",
      svg: "image",
      webp: "image",

      // Vidéos
      mp4: "video",
      avi: "video",
      mov: "video",
      wmv: "video",
      webm: "video",
      mkv: "video",

      // Audio
      mp3: "audio",
      wav: "audio",
      ogg: "audio",
      flac: "audio",
      aac: "audio",

      // Archives
      zip: "archive",
      rar: "archive",
      "7z": "archive",
      tar: "archive",
      gz: "archive",

      // Code
      js: "code",
      ts: "code",
      html: "code",
      css: "code",
      json: "code",
      xml: "code",
      py: "code",
      java: "code",
      cpp: "code",
      c: "code",
    };

    // Vérifier d'abord par extension
    if (typeMapping[extension]) {
      return typeMapping[extension];
    }

    // Fallback sur le MIME type si disponible
    if (mimeType) {
      if (mimeType.startsWith("image/")) return "image";
      if (mimeType.startsWith("video/")) return "video";
      if (mimeType.startsWith("audio/")) return "audio";
      if (mimeType.startsWith("text/")) return "document";
      if (mimeType.includes("pdf")) return "document";
      if (mimeType.includes("word")) return "document";
      if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
        return "spreadsheet";
      if (mimeType.includes("powerpoint") || mimeType.includes("presentation"))
        return "presentation";
    }

    // Par défaut
    return "document";
  }

  /**
   * Ajoute un tag basé sur le type de document
   * @param type - Type de document détecté
   * @param existingTags - Tags existants
   * @returns Tags mis à jour
   */
  private addTagFromType(type: string, existingTags: string = ""): string {
    const typeTagMapping: Record<string, string> = {
      document: "documents",
      spreadsheet: "documents",
      presentation: "documents",
      image: "images",
      video: "vidéos",
      audio: "audio",
      archive: "archives",
      code: "code",
      other: "autres",
    };

    const typeTag = typeTagMapping[type] || "autres";
    const tags = existingTags
      ? existingTags.split(",").map((t) => t.trim())
      : [];

    if (!tags.includes(typeTag)) {
      tags.push(typeTag);
    }

    return tags.join(",");
  }

  async createDocument(data: CreateDocumentData) {
    let fileId = "";
    let fileSize = 0;
    let fileBuffer: Buffer | undefined;

    // Résoudre l'ID utilisateur à partir de l'email si ownerId non fourni
    let ownerId = data.ownerId;
    if (!ownerId && data.ownerEmail) {
      const user = await prisma.user.findUnique({
        where: { email: data.ownerEmail },
      });
      if (!user) {
        throw new Error(
          `Aucun utilisateur trouvé avec l'email: ${data.ownerEmail}`
        );
      }
      ownerId = user.id;
    }
    if (!ownerId) {
      throw new Error("ownerId ou ownerEmail requis pour créer un document");
    }

    // Upload du fichier vers MEGA si fourni
    if (data.filePath) {
      const resolvedPath = path.resolve(data.filePath);
      const name = path.basename(resolvedPath);
      const mimeType = this.megaStorageService.getMimeType(
        name.split(".").pop() || ""
      );
      fileBuffer = fs.readFileSync(resolvedPath);
      fileId = await this.megaStorageService.uploadFile(
        name,
        mimeType,
        fileBuffer,
        data.testFolderId,
        ownerId
      );
      fileSize = fileBuffer.length;
    } else if (data.file) {
      fileBuffer = data.file.buffer;
      fileId = await this.megaStorageService.uploadFile(
        data.file.name,
        data.file.mimeType,
        fileBuffer,
        data.testFolderId,
        ownerId
      );
      fileSize = fileBuffer.length;
    }

    if (!fileBuffer) {
      throw new Error(
        "Aucun contenu de fichier fourni pour créer le document."
      );
    }

    // Calculer le hash du fichier
    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const document = await prisma.document.create({
      data: {
        name: data.name,
        type: data.type,
        size: fileSize,
        description: data.description,
        tags: this.addTagFromType(data.type, data.tags || ""),
        fileId,
        hash, // Ajout du hash
        ownerId: ownerId,
        // Placer le document dans le dossier cible si fourni
        folderId: data.folderId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Synchroniser les relations Tag <-> Document
    await this.syncDocumentTags(document.id, document.tags, ownerId);

    // Indexation d'un embedding basé métadonnées (asynchrone best-effort)
    // On ne bloque pas le flux utilisateur; l'échec n'empêche pas la création du doc
    void new EmbeddingGenerator()
      .generateForDocument(document.id)
      .catch(() => undefined);

    await this.logService.log({
      action: "DOCUMENT_CREATE",
      entity: "DOCUMENT",
      entityId: document.id,
      userId: ownerId,
      documentId: document.id,
      details: `Document créé: ${document.name} (${document.type})`,
    });

    return document;
  }

  async getDocumentById(id: string) {
    return prisma.document.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getDocumentByNameAndOwner(name: string, ownerEmail: string) {
    return prisma.document.findFirst({
      where: {
        name: name,
        owner: {
          email: ownerEmail,
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getDocumentByIdPrefix(idPrefix: string) {
    // Rechercher le premier document dont l'ID commence par le préfixe donné
    const documents = await prisma.document.findMany({
      where: {
        id: {
          startsWith: idPrefix,
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 1, // Ne prendre que le premier résultat
    });

    return documents.length > 0 ? documents[0] : null;
  }

  async getAllDocuments(
    skip = 0,
    take = 20,
    filters?: {
      type?: string;
      ownerId?: string;
      tags?: string[];
      tag?: string; // Tag unique pour compatibilité
      search?: string;
    }
  ) {
    const where: Record<string, unknown> = {};

    if (filters?.type) where.type = filters.type;
    if (filters?.ownerId) where.ownerId = filters.ownerId;

    // Gérer les tags multiples ou un tag unique
    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    } else if (filters?.tag) {
      // Filtrage par tag unique - rechercher dans la chaîne de tags
      where.tags = { contains: filters.tag };
    } else {
      // PAR DÉFAUT : exclure les documents archivés si aucun tag spécifique n'est demandé
      where.NOT = {
        tags: { contains: "archived" },
      };
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return prisma.document.findMany({
      where,
      skip,
      take,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getDocumentCount(filters?: {
    type?: string;
    ownerId?: string;
    tags?: string[];
    tag?: string; // Tag unique pour compatibilité
    search?: string;
  }) {
    const where: Record<string, unknown> = {};

    if (filters?.type) where.type = filters.type;
    if (filters?.ownerId) where.ownerId = filters.ownerId;

    // Gérer les tags multiples ou un tag unique
    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    } else if (filters?.tag) {
      // Filtrage par tag unique - rechercher dans la chaîne de tags
      where.tags = { contains: filters.tag };
    } else {
      // PAR DÉFAUT : exclure les documents archivés si aucun tag spécifique n'est demandé
      where.NOT = {
        tags: { contains: "archived" },
      };
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return prisma.document.count({
      where,
    });
  }

  async getUserDocuments(ownerId: string, skip = 0, take = 20) {
    return prisma.document.findMany({
      where: { ownerId },
      skip,
      take,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getFavoriteDocuments(ownerId: string) {
    return prisma.document.findMany({
      where: {
        ownerId,
        isFavorite: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateDocument(id: string, data: UpdateDocumentData, userId: string) {
    const updateData: Partial<UpdateDocumentData & { modifiedAt: Date }> = {
      ...data,
      tags: data.tags
        ? (Array.isArray(data.tags) ? data.tags.join(",") : data.tags)
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .join(",")
        : undefined,
      modifiedAt: new Date(),
    };

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (updateData.tags !== undefined) {
      // ownerId dans l'entité mise à jour (champ non sélectionné explicitement dans include mais présent sur document)
      const ownerIdForTags: string =
        (document as any).ownerId || document.owner?.id; // eslint-disable-line @typescript-eslint/no-explicit-any
      await this.syncDocumentTags(id, updateData.tags || "", ownerIdForTags);
    }

    await this.logService.log({
      action: "DOCUMENT_UPDATE",
      entity: "DOCUMENT",
      entityId: id,
      userId,
      documentId: id,
      details: `Document mis à jour: ${document.name} (${Object.keys(data).join(
        ", "
      )})`,
    });

    // Réindexation embedding (asynchrone, best-effort)
    if (
      updateData.name !== undefined ||
      updateData.type !== undefined ||
      updateData.description !== undefined ||
      updateData.tags !== undefined
    ) {
      void new EmbeddingGenerator()
        .generateForDocument(id)
        .catch(() => undefined);
    }

    return document;
  }

  /**
   * Met à jour uniquement le fileId d'un document et journalise l'opération
   */
  async updateDocumentFileId(
    id: string,
    newFileId: string,
    userId: string,
    reason?: string
  ) {
    const updated = await prisma.document.update({
      where: { id },
      data: { fileId: newFileId, modifiedAt: new Date() },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    await this.logService.log({
      action: "DOCUMENT_UPDATE",
      entity: "DOCUMENT",
      entityId: id,
      userId,
      documentId: id,
      details: `fileId réconcilié -> ${newFileId}${reason ? ` (${reason})` : ""}`,
    });

    return updated;
  }

  /**
   * Synchronise la table de jonction DocumentTag avec la chaîne CSV
   */
  private async syncDocumentTags(
    documentId: string,
    csv: string,
    ownerId: string
  ) {
    const tagNames = Array.from(
      new Set(
        csv
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      )
    );
    if (tagNames.length === 0) {
      // Supprimer tous les liens existants si aucun tag
      await prisma.documentTag.deleteMany({ where: { documentId } });
      return;
    }
    const existingLinks = await prisma.documentTag.findMany({
      where: { documentId },
      include: { tag: true },
    });
    const existingTagMap = new Map<string, (typeof existingLinks)[number]>(
      existingLinks.map((l) => [l.tag.name, l])
    );

    // Créer les tags manquants et liens
    for (const name of tagNames) {
      if (!existingTagMap.has(name)) {
        const tag = await prisma.tag.upsert({
          where: { userId_name: { userId: ownerId, name } },
          update: {},
          create: { userId: ownerId, name },
        });
        await prisma.documentTag.create({
          data: { documentId, tagId: tag.id },
        });
      }
    }
    // Supprimer les liens obsolètes
    for (const [name, link] of existingTagMap.entries()) {
      if (!tagNames.includes(name)) {
        await prisma.documentTag.delete({
          where: { documentId_tagId: { documentId, tagId: link.tagId } },
        });
      }
    }
  }

  async toggleFavorite(id: string, userId: string) {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new Error("Document non trouvé");
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        isFavorite: !document.isFavorite,
        modifiedAt: new Date(),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await this.logService.log({
      action: updated.isFavorite ? "DOCUMENT_FAVORITE" : "DOCUMENT_UNFAVORITE",
      entity: "DOCUMENT",
      entityId: id,
      userId,
      documentId: id,
      details: `Document ${
        updated.isFavorite ? "ajouté aux" : "retiré des"
      } favoris: ${updated.name}`,
    });

    return updated;
  }

  async deleteDocument(id: string, userId: string, folderId?: string) {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new Error("Document non trouvé");
    }

    // Enregistrer le log AVANT la suppression pour éviter les violations de contrainte
    await this.logService.log({
      action: "DOCUMENT_DELETE",
      entity: "DOCUMENT",
      entityId: id,
      userId,
      documentId: id,
      details: `Document supprimé: ${document.name}`,
    });

    // Suppression du fichier sur MEGA
    if (document.fileId) {
      try {
        await this.megaStorageService.deleteFile(
          document.fileId,
          document.ownerId,
          folderId
        );
        console.log(`🗑️ Fichier MEGA supprimé: ${document.fileId}`);
      } catch (error) {
        console.warn(
          `⚠️ Impossible de supprimer le fichier MEGA (${document.fileId}): ${
            error instanceof Error ? error.message : error
          }`
        );
        console.warn(
          `💡 Le document sera supprimé de la base de données même si le fichier MEGA est inaccessible.`
        );
      }
    }

    // Suppression du document dans la base de données
    await prisma.document.delete({
      where: { id },
    });

    return { message: "Document supprimé avec succès" };
  }

  async downloadDocument(id: string, userId: string) {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new Error("Document non trouvé");
    }

    if (!document.fileId) {
      throw new Error("Aucun fichier associé à ce document");
    }

    const fileBuffer = await this.megaStorageService.downloadFile(
      document.fileId,
      document.ownerId
    );

    await this.logService.log({
      action: "DOCUMENT_DOWNLOAD",
      entity: "DOCUMENT",
      entityId: id,
      userId,
      documentId: id,
      details: `Document téléchargé: ${document.name}`,
    });

    return {
      buffer: fileBuffer,
      filename: document.name,
      mimeType: this.getMimeTypeFromType(document.type),
    };
  }

  async getDocumentUrl(id: string, userId: string) {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new Error("Document non trouvé");
    }

    if (!document.fileId) {
      throw new Error("Aucun fichier associé à ce document");
    }

    const url = await this.megaStorageService.getFileUrl(
      document.fileId,
      document.ownerId
    );

    await this.logService.log({
      action: "DOCUMENT_DOWNLOAD",
      entity: "DOCUMENT",
      entityId: id,
      userId,
      documentId: id,
      details: `URL temporaire générée pour: ${document.name}`,
    });

    return { url, expiresIn: "1 heure" };
  }

  async getDocumentStats() {
    const stats = await prisma.document.groupBy({
      by: ["type"],
      _count: {
        id: true,
      },
      _sum: {
        size: true,
      },
    });

    const totalDocuments = await prisma.document.count();
    const totalSize = await prisma.document.aggregate({
      _sum: { size: true },
    });

    return {
      totalDocuments,
      totalSize: totalSize._sum.size || 0,
      byType: stats,
    };
  }

  /**
   * Synchronise les fichiers de MEGA avec la base de données.
   * Les fichiers existants dans MEGA mais absents de la DB sont ajoutés.
   * @param defaultOwnerId - L'ID de l'utilisateur propriétaire par défaut pour les nouveaux documents.
   * @param folderId - ID du dossier MEGA à synchroniser (optionnel, par défaut tout le compte)
   */
  async synchronizeMegaFiles(defaultOwnerId: string, folderId?: string) {
    if (process.env.NODE_ENV !== "production")
      console.debug(`🔄 Sync MEGA start${folderId ? " (scope dossier)" : ""}`);
    const megaFiles = await this.megaStorageService.getAllFilesWithContent(
      defaultOwnerId,
      folderId
    );
    if (process.env.NODE_ENV !== "production")
      console.debug(`🔍 MEGA fichiers: ${megaFiles.length}`);

    const allDocuments = await prisma.document.findMany({
      select: {
        id: true,
        hash: true,
        name: true,
        tags: true,
      },
    });
    if (process.env.NODE_ENV !== "production")
      console.debug(`📄 DB documents: ${allDocuments.length}`);

    const newDocuments: Array<{
      id: string;
      name: string;
      type: string;
      size: number;
      description?: string | null;
      tags: string;
      fileId: string;
      hash: string;
      ownerId: string;
      isFavorite: boolean;
      createdAt: Date;
      modifiedAt: Date;
    }> = [];
    const updatedDocuments: Array<{
      id: string;
      name: string;
      type: string;
      size: number;
      description?: string | null;
      tags: string;
      fileId: string;
      hash: string;
      ownerId: string;
      isFavorite: boolean;
      createdAt: Date;
      modifiedAt: Date;
    }> = [];

    for (const megaFile of megaFiles) {
      const hash = crypto
        .createHash("sha256")
        .update(megaFile.buffer)
        .digest("hex");
      if (process.env.NODE_ENV !== "production")
        console.debug(
          `   • Fichier ${megaFile.name} (${hash.substring(0, 12)}...)`
        );

      // Chercher si un document avec ce hash existe déjà
      const existingDocument = allDocuments.find((doc) => doc.hash === hash);

      if (existingDocument) {
        if (process.env.NODE_ENV !== "production")
          console.debug(`   ↺ Update ${existingDocument.name}`);

        // Mise à jour du document existant avec détection de type
        const detectedType = this.getDocumentTypeFromFile(
          megaFile.name,
          megaFile.mimeType
        );

        const updatedDocument = await prisma.document.update({
          where: { id: existingDocument.id },
          data: {
            name: megaFile.name, // Mettre à jour le nom si il a changé
            type: detectedType, // Mettre à jour le type
            tags: this.addTagFromType(detectedType, existingDocument.tags), // Ajouter les tags basés sur le type
            size: megaFile.size, // Mettre à jour la taille
            fileId: megaFile.fileId, // Mettre à jour le fileId MEGA
            modifiedAt: new Date(),
          },
        });

        await this.logService.log({
          action: "DOCUMENT_SYNC",
          entity: "DOCUMENT",
          entityId: existingDocument.id,
          userId: defaultOwnerId,
          details: `Document mis à jour lors de la synchronisation MEGA: ${megaFile.name}`,
        });

        updatedDocuments.push(updatedDocument);
      } else {
        if (process.env.NODE_ENV !== "production")
          console.debug(`   ✨ Nouveau ${megaFile.name}`);

        // Création d'un nouveau document avec détection de type appropriée
        const detectedType = this.getDocumentTypeFromFile(
          megaFile.name,
          megaFile.mimeType
        );

        const document = await prisma.document.create({
          data: {
            name: megaFile.name,
            type: detectedType,
            size: megaFile.size, // Utiliser la taille du buffer retournée par MEGA
            description: "Document synchronisé depuis MEGA",
            tags: this.addTagFromType(detectedType, "synced"),
            fileId: megaFile.fileId,
            hash: hash,
            ownerId: defaultOwnerId,
          },
        });

        await this.logService.log({
          action: "DOCUMENT_SYNC",
          entity: "DOCUMENT",
          entityId: document.id,
          userId: defaultOwnerId,
          details: `Nouveau document synchronisé depuis MEGA: ${document.name}`,
        });

        newDocuments.push(document);
      }
    }

    if (process.env.NODE_ENV !== "production")
      console.debug(
        `🎉 Sync ok +${newDocuments.length} / ~${updatedDocuments.length}`
      );
    return {
      syncedCount: newDocuments.length,
      updatedCount: updatedDocuments.length,
      newDocuments,
      updatedDocuments,
    };
  }

  /**
   * Convertit un type de document en type MIME
   * @param type Type de document
   * @returns Type MIME correspondant
   */
  private getMimeTypeFromType(type: string): string {
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      bmp: "image/bmp",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      txt: "text/plain",
      zip: "application/zip",
      rar: "application/x-rar-compressed",
    };

    return mimeTypes[type.toLowerCase()] || "application/octet-stream";
  }
}
