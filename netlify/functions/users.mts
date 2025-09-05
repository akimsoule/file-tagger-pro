import { Context } from '@netlify/functions';
import { UserService } from '../files.core/src/services/userService';
import { LogService } from '../files.core/src/services/logService';
import {
  handleCorsOptions,
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
  validateHttpMethod,
  safeJsonParse,
  sanitizeString,
  handleErrors
} from './shared/middleware.mts';

// Initialisation des services
const logService = new LogService();
const userService = new UserService(logService);

export default handleErrors(async (request: Request, context: Context) => {
  // Gestion CORS
  if (request.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  // Validation de la méthode HTTP
  const methodValidation = validateHttpMethod(request, ['GET', 'PUT', 'DELETE']);
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
        case 'profile':
          return await handleGetProfile(user);

        case 'preferences':
          return await handleGetPreferences(user);

        default:
          return createErrorResponse('Action non trouvée', 404);
      }

    case 'PUT':
      switch (action) {
        case 'profile':
          return await handleUpdateProfile(request, user);

        case 'preferences':
          return await handleUpdatePreferences(request, user);

        default:
          return createErrorResponse('Action non trouvée', 404);
      }

    case 'DELETE':
      if (action === 'account') {
        return await handleDeleteAccount(user);
      } else {
        return createErrorResponse('Action non trouvée', 404);
      }

    default:
      return createErrorResponse('Méthode non autorisée', 405);
  }
});

interface AuthUser { userId: string }

async function handleGetProfile(user: AuthUser) {
  try {
    const userProfile = await userService.getUserById(user.userId);
    if (!userProfile) {
      return createErrorResponse('Utilisateur non trouvé', 404);
    }
    return createSuccessResponse(userProfile);
  } catch (error) {
  console.error('[users] Erreur profil:', error);
    return createErrorResponse('Erreur lors de la récupération du profil', 500);
  }
}

async function handleGetPreferences(_user: AuthUser) {
  try {
    // Récupérer les préférences de l'utilisateur (à implémenter dans UserService)
    const defaultPreferences = {
      theme: 'auto',
      language: 'fr',
      notifications: true,
      autoSave: true
    };
    
    return createSuccessResponse({
      message: 'Préférences utilisateur à implémenter',
      preferences: defaultPreferences
    });
  } catch (error) {
  console.error('[users] Erreur préférences get:', error);
    return createErrorResponse('Erreur lors de la récupération des préférences', 500);
  }
}

async function handleUpdateProfile(request: Request, user: AuthUser) {
  const parseResult = await safeJsonParse(request);
  if (!parseResult.success) {
    return createErrorResponse(parseResult.error!, 400);
  }

  const { name, email, password } = parseResult.data as { name?: string; email?: string; password?: string };

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = sanitizeString(name);
  if (email) updateData.email = sanitizeString(email);
  if (password) updateData.password = password;

  if (Object.keys(updateData).length === 0) {
    return createErrorResponse('Aucune donnée à mettre à jour', 400);
  }

  try {
    const updatedUser = await userService.updateUser(user.userId, updateData);
    return createSuccessResponse(updatedUser);
  } catch (error) {
  console.error('[users] Erreur update profil:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour';
    return createErrorResponse(message, 400);
  }
}

async function handleUpdatePreferences(request: Request, _user: AuthUser) {
  const parseResult = await safeJsonParse(request);
  if (!parseResult.success) {
    return createErrorResponse(parseResult.error!, 400);
  }

  try {
    // Mettre à jour les préférences (à implémenter dans UserService)
    return createSuccessResponse({
      message: 'Préférences mises à jour (fonctionnalité à implémenter)',
      preferences: parseResult.data
    });
  } catch (error) {
  console.error('[users] Erreur update préférences:', error);
    return createErrorResponse('Erreur lors de la mise à jour des préférences', 500);
  }
}

async function handleDeleteAccount(user: AuthUser) {
  try {
    await userService.deleteUser(user.userId);
    return createSuccessResponse({
      message: 'Compte supprimé avec succès'
    });
  } catch (error) {
  console.error('[users] Erreur suppression compte:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de la suppression';
    return createErrorResponse(message, 400);
  }
}
