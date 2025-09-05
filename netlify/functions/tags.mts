import { Context } from '@netlify/functions';
import { TagService } from '../files.core/src/services/tagService';
import { LogService } from '../files.core/src/services/logService';
import {
  handleCorsOptions,
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
  validateHttpMethod,
  extractResourceId,
  handleErrors
} from './shared/middleware.mts';

// Initialisation des services
const logService = new LogService();
const tagService = new TagService(logService);

export default handleErrors(async (request: Request, context: Context) => {
  // Gestion CORS
  if (request.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  // Validation de la méthode HTTP
  const methodValidation = validateHttpMethod(request, ['GET', 'DELETE']);
  if (!methodValidation.success) {
    return methodValidation.response!;
  }

  // Authentification
  const authResult = requireAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const user = authResult.context!.user!;
  const url = new URL(request.url);
  const tagName = extractResourceId(url, 'tags');

  switch (request.method) {
    case 'GET':
      if (tagName) {
        return await handleTagStats(tagName);
      } else {
        const searchQuery = url.searchParams.get('q') || url.searchParams.get('search');
        return await handleListTags(searchQuery);
      }

    case 'DELETE':
      if (tagName) {
        return await handleDeleteTag(tagName, user);
      } else {
        return createErrorResponse('Nom du tag requis pour la suppression', 400);
      }

    default:
      return createErrorResponse('Méthode non autorisée', 405);
  }
});

// Fonctions helper

async function handleListTags(searchQuery?: string | null) {
  try {
    let tags;
    
    if (searchQuery && searchQuery.trim()) {
      // Recherche de tags spécifiques
      tags = await tagService.searchTags(searchQuery.trim());
    } else {
      // Récupération de tous les tags
      tags = await tagService.getAllTags();
    }
    
    return createSuccessResponse(tags);
  } catch (error) {
    console.error('Erreur lors de la récupération des tags:', error);
    return createErrorResponse('Erreur lors de la récupération des tags', 500);
  }
}

async function handleTagStats(tagName: string) {
  try {
    const allTags = await tagService.getAllTags();
    const specificTag = allTags.find(t => t.name === tagName);
    
    if (!specificTag) {
      return createErrorResponse('Tag non trouvé', 404);
    }
    
    return createSuccessResponse(specificTag);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques du tag:', error);
    return createErrorResponse('Erreur lors de la récupération des statistiques du tag', 500);
  }
}

async function handleDeleteTag(tagName: string, user: any) {
  try {
    const updatedCount = await tagService.deleteTag(tagName);
    
    return createSuccessResponse({
      message: `Tag "${tagName}" supprimé avec succès`,
      updatedDocuments: updatedCount
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du tag:', error);
    return createErrorResponse('Erreur lors de la suppression du tag', 500);
  }
}
