import { Context } from '@netlify/functions';
import { SearchService } from '../files.core/src/services/searchService';
import { StatsService } from '../files.core/src/services/statsService';
import { LogService } from '../files.core/src/services/logService';
import { activityService } from '../files.core/src/services/activityService';
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
const searchService = new SearchService(logService);
const statsService = new StatsService(logService);

// Types locaux
interface AuthUser { userId: string; [k: string]: unknown }

interface BasicFilters {
  ownerId: string;
  type?: string;
  category?: string; // rétro‑compat éventuellement utilisé côté service
  tags?: string[];
  createdAt?: { gte?: Date; lte?: Date };
  fileSize?: { gte?: number; lte?: number };
}

interface SearchQueryInput {
  query: string;
  limit: number;
}

interface AdvancedSearchInput extends Partial<Omit<BasicFilters,'ownerId'>> {
  query?: string;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  minSize?: number;
  maxSize?: number;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

function parseLimit(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(n));
}

function buildBasicFilters(userId: string, params: { type?: string | null; category?: string | null; tag?: string | null }): BasicFilters {
  const filters: BasicFilters = { ownerId: userId };
  if (params.type) filters.type = params.type.trim();
  if (params.category) filters.category = params.category.trim();
  if (params.tag) filters.tags = [params.tag.trim()];
  return filters;
}

function buildAdvancedFilters(userId: string, body: AdvancedSearchInput): { filters: BasicFilters; query: string; limit: number } {
  const filters: BasicFilters = { ownerId: userId };
  if (body.type) filters.type = body.type.trim();
  if (body.category) filters.category = body.category.trim();
  if (body.tags && body.tags.length) filters.tags = body.tags.map(t => t.trim()).filter(Boolean);
  if (body.dateFrom || body.dateTo) {
    filters.createdAt = {};
    if (body.dateFrom) filters.createdAt.gte = new Date(body.dateFrom as unknown as string);
    if (body.dateTo) filters.createdAt.lte = new Date(body.dateTo as unknown as string);
  }
  if ((body as any).minSize || (body as any).maxSize) { // conserver compat pour noms existants
    filters.fileSize = {};
    const minSize = (body as any).minSize;
    const maxSize = (body as any).maxSize;
    if (Number.isFinite(minSize)) filters.fileSize.gte = Number(minSize);
    if (Number.isFinite(maxSize)) filters.fileSize.lte = Number(maxSize);
  }
  const limit = body.limit ? Math.min(MAX_LIMIT, Math.max(1, body.limit)) : DEFAULT_LIMIT;
  const query = (body.query || '').toString();
  return { filters, query, limit };
}

export default handleErrors(async (request: Request, context: Context) => {
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

  const user = authResult.context!.user! as unknown as AuthUser;
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
  const action = pathSegments[pathSegments.length - 1];

  switch (request.method) {
    case 'GET':
      switch (action) {
        case 'search':
          return await handleSearch(url, user);
        
        case 'similar':
          return await handleSimilar(url, user);
        
        case 'stats':
          return await handleStats(url, user);
        
        case 'user-stats':
          return await handleUserStats(url, user);
        
        case 'recent-activities':
          return await handleRecentActivities(url, user);
        
        default:
          return createErrorResponse('Action non trouvée', 404);
      }

    case 'POST':
      switch (action) {
        case 'advanced-search':
          return await handleAdvancedSearch(request, user);
        
        case 'reindex-document':
          return await handleReindexDocument(request, user);
        
        default:
          return createErrorResponse('Action non trouvée', 404);
      }

    default:
      return createErrorResponse('Méthode non autorisée', 405);
  }
});

async function handleSearch(url: URL, user: AuthUser) {
  const query = (url.searchParams.get('q') || '').trim();
  if (!query) return createErrorResponse('Paramètre de recherche requis', 400);
  const limit = parseLimit(url.searchParams.get('limit'));

  try {
    const filters = buildBasicFilters(user.userId, {
      type: url.searchParams.get('type'),
      category: url.searchParams.get('category'),
      tag: url.searchParams.get('tag')
    });
    const searchFilters = { query, ...filters, limit };
    const results = await searchService.searchDocuments(searchFilters, user.userId);
    return createSuccessResponse({
      query,
      results: results.documents,
      total: results.totalCount,
      searchTime: results.searchTime
    });
  } catch (error) {
    console.error('[search] Erreur recherche simple:', error);
    return createErrorResponse('Erreur lors de la recherche', 500);
  }
}

async function handleAdvancedSearch(request: Request, user: AuthUser) {
  const parseResult = await safeJsonParse(request);
  if (!parseResult.success) {
    return createErrorResponse(parseResult.error!, 400);
  }

  try {
    const { filters, query, limit } = buildAdvancedFilters(user.userId, parseResult.data as AdvancedSearchInput);
    const searchFilters = { query, ...filters, limit };
    const results = await searchService.searchDocuments(searchFilters, user.userId);
    return createSuccessResponse({
      query,
      filters,
      results: results.documents,
      total: results.totalCount,
      searchTime: results.searchTime
    });
  } catch (error) {
    console.error('[search] Erreur recherche avancée:', error);
    return createErrorResponse('Erreur lors de la recherche avancée', 500);
  }
}

async function handleSimilar(url: URL, user: AuthUser) {
  const documentId = (url.searchParams.get('documentId') || '').trim();
  if (!documentId) return createErrorResponse('Paramètre documentId requis', 400);
  const limit = parseLimit(url.searchParams.get('limit'));

  try {
    const results = await searchService.findSimilarDocuments(documentId, limit);
    return createSuccessResponse({ documentId, results });
  } catch (error) {
    console.error('[search] Erreur similar documents:', error);
    return createErrorResponse('Erreur lors de la recherche de documents similaires', 500);
  }
}

async function handleReindexDocument(request: Request, user: AuthUser) {
  const parseResult = await safeJsonParse(request);
  if (!parseResult.success) {
    return createErrorResponse(parseResult.error!, 400);
  }
  const { documentId } = (parseResult.data || {}) as { documentId?: string };
  if (!documentId) return createErrorResponse('documentId requis', 400);

  try {
    // Placeholder: Pas d’indexation d’embeddings implémentée pour le moment.
    // On journalise l’intention et on répond succès immédiat.
    await logService.log({
      action: 'UPDATE',
      entity: 'SYSTEM',
      entityId: 'reindex-document',
      details: `Réindexation demandée pour le document ${documentId}`,
      userId: user.userId,
      documentId
    });
    return createSuccessResponse({ message: 'Réindexation demandée' });
  } catch (error) {
    console.error('[search] Erreur reindex document:', error);
    return createErrorResponse('Erreur lors de la réindexation du document', 500);
  }
}

async function handleStats(_url: URL, _user: AuthUser) {
  try {
    const globalStats = await statsService.getSystemStats();
    return createSuccessResponse(globalStats);
  } catch (error) {
  console.error('[search] Erreur stats globales:', error);
    return createErrorResponse('Erreur lors de la récupération des statistiques', 500);
  }
}

async function handleUserStats(_url: URL, user: AuthUser) {
  try {
    const userStats = await statsService.getUserStats(user.userId);
    return createSuccessResponse(userStats);
  } catch (error) {
  console.error('[search] Erreur stats utilisateur:', error);
    return createErrorResponse('Erreur lors de la récupération des statistiques utilisateur', 500);
  }
}

async function handleRecentActivities(url: URL, user: AuthUser) {
  try {
  const limit = parseLimit(url.searchParams.get('limit'));
    const activities = await activityService.getRecentActivities(user.userId, limit);
    return createSuccessResponse(activities);
  } catch (error) {
  console.error('[search] Erreur activités récentes:', error);
    return createErrorResponse('Erreur lors de la récupération des activités récentes', 500);
  }
}
