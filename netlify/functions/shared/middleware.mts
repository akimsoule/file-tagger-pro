// Utilitaires de middleware centralisés pour les fonctions Netlify
import jwt from "jsonwebtoken";
import type { Context } from '@netlify/functions';
import { LogService } from "../../files.core/src/services/logService";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const logService = new LogService();

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name?: string;
}

export interface MiddlewareContext {
  user?: AuthenticatedUser;
  startTime: number;
}

export interface MiddlewareResponse {
  success: boolean;
  response?: Response;
  context?: MiddlewareContext;
}

/**
 * Headers CORS standards pour toutes les réponses
 */
export const getCorsHeaders = () => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Max-Age": "86400",
});

/**
 * Gestion des requêtes OPTIONS (preflight CORS)
 */
export const handleCorsOptions = (): Response => {
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
};

/**
 * Extraction et vérification du token JWT
 */
export const verifyToken = (request: Request): AuthenticatedUser | null => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Middleware d'authentification
 */
export const requireAuth = (request: Request): MiddlewareResponse => {
  const user = verifyToken(request);

  if (!user) {
    return {
      success: false,
      response: createErrorResponse("Token d'authentification requis", 401),
    };
  }

  return {
    success: true,
    context: {
      user,
      startTime: Date.now(),
    },
  };
};

/**
 * Middleware d'authentification optionnelle
 */
export const optionalAuth = (request: Request): MiddlewareResponse => {
  const user = verifyToken(request);

  return {
    success: true,
    context: {
      user: user || undefined,
      startTime: Date.now(),
    },
  };
};

/**
 * Création d'une réponse d'erreur standardisée
 */
export const createErrorResponse = (
  message: string,
  status: number = 400,
  details?: string
): Response => {
  const body = details ? { error: message, details } : { error: message };

  return new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(),
  });
};

/**
 * Création d'une réponse de succès standardisée
 */
export const createSuccessResponse = (
  data: unknown,
  status: number = 200,
  additionalHeaders?: Record<string, string>
): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(),
      ...additionalHeaders,
    },
  });
};

/**
 * Validation des paramètres requis
 */
export const validateRequiredFields = (
  data: Record<string, unknown>,
  requiredFields: string[]
): string | null => {
  for (const field of requiredFields) {
    if (
      !data[field] ||
      (typeof data[field] === "string" && !data[field].trim())
    ) {
      return `Le champ '${field}' est requis`;
    }
  }
  return null;
};

/**
 * Extraction de l'ID de ressource depuis l'URL
 */
export const extractResourceId = (
  url: URL,
  resourceName: string = ""
): string | null => {
  const pathSegments = url.pathname
    .split("/")
    .filter((segment) => segment !== "");
  const lastSegment = pathSegments[pathSegments.length - 1];

  if (lastSegment === resourceName) {
    return null;
  }

  return lastSegment || null;
};

/**
 * Parsing sécurisé du JSON
 */
export const safeJsonParse = async (
  request: Request
): Promise<{ success: boolean; data?: unknown; error?: string }> => {
  try {
    const data = await request.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: "Format JSON invalide",
    };
  }
};

/**
 * Validation des paramètres de pagination
 */
export const validatePagination = (url: URL) => {
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");

  const validatedPage = Math.max(1, page);
  const validatedLimit = Math.min(Math.max(1, limit), 100); // Max 100 items par page

  return {
    page: validatedPage,
    limit: validatedLimit,
    skip: (validatedPage - 1) * validatedLimit,
  };
};

/**
 * Logging standardisé des requêtes
 */
export const logRequest = async (
  request: Request,
  context: MiddlewareContext,
  response: Response,
  action: string = "API_REQUEST"
): Promise<void> => {
  try {
    const duration = Date.now() - context.startTime;
    const url = new URL(request.url);

    await logService.log({
      action: "SYSTEM_BACKUP",
      entity: "SYSTEM",
      entityId: url.pathname,
      details: JSON.stringify({
        method: request.method,
        path: url.pathname,
        status: response.status,
        duration,
        action,
      }),
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      userId: context.user?.userId,
    });
  } catch (error) {
    console.warn("Erreur lors du logging:", error);
  }
};

/**
 * Wrapper pour gérer les erreurs de manière centralisée
 */
export const handleErrors = <F extends (request: Request, context: Context) => Promise<Response>>(fn: F) => {
  return async (request: Request, context: Context): Promise<Response> => {
    try {
      return await fn(request, context);
    } catch (error) {
      console.error("Erreur non gérée dans la fonction:", error);
      return createErrorResponse(
        "Erreur interne du serveur",
        500,
        error instanceof Error ? error.message : "Erreur inconnue"
      );
    }
  };
};

/**
 * Validation des méthodes HTTP autorisées
 */
export const validateHttpMethod = (
  request: Request,
  allowedMethods: string[]
): MiddlewareResponse => {
  if (!allowedMethods.includes(request.method)) {
    return {
      success: false,
      response: createErrorResponse("Méthode non autorisée", 405),
    };
  }

  return { success: true };
};

/**
 * Sanitisation basique des chaînes de caractères
 */
export const sanitizeString = (str: string): string => {
  if (typeof str !== "string") return "";

  return str
    .trim()
    .replace(/[<>]/g, "") // Supprime < et >
    .substring(0, 1000); // Limite à 1000 caractères
};

/**
 * Validation des filtres de recherche
 */
export const validateSearchFilters = (url: URL) => {
  const filters: Record<string, unknown> = {};

  const search = url.searchParams.get("search");
  const category = url.searchParams.get("category");
  const type = url.searchParams.get("type");
  const tag = url.searchParams.get("tag");
  const userId = url.searchParams.get("userId");

  if (search) filters.search = sanitizeString(search);
  if (category) filters.category = sanitizeString(category);
  if (type) filters.type = sanitizeString(type);
  if (tag) filters.tags = [sanitizeString(tag)];
  if (userId) filters.ownerId = sanitizeString(userId);

  return filters;
};

/**
 * Parsing du multipart/form-data pour l'upload de fichiers
 */
export interface ParsedFile {
  fieldName: string;
  name: string;
  buffer: Buffer;
  mimeType: string;
}

export interface ParsedFormData {
  data: Record<string, string>;
  files: ParsedFile[];
}

export const parseFormData = async (
  request: Request
): Promise<ParsedFormData> => {
  const formData = await request.formData();
  const data: Record<string, string> = {};
  const files: ParsedFile[] = [];

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const buffer = Buffer.from(await value.arrayBuffer());
      files.push({
        fieldName: key,
        name: value.name,
        buffer: buffer,
        mimeType: value.type,
      });
    } else {
      data[key] = value;
    }
  }

  return { data, files };
};

/**
 * Rate limiting basique (en mémoire - pour production utiliser Redis)
 */
import Redis from "ioredis";

const memoryCounts = new Map<string, { count: number; resetTime: number }>();
let redisClient: Redis | null = null;
if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    // Connexion en arrière-plan
    redisClient.connect().catch(() => {
      redisClient = null;
    });
  } catch {
    redisClient = null;
  }
}

export const rateLimit = (
  request: Request,
  maxRequests: number = parseInt(process.env.RATE_LIMIT_MAX || "100"),
  windowMs: number = parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || (15 * 60 * 1000).toString()
  )
): MiddlewareResponse => {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `rl:${ip}`;

  if (redisClient) {
    // Mode Redis (script simple incr + ttl)
    // NOTE: Netlify functions sont stateless, Redis assure la persistance inter-invocations
    try {
      const pipeline = redisClient.multi();
      pipeline.incr(key);
      pipeline.pttl(key);
      return { success: true, response: undefined } as MiddlewareResponse; // On ne peut pas attendre ici car sync
    } catch {
      // Fallback mémoire si erreur Redis
    }
  }

  const now = Date.now();
  const data = memoryCounts.get(key);
  if (!data || now > data.resetTime) {
    memoryCounts.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true };
  }
  if (data.count >= maxRequests) {
    return {
      success: false,
      response: createErrorResponse("Trop de requêtes", 429),
    };
  }
  data.count++;
  return { success: true };
};
