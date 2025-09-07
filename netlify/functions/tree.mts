import { Context } from "@netlify/functions";

import prisma from "../files.core/src/services/database";
import {
  createErrorResponse,
  createSuccessResponse,
  handleCorsOptions,
  handleErrors,
  requireAuth,
  validateHttpMethod,
} from "./shared/middleware.mts";

// Types
interface TreeFolderStats {
  documents: number;
  folders: number;
  totalSize: number;
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

type FolderEntity = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  parentId: string | null;
  isRoot: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string | null;
};

type DocumentEntity = {
  id: string;
  name: string;
  type: string;
  size: number;
  description: string | null;
  tags: string;
  folderId: string | null;
  isFavorite: boolean;
  createdAt: Date;
  modifiedAt: Date;
};

// Service functions
async function fetchUserData(userId: string) {
  return await Promise.all([
    prisma.folder.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
    }),
  ]);
}

function buildMaps(folders: FolderEntity[], documents: DocumentEntity[]) {
  const folderChildrenMap = new Map<string | null, FolderEntity[]>();
  const docsByFolder = new Map<string | null, DocumentEntity[]>();

  // Build folder hierarchy map
  for (const folder of folders) {
    const key = folder.parentId || null;
    const existing = folderChildrenMap.get(key);
    if (existing) {
      existing.push(folder);
    } else {
      folderChildrenMap.set(key, [folder]);
    }
  }

  // Build documents by folder map
  for (const document of documents) {
    const key = document.folderId || null;
    const existing = docsByFolder.get(key);
    if (existing) {
      existing.push(document);
    } else {
      docsByFolder.set(key, [document]);
    }
  }

  return { folderChildrenMap, docsByFolder };
}

function attachOrphansToRoot(
  rootFolder: FolderEntity,
  folderChildrenMap: Map<string | null, FolderEntity[]>,
  docsByFolder: Map<string | null, DocumentEntity[]>,
) {
  const topLevel = folderChildrenMap.get(null) || [];
  const orphanFolders = topLevel.filter((f) => f.id !== rootFolder.id);

  if (orphanFolders.length > 0) {
    // Keep only root in null level
    folderChildrenMap.set(
      null,
      topLevel.filter((f) => f.id === rootFolder.id),
    );

    // Attach orphan folders to root
    if (!folderChildrenMap.has(rootFolder.id)) {
      folderChildrenMap.set(rootFolder.id, []);
    }
    const rootChildren = folderChildrenMap.get(rootFolder.id)!;
    rootChildren.push(...orphanFolders);
  }

  // Attach orphan documents to root
  const orphanDocs = docsByFolder.get(null) || [];
  if (orphanDocs.length > 0) {
    if (!docsByFolder.has(rootFolder.id)) {
      docsByFolder.set(rootFolder.id, []);
    }
    const rootDocs = docsByFolder.get(rootFolder.id)!;
    rootDocs.push(...orphanDocs);
    docsByFolder.set(null, []);
  }
}

function convertDocumentEntity(document: DocumentEntity): TreeDocumentDTO {
  return {
    id: document.id,
    name: document.name,
    type: document.type,
    size: document.size,
    description: document.description,
    tags: document.tags,
    folderId: document.folderId,
    isFavorite: document.isFavorite,
    createdAt: document.createdAt,
    modifiedAt: document.modifiedAt,
  };
}

function createFolderBuilder(
  folderChildrenMap: Map<string | null, FolderEntity[]>,
  docsByFolder: Map<string | null, DocumentEntity[]>,
) {
  return function buildFolder(folder: FolderEntity): TreeFolderDTO {
    const childFolders = folderChildrenMap.get(folder.id) || [];
    const folderDocuments = docsByFolder.get(folder.id) || [];

    return {
      id: folder.id,
      name: folder.name,
      description: folder.description,
      color: folder.color,
      parentId: folder.parentId,
      isRoot: folder.isRoot,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      folders: childFolders.map(buildFolder),
      documents: folderDocuments.map(convertDocumentEntity),
      tags: folder.tags || "",
    };
  };
}

function createSyntheticRoot(
  folderChildrenMap: Map<string | null, FolderEntity[]>,
  docsByFolder: Map<string | null, DocumentEntity[]>,
  buildFolder: (folder: FolderEntity) => TreeFolderDTO,
): TreeFolderDTO {
  const topFolders = folderChildrenMap.get(null) || [];
  const rootDocuments = docsByFolder.get(null) || [];

  return {
    id: "synthetic-root",
    name: "Root",
    description: "Synthetic root",
    color: "#000000",
    parentId: null,
    isRoot: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    folders: topFolders.map(buildFolder),
    documents: rootDocuments.map(convertDocumentEntity),
    tags: "",
  };
}

function computeTreeStats(folder: TreeFolderDTO): TreeFolderStats {
  let documentsCount = folder.documents.length;
  let foldersCount = folder.folders.length;
  let totalSize = folder.documents.reduce((acc, doc) => acc + (doc.size || 0), 0);

  for (const childFolder of folder.folders) {
    const childStats = computeTreeStats(childFolder);
    documentsCount += childStats.documents;
    foldersCount += childStats.folders;
    totalSize += childStats.totalSize;
  }

  const stats: TreeFolderStats = {
    documents: documentsCount,
    folders: foldersCount,
    totalSize,
  };

  folder.stats = stats;
  return stats;
}

async function buildTree(userId: string): Promise<TreeFolderDTO | null> {
  const [folders, documents] = await fetchUserData(userId);

  if (folders.length === 0 && documents.length === 0) {
    return null;
  }

  const { folderChildrenMap, docsByFolder } = buildMaps(folders, documents);
  const rootFolder = folders.find((f) => f.isRoot);
  const buildFolder = createFolderBuilder(folderChildrenMap, docsByFolder);

  let rootTree: TreeFolderDTO;

  if (rootFolder) {
    attachOrphansToRoot(rootFolder, folderChildrenMap, docsByFolder);
    rootTree = buildFolder(rootFolder);
  } else {
    rootTree = createSyntheticRoot(folderChildrenMap, docsByFolder, buildFolder);
  }

  computeTreeStats(rootTree);
  return rootTree;
}

const treeHandler = handleErrors(async (request: Request, _context: Context) => {
  if (request.method === "OPTIONS") return handleCorsOptions();

  const methodValidation = validateHttpMethod(request, ["GET"]);
  if (!methodValidation.success) return methodValidation.response!;

  const authResult = requireAuth(request);
  if (!authResult.success) return authResult.response!;

  const user = authResult.context!.user!;

  try {
    const tree = await buildTree(user.userId);
    const globalStats = tree ? tree.stats : { documents: 0, folders: 0, totalSize: 0 };

    return createSuccessResponse({ tree, stats: globalStats });
  } catch (error) {
    console.error("[tree] Erreur build tree:", error);
    return createErrorResponse("Erreur lors de la construction de l'arbre", 500);
  }
});

export default treeHandler;
