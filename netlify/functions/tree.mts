import { Context } from "@netlify/functions";
import prisma from "../files.core/src/services/database";
import { LogService } from "../files.core/src/services/logService";
import {
  handleCorsOptions,
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
  validateHttpMethod,
  handleErrors,
} from "./shared/middleware.mts";

const logService = new LogService();

interface TreeFolderStats {
  documents: number; // nombre total de documents dans le sous-arbre
  folders: number; // nombre total de dossiers descendants (excluant lui-même ou incluant? => incluant descendants uniquement)
  totalSize: number; // taille totale (somme sizes documents)
}

interface TreeFolderDTO {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  parentId?: string | null;
  isRoot?: boolean;
  createdAt: Date;
  updatedAt: Date;
  folders: TreeFolderDTO[];
  documents: TreeDocumentDTO[];
  stats?: TreeFolderStats;
  tags?: string;
}

interface TreeDocumentDTO {
  id: string;
  name: string;
  type: string;
  size: number;
  description?: string | null;
  tags: string;
  folderId?: string | null;
  isFavorite: boolean;
  createdAt: Date;
  modifiedAt: Date;
}

async function buildTree(userId: string): Promise<TreeFolderDTO | null> {
  const [folders, documents] = await Promise.all([
    prisma.folder.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (folders.length === 0 && documents.length === 0) return null;

  const folderChildrenMap = new Map<string | null, any[]>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const f of folders) {
    const key = f.parentId || null;
    if (!folderChildrenMap.has(key)) folderChildrenMap.set(key, []);
    folderChildrenMap.get(key)!.push(f);
  }
  const docsByFolder = new Map<string | null, any[]>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const d of documents) {
    const key = d.folderId || null;
    if (!docsByFolder.has(key)) docsByFolder.set(key, []);
    docsByFolder.get(key)!.push(d);
  }

  const rootFolder = folders.find((f) => f.isRoot);
  const rootId = rootFolder ? rootFolder.id : "synthetic-root";

  // FIX: si un rootFolder existe, rattacher les dossiers "orphelins" (parentId null, isRoot=false)
  // sous ce root afin d'éviter un second niveau racine fantôme côté client.
  if (rootFolder) {
    const topLevel = folderChildrenMap.get(null) || [];
    const orphans = topLevel.filter((f) => f.id !== rootFolder.id);
    if (orphans.length) {
      // Ne garder dans null que le root lui-même pour éviter re-traitement
      folderChildrenMap.set(
        null,
        topLevel.filter((f) => f.id === rootFolder.id)
      );
      if (!folderChildrenMap.has(rootFolder.id))
        folderChildrenMap.set(rootFolder.id, []);
      const rootChildren = folderChildrenMap.get(rootFolder.id)!;
      for (const orphan of orphans) {
        rootChildren.push(orphan);
      }
    }
    // Rattacher aussi les documents orphelins (folderId null) au root réel
    const orphanDocs = docsByFolder.get(null) || [];
    if (orphanDocs.length) {
      if (!docsByFolder.has(rootFolder.id)) docsByFolder.set(rootFolder.id, []);
      const rootDocs = docsByFolder.get(rootFolder.id)!;
      for (const d of orphanDocs) {
        rootDocs.push(d);
      }
      // laisser docsByFolder(null) intact (optionnel) ou le vider pour éviter double
      docsByFolder.set(null, []);
    }
  }

  function buildFolder(f: any): TreeFolderDTO {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    const childFolders = folderChildrenMap.get(f.id) || [];
    return {
      id: f.id,
      name: f.name,
      description: f.description,
      color: f.color,
      parentId: f.parentId,
      isRoot: f.isRoot,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      folders: childFolders.map(buildFolder),
      documents: (docsByFolder.get(f.id) || []).map((d: any) => ({
        // eslint-disable-line @typescript-eslint/no-explicit-any
        id: d.id,
        name: d.name,
        type: d.type,
        size: d.size,
        description: d.description,
        tags: d.tags,
        folderId: d.folderId,
        isFavorite: d.isFavorite,
        createdAt: d.createdAt,
        modifiedAt: d.modifiedAt,
      })),
      tags: f.tags || "",
    };
  }

  let rootTree: TreeFolderDTO;
  if (rootFolder) {
    rootTree = buildFolder(rootFolder);
  } else {
    // construire racine synthétique
    const topFolders = folderChildrenMap.get(null) || [];
    rootTree = {
      id: rootId,
      name: "Root",
      description: "Synthetic root",
      color: "#000000",
      parentId: null,
      isRoot: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      folders: topFolders.map(buildFolder),
      documents: (docsByFolder.get(null) || []).map((d: any) => ({
        // eslint-disable-line @typescript-eslint/no-explicit-any
        id: d.id,
        name: d.name,
        type: d.type,
        size: d.size,
        description: d.description,
        tags: d.tags,
        folderId: d.folderId,
        isFavorite: d.isFavorite,
        createdAt: d.createdAt,
        modifiedAt: d.modifiedAt,
      })),
      tags: "",
    };
  }
  // Calcul des statistiques agrégées (post-order)
  function computeStats(folder: TreeFolderDTO): TreeFolderStats {
    let docs = folder.documents.length;
    let foldersCount = folder.folders.length; // descendants directs
    let size = folder.documents.reduce((acc, d) => acc + (d.size || 0), 0);
    for (const child of folder.folders) {
      const childStats = computeStats(child);
      docs += childStats.documents;
      foldersCount += childStats.folders; // ajouter dossiers descendants du child
      size += childStats.totalSize;
    }
    folder.stats = { documents: docs, folders: foldersCount, totalSize: size };
    return folder.stats;
  }
  computeStats(rootTree);
  return rootTree;
}

const treeHandler = handleErrors(
  async (request: Request, _context: Context) => {
    if (request.method === "OPTIONS") return handleCorsOptions();
    const methodValidation = validateHttpMethod(request, ["GET"]);
    if (!methodValidation.success) return methodValidation.response!;
    const authResult = requireAuth(request);
    if (!authResult.success) return authResult.response!;
    const user = authResult.context!.user!;
    try {
      const tree = await buildTree(user.userId);
      const globalStats = tree
        ? tree.stats
        : { documents: 0, folders: 0, totalSize: 0 };
      return createSuccessResponse({ tree, stats: globalStats });
    } catch (e) {
      console.error("Erreur build tree", e);
      return createErrorResponse(
        "Erreur lors de la construction de l'arbre",
        500
      );
    }
  }
);

export default treeHandler;
