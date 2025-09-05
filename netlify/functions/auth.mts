import { Context } from '@netlify/functions';
import { UserService } from '../files.core/src/services/userService';
import { LogService } from '../files.core/src/services/logService';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../files.core/src/services/database';
import {
  handleCorsOptions,
  createErrorResponse,
  createSuccessResponse,
  validateRequiredFields,
  safeJsonParse,
  handleErrors
} from './shared/middleware.mts';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

// Initialisation des services
const logService = new LogService();
const userService = new UserService(logService);

const authHandler = handleErrors(async (request: Request, context: Context) => {
  // Gestion CORS
  if (request.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  // Validation méthode HTTP
  if (request.method !== 'POST') {
    return createErrorResponse('Méthode non autorisée', 405);
  }

  const url = new URL(request.url);
  const action = url.pathname.split('/').pop();

  switch (action) {
    case 'login':
      return await handleLogin(request);

    case 'register':
      return await handleRegister(request);

    case 'refresh':
      return await handleRefreshToken(request);

    case 'verify':
      return await handleVerifyToken(request);

    default:
      return createErrorResponse('Action non trouvée', 404);
  }
});

async function handleLogin(request: Request) {
  const jsonParse = await safeJsonParse(request);
  if (!jsonParse.success) {
    return createErrorResponse(jsonParse.error!, 400);
  }

  const body = jsonParse.data;
  const validationError = validateRequiredFields(body, ['email', 'password']);
  if (validationError) {
    return createErrorResponse(validationError, 400);
  }

  const { email, password } = body;

  try {
    // Rechercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      return createErrorResponse('Identifiants invalides', 401);
    }

    // Générer le token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Retourner les données de l'utilisateur sans le mot de passe
    const { passwordHash, ...userWithoutPassword } = user;

    return createSuccessResponse({
      message: 'Connexion réussie',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return createErrorResponse('Erreur lors de la connexion', 500);
  }
}

async function handleRegister(request: Request) {
  const jsonParse = await safeJsonParse(request);
  if (!jsonParse.success) {
    return createErrorResponse(jsonParse.error!, 400);
  }

  const body = jsonParse.data;
  const validationError = validateRequiredFields(body, ['email', 'name', 'password']);
  if (validationError) {
    return createErrorResponse(validationError, 400);
  }

  const { email, name, password } = body;

  if (password.length < 6) {
    return createErrorResponse('Le mot de passe doit contenir au moins 6 caractères', 400);
  }

  try {
    const user = await userService.createUser({ email, name, password });

    // Générer le token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return createSuccessResponse({
      message: 'Inscription réussie',
      token,
      user
    }, 201);

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'inscription';
    return createErrorResponse(message, 400);
  }
}

async function handleRefreshToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createErrorResponse('Token requis', 401);
  }

  const token = authHeader.substring(7);

  try {
    // Vérifier le token même s'il est expiré pour récupérer les données utilisateur
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as any;
    
    // Vérifier que l'utilisateur existe toujours
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return createErrorResponse('Utilisateur non trouvé', 404);
    }

    // Générer un nouveau token
    const newToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return createSuccessResponse({
      message: 'Token rafraîchi',
      token: newToken,
      user
    });

  } catch (error) {
    return createErrorResponse('Token invalide', 401);
  }
}

async function handleVerifyToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createErrorResponse('Token requis', 401);
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Vérifier que l'utilisateur existe toujours
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return createErrorResponse('Utilisateur non trouvé', 404);
    }

    return createSuccessResponse({
      valid: true,
      user
    });

  } catch (error) {
    return createErrorResponse('Token invalide ou expiré', 401);
  }
}

export default authHandler;
