import { Context } from '@netlify/functions';
import { userMegaConfigService } from '../files.core/src/services/userMegaConfigService';
import { verifyToken } from './shared/middleware.mts';

/**
 * Netlify Function pour gérer les configurations MEGA des utilisateurs
 */
export default async function handler(request: Request, context: Context): Promise<Response> {
  const { url, method } = request;
  const urlPath = new URL(url);
  const segments = urlPath.pathname.split('/').filter(Boolean);

  // Authentification requise pour toutes les routes
  let userId: string;
  try {
    const user = verifyToken(request);
    if (!user) {
      throw new Error('Token invalide');
    }
    userId = user.userId;
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Token d\'authentification invalide' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    switch (method) {
      case 'GET':
        // GET /user-mega-config - Récupérer la configuration MEGA de l'utilisateur
        return await getUserMegaConfig(userId);

      case 'POST':
        // POST /user-mega-config - Créer/mettre à jour la configuration MEGA
        return await upsertUserMegaConfig(request, userId);

      case 'PUT':
        // PUT /user-mega-config/toggle - Activer/désactiver la configuration
        return await toggleUserMegaConfig(request, userId);

      case 'DELETE':
        // DELETE /user-mega-config - Supprimer la configuration MEGA
        return await deleteUserMegaConfig(userId);

      default:
        return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Erreur dans user-mega-config API:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Récupère la configuration MEGA de l'utilisateur
 */
async function getUserMegaConfig(userId: string): Promise<Response> {
  const config = await userMegaConfigService.getUserMegaConfig(userId);
  
  if (!config) {
    return new Response(JSON.stringify({ 
      hasConfig: false,
      message: 'Aucune configuration MEGA trouvée' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    hasConfig: true,
    config: {
      id: config.id,
      email: config.email,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Crée ou met à jour la configuration MEGA de l'utilisateur
 */
async function upsertUserMegaConfig(request: Request, userId: string): Promise<Response> {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return new Response(JSON.stringify({ 
      error: 'Email et mot de passe MEGA requis' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validation basique de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new Response(JSON.stringify({ 
      error: 'Format d\'email invalide' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const config = await userMegaConfigService.upsertUserMegaConfig(userId, {
    email,
    password,
    isActive: true
  });

  return new Response(JSON.stringify({
    message: 'Configuration MEGA mise à jour avec succès',
    config: {
      id: config.id,
      email: config.email,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Active/désactive la configuration MEGA de l'utilisateur
 */
async function toggleUserMegaConfig(request: Request, userId: string): Promise<Response> {
  const body = await request.json();
  const { isActive } = body;

  if (typeof isActive !== 'boolean') {
    return new Response(JSON.stringify({ 
      error: 'isActive doit être un booléen' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const config = await userMegaConfigService.toggleUserMegaConfig(userId, isActive);

  if (!config) {
    return new Response(JSON.stringify({ 
      error: 'Configuration MEGA non trouvée' 
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    message: `Configuration MEGA ${isActive ? 'activée' : 'désactivée'} avec succès`,
    config: {
      id: config.id,
      email: config.email,
      isActive: config.isActive,
      updatedAt: config.updatedAt,
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Supprime la configuration MEGA de l'utilisateur
 */
async function deleteUserMegaConfig(userId: string): Promise<Response> {
  await userMegaConfigService.deleteUserMegaConfig(userId);

  return new Response(JSON.stringify({
    message: 'Configuration MEGA supprimée avec succès'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
