import { Context } from '@netlify/functions';
import { DocumentService } from '../files.core/src/services/documentService';
import { MegaStorageService } from '../files.core/src/services/megaStorage';
import { LogService } from '../files.core/src/services/logService';
import {
  handleCorsOptions,
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
  validateHttpMethod,
  extractResourceId,
  sanitizeString,
  handleErrors
} from './shared/middleware.mts';

// Initialisation des services
const logService = new LogService();
const megaStorageService = new MegaStorageService();
const documentService = new DocumentService(megaStorageService, logService);

const filesHandler = handleErrors(async (request: Request, context: Context) => {
  // Gestion CORS
  if (request.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  // Validation de la méthode HTTP
  const methodValidation = validateHttpMethod(request, ['GET']);
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
  const documentId = extractResourceId(url, 'files');
  const downloadType = sanitizeString(url.searchParams.get('type') || 'url'); // 'url' ou 'base64'

  if (!documentId) {
    return createErrorResponse('ID du document requis', 400);
  }

  return await handleFileDownload(documentId, downloadType, user);
});

// Fonction helper

interface AuthUser { userId: string }
async function handleFileDownload(documentId: string, downloadType: string, user: AuthUser) {
  try {
    // Récupérer les informations du document
    const document = await documentService.getDocumentById(documentId);
    
    if (!document) {
      return createErrorResponse('Document non trouvé', 404);
    }

    // Vérifier que l'utilisateur a accès au document
    if (document.ownerId !== user.userId) {
      return createErrorResponse('Accès non autorisé', 403);
    }

    try {
      // Toujours récupérer le contenu en base64 pour éviter d'exposer les URLs MEGA
      const dataUrl = await megaStorageService.getBase64FileUrl(document.fileId, document.ownerId);
      
      return createSuccessResponse({
        documentId: document.id,
        name: document.name,
        type: document.type,
        dataUrl: dataUrl,
        size: document.size
      });

    } catch (fileError) {
      console.error('Erreur lors de la récupération du fichier:', fileError);
      return createErrorResponse('Fichier non accessible', 404, 'Le fichier pourrait avoir été supprimé ou déplacé');
    }

  } catch (error) {
    console.error('Erreur lors du téléchargement:', error);
    return createErrorResponse('Erreur lors du téléchargement', 500);
  }
}

export default filesHandler;
