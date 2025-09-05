import { Context } from '@netlify/functions';
import { FolderService } from '../files.core/src/services/folderService';
import { LogService } from '../files.core/src/services/logService';
import prisma from '../files.core/src/services/database';
import {
  handleCorsOptions,
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
  validateHttpMethod,
  sanitizeString,
  handleErrors,
} from './shared/middleware.mts';

const logService = new LogService();
const folderService = new FolderService(logService);

interface AuthUser { userId: string }
// Prisma déjà importé statiquement pour éviter le dynamic import

async function handleGetFolders(request: Request, user: AuthUser) {
  try {
    const url = new URL(request.url);
    const parentId = url.searchParams.get('parentId');
    const isRootFlag = url.searchParams.get('isRoot');

    if (isRootFlag === '1') {
      // Récupérer le dossier root logique (isRoot true)
      const root = await prisma.folder.findFirst({ where: { ownerId: user.userId, isRoot: true } });
      if (!root) return createSuccessResponse(null);
      return createSuccessResponse(root);
    }
    
    let folders;
    if (parentId) {
      folders = await folderService.getSubfolders(parentId, user.userId);
    } else {
      folders = await folderService.getRootFolders(user.userId);
    }
    
    return createSuccessResponse(folders);
  } catch (error) {
    console.error('Erreur lors de la récupération des dossiers:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Erreur lors de la récupération des dossiers',
      500
    );
  }
}

async function handleGetFolder(request: Request, user: AuthUser) {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
    const folderId = pathSegments[pathSegments.length - 1];
    
    if (!folderId) {
      return createErrorResponse('ID du dossier requis', 400);
    }
    
    const folder = await folderService.getFolderById(folderId, user.userId);
    return createSuccessResponse(folder);
  } catch (error) {
    console.error('Erreur lors de la récupération du dossier:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Erreur lors de la récupération du dossier',
      500
    );
  }
}

async function handleCreateFolder(request: Request, user: AuthUser) {
  try {
    const body = await request.json();
    
    if (!body.name) {
      return createErrorResponse('Le nom du dossier est requis', 400);
    }
    
    const folderData = {
      name: sanitizeString(body.name),
      description: body.description ? sanitizeString(body.description) : undefined,
      color: body.color,
      parentId: body.parentId,
      ownerId: user.userId,
      tags: body.tags ? sanitizeString(body.tags) : undefined,
    };
    
    const folder = await folderService.createFolder(folderData);
    return createSuccessResponse(folder, 201);
  } catch (error) {
    console.error('Erreur lors de la création du dossier:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Erreur lors de la création du dossier',
      500
    );
  }
}

async function handleUpdateFolder(request: Request, user: AuthUser) {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
    const folderId = pathSegments[pathSegments.length - 1];
    const body = await request.json();
    
    if (!folderId) {
      return createErrorResponse('ID du dossier requis', 400);
    }
    
    const updateData = {
      name: body.name ? sanitizeString(body.name) : undefined,
      description: body.description !== undefined ? 
        (body.description ? sanitizeString(body.description) : undefined) : undefined,
      color: body.color,
      parentId: body.parentId,
      tags: body.tags !== undefined ? sanitizeString(body.tags) : undefined,
    };
    
    const folder = await folderService.updateFolder(folderId, updateData, user.userId);
    return createSuccessResponse(folder);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du dossier:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Erreur lors de la mise à jour du dossier',
      500
    );
  }
}

async function handleDeleteFolder(request: Request, user: AuthUser) {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
    const folderId = pathSegments[pathSegments.length - 1];
    
    if (!folderId) {
      return createErrorResponse('ID du dossier requis', 400);
    }
    
    await folderService.deleteFolder(folderId, user.userId);
    return createSuccessResponse({ message: 'Dossier supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du dossier:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Erreur lors de la suppression du dossier',
      500
    );
  }
}

async function handleMoveDocument(request: Request, user: AuthUser) {
  try {
    const body = await request.json();
    
    if (!body.documentId) {
      return createErrorResponse('ID du document requis', 400);
    }
    
    const document = await folderService.moveDocumentToFolder(
      body.documentId,
      body.folderId || null,
      user.userId
    );
    
    return createSuccessResponse(document);
  } catch (error) {
    console.error('Erreur lors du déplacement du document:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Erreur lors du déplacement du document',
      500
    );
  }
}

async function handleGetFolderPath(request: Request, user: AuthUser) {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
    const folderIndex = pathSegments.findIndex(segment => segment === 'folders');
    const folderId = pathSegments[folderIndex + 1]; // ID après '/folders/'
    
    if (!folderId) {
      return createErrorResponse('ID du dossier requis', 400);
    }
    
    const path = await folderService.getFolderPath(folderId, user.userId);
    return createSuccessResponse({ path });
  } catch (error) {
    console.error('Erreur lors de la récupération du chemin:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Erreur lors de la récupération du chemin',
      500
    );
  }
}

const folderHandler = handleErrors(async (request: Request, context: Context) => {
  // Gestion des options CORS
  if (request.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  // Validation des méthodes HTTP autorisées
  const methodValidation = validateHttpMethod(request, ['GET', 'POST', 'PUT', 'DELETE']);
  if (!methodValidation.success) {
    return methodValidation.response!;
  }

  // Authentification requise
  const authResult = requireAuth(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  const user = authResult.context?.user as AuthUser | undefined;
  const url = new URL(request.url);

  try {
    // Routes pour les dossiers
    if (url.pathname.includes('/folders')) {
      switch (request.method) {
        case 'GET':
          if (url.pathname.endsWith('/folders')) {
            return user ? await handleGetFolders(request, user) : createErrorResponse('Utilisateur requis', 401);
          } else if (url.pathname.includes('/path')) {
            return user ? await handleGetFolderPath(request, user) : createErrorResponse('Utilisateur requis', 401);
          } else {
            return user ? await handleGetFolder(request, user) : createErrorResponse('Utilisateur requis', 401);
          }
        case 'POST':
          if (url.pathname.endsWith('/folders')) {
            return user ? await handleCreateFolder(request, user) : createErrorResponse('Utilisateur requis', 401);
          } else if (url.pathname.includes('/move-document')) {
            return user ? await handleMoveDocument(request, user) : createErrorResponse('Utilisateur requis', 401);
          }
          break;
        case 'PUT':
          return user ? await handleUpdateFolder(request, user) : createErrorResponse('Utilisateur requis', 401);
        case 'DELETE':
          return user ? await handleDeleteFolder(request, user) : createErrorResponse('Utilisateur requis', 401);
      }
    }

    return createErrorResponse('Route non trouvée', 404);
  } catch (error) {
    console.error('Erreur dans le handler des dossiers:', error);
    return createErrorResponse('Erreur interne du serveur', 500);
  }
});

export default folderHandler;