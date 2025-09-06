import { Context } from '@netlify/functions';
import { EmbeddingService } from '../files.core/src/services/embeddingService';
import { EmbeddingGenerator } from '../files.core/src/services/embeddingGenerator';
import {
  handleCorsOptions,
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
  validateHttpMethod,
  safeJsonParse,
  handleErrors
} from './shared/middleware.mts';

const embeddingService = new EmbeddingService();

interface AuthUser { userId: string }

export default handleErrors(async (request: Request, _context: Context) => {
  if (request.method === 'OPTIONS') return handleCorsOptions();
  const methodValidation = validateHttpMethod(request, ['GET','POST']);
  if (!methodValidation.success) return methodValidation.response!;

  const auth = requireAuth(request);
  if (!auth.success) return auth.response!;
  const user = auth.context!.user as unknown as AuthUser;

  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const action = parts[parts.length - 1];

  if (request.method === 'POST') {
    if (action === 'upsert') {
      const parsed = await safeJsonParse(request);
      if (!parsed.success) return createErrorResponse(parsed.error!, 400);
      const { documentId, embedding, model } = parsed.data as { documentId: string; embedding: number[]; model?: string };
      if (!documentId || !Array.isArray(embedding)) return createErrorResponse('documentId et embedding requis', 400);
      const res = await embeddingService.upsertEmbedding({ documentId, embedding, model: model || 'local-embedding' });
      return createSuccessResponse(res, 201);
    }
    if (action === 'reindex') {
      const parsed = await safeJsonParse(request);
      let documentId = (parsed.success ? (parsed.data as any)?.documentId : undefined) as string | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!documentId) {
        const url = new URL(request.url);
        documentId = url.searchParams.get('documentId') || undefined;
      }
      if (!documentId) return createErrorResponse('documentId requis', 400);
      const gen = new EmbeddingGenerator();
      const res = await gen.generateForDocument(documentId);
      return createSuccessResponse({ message: 'Réindexation lancée', ...res });
    }
    if (action === 'similar-vector') {
      const parsed = await safeJsonParse(request);
      if (!parsed.success) return createErrorResponse(parsed.error!, 400);
      const { vector, limit } = parsed.data as { vector: number[]; limit?: number };
      if (!Array.isArray(vector)) return createErrorResponse('vector requis', 400);
      const results = await embeddingService.findSimilarByVector(vector, limit || 5, user.userId);
      return createSuccessResponse({ results });
    }
    return createErrorResponse('Action non trouvée', 404);
  }

  if (request.method === 'GET') {
    if (action === 'similar') {
      // /semantic/similar?documentId=...&limit=5
      const documentId = url.searchParams.get('documentId');
      const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit')) || 5));
      if (!documentId) return createErrorResponse('documentId requis', 400);
      const results = await embeddingService.findSimilarByDocument(documentId, limit, user.userId);
      return createSuccessResponse({ documentId, limit, results });
    }
    return createErrorResponse('Action non trouvée', 404);
  }

  return createErrorResponse('Méthode non autorisée', 405);
});
