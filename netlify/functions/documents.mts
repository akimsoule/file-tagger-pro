import { Context } from "@netlify/functions";
import { DocumentService } from "../files.core/src/services/documentService";
import { MegaStorageService } from "../files.core/src/services/megaStorage";
import { LogService } from "../files.core/src/services/logService";
import {
  handleCorsOptions,
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
  validateHttpMethod,
  extractResourceId,
  parseFormData,
  validatePagination,
  sanitizeString,
  handleErrors,
} from "./shared/middleware.mts";

// Initialisation des services
// Initialisation des services
const logService = new LogService();
const megaStorageService = new MegaStorageService();
const documentService = new DocumentService(megaStorageService, logService);

// Fonction helper pour déterminer le type de document basé sur le fichier
function getDocumentTypeFromFile(fileName: string, mimeType?: string): string {
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

const documentsHandler = handleErrors(
  async (request: Request, context: Context) => {
    // Gestion CORS
    if (request.method === "OPTIONS") {
      return handleCorsOptions();
    }

    // Validation de la méthode HTTP
    const methodValidation = validateHttpMethod(request, [
      "GET",
      "POST",
      "PUT",
      "DELETE",
    ]);
    if (!methodValidation.success) {
      return methodValidation.response!;
    }

    const url = new URL(request.url);
    const pathSegments = url.pathname
      .split("/")
      .filter((segment) => segment !== "");
    const documentId = extractResourceId(url, "documents");

    // Vérifier si c'est une action spéciale (ex: synchronisation)
    const action = pathSegments[pathSegments.length - 1];

    // Pour GET, l'authentification est optionnelle (pour les documents publics)
    // Pour les autres méthodes, elle est requise
    if (request.method === "GET") {
      // GET avec authentification optionnelle
      const authResult = requireAuth(request);
      const user = authResult.success ? authResult.context!.user! : null;

      if (documentId) {
        return await handleGetDocument(documentId, user);
      } else {
        return await handleGetDocuments(url, user);
      }
    } else {
      // Autres méthodes - authentification requise
      const authResult = requireAuth(request);
      if (!authResult.success) {
        return authResult.response!;
      }

      const user = authResult.context!.user!;

      switch (request.method) {
        case "POST":
          // Vérifier si c'est une action de synchronisation
          if (action === "sync-mega") {
            return await handleSyncMegaFiles(request, user);
          }
          return await handleCreateDocument(request, user);

        case "PUT":
          if (documentId) {
            return await handleUpdateDocument(documentId, request, user);
          } else {
            return createErrorResponse(
              "ID du document requis pour la mise à jour",
              400
            );
          }

        case "DELETE":
          if (documentId) {
            return await handleDeleteDocument(documentId, user);
          } else {
            return createErrorResponse(
              "ID du document requis pour la suppression",
              400
            );
          }

        default:
          return createErrorResponse("Méthode non autorisée", 405);
      }
    }
  }
);

// Fonctions helper

interface AuthUser { userId: string }

async function handleGetDocument(documentId: string, _user: AuthUser | null) {
  try {
    const document = await documentService.getDocumentById(documentId);
    if (!document) {
      return createErrorResponse("Document non trouvé", 404);
    }
    return createSuccessResponse(document);
  } catch (error) {
    console.error("Erreur lors de la récupération du document:", error);
    return createErrorResponse(
      "Erreur lors de la récupération du document",
      500
    );
  }
}

async function handleGetDocuments(url: URL, _user: AuthUser | null) {
  try {
    const category = sanitizeString(url.searchParams.get("category") || "");
    const search = sanitizeString(url.searchParams.get("search") || "");
    const tag = sanitizeString(url.searchParams.get("tag") || "");
    const userId = sanitizeString(url.searchParams.get("userId") || "");

    const pagination = validatePagination(url);

  const filters: Record<string, unknown> = {};
    // Compatibilité: convertir category en tag
    if (category) filters.tag = category;
    if (search) filters.search = search;
    if (tag) filters.tag = tag;
    if (userId) filters.ownerId = userId;

    const documents = await documentService.getAllDocuments(
      pagination.skip,
      pagination.limit,
      filters
    );

    // Calculer le total des documents (pour la pagination)
    const total = await documentService.getDocumentCount(filters);

    // Retourner la structure attendue par le frontend
    const response = {
      documents,
      total,
      page: Math.floor(pagination.skip / pagination.limit) + 1,
      limit: pagination.limit,
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error("Erreur lors de la récupération des documents:", error);
    return createErrorResponse(
      "Erreur lors de la récupération des documents",
      500
    );
  }
}

async function handleCreateDocument(request: Request, user: AuthUser) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Upload de fichier
      const { data, files } = await parseFormData(request);

      if (files.length === 0) {
        return createErrorResponse("Aucun fichier fourni", 400);
      }

      const file = files[0];

      // Déterminer le type de document basé sur le fichier
      const documentType = getDocumentTypeFromFile(file.name, file.mimeType);

  const createData = {
        name: sanitizeString(data.name || file.name),
        type: sanitizeString(data.type || documentType),
        description: sanitizeString(data.description || ""),
        tags: data.tags || "general", // Utiliser "general" comme tag par défaut au lieu de category
        ownerId: user.userId,
  folderId: data.folderId ? sanitizeString(data.folderId) : undefined,
        file: {
          name: file.name,
          buffer: file.buffer,
          mimeType: file.mimeType,
        },
      };

      const document = await documentService.createDocument(createData);
      return createSuccessResponse(document, 201);
    } else {
      // Données JSON
      const body = await request.json();
  const createData = {
        name: sanitizeString(body.name),
        type: sanitizeString(body.type),
        description: sanitizeString(body.description || ""),
        tags: body.tags || "general", // Utiliser "general" comme tag par défaut
        ownerId: user.userId,
  folderId: body.folderId ? sanitizeString(body.folderId) : undefined,
      };

      const document = await documentService.createDocument(createData);
      return createSuccessResponse(document, 201);
    }
  } catch (error) {
    console.error("Erreur lors de la création du document:", error);
    return createErrorResponse("Erreur lors de la création du document", 500);
  }
}

async function handleUpdateDocument(
  documentId: string,
  request: Request,
  user: AuthUser
) {
  try {
    const body = await request.json();

    // Sanitiser les données d'entrée
    const updateData: Record<string, unknown> = {};
    if (body.name) updateData.name = sanitizeString(body.name);
    if (body.type) updateData.type = sanitizeString(body.type);
    // Note: category est maintenant géré via tags
    if (body.category) {
      // Compatibilité: convertir category en tag
      const currentTags = body.tags || "";
      const categoryAsTag = sanitizeString(body.category);
      updateData.tags = currentTags ? `${currentTags},${categoryAsTag}` : categoryAsTag;
    }
    if (body.description)
      updateData.description = sanitizeString(body.description);
    if (body.tags) updateData.tags = body.tags;
    if (typeof body.isFavorite === "boolean")
      updateData.isFavorite = body.isFavorite;

    const updatedDocument = await documentService.updateDocument(
      documentId,
      updateData,
      user.userId
    );
    return createSuccessResponse(updatedDocument);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du document:", error);
    return createErrorResponse(
      "Erreur lors de la mise à jour du document",
      500
    );
  }
}

async function handleDeleteDocument(documentId: string, user: AuthUser) {
  try {
    await documentService.deleteDocument(documentId, user.userId);
    return createSuccessResponse({ message: "Document supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du document:", error);
    return createErrorResponse(
      "Erreur lors de la suppression du document",
      500
    );
  }
}

async function handleSyncMegaFiles(request: Request, user: AuthUser) {
  try {
    const body = await request.json().catch(() => ({}));
    const folderId = body.folderId || undefined; // Optionnel: ID du dossier MEGA à synchroniser

    const result = await documentService.synchronizeMegaFiles(
      user.userId,
      folderId
    );

    return createSuccessResponse({
      message: "Synchronisation MEGA terminée avec succès",
      syncedCount: result.syncedCount,
      updatedCount: result.updatedCount,
      newDocuments: result.newDocuments.map((doc) => ({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        tags: doc.tags,
      })),
      updatedDocuments: result.updatedDocuments.map((doc) => ({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        tags: doc.tags,
      })),
    });
  } catch (error) {
    console.error("Erreur lors de la synchronisation MEGA:", error);
    return createErrorResponse(
      error instanceof Error
        ? error.message
        : "Erreur lors de la synchronisation MEGA",
      500
    );
  }
}

export default documentsHandler;
