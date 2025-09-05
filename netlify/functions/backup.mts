import { Context } from '@netlify/functions';
import { BackupService } from '../files.core/src/services/backupService';
import { MegaStorageService } from '../files.core/src/services/megaStorage';
import { LogService } from '../files.core/src/services/logService';
import {
  handleCorsOptions,
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
  validateHttpMethod,
  safeJsonParse,
  handleErrors
} from './shared/middleware.mts';

// Initialisation des services
const logService = new LogService();
const megaStorageService = new MegaStorageService();
const backupService = new BackupService(logService, megaStorageService);

const backupHandler = handleErrors(async (request: Request, context: Context) => {
  // Gestion CORS
  if (request.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  // Validation de la méthode HTTP
  const methodValidation = validateHttpMethod(request, ['GET', 'POST']);
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
  const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
  const action = pathSegments[pathSegments.length - 1];

  switch (request.method) {
    case 'GET':
      switch (action) {
        case 'status':
          return await handleBackupStatus(user);

        case 'history':
          return await handleBackupHistory(user);

        case 'download':
          return await handleBackupDownload(user);

        default:
          return createErrorResponse('Action non trouvée', 404);
      }

    case 'POST':
      switch (action) {
        case 'create':
          return await handleCreateBackup(request, user);

        case 'restore':
          return await handleRestoreBackup(request, user);

        default:
          return createErrorResponse('Action non trouvée', 404);
      }

    default:
      return createErrorResponse('Méthode non autorisée', 405);
  }
});

// Fonctions helper

interface AuthUser { userId: string }
async function handleBackupStatus(_user: AuthUser) {
  try {
    // Statut des sauvegardes (simplifié)
    return createSuccessResponse({
      status: 'Fonctionnalité de sauvegarde disponible',
      lastBackup: null,
      nextScheduledBackup: null
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du statut:', error);
    return createErrorResponse('Erreur lors de la récupération du statut', 500);
  }
}

async function handleBackupHistory(_user: AuthUser) {
  try {
    // Historique des sauvegardes (à implémenter)
    return createSuccessResponse({
      message: 'Historique des sauvegardes à implémenter',
      backups: []
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    return createErrorResponse('Erreur lors de la récupération de l\'historique', 500);
  }
}

async function handleBackupDownload(_user: AuthUser) {
  try {
    // Télécharger une sauvegarde (à implémenter)
    return createErrorResponse('Téléchargement de sauvegarde non implémenté', 501);
  } catch (error) {
    console.error('Erreur lors du téléchargement:', error);
    return createErrorResponse('Erreur lors du téléchargement', 500);
  }
}

async function handleCreateBackup(request: Request, user: AuthUser) {
  const parseResult = await safeJsonParse(request);
  if (!parseResult.success) {
    return createErrorResponse(parseResult.error!, 400);
  }
  // Validation basique du payload
  if (typeof parseResult.data !== 'object' || parseResult.data === null) {
    return createErrorResponse('Payload invalide', 400);
  }
  interface CreateBackupPayload { type?: string; description?: string }
  const { type = 'full', description } = parseResult.data as CreateBackupPayload;

  if (!['full', 'incremental', 'documents-only'].includes(type)) {
    return createErrorResponse('Type de sauvegarde invalide. Valeurs autorisées: full, incremental, documents-only', 400);
  }

  try {
    const backupOptions = { 
      includeLogs: true,
      maxLogAge: 90
    };
    const backup = await backupService.createBackup(backupOptions, user.userId);
    
    return createSuccessResponse({
      message: 'Sauvegarde initiée',
      backup
    }, 202); // Accepted - processus asynchrone
  } catch (error) {
    console.error('Erreur lors de la création de la sauvegarde:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de la création de la sauvegarde';
    return createErrorResponse(message, 500);
  }
}

async function handleRestoreBackup(request: Request, user: AuthUser) {
  const parseResult = await safeJsonParse(request);
  if (!parseResult.success) {
    return createErrorResponse(parseResult.error!, 400);
  }
  if (typeof parseResult.data !== 'object' || parseResult.data === null) {
    return createErrorResponse('Payload invalide', 400);
  }
  interface RestoreBackupPayload { backupId?: string; replaceExisting?: boolean }
  const { backupId, replaceExisting = false } = parseResult.data as RestoreBackupPayload;

  if (!backupId) {
    return createErrorResponse('ID de sauvegarde requis', 400);
  }

  try {
    const restoreOptions = { replaceExisting, includeLogs: true };
    const result = await backupService.restoreBackup(backupId, restoreOptions, user.userId);
    
    return createSuccessResponse({
      message: 'Restauration initiée',
      result
    }, 202); // Accepted - processus asynchrone
  } catch (error) {
    console.error('Erreur lors de la restauration:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de la restauration';
    return createErrorResponse(message, 500);
  }
}

export default backupHandler;