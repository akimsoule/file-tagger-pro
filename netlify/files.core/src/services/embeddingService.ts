import prisma from "./database";
import { MegaStorageService } from "./megaStorage";
import crypto from "crypto";
import Redis from "ioredis";

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// parseEmbedding supprimé (non utilisé)

const VECTOR_STORAGE = "mega" as const; // enforced: MEGA-only storage
const redisUrl = process.env.REDIS_URL;
let redis: Redis | null = null;
if (redisUrl) {
  try {
    redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    redis.connect().catch(() => undefined);
  } catch {
    redis = null;
  }
}

// In-memory cache fallback with TTL (per warm function instance)
const CACHE_TTL_MS = parseInt(
  process.env.EMBED_CACHE_TTL_MS || (24 * 60 * 60 * 1000).toString()
);
const CANDIDATES_LIMIT = parseInt(process.env.EMBED_CANDIDATES || "300");
const DL_CONCURRENCY = Math.max(
  1,
  Math.min(16, parseInt(process.env.EMBED_DL_CONCURRENCY || "4"))
);
const memoryCache = new Map<string, { expires: number; vec: number[] }>();

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length) as unknown as R[];
  let nextIndex = 0;
  const workers = new Array(Math.min(limit, items.length))
    .fill(0)
    .map(async () => {
      while (true) {
        const i = nextIndex++;
        if (i >= items.length) break;
        results[i] = await mapper(items[i], i);
      }
    });
  await Promise.all(workers);
  return results;
}

export class EmbeddingService {
  private mega = new MegaStorageService();

  private cacheKey(docId: string) {
    return `emb:${docId}`;
  }

  private checksum(vec: number[]) {
    return crypto.createHash("sha1").update(JSON.stringify(vec)).digest("hex");
  }

  async upsertEmbedding(params: {
    documentId: string;
    embedding: number[];
    model: string;
  }): Promise<{ documentId: string; dim: number; model: string }> {
    const { documentId, embedding, model } = params;
    if (!documentId || !embedding || embedding.length === 0) {
      throw new Error("documentId et embedding requis");
    }

    // Vérifier existence du document
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, ownerId: true },
    });
    if (!doc) throw new Error("Document non trouvé");

    const dim = embedding.length;
    let megaFileId: string | undefined = undefined;
    const checksum = this.checksum(embedding);

    // Stocker en fichier JSON compact sur MEGA (MEGA-only)
    const filename = `embedding_${documentId}.json`;
    const buffer = Buffer.from(
      JSON.stringify({ model, dim, v: embedding }),
      "utf8"
    );
    const mime = "application/json";
    // Stratégie “replace”: jamais d'update direct (non fiable). On nettoie puis on ré-upload.
    const existing = await prisma.documentEmbedding.findUnique({
      where: { documentId },
      select: { megaFileId: true },
    });
    const embeddingsFolderId = await this.mega.ensureEmbeddingsFolder(
      doc.ownerId
    );
    // 1) Tenter de supprimer l'ancien fichier par ID si on l'a
    if (existing?.megaFileId) {
      await this.mega
        .deleteFile(existing.megaFileId, doc.ownerId)
        .catch(() => undefined);
    }
    // 2) Purger tout doublon homonyme résiduel dans le dossier embeddings
    await this.mega
      .deleteFilesInFolderByName(embeddingsFolderId, filename, doc.ownerId)
      .catch(() => undefined);
    // 3) Upload unique du nouveau contenu
    console.log(
      `[embeddings] Uploading embedding for doc ${documentId} (owner ${doc.ownerId}) to MEGA folder ${embeddingsFolderId}`
    );
    megaFileId = await this.mega.uploadFile(
      filename,
      mime,
      buffer,
      embeddingsFolderId,
      doc.ownerId
    );
    console.log(
      `[embeddings] Uploaded embedding file ${filename} -> MEGA fileId ${megaFileId}`
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      dim,
      model,
      storageMode: VECTOR_STORAGE,
      megaFileId,
      checksum,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createData: any = {
      documentId,
      dim,
      model,
      storageMode: VECTOR_STORAGE,
      megaFileId,
      checksum,
    };

    await prisma.documentEmbedding.upsert({
      where: { documentId },
      update: updateData,
      create: createData,
    });

    // cache
    const key = this.cacheKey(documentId);
    const payload = JSON.stringify(embedding);
    if (redis) {
      await redis
        .set(key, payload, "EX", Math.floor(CACHE_TTL_MS / 1000))
        .catch(() => undefined);
    } else {
      memoryCache.set(key, {
        expires: Date.now() + CACHE_TTL_MS,
        vec: embedding.slice(),
      });
    }
    return { documentId, dim, model };
  }

  private async getEmbeddingVector(
    documentId: string
  ): Promise<number[] | null> {
    const key = this.cacheKey(documentId);
    // Memory cache first
    const mc = memoryCache.get(key);
    if (mc && mc.expires > Date.now()) {
      return mc.vec.slice();
    } else if (mc) {
      memoryCache.delete(key);
    }

    if (redis) {
      const cached = await redis.get(key).catch(() => null);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          /* noop */
        }
      }
    }
    const row = await prisma.documentEmbedding.findUnique({
      where: { documentId },
    });
    if (!row) return null;
    const anyRow = row as unknown as {
      embedding?: string | null;
      megaFileId?: string | null;
    };
    if (anyRow.embedding) {
      try {
        const vec = JSON.parse(anyRow.embedding);
        if (Array.isArray(vec)) return vec.map(Number);
      } catch {
        /* noop */
      }
    }
    if (anyRow.megaFileId) {
      // Télécharger depuis MEGA et mettre en cache
      const owner = await prisma.document.findUnique({
        where: { id: documentId },
        select: { ownerId: true },
      });
      if (!owner) return null;
      const buf = await this.mega.downloadFile(
        anyRow.megaFileId,
        owner.ownerId
      );
      try {
        const json = JSON.parse(buf.toString("utf8")) as { v: number[] };
        if (Array.isArray(json.v)) {
          // cache
          const payload = JSON.stringify(json.v);
          if (redis)
            await redis
              .set(key, payload, "EX", Math.floor(CACHE_TTL_MS / 1000))
              .catch(() => undefined);
          else
            memoryCache.set(key, {
              expires: Date.now() + CACHE_TTL_MS,
              vec: json.v.slice(),
            });
          return json.v.map(Number);
        }
      } catch {
        /* noop */
      }
    }
    return null;
  }

  async findSimilarByDocument(documentId: string, limit = 5, ownerId?: string) {
    const v = await this.getEmbeddingVector(documentId);
    if (!v) throw new Error("Embedding introuvable pour ce document");
    // On limite la fenêtre de candidats pour éviter trop de downloads MEGA
    const candidates = (await prisma.documentEmbedding.findMany({
      where: ownerId
        ? { document: { ownerId }, documentId: { not: documentId } }
        : { documentId: { not: documentId } },
      take: 300, // éviter trop de téléchargements
      include: {
        document: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true,
            description: true,
            tags: true,
            fileId: true,
            ownerId: true,
            createdAt: true,
            modifiedAt: true,
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })) as unknown as Array<{
      documentId: string;
      document: {
        id: string;
        name: string;
        type: string;
        size: number;
        description?: string | null;
        tags: string;
        fileId: string;
        ownerId: string;
        createdAt: Date;
        modifiedAt: Date;
        owner: { id: string; name: string; email: string };
      };
    }>;

    // Télécharger/charger les vecteurs candidats (cache Redis si dispo)
    const withVecs = await mapWithConcurrency(
      candidates,
      DL_CONCURRENCY,
      async (c) => {
        const cv = await this.getEmbeddingVector(c.documentId);
        return { doc: c.document, vec: cv };
      }
    );
    const scored = withVecs
      .filter((x) => Array.isArray(x.vec) && x.vec.length === v.length)
      .map((x) => ({ sim: cosineSimilarity(v, x.vec as number[]), doc: x.doc }))
      .filter((x) => Number.isFinite(x.sim))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, Math.min(50, Math.max(1, limit)));

    return scored.map((s) => ({ ...s.doc, similarity: s.sim }));
  }

  async findSimilarByVector(vector: number[], limit = 5, ownerId?: string) {
    if (!vector || vector.length === 0) throw new Error("Vecteur requis");
    const candidates = (await prisma.documentEmbedding.findMany({
      where: ownerId ? { document: { ownerId } } : {},
      take: CANDIDATES_LIMIT,
      include: {
        document: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true,
            description: true,
            tags: true,
            fileId: true,
            ownerId: true,
            createdAt: true,
            modifiedAt: true,
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })) as unknown as Array<{
      documentId: string;
      document: {
        id: string;
        name: string;
        type: string;
        size: number;
        description?: string | null;
        tags: string;
        fileId: string;
        ownerId: string;
        createdAt: Date;
        modifiedAt: Date;
        owner: { id: string; name: string; email: string };
      };
    }>;

    const withVecs = await mapWithConcurrency(
      candidates,
      DL_CONCURRENCY,
      async (c) => {
        const cv = await this.getEmbeddingVector(c.documentId);
        return { doc: c.document, vec: cv };
      }
    );
    const scored = withVecs
      .filter((x) => Array.isArray(x.vec) && x.vec.length === vector.length)
      .map((x) => ({
        sim: cosineSimilarity(vector, x.vec as number[]),
        doc: x.doc,
      }))
      .filter((x) => Number.isFinite(x.sim))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, Math.min(50, Math.max(1, limit)));

    return scored.map((s) => ({ ...s.doc, similarity: s.sim }));
  }
}

export default EmbeddingService;
