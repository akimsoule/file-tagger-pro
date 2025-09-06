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
  private defaultEmail = process.env.MEGA_EMAIL;
  private defaultPassword = process.env.MEGA_PASSWORD;
  private appRootName = process.env.MEGA_APP_ROOT_NAME || "app.file-tagger-pro";

  /**
   * Initialise la connexion MEGA pour un utilisateur spécifique
   */
  private async getStorage(userId?: string): Promise<Storage> {
    let storageKey = "default";
    let email = this.defaultEmail;
    let password = this.defaultPassword;

    // Si un userId est fourni, utiliser sa configuration
    if (userId) {
      const credentials = await userMegaConfigService.getUserMegaCredentials(
        userId
      );
      if (credentials) {
        storageKey = userId;
        email = credentials.email;
        password = credentials.password;
      }
    }

    // Vérifier le cache
    if (this.storageCache.has(storageKey)) {
      return this.storageCache.get(storageKey)!;
    }

    // Vérifier que les credentials sont disponibles
    if (!email || !password) {
      throw new Error(
        "Identifiants MEGA requis - configurez votre compte MEGA dans vos paramètres"
      );
    }

    try {
      const storage = await new Storage({
        email,
        password,
      }).ready;

      this.storageCache.set(storageKey, storage);
      return storage;
    } catch (error) {
      throw new Error(
        `Erreur de connexion MEGA: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    }
  }

  /**
   * Retourne (ou crée) le dossier racine de l'application sous le compte MEGA
   * Par défaut: "app.file-tagger-pro" (overridable via MEGA_APP_ROOT_NAME)
   */
  private async getAppRootFolder(userId?: string): Promise<{ nodeId: string }> {
    const storage = await this.getStorage(userId);
    type MegaNode = { nodeId?: string; name?: string; directory?: boolean };
    const existing = (Object.values(storage.files) as MegaNode[]).find(
      (n) =>
        !!n.directory &&
        typeof n.name === "string" &&
        n.name.toLowerCase() === this.appRootName.toLowerCase()
    );
    if (existing && existing.nodeId) return { nodeId: existing.nodeId };

    const created = await storage.root.mkdir(this.appRootName);
    if (!created?.nodeId)
      throw new Error(
        `Impossible de créer le dossier racine ${this.appRootName}`
      );
    return { nodeId: created.nodeId };
  }

  /**
   * Trouve un fichier par nom sous le dossier appRoot (recherche récursive via chaîne de parents)
   */
  private async findFileByNameUnderAppRoot(
    name: string,
    userId?: string
  ): Promise<{ nodeId: string; name?: string } | null> {
    const tryFind = async (forUserId?: string) => {
      const storage = await this.getStorage(forUserId);
      const appRef = await this.getAppRootFolder(forUserId);
      const appRoot = (storage.find((f) => f.nodeId === appRef.nodeId) ||
        storage.root) as unknown as NodeLike;
      const appRootId = appRef.nodeId;

      const isDescendantOfAppRoot = (
        node: NodeLike | null | undefined
      ): boolean => {
        let cur = node?.parent as NodeLike | null | undefined;
        while (cur) {
          if (cur.nodeId && cur.nodeId === appRootId) return true;
          cur = cur.parent as NodeLike | null | undefined;
        }
        // Si aucun parent n'est disponible, dernier recours: vérifier l'égalité stricte (cas où les objets parent sont identiques)
        return node?.parent === appRoot;
      };

      const candidates = (
        Object.values(storage.files) as unknown as NodeLike[]
      ).filter(
        (f) =>
          !f.directory &&
          typeof f.name === "string" &&
          f.name === name &&
          isDescendantOfAppRoot(f)
      );

      const first = candidates.find((c) => !!c.nodeId);
      return first?.nodeId ? { nodeId: first.nodeId, name: first.name } : null;
    };

    // 1) Chercher côté utilisateur (si fourni)
    const fromUser = await tryFind(userId);
    if (fromUser) return fromUser;

    // 2) Fallback: chercher sur le stockage par défaut
    const fromDefault = await tryFind(undefined);
    if (fromDefault) return fromDefault;

    return null;
  }

  /**
   * Génère une URL de téléchargement temporaire pour un fichier
   * @param fileId - L'ID du fichier sur MEGA
   * @param userId - ID de l'utilisateur (optionnel, utilise la config par défaut si non fourni)
   * @returns Une URL temporaire valide pendant 1 heure
   */
  async getFileUrl(fileId: string, userId?: string): Promise<string> {
    const storage = await this.getStorage(userId);
    let file = storage.find((f) => f.nodeId === fileId);
    // Fallback: essayer le stockage par défaut si non trouvé côté utilisateur
    if (!file && userId) {
      try {
        const defaultStorage = await this.getStorage();
        file = defaultStorage.find((f) => f.nodeId === fileId);
      } catch {
        /* ignore */
      }
    }
    if (!file) throw new Error("Fichier non trouvé");

    // Génère une URL temporaire valide pendant 1 heure
    return await file.link({
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
    const storage = await this.getStorage(userId);
    let file = storage.find((f) => f.nodeId === fileId);
    // Fallback: essayer le stockage par défaut si non trouvé côté utilisateur
    if (!file && userId) {
      try {
        const defaultStorage = await this.getStorage();
        file = defaultStorage.find((f) => f.nodeId === fileId);
      } catch {
        /* ignore */
      }
    }
    if (!file) throw new Error("Fichier non trouvé");

    // Déterminer le type MIME en fonction de l'extension du fichier
    const ext = file.name?.split(".").pop()?.toLowerCase();
    const mimeType = this.getMimeType(ext || "");

    // Télécharger et convertir le fichier en base64
    const data = await file.downloadBuffer({});
    const base64 = data.toString("base64");

    // Retourner l'URL data avec le type MIME approprié
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Génère une data URL base64 pour un fichier identifié par son nom sous appRoot
   */
  async getBase64FileUrlByNameUnderAppRoot(
    name: string,
    userId?: string
  ): Promise<string | null> {
    const found = await this.findFileByNameUnderAppRoot(name, userId);
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
    userId?: string
  ): Promise<string> {
    const storage = await this.getStorage(userId);
    let folder = storage.root;
    if (folderId) {
      folder = storage.find((file) => file.nodeId === folderId) || storage.root;
    } else {
      const appRef = await this.getAppRootFolder(userId);
      folder = storage.find((f) => f.nodeId === appRef.nodeId) || storage.root;
    }

    return new Promise((resolve, reject) => {
      interface UploadCapable {
        upload: (
          opts: { name: string; size: number },
          buf: Buffer
        ) => {
          on: (
            evt: "complete" | "error",
            cb: (...args: unknown[]) => void
          ) => void;
        };
      }
      const uploadStream = (folder as unknown as UploadCapable).upload(
        { name, size: buffer.length },
        buffer
      );
      uploadStream.on("complete", (...args: unknown[]) => {
        const f = args[0] as { nodeId: string };
        resolve(f.nodeId);
      });
      uploadStream.on("error", reject);
    });
  }

  /**
   * Retourne l'ID du dossier "embeddings" (créé s'il n'existe pas) à la racine du compte MEGA de l'utilisateur
   */
  async ensureEmbeddingsFolder(userId?: string): Promise<string> {
    const storage = await this.getStorage(userId);
    const appRef = await this.getAppRootFolder(userId);
    const appRoot =
      storage.find((f) => f.nodeId === appRef.nodeId) || storage.root;
    // Chercher un dossier "embeddings" directement sous appRoot
    const existingNode = (
      Object.values(storage.files) as Array<{
        nodeId?: string;
        name?: string;
        directory?: boolean;
        parent?: { nodeId?: string } | unknown;
      }>
    ).find(
      (f) =>
        !!f.directory &&
        typeof f.name === "string" &&
        f.name.toLowerCase() === "embeddings" &&
        ((f.parent as { nodeId?: string } | undefined)?.nodeId ===
          appRef.nodeId ||
          f.parent === appRoot)
    );
    if (existingNode?.nodeId) return existingNode.nodeId as string;

    const folder = await appRoot.mkdir("embeddings");
    if (!folder?.nodeId)
      throw new Error("Impossible de créer le dossier embeddings");
    return folder.nodeId;
  }

  /**
   * Suppression d'un fichier
   * @param fileId - ID du fichier à supprimer
   * @param userId - ID de l'utilisateur
   * @param folderId - ID du dossier où chercher (optionnel, si non fourni cherche dans tout le compte)
   */
  async deleteFile(
    fileId: string,
    userId: string,
    folderId?: string
  ): Promise<void> {
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
        (child) => child.nodeId !== undefined
      ) as Array<{
        nodeId: string;
        name?: string;
        delete?: () => Promise<void>;
      }>;
      console.log(
        `📁 Recherche dans le dossier spécifique: ${searchFiles.length} fichiers`
      );
    } else {
      // Chercher dans tout le storage
      searchFiles = Object.values(storage.files).filter(
        (f) => f.nodeId !== undefined
      ) as Array<{
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
    const storage = await this.getStorage(userId);
    let file = storage.find((f) => f.nodeId === fileId);
    // Fallback: essayer le stockage par défaut si non trouvé côté utilisateur
    if (!file && userId) {
      try {
        const defaultStorage = await this.getStorage();
        file = defaultStorage.find((f) => f.nodeId === fileId);
      } catch {
        /* ignore */
      }
    }
    if (!file) throw new Error("Fichier non trouvé");

    const data = await file.downloadBuffer({});

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
    userId?: string
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
    userId?: string
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
      (c) => !c.directory && typeof c.name === "string" && c.name === name
    );
    return match && match.nodeId
      ? { nodeId: match.nodeId, name: match.name }
      : null;
  }

  /**
   * Supprime tous les fichiers portant un nom donné dans un dossier (utile pour éviter les doublons)
   * Retourne le nombre supprimé
   */
  async deleteFilesInFolderByName(
    folderId: string,
    name: string,
    userId?: string
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
      (c) =>
        !c.directory &&
        typeof c.name === "string" &&
        c.name === name &&
        c.nodeId
    );
    let deleted = 0;
    for (const m of matches) {
      try {
        if (typeof m.delete === "function") {
          await m.delete();
          deleted++;
        }
      } catch (e) {
        console.warn(
          `⚠️ Échec de suppression pour ${m.name} (${m.nodeId}):`,
          e
        );
      }
    }
    if (deleted > 0) {
      console.log(
        `🧹 Suppression de ${deleted} doublon(s) pour "${name}" dans le dossier ${folderId}`
      );
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
    userId?: string
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
      const appRef = await this.getAppRootFolder(userId);
      targetFolder =
        storage.find((f) => f.nodeId === appRef.nodeId) || storage.root;
    }

    const targetFolderId = (targetFolder as unknown as { nodeId?: string })
      .nodeId;
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
      } fichiers trouvés`
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
        console.log(
          `   ⚠️ Fichier ignoré (ID ou nom manquant): ${
            file.nodeId || "unknown"
          }`
        );
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
          `   ✅ ${file.name} téléchargé (${buffer.length} bytes, type: ${extension}, MIME: ${mimeType})`
        );
      } catch (error) {
        console.error(
          `   ❌ Erreur lors du téléchargement du fichier ${file.name} (${file.nodeId}):`,
          error
        );
        // Continuer avec les autres fichiers même si un échoue
      }
    }

    console.log(
      `📋 Récupération terminée: ${filesWithContent.length}/${files.length} fichiers traités avec succès`
    );
    return filesWithContent;
  }

  /**
   * Crée un dossier sur MEGA
   * @param name - Nom du dossier
   * @param parentFolderId - ID du dossier parent (optionnel, par défaut le dossier racine)
   * @param userId - ID de l'utilisateur (optionnel, utilise la config par défaut si non fourni)
   * @returns ID du dossier créé
   */
  async createFolder(
    name: string,
    parentFolderId?: string,
    userId?: string
  ): Promise<string> {
    const storage = await this.getStorage(userId);
    let parentFolder = storage.root;
    if (parentFolderId) {
      parentFolder =
        storage.find((f) => f.nodeId === parentFolderId) || storage.root;
    } else {
      const appRef = await this.getAppRootFolder(userId);
      parentFolder =
        storage.find((f) => f.nodeId === appRef.nodeId) || storage.root;
    }

    const folder = await parentFolder.mkdir(name);
    if (!folder.nodeId) {
      throw new Error("Impossible de créer le dossier");
    }
    return folder.nodeId;
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
