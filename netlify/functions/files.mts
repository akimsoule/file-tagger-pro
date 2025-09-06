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
  sanitizeString,
  handleErrors,
} from "./shared/middleware.mts";

// Initialisation des services
const logService = new LogService();
const megaStorageService = new MegaStorageService();
const documentService = new DocumentService(megaStorageService, logService);

const filesHandler = handleErrors(
  async (request: Request, context: Context) => {
    // Gestion CORS
    if (request.method === "OPTIONS") {
      return handleCorsOptions();
    }

    // Validation de la méthode HTTP
    const methodValidation = validateHttpMethod(request, ["GET"]);
    if (!methodValidation.success) {
      return methodValidation.response!;
    }

    // Authentification
    const authResult = requireAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const user = authResult.context!.user! as AuthUser;
    const url = new URL(request.url);
    const documentId = extractResourceId(url, "files");
    const downloadType = sanitizeString(url.searchParams.get("type") || "url"); // 'url' ou 'base64'

    if (!documentId) {
      return createErrorResponse("ID du document requis", 400);
    }

    return await handleFileDownload(documentId, downloadType, user);
  }
);

// Fonction helper

interface AuthUser {
  userId: string;
}
async function handleFileDownload(
  documentId: string,
  downloadType: string,
  user: AuthUser
) {
  try {
    // Récupérer les informations du document
    const document = await documentService.getDocumentById(documentId);

    if (!document) {
      return createErrorResponse("Document non trouvé", 404);
    }

    // Vérifier que l'utilisateur a accès au document
    if (document.ownerId !== user.userId) {
      return createErrorResponse("Accès non autorisé", 403);
    }

    // Helpers locaux (clean code)
    const getExt = (name: string) => name.split(".").pop()?.toLowerCase();
    const success = (dataUrl: string) =>
      createSuccessResponse({
        documentId: document.id,
        name: document.name,
        type: document.type,
        dataUrl,
        size: document.size,
      });
    const reconcile = async (newNodeId: string | undefined, reason: string) => {
      if (!newNodeId || newNodeId === document.fileId) return;
      try {
        await documentService.updateDocumentFileId(
          document.id,
          newNodeId,
          user.userId,
          reason
        );
        console.warn(`fileId réconcilié (${reason}) pour ${document.id}`);
      } catch {}
    };

    try {
      // Toujours récupérer le contenu en base64 pour éviter d'exposer les URLs MEGA
      const dataUrl = await megaStorageService.getBase64FileUrl(
        document.fileId,
        document.ownerId
      );
      return success(dataUrl);
    } catch (fileError) {
      console.error(
        "Erreur lors de la récupération du fichier (par ID):",
        fileError
      );
      const ext = getExt(document.name);
      // Fallback: si le fichier a été déplacé/dupliqué, tenter par nom sous appRoot
      try {
        const byName =
          await megaStorageService.getBase64FileUrlByNameUnderAppRoot(
            document.name,
            document.ownerId
          );
        if (byName) {
          // Réconciliation clean via DocumentService
          const found = await megaStorageService.findFileByNameUnderAppRoot(
            document.name,
            document.ownerId
          );
          await reconcile(found?.nodeId, "fallback:name:appRoot");
          console.warn(
            `Fallback par nom activé sous appRoot pour le document ${document.id} (${document.name}). Pensez à réconcilier fileId en base de données si nécessaire.`
          );
          return success(byName);
        }
        // Fallback global par nom (dans tout le storage)
        const byNameAny = await megaStorageService.getBase64FileUrlByNameAnywhere(
          document.name,
          document.ownerId
        );
        if (byNameAny) {
          // Réconciliation clean via DocumentService (global)
          const found = await megaStorageService.findFileByNameAnywhere(
            document.name,
            document.ownerId
          );
          await reconcile(found?.nodeId, "fallback:name:anywhere");
          console.warn(
            `Fallback global par nom activé pour le document ${document.id}.`
          );
          return success(byNameAny);
        }
        // Fallback additionnel: recherche par taille+hash sous appRoot (indépendant du nom)
        if (document.hash && document.size) {
          const byHash =
            await megaStorageService.getBase64FileUrlByHashUnderAppRoot(
              { size: document.size, hash: document.hash, ext },
              document.ownerId
            );
          if (byHash) {
            // Réconciliation: fileId
            const found = await megaStorageService.findFileByHashUnderAppRoot(
              { size: document.size, hash: document.hash, ext },
              document.ownerId
            );
            await reconcile(found?.nodeId, "fallback:hash:appRoot");
            console.warn(
              `Fallback par hash/size activé sous appRoot pour le document ${document.id}.`
            );
            return success(byHash);
          }

          // Fallback global par hash/size (dans tout le storage)
          const byHashAny =
            await megaStorageService.getBase64FileUrlByHashAnywhere(
              { size: document.size, hash: document.hash, ext },
              document.ownerId
            );
          if (byHashAny) {
            // Réconciliation: fileId
            const found = await megaStorageService.findFileByHashAnywhere(
              { size: document.size, hash: document.hash, ext },
              document.ownerId
            );
            await reconcile(found?.nodeId, "fallback:hash:anywhere");
            console.warn(
              `Fallback global par hash/size activé pour le document ${document.id}.`
            );
            return success(byHashAny);
          }
        }
        // Fallback final: par taille + extension (pour anciens documents sans hash)
        if (document.size) {
          const bySizeExt =
            await megaStorageService.getBase64FileUrlBySizeAndExtUnderAppRoot(
              { size: document.size, ext },
              document.ownerId
            );
          if (bySizeExt) {
            // Réconciliation: tentative prudente (taille+ext non unique)
            const found = await megaStorageService.findFileBySizeAndExtUnderAppRoot(
              { size: document.size, ext },
              document.ownerId
            );
            await reconcile(found?.nodeId, "fallback:sizeExt:appRoot");
            console.warn(
              `Fallback taille+extension activé pour le document ${document.id}.`
            );
            return success(bySizeExt);
          }

          // Fallback global taille+extension (dans tout le storage)
          const bySizeExtAny =
            await megaStorageService.getBase64FileUrlBySizeAndExtAnywhere(
              { size: document.size, ext },
              document.ownerId
            );
          if (bySizeExtAny) {
            // Réconciliation: très prudente
            const found = await megaStorageService.findFileBySizeAndExtAnywhere(
              { size: document.size, ext },
              document.ownerId
            );
            await reconcile(found?.nodeId, "fallback:sizeExt:anywhere");
            console.warn(
              `Fallback global taille+extension activé pour le document ${document.id}.`
            );
            return success(bySizeExtAny);
          }
        }
      } catch {}
      return createErrorResponse(
        "Fichier non accessible",
        404,
        "Le fichier pourrait avoir été supprimé ou déplacé"
      );
    }
  } catch (error) {
    console.error("Erreur lors du téléchargement:", error);
    return createErrorResponse("Erreur lors du téléchargement", 500);
  }
}

export default filesHandler;
