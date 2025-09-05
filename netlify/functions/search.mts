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

  const user = authResult.context!.user!;
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
  const action = pathSegments[pathSegments.length - 1];

  switch (request.method) {
    case 'GET':
      switch (action) {
        case 'search':
          return await handleSearch(url, user);
        
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
        
        default:
          return createErrorResponse('Action non trouvée', 404);
      }

    default:
      return createErrorResponse('Méthode non autorisée', 405);
  }
});

async function handleSearch(url: URL, user: any) {
  const query = url.searchParams.get('q') || '';
  const type = url.searchParams.get('type');
  const category = url.searchParams.get('category');
  const tag = url.searchParams.get('tag');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  if (!query.trim()) {
    return createErrorResponse('Paramètre de recherche requis', 400);
  }

  try {
    const filters: any = { ownerId: user.userId };
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (tag) filters.tags = [tag];

    const searchFilters = {
      query,
      ...filters,
      limit
    };

    const results = await searchService.searchDocuments(searchFilters, user.userId);
    
    return createSuccessResponse({
      query,
      results: results.documents,
      total: results.totalCount,
      searchTime: results.searchTime
    });

  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    return createErrorResponse('Erreur lors de la recherche', 500);
  }
}

async function handleAdvancedSearch(request: Request, user: any) {
  const parseResult = await safeJsonParse(request);
  if (!parseResult.success) {
    return createErrorResponse(parseResult.error!, 400);
  }

  const {
    query,
    type,
    category,
    tags,
    dateFrom,
    dateTo,
    minSize,
    maxSize,
    limit = 20
  } = parseResult.data;

  try {
    const filters: any = { ownerId: user.userId };
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (tags && tags.length > 0) filters.tags = tags;
    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) filters.createdAt.gte = new Date(dateFrom);
      if (dateTo) filters.createdAt.lte = new Date(dateTo);
    }
    if (minSize || maxSize) {
      filters.fileSize = {};
      if (minSize) filters.fileSize.gte = minSize;
      if (maxSize) filters.fileSize.lte = maxSize;
    }

    const searchFilters = {
      query: query || '',
      ...filters,
      limit
    };

    const results = await searchService.searchDocuments(searchFilters, user.userId);
    
    return createSuccessResponse({
      query,
      filters,
      results: results.documents,
      total: results.totalCount,
      searchTime: results.searchTime
    });

  } catch (error) {
    console.error('Erreur lors de la recherche avancée:', error);
    return createErrorResponse('Erreur lors de la recherche avancée', 500);
  }
}

async function handleStats(url: URL, user: any) {
  try {
    const globalStats = await statsService.getSystemStats();
    
    return createSuccessResponse(globalStats);

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return createErrorResponse('Erreur lors de la récupération des statistiques', 500);
  }
}

async function handleUserStats(url: URL, user: any) {
  try {
    const userStats = await statsService.getUserStats(user.userId);
    
    return createSuccessResponse(userStats);

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques utilisateur:', error);
    return createErrorResponse('Erreur lors de la récupération des statistiques utilisateur', 500);
  }
}

async function handleRecentActivities(url: URL, user: any) {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    const activities = await activityService.getRecentActivities(user.userId, limit);
    
    return createSuccessResponse(activities);

  } catch (error) {
    console.error('Erreur lors de la récupération des activités récentes:', error);
    return createErrorResponse('Erreur lors de la récupération des activités récentes', 500);
  }
}
