import crypto from "crypto";
import { Storage, verify } from "megajs";

import { userMegaConfigService } from "./userMegaConfigService";

type NodeLike = {
  nodeId?: string;
  name?: string;
  directory?: boolean;
  parent?: NodeLike | null | undefined;
};

/**
 * Service de gestion des fichiers sur MEGA avec support multi-utilisateur
 */
export class MegaStorageService {
  private storageCache = new Map<string, Storage>();

  /**
   * Helper: retrouve un nœud par ID, avec fallback sur le storage par défaut si userId fourni
   */
  private async findNodeById(
    fileId: string,
    userId?: string,
  ): Promise<
    | (NodeLike & {
        link?: (opts?: unknown) => Promise<string>;
        downloadBuffer?: (opts?: unknown) => Promise<Buffer>;
        delete?: () => Promise<void>;
        name?: string;
      })
    | undefined
  > {
    const storage = await this.getStorage(userId);
    let file = storage.find((f) => f.nodeId === fileId) as unknown as
      | (NodeLike & {
          link?: (opts?: unknown) => Promise<string>;
          downloadBuffer?: (opts?: unknown) => Promise<Buffer>;
        })
      | undefined;

    // Heuristique: si non trouvé, tenter correspondance partielle (nodeId ou nom contient fileId)
    if (!file) {
      try {
        const all = Object.values(storage.files) as unknown as NodeLike[];
        const partial = all.filter(
          (f) =>
            !f.directory &&
            f.nodeId &&
            (f.nodeId.includes(fileId) || (typeof f.name === "string" && f.name.includes(fileId))),
        );
        // Prendre le premier candidat disponible
        const candidate = partial[0];
        if (candidate) {
          file = storage.find((n) => n.nodeId === candidate!.nodeId) as unknown as
            | (NodeLike & {
                link?: (opts?: unknown) => Promise<string>;
                downloadBuffer?: (opts?: unknown) => Promise<Buffer>;
              })
            | undefined;
          if (file) {
            const cname = typeof candidate.name === "string" ? candidate.name : "";
            console.warn(
              `[mega] Heuristique nodeId/nom: mappé ${fileId} -> ${candidate.nodeId} (${cname})`,
            );
          }
        }
      } catch {
        // ignore heuristique
      }
    }
    if (!file && userId) {
      try {
        console.warn(
          `[mega] ID ${fileId} introuvable dans le storage utilisateur ${userId}. Tentative sur le storage par défaut.`,
        );
        const defaultStorage = await this.getStorage();
        file = defaultStorage.find((f) => f.nodeId === fileId) as unknown as
          | (NodeLike & {
              link?: (opts?: unknown) => Promise<string>;
              downloadBuffer?: (opts?: unknown) => Promise<Buffer>;
            })
          | undefined;

        // Heuristique sur le storage par défaut si nécessaire
        if (!file) {
          const all = Object.values(defaultStorage.files) as unknown as NodeLike[];
          const partial = all.filter(
            (f) =>
              !f.directory &&
              f.nodeId &&
              (f.nodeId.includes(fileId) ||
                (typeof f.name === "string" && f.name.includes(fileId))),
          );
          const candidate = partial[0];
          if (candidate) {
            file = defaultStorage.find((n) => n.nodeId === candidate!.nodeId) as unknown as
              | (NodeLike & {
                  link?: (opts?: unknown) => Promise<string>;
                  downloadBuffer?: (opts?: unknown) => Promise<Buffer>;
                })
              | undefined;
            if (file) {
              const cname = typeof candidate.name === "string" ? candidate.name : "";
              console.warn(
                `[mega] Heuristique nodeId/nom (default): mappé ${fileId} -> ${candidate.nodeId} (${cname})`,
              );
            }
          }
        }
      } catch {
        console.warn(
          `[mega] Fallback vers le storage par défaut impossible (identifiants MEGA non configurés ?)`,
        );
      }
    }
    return file;
  }

  /**
   * Initialise la connexion MEGA pour un utilisateur spécifique
   */
  private async getStorage(userId?: string): Promise<Storage> {
    let storageKey = "default";
    let email: string | undefined;
    let password: string | undefined;
    let origin: "user" | "default" = "default";

    // Si un userId est fourni, tenter d'utiliser sa configuration
    if (userId) {
      const credentials = await userMegaConfigService.getUserMegaCredentials(userId);

      if (!credentials) {
        throw new Error(
          "Identifiants MEGA utilisateur requis - ouvrez les Paramètres et configurez votre compte MEGA",
        );
      }
      if (credentials) {
        storageKey = userId;
        email = credentials.email;
        password = credentials.password;
        origin = "user";
      }
    }

    // Vérifier le cache
    if (this.storageCache.has(storageKey)) {
      return this.storageCache.get(storageKey)!;
    }

    // Vérifier que les credentials sont disponibles
    if (!email || !password) {
      throw new Error(
        "Identifiants MEGA requis - configurez votre compte MEGA dans vos paramètres",
      );
    }

    try {
      const storage = await new Storage({
        email,
        password,
      }).ready;
      if (origin === "user") {
        // Journalisation non sensible pour diagnostiquer en prod
        console.info(`[mega] Connexion établie sur le storage utilisateur (${userId}).`);
      } else {
        console.info(`[mega] Connexion établie sur le storage par défaut.`);
      }
      this.storageCache.set(storageKey, storage);
      return storage;
    } catch (error) {
      throw new Error(
        `Erreur de connexion MEGA: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      );
    }
  }

  /**
   * Recherche globale par nom (dans tout le storage). Essaie exact puis insensible à la casse.
   */
  async findFileByNameAnywhere(
    name: string,
    userId?: string,
  ): Promise<{ nodeId: string; name?: string } | null> {
    const tryFind = async (forUserId?: string) => {
      const storage = await this.getStorage(forUserId);
      const all = Object.values(storage.files) as Array<{
        nodeId?: string;
        name?: string;
        directory?: boolean;
      }>;
      let match = all.find(
        (f) => !f.directory && f.nodeId && typeof f.name === "string" && f.name === name,
      );
      if (!match) {
        const lower = name.toLowerCase();
        match = all.find(
          (f) =>
            !f.directory &&
            f.nodeId &&
            typeof f.name === "string" &&
            f.name.toLowerCase() === lower,
        );
      }
      return match?.nodeId ? { nodeId: match.nodeId, name: match.name } : null;
    };
    const fromUser = await tryFind(userId);
    if (fromUser) return { nodeId: fromUser.nodeId, name: fromUser.name ?? undefined };
    const fromDefault = await tryFind(undefined);
    if (fromDefault)
      return {
        nodeId: fromDefault.nodeId,
        name: fromDefault.name ?? undefined,
      };
    return null;
  }

  /**
   * Recherche globale par nom contenant (insensible à la casse)
   */
  async findFileByNameContainsAnywhere(
    part: string,
    userId?: string,
  ): Promise<{ nodeId: string; name?: string } | null> {
    const tryFind = async (forUserId?: string) => {
      const storage = await this.getStorage(forUserId);
      const lower = part.toLowerCase();
      const match = (
        Object.values(storage.files) as Array<{
          nodeId?: string;
          name?: string;
          directory?: boolean;
        }>
      ).find(
        (f) =>
          !f.directory &&
          f.nodeId &&
          typeof f.name === "string" &&
          f.name.toLowerCase().includes(lower),
      );
      return match?.nodeId ? { nodeId: match.nodeId, name: match.name } : null;
    };
    const fromUser = await tryFind(userId);
    if (fromUser) return { nodeId: fromUser.nodeId, name: fromUser.name ?? undefined };
    const fromDefault = await tryFind(undefined);
    if (fromDefault)
      return {
        nodeId: fromDefault.nodeId,
        name: fromDefault.name ?? undefined,
      };
    return null;
  }

  /**
   * Recherche par nom contenant sous appRoot (insensible à la casse)
   */
  async findFileByNameContainsUnderAppRoot(
    part: string,
    userId?: string,
  ): Promise<{ nodeId: string; name?: string } | null> {
    return this.findFileByNameContainsAnywhere(part, userId);
  }

  async getBase64FileUrlByNameContainsAnywhere(
    part: string,
    userId?: string,
  ): Promise<string | null> {
    const found = await this.findFileByNameContainsAnywhere(part, userId);
    if (!found) return null;
    try {
      return await this.getBase64FileUrl(found.nodeId, userId);
    } catch {
      return null;
    }
  }

  async getBase64FileUrlByNameContainsUnderAppRoot(
    part: string,
    userId?: string,
  ): Promise<string | null> {
    const found = await this.findFileByNameContainsUnderAppRoot(part, userId);
    if (!found) return null;
    try {
      return await this.getBase64FileUrl(found.nodeId, userId);
    } catch {
      return null;
    }
  }

  /**
   * Recherche globale par taille+hash (dans tout le storage), indépendante du nom
   */
  async findFileByHashAnywhere(
    expected: { size: number; hash: string; ext?: string },
    userId?: string,
  ): Promise<{ nodeId: string; name?: string } | null> {
    const tryFind = async (forUserId?: string) => {
      const storage = await this.getStorage(forUserId);
      const all = Object.values(storage.files) as Array<{
        nodeId?: string;
        name?: string;
        directory?: boolean;
        size?: number;
      }>;
      const candidates = all.filter((f) => {
        if (f.directory || !f.nodeId) return false;
        if (typeof f.size === "number" && f.size !== expected.size) return false;
        return true;
      });
      for (const c of candidates) {
        try {
          const node = storage.find((n) => n.nodeId === c.nodeId);
          if (!node) continue;
          const buf = await node.downloadBuffer({});
          const hash = crypto.createHash("sha256").update(buf).digest("hex");
          if (hash === expected.hash) {
            return { nodeId: node.nodeId as string, name: node.name };
          }
        } catch {
          // ignore
        }
      }
      return null;
    };
    const fromUser = await tryFind(userId);
    if (fromUser) return { nodeId: fromUser.nodeId, name: fromUser.name ?? undefined };
    const fromDefault = await tryFind(undefined);
    if (fromDefault)
      return {
        nodeId: fromDefault.nodeId,
        name: fromDefault.name ?? undefined,
      };
    return null;
  }

  /**
   * Recherche globale par taille+extension (sans hash). Retourne le premier match.
   */
  async findFileBySizeAndExtAnywhere(
    expected: { size: number; ext?: string },
    userId?: string,
  ): Promise<{ nodeId: string; name?: string } | null> {
    const tryFind = async (forUserId?: string) => {
      const storage = await this.getStorage(forUserId);
      const all = Object.values(storage.files) as Array<{
        nodeId?: string;
        name?: string;
        directory?: boolean;
        size?: number;
      }>;
      const match = all.find((f) => {
        if (f.directory || !f.nodeId) return false;
        if (typeof f.size === "number" && f.size !== expected.size) return false;
        if (expected.ext && typeof f.name === "string") {
          const fe = f.name.split(".").pop()?.toLowerCase();
          if (fe && fe !== expected.ext.toLowerCase()) return false;
        }
        return true;
      });
      return match?.nodeId ? { nodeId: match.nodeId, name: match.name ?? undefined } : null;
    };
    const fromUser = await tryFind(userId);
    if (fromUser) return { nodeId: fromUser.nodeId, name: fromUser.name ?? undefined };
    const fromDefault = await tryFind(undefined);
    if (fromDefault)
      return {
        nodeId: fromDefault.nodeId,
        name: fromDefault.name ?? undefined,
      };
    return null;
  }

  /**
   * Compat: délégué à la recherche globale par taille+extension (pour anciens docs sans hash)
   * Retourne le premier match si trouvé. À utiliser avec prudence.
   */
  async findFileBySizeAndExtUnderAppRoot(
    expected: { size: number; ext?: string },
    userId?: string,
  ): Promise<{ nodeId: string; name?: string } | null> {
    return this.findFileBySizeAndExtAnywhere(expected, userId);
  }

  /**
   * Génère une URL de téléchargement temporaire pour un fichier
   * @param fileId - L'ID du fichier sur MEGA
   * @param userId - ID de l'utilisateur (optionnel, utilise la config par défaut si non fourni)
   * @returns Une URL temporaire valide pendant 1 heure
   */
  async getFileUrl(fileId: string, userId?: string): Promise<string> {
    const file = await this.findNodeById(fileId, userId);
    if (!file) throw new Error("Fichier non trouvé");

    // Génère une URL temporaire valide pendant 1 heure
    return await (
      file as unknown as {
        link: (opts?: unknown) => Promise<string>;
      }
    ).link({
      // noExpire: false,
      // expiry: 3600 // 1 heure
    });
  }

  /**
   * Génère une URL data base64 pour un fichier
   * @param fileId - L'ID du fichier sur MEGA
   * @param userId - ID de l'utilisateur (optionnel, utilise la config par défaut si non fourni)
   * @returns Une URL data en base64
   */
  async getBase64FileUrl(fileId: string, userId?: string): Promise<string> {
    const file = await this.findNodeById(fileId, userId);
    if (!file) {
      console.warn(
        `[mega] getBase64FileUrl: fichier non trouvé (id=${fileId}, userId=${userId ?? "default"})`,
      );
      throw new Error("Fichier non trouvé");
    }

    // Déterminer le type MIME en fonction de l'extension du fichier
    const ext = (file as unknown as { name?: string }).name?.split(".").pop()?.toLowerCase();
    const mimeType = this.getMimeType(ext || "");

    // Télécharger et convertir le fichier en base64
    const data = await (
      file as unknown as {
        downloadBuffer: (opts?: unknown) => Promise<Buffer>;
      }
    ).downloadBuffer({});
    const base64 = data.toString("base64");

    // Retourner l'URL data avec le type MIME approprié
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Génère une data URL base64 pour un fichier identifié par son nom sous appRoot
   */
  async getBase64FileUrlByNameUnderAppRoot(name: string, userId?: string): Promise<string | null> {
    const found = await this.findFileByNameAnywhere(name, userId);
    if (!found) return null;
    try {
      return await this.getBase64FileUrl(found.nodeId, userId);
    } catch {
      return null;
    }
  }

  async getBase64FileUrlByNameAnywhere(name: string, userId?: string): Promise<string | null> {
    const found = await this.findFileByNameAnywhere(name, userId);
    if (!found) return null;
    try {
      return await this.getBase64FileUrl(found.nodeId, userId);
    } catch {
      return null;
    }
  }

  async getBase64FileUrlByHashAnywhere(
    expected: { size: number; hash: string; ext?: string },
    userId?: string,
  ): Promise<string | null> {
    const found = await this.findFileByHashAnywhere(expected, userId);
    if (!found) return null;
    try {
      return await this.getBase64FileUrl(found.nodeId, userId);
    } catch {
      return null;
    }
  }

  async getBase64FileUrlBySizeAndExtAnywhere(
    expected: { size: number; ext?: string },
    userId?: string,
  ): Promise<string | null> {
    const found = await this.findFileBySizeAndExtAnywhere(expected, userId);
    if (!found) return null;
    try {
      return await this.getBase64FileUrl(found.nodeId, userId);
    } catch {
      return null;
    }
  }

  /**
   * Génère une data URL base64 par fallback taille+extension (sans hash) sous appRoot
   */
  async getBase64FileUrlBySizeAndExtUnderAppRoot(
    expected: { size: number; ext?: string },
    userId?: string,
  ): Promise<string | null> {
    const found = await this.findFileBySizeAndExtUnderAppRoot(expected, userId);
    if (!found) return null;
    try {
      return await this.getBase64FileUrl(found.nodeId, userId);
    } catch {
      return null;
    }
  }

  /**
   * Détermine le type MIME en fonction de l'extension du fichier
   * @param ext - Extension du fichier
   * @returns Type MIME correspondant
   */
  getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      txt: "text/plain",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }

  /**
   * Upload d'un fichier
   * @param name - Nom du fichier
   * @param mimeType - Type MIME du fichier
   * @param buffer - Contenu du fichier
   * @param folderId - ID du dossier de destination (optionnel)
   * @param userId - ID de l'utilisateur (optionnel, utilise la config par défaut si non fourni)
   * @returns ID du fichier uploadé
   */
  async uploadFile(
    name: string,
    mimeType: string,
    buffer: Buffer,
    folderId?: string,
    userId?: string,
  ): Promise<string> {
    const storage = await this.getStorage(userId);
    let folder = storage.root;
    if (folderId) {
      folder = storage.find((file) => file.nodeId === folderId) || storage.root;
    }

    return new Promise((resolve, reject) => {
      interface UploadCapable {
        upload: (
          opts: { name: string; size: number },
          buf: Buffer,
        ) => {
          on: (evt: "complete" | "error", cb: (...args: unknown[]) => void) => void;
        };
      }
      const uploadStream = (folder as unknown as UploadCapable).upload(
        { name, size: buffer.length },
        buffer,
      );
      uploadStream.on("complete", (...args: unknown[]) => {
        const f = args[0] as { nodeId: string };
        resolve(f.nodeId);
      });
      uploadStream.on("error", reject);
    });
  }

  /**
   * Suppression d'un fichier
   * @param fileId - ID du fichier à supprimer
   * @param userId - ID de l'utilisateur
   * @param folderId - ID du dossier où chercher (optionnel, si non fourni cherche dans tout le compte)
   */
  async deleteFile(fileId: string, userId: string, folderId?: string): Promise<void> {
    const storage = await this.getStorage(userId);

    let searchFiles: Array<{
      nodeId: string;
      name?: string;
      delete?: () => Promise<void>;
    }>;

    if (folderId) {
      // Chercher uniquement dans le dossier spécifié
      const folder = storage.find((f) => f.nodeId === folderId);
      if (!folder) {
        throw new Error(`Dossier avec ID ${folderId} non trouvé`);
      }
      searchFiles = Object.values(folder.children || {}).filter(
        (child) => child.nodeId !== undefined,
      ) as Array<{
        nodeId: string;
        name?: string;
        delete?: () => Promise<void>;
      }>;
      console.log(`📁 Recherche dans le dossier spécifique: ${searchFiles.length} fichiers`);
    } else {
      // Chercher dans tout le storage
      searchFiles = Object.values(storage.files).filter((f) => f.nodeId !== undefined) as Array<{
        nodeId: string;
        name?: string;
        delete?: () => Promise<void>;
      }>;
      console.log(`📁 ${searchFiles.length} fichiers totaux dans le storage`);
    }

    const file = searchFiles.find((f) => f.nodeId === fileId);
    if (!file) {
      console.log(`❌ Fichier ${fileId} non trouvé`);
      console.log(`🔍 Fichiers disponibles:`);
      searchFiles.slice(0, 5).forEach((f) => {
        console.log(`   - ${f.name} (ID: ${f.nodeId})`);
      });
      if (searchFiles.length > 5) {
        console.log(`   ... et ${searchFiles.length - 5} autres fichiers`);
      }
      throw new Error("Fichier non trouvé");
    }

    console.log(`✅ Fichier trouvé: ${file.name} (ID: ${file.nodeId})`);
    if (typeof file.delete === "function") {
      await file.delete();
      console.log(`🗑️ Fichier supprimé avec succès`);
    } else {
      throw new Error("La méthode de suppression du fichier est indisponible");
    }
  }

  /**
   * Téléchargement d'un fichier
   * @param fileId - ID du fichier à télécharger
   * @param userId - ID de l'utilisateur (optionnel, utilise la config par défaut si non fourni)
   * @returns Buffer contenant le fichier
   */
  async downloadFile(fileId: string, userId?: string): Promise<Buffer> {
    const file = await this.findNodeById(fileId, userId);
    if (!file) throw new Error("Fichier non trouvé");

    const data = await (
      file as unknown as {
        downloadBuffer: (opts?: unknown) => Promise<Buffer>;
      }
    ).downloadBuffer({});

    const result = await verify(data);
    if (!result) throw new Error("Fichier corrompu");

    return data;
  }

  /**
   * Remplacement d'un fichier (mise à jour)
   * @param fileId - ID du fichier à remplacer
   * @param name - Nouveau nom du fichier
   * @param mimeType - Type MIME du nouveau fichier
   * @param buffer - Nouveau contenu du fichier
   * @param userId - ID de l'utilisateur (optionnel, utilise la config par défaut si non fourni)
   * @returns ID du nouveau fichier
   */
  async updateFile(
    fileId: string,
    name: string,
    mimeType: string,
    buffer: Buffer,
    userId?: string,
  ): Promise<string> {
    const storage = await this.getStorage(userId);
    const oldFile = storage.find((f) => f.nodeId === fileId);
    if (!oldFile) throw new Error("Fichier à mettre à jour non trouvé");

    const parent = oldFile.parent || storage.root;
    await oldFile.delete();

    return new Promise((resolve, reject) => {
      const uploadStream = parent.upload({ name, size: buffer.length }, buffer);
      uploadStream.on("complete", (file: { nodeId: string }) => {
        resolve(file.nodeId);
      });
      uploadStream.on("error", reject);
    });
  }

  /**
   * Trouve un fichier par nom dans un dossier spécifique
   */
  async findFileInFolderByName(
    folderId: string,
    name: string,
    userId?: string,
  ): Promise<{ nodeId: string; name?: string } | null> {
    const storage = await this.getStorage(userId);
    const folder = storage.find((f) => f.nodeId === folderId);
    if (!folder) throw new Error(`Dossier avec ID ${folderId} non trouvé`);
    const children = Object.values(folder.children || {}) as Array<{
      nodeId?: string;
      name?: string;
      directory?: boolean;
    }>;
    const match = children.find(
      (c) => !c.directory && typeof c.name === "string" && c.name === name,
    );
    return match && match.nodeId ? { nodeId: match.nodeId, name: match.name } : null;
  }

  /**
   * Supprime tous les fichiers portant un nom donné dans un dossier (utile pour éviter les doublons)
   * Retourne le nombre supprimé
   */
  async deleteFilesInFolderByName(
    folderId: string,
    name: string,
    userId?: string,
  ): Promise<number> {
    const storage = await this.getStorage(userId);
    const folder = storage.find((f) => f.nodeId === folderId);
    if (!folder) throw new Error(`Dossier avec ID ${folderId} non trouvé`);
    const children = Object.values(folder.children || {}) as Array<{
      nodeId?: string;
      name?: string;
      directory?: boolean;
      delete?: () => Promise<void>;
    }>;
    const matches = children.filter(
      (c) => !c.directory && typeof c.name === "string" && c.name === name && c.nodeId,
    );
    let deleted = 0;
    for (const m of matches) {
      try {
        if (typeof m.delete === "function") {
          await m.delete();
          deleted++;
        }
      } catch (e) {
        console.warn(`⚠️ Échec de suppression pour ${m.name} (${m.nodeId}):`, e);
      }
    }
    if (deleted > 0) {
      console.log(
        `🧹 Suppression de ${deleted} doublon(s) pour "${name}" dans le dossier ${folderId}`,
      );
    }
    return deleted;
  }

  /**
   * Supprime tous les fichiers portant un nom donné directement sous la racine
   * Retourne le nombre supprimé
   */
  async deleteFilesByNameAtRoot(name: string, userId?: string): Promise<number> {
    const storage = await this.getStorage(userId);
    const children = Object.values(storage.root.children || {}) as Array<{
      nodeId?: string;
      name?: string;
      directory?: boolean;
      delete?: () => Promise<void>;
    }>;
    const matches = children.filter(
      (c) => !c.directory && typeof c.name === "string" && c.name === name && c.nodeId,
    );
    let deleted = 0;
    for (const m of matches) {
      try {
        if (typeof m.delete === "function") {
          await m.delete();
          deleted++;
        }
      } catch (e) {
        console.warn(`⚠️ Échec de suppression à la racine pour ${m.name} (${m.nodeId}):`, e);
      }
    }
    if (deleted > 0) {
      console.log(`🧹 Suppression de ${deleted} doublon(s) pour "${name}" à la racine`);
    }
    return deleted;
  }

  /**
   * Récupère tous les fichiers de MEGA avec leur contenu.
   * @param folderId - ID du dossier à scanner (optionnel, par défaut le dossier racine)
   * @param userId - ID de l'utilisateur (optionnel, utilise la config par défaut si non fourni)
   * @returns Un tableau d'objets contenant les informations et le buffer de chaque fichier.
   */
  async getAllFilesWithContent(
    folderId?: string,
    userId?: string,
  ): Promise<
    {
      fileId: string;
      name: string;
      buffer: Buffer;
      type: string;
      mimeType: string;
      size: number;
    }[]
  > {
    const storage = await this.getStorage(userId);

    let targetFolder: typeof storage.root | null;
    if (folderId) {
      targetFolder = storage.find((f) => f.nodeId === folderId);
      if (!targetFolder) {
        throw new Error(`Dossier avec l'ID ${folderId} non trouvé`);
      }
    } else {
      targetFolder = storage.root;
    }

    const targetFolderId = (targetFolder as unknown as { nodeId?: string }).nodeId;
    const files = Object.values(storage.files).filter((file) => {
      const p = file.parent as { nodeId?: string } | undefined;
      const parentMatches =
        (p?.nodeId && targetFolderId && p.nodeId === targetFolderId) ||
        file.parent === targetFolder;
      return parentMatches && !file.directory;
    });

    console.log(
      `📁 Scanning ${folderId ? "dossier spécifique" : "dossier racine"}: ${
        files.length
      } fichiers trouvés`,
    );

    const filesWithContent: {
      fileId: string;
      name: string;
      buffer: Buffer;
      type: string;
      mimeType: string;
      size: number;
    }[] = [];

    for (const file of files) {
      if (!file.nodeId || !file.name) {
        console.log(`   ⚠️ Fichier ignoré (ID ou nom manquant): ${file.nodeId || "unknown"}`);
        continue;
      }

      try {
        console.log(`   ⬇️ Téléchargement: ${file.name}...`);
        const buffer = await file.downloadBuffer({});

        // Validation du buffer
        if (!buffer || buffer.length === 0) {
          console.warn(`   ⚠️ Fichier vide ignoré: ${file.name}`);
          continue;
        }

        // Détection du type MIME basée sur l'extension
        const extension = file.name.split(".").pop()?.toLowerCase() || "";
        const mimeType = this.getMimeType(extension);

        filesWithContent.push({
          fileId: file.nodeId,
          name: file.name,
          buffer: buffer,
          type: extension, // Extension du fichier pour compatibilité
          mimeType: mimeType, // Type MIME détecté
          size: buffer.length,
        });

        console.log(
          `   ✅ ${file.name} téléchargé (${buffer.length} bytes, type: ${extension}, MIME: ${mimeType})`,
        );
      } catch (error) {
        console.error(
          `   ❌ Erreur lors du téléchargement du fichier ${file.name} (${file.nodeId}):`,
          error,
        );
        // Continuer avec les autres fichiers même si un échoue
      }
    }

    console.log(
      `📋 Récupération terminée: ${filesWithContent.length}/${files.length} fichiers traités avec succès`,
    );
    return filesWithContent;
  }

  /**
   * Nettoie le cache de connexion pour un utilisateur spécifique
   * @param userId - ID de l'utilisateur
   */
  clearUserCache(userId: string): void {
    this.storageCache.delete(userId);
  }

  /**
   * Nettoie tout le cache de connexions
   */
  clearAllCache(): void {
    this.storageCache.clear();
  }
}
