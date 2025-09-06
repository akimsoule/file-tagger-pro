import prisma from './database';
import crypto from 'crypto';
import { EmbeddingService } from './embeddingService';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/g)
    .filter(t => t.length >= 2 && t.length <= 64);
}

function featureHashing(tokens: string[], dim = 256): number[] {
  const vec = new Array(dim).fill(0);
  for (const t of tokens) {
    const h = crypto.createHash('sha1').update(t).digest('hex');
    const idx = parseInt(h.slice(0, 8), 16) % dim;
    vec[idx] += 1;
  }
  // L2 normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) vec[i] = vec[i] / norm;
  }
  return vec;
}

export class EmbeddingGenerator {
  private emb: EmbeddingService;

  constructor(embeddingService?: EmbeddingService) {
    this.emb = embeddingService ?? new EmbeddingService();
  }

  async generateForDocument(documentId: string, dim = 256) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, name: true, type: true, description: true, tags: true },
    });
    if (!doc) throw new Error('Document introuvable');

    const bag: string[] = [];
    if (doc.name) bag.push(doc.name);
    if (doc.type) bag.push(doc.type);
    if (doc.description) bag.push(doc.description);
    if (doc.tags) bag.push(doc.tags);
    const tokens = tokenize(bag.join(' '));
    const vector = featureHashing(tokens, dim);

    await this.emb.upsertEmbedding({
      documentId: doc.id,
      embedding: vector,
      model: `meta-hash-${dim}-v1`,
    });
    return { documentId: doc.id, dim, tokens: tokens.length };
  }
}

export default EmbeddingGenerator;
