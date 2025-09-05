import { Context } from '@netlify/functions';
import prisma from '../files.core/src/services/database';
import {
  handleCorsOptions,
  requireAuth,
  createErrorResponse,
  createSuccessResponse,
  validateHttpMethod,
  sanitizeString,
  handleErrors
} from './shared/middleware.mts';

// Type attendu depuis le front: [{ id: string, data: { ...partial document fields... } }]
interface IncomingItem {
  id: string;
  data: Record<string, unknown>;
}

const ALLOWED_FIELDS = new Set(['name','type','description','tags','isFavorite']);
const MAX_BATCH = 100; // sécurité

const bulkSyncHandler = handleErrors(async (request: Request, _context: Context) => {
  // CORS preflight
  if (request.method === 'OPTIONS') return handleCorsOptions();

  const methodValidation = validateHttpMethod(request, ['POST']);
  if (!methodValidation.success) return methodValidation.response!;

  const authResult = requireAuth(request);
  if (!authResult.success) return authResult.response!;
  const user = authResult.context!.user!;

  // Lecture corps (accept beacon content-type text/plain)
  let raw: string;
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      raw = await request.text();
    } else {
      // Beacon souvent text/plain
      raw = await request.text();
    }
  } catch {
    return createErrorResponse('Corps de requête illisible', 400);
  }

  let items: IncomingItem[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Payload non tableau');
    items = parsed as IncomingItem[];
  } catch (e) {
    return createErrorResponse('Payload JSON invalide', 400, e instanceof Error ? e.message : undefined);
  }

  if (items.length === 0) {
    return createSuccessResponse({ updated: 0, skipped: 0, errors: [] });
  }
  if (items.length > MAX_BATCH) {
    return createErrorResponse(`Taille lot trop grande (max ${MAX_BATCH})`, 413);
  }

  // Récupérer les documents appartenant à l'utilisateur
  const ids = items.map(i => i.id).filter(id => typeof id === 'string');
  const existing = await prisma.document.findMany({
    where: { id: { in: ids }, ownerId: user.userId },
    select: { id: true, ownerId: true }
  });
  const existingMap = new Map(existing.map(d => [d.id, true]));

  let updated = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const item of items) {
    if (!item?.id || typeof item.id !== 'string') {
      errors.push({ id: '(inconnu)', error: 'ID manquant' });
      continue;
    }
    if (!existingMap.has(item.id)) {
      errors.push({ id: item.id, error: 'Document introuvable ou non autorisé' });
      continue;
    }
    if (!item.data || typeof item.data !== 'object') {
      errors.push({ id: item.id, error: 'Données invalides' });
      continue;
    }
    // Construire payload sécurisé
    const updateData: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const [k,v] of Object.entries(item.data)) {
      if (!ALLOWED_FIELDS.has(k)) continue;
      if (k === 'tags' && typeof v === 'string') {
        updateData.tags = v.split(',').map(t => sanitizeString(t)).filter(Boolean).join(',');
      } else if (k === 'name' || k === 'type' || k === 'description') {
        if (typeof v === 'string') updateData[k] = sanitizeString(v);
      } else if (k === 'isFavorite') {
        if (typeof v === 'boolean') updateData.isFavorite = v;
      }
    }
    if (Object.keys(updateData).length === 0) {
      // rien à appliquer
      continue;
    }
    try {
      await prisma.document.update({ where: { id: item.id }, data: updateData });
      updated++;
    } catch (e) {
      errors.push({ id: item.id, error: e instanceof Error ? e.message : 'Erreur inconnue' });
    }
  }

  return createSuccessResponse({ updated, skipped: items.length - updated - errors.length, errors });
});

export default bulkSyncHandler;
export const config = { path: '/bulk-sync-docs' };