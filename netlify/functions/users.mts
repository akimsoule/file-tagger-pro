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

  const user = authResult.context!.user!;
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

async function handleGetProfile(user: any) {
  try {
    const userProfile = await userService.getUserById(user.userId);
    if (!userProfile) {
      return createErrorResponse('Utilisateur non trouvé', 404);
    }
    return createSuccessResponse(userProfile);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return createErrorResponse('Erreur lors de la récupération du profil', 500);
  }
}

async function handleGetPreferences(user: any) {
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
    console.error('Erreur lors de la récupération des préférences:', error);
    return createErrorResponse('Erreur lors de la récupération des préférences', 500);
  }
}

async function handleUpdateProfile(request: Request, user: any) {
  const parseResult = await safeJsonParse(request);
  if (!parseResult.success) {
    return createErrorResponse(parseResult.error!, 400);
  }

  const { name, email, password } = parseResult.data;

  const updateData: any = {};
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
    console.error('Erreur lors de la mise à jour du profil:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour';
    return createErrorResponse(message, 400);
  }
}

async function handleUpdatePreferences(request: Request, user: any) {
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
    console.error('Erreur lors de la mise à jour des préférences:', error);
    return createErrorResponse('Erreur lors de la mise à jour des préférences', 500);
  }
}

async function handleDeleteAccount(user: any) {
  try {
    await userService.deleteUser(user.userId);
    return createSuccessResponse({
      message: 'Compte supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du compte:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de la suppression';
    return createErrorResponse(message, 400);
  }
}
