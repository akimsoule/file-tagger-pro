import { getCorsHeaders, createSuccessResponse, createErrorResponse } from './shared/middleware.mts';
import prisma from '../files.core/src/services/database';
import Redis from 'ioredis';

// Optionnel: test connexion Redis si REDIS_URL défini
let redis: Redis | null = null;
if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  } catch {
    redis = null;
  }
}

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: getCorsHeaders() });
  }
  if (request.method !== 'GET') {
    return createErrorResponse('Méthode non autorisée', 405);
  }
  const start = Date.now();
  let dbOk = false;
  let redisOk = !redis; // true si pas configuré
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {}
  if (redis) {
    try {
      await redis.ping();
      redisOk = true;
    } catch {}
  }
  return createSuccessResponse({
    status: dbOk && redisOk ? 'ok' : 'degraded',
    uptime: process.uptime(),
    durationMs: Date.now() - start,
    db: dbOk ? 'up' : 'down',
    redis: redis ? (redisOk ? 'up' : 'down') : 'not_configured'
  });
}

export const config = { path: '/health' };