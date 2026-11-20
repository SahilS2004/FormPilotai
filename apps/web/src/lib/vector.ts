import { getDbPool, checkPostgresHealth } from './db';
import { embedText } from './embedder';
import { VectorDocumentChunk } from '@formpilot/shared';

// ============================================================================
// Vector Embedding Engine (384-Dimensional Dense Semantic Embeddings)
// Supports PostgreSQL pgvector (<=> cosine distance) & In-Memory Fallback
// ============================================================================

const EMBEDDING_DIM = 384;

const memoryRoot = globalThis as typeof globalThis & {
  __formpilotVectors?: Array<{
    id: string;
    documentId: string;
    documentName: string;
    chunkIndex: number;
    content: string;
    metadata: Record<string, any>;
    embedding: number[];
  }>;
};
if (!memoryRoot.__formpilotVectors) memoryRoot.__formpilotVectors = [];

// In-memory fallback cache if PostgreSQL is temporarily unavailable
export const inMemoryVectorStore = memoryRoot.__formpilotVectors;

/**
 * 384-d MiniLM embedding. Same width as the pgvector column.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return embedText(text);
}

/**
 * Splits document text into semantic chunks with overlap
 */
export function chunkDocument(
  text: string,
  maxChars = 400,
  overlap = 80
): Array<{ chunkIndex: number; content: string }> {
  if (!text || text.trim().length === 0) return [];

  const chunks: Array<{ chunkIndex: number; content: string }> = [];
  let index = 0;

  const pushPiece = (content: string) => {
    const clean = content.trim();
    if (!clean) return;
    if (clean.length <= maxChars) {
      chunks.push({ chunkIndex: index++, content: clean });
      return;
    }
    let pos = 0;
    while (pos < clean.length) {
      const slice = clean.slice(pos, pos + maxChars).trim();
      if (slice) chunks.push({ chunkIndex: index++, content: slice });
      if (pos + maxChars >= clean.length) break;
      pos += maxChars - overlap;
    }
  };

  let current = '';
  for (const paragraph of text.split(/\n\s*\n/)) {
    const cleanPara = paragraph.trim();
    if (!cleanPara) continue;
    if (current && current.length + cleanPara.length + 1 > maxChars) {
      pushPiece(current);
      current = '';
    }
    current = current ? `${current}\n\n${cleanPara}` : cleanPara;
  }
  pushPiece(current);
  return chunks;
}

/**
 * Ingests a document into PostgreSQL vector DB (document_chunks table) with metadata
 */
export async function storeDocumentVectors(params: {
  documentId: string;
  documentName: string;
  contentText: string;
  metadata?: Record<string, any>;
}): Promise<{ chunksStored: number; vectorDimension: number }> {
  const { documentId, documentName, contentText, metadata = {} } = params;
  const chunks = chunkDocument(contentText);

  if (chunks.length === 0) {
    return { chunksStored: 0, vectorDimension: EMBEDDING_DIM };
  }

  const pool = getDbPool();
  const isHealthy = await checkPostgresHealth();

  // Remove existing vectors in memory
  const remainingInMemory = inMemoryVectorStore.filter(c => c.documentId !== documentId);
  inMemoryVectorStore.length = 0;
  inMemoryVectorStore.push(...remainingInMemory);

  if (isHealthy && pool) {
    try {
      // Clear previous chunks for this document
      await pool.query('DELETE FROM document_chunks WHERE document_id = $1', [documentId]);

      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk.content);
        const chunkId = `chk_${documentId}_${chunk.chunkIndex}`;
        const vectorStr = `[${embedding.join(',')}]`;

        const chunkMetadata = {
          ...metadata,
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunks.length,
          docName: documentName
        };

        await pool.query(
          `INSERT INTO document_chunks (id, document_id, document_name, chunk_index, content, metadata, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7::vector)`,
          [
            chunkId,
            documentId,
            documentName,
            chunk.chunkIndex,
            chunk.content,
            JSON.stringify(chunkMetadata),
            vectorStr
          ]
        );

        // Keep in memory copy as well
        inMemoryVectorStore.push({
          id: chunkId,
          documentId,
          documentName,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          metadata: chunkMetadata,
          embedding
        });
      }

      return { chunksStored: chunks.length, vectorDimension: EMBEDDING_DIM };
    } catch (err) {
      console.warn('[VectorStore PostgreSQL Error, falling back to in-memory]', err);
    }
  }

  // Fallback to in-memory embedding
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.content);
    inMemoryVectorStore.push({
      id: `chk_${documentId}_${chunk.chunkIndex}`,
      documentId,
      documentName,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      metadata: { ...metadata, chunkIndex: chunk.chunkIndex },
      embedding
    });
  }

  return { chunksStored: chunks.length, vectorDimension: EMBEDDING_DIM };
}

let chunkRepairStarted = false;

/** Re-splits documents that were stored as one oversized chunk, so each question can retrieve a different passage. */
export async function repairOversizedChunks(): Promise<void> {
  if (chunkRepairStarted) return;
  chunkRepairStarted = true;
  const pool = getDbPool();
  const healthy = await checkPostgresHealth();
  if (!pool || !healthy) return;

  const oversized = await pool.query(
    `SELECT DISTINCT d.id, d.name, d.content_text
     FROM documents d
     JOIN document_chunks c ON c.document_id = d.id
     WHERE length(c.content) > 500 AND d.content_text IS NOT NULL`
  );
  for (const row of oversized.rows) {
    if (!row.content_text) continue;
    const stored = await storeDocumentVectors({
      documentId: row.id,
      documentName: row.name,
      contentText: row.content_text,
    });
    await pool.query(
      `UPDATE documents SET chunk_count = $2, index_status = 'indexed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [row.id, stored.chunksStored]
    );
  }
}

/**
 * Searches document vector chunks using Cosine Distance (<=> in PostgreSQL pgvector)
 */
export async function searchVectorChunks(params: {
  query: string;
  topK?: number;
  filterDocIds?: string[];
  docTypeFilter?: string;
}): Promise<VectorDocumentChunk[]> {
  const { query, topK = 5, filterDocIds, docTypeFilter } = params;
  if (!query || !query.trim()) return [];

  const queryEmbedding = await generateEmbedding(query);
  const pool = getDbPool();
  const isHealthy = await checkPostgresHealth();

  if (isHealthy && pool) {
    try {
      const vectorStr = `[${queryEmbedding.join(',')}]`;
      const queryParams: any[] = [vectorStr, topK];
      let sql = `
        SELECT id, document_id as "documentId", document_name as "documentName", 
               chunk_index as "chunkIndex", content, metadata,
               1 - (embedding <=> $1::vector) as similarity
        FROM document_chunks
        WHERE 1=1
      `;

      if (filterDocIds && filterDocIds.length > 0) {
        queryParams.push(filterDocIds);
        sql += ` AND document_id = ANY($${queryParams.length})`;
      }

      if (docTypeFilter) {
        queryParams.push(docTypeFilter);
        sql += ` AND metadata->>'docType' = $${queryParams.length}`;
      }

      sql += ` ORDER BY embedding <=> $1::vector ASC LIMIT $2`;

      const res = await pool.query(sql, queryParams);
      if (res.rows && res.rows.length > 0) {
        return res.rows.map(r => ({
          id: r.id,
          documentId: r.documentId,
          documentName: r.documentName,
          chunkIndex: r.chunkIndex,
          content: r.content,
          metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata || {},
          similarity: Number(r.similarity)
        }));
      }
    } catch (err) {
      console.warn('[searchVectorChunks PGVector Query Fallback]', err);
    }
  }

  // In-Memory Cosine Similarity Fallback
  const results = inMemoryVectorStore
    .filter(c => {
      if (filterDocIds && filterDocIds.length > 0 && !filterDocIds.includes(c.documentId)) {
        return false;
      }
      if (docTypeFilter && c.metadata?.docType !== docTypeFilter) {
        return false;
      }
      return true;
    })
    .map(c => {
      // Calculate dot product (cosine similarity since vectors are L2-normalized)
      let dot = 0;
      for (let i = 0; i < EMBEDDING_DIM; i++) {
        dot += queryEmbedding[i] * c.embedding[i];
      }
      return {
        id: c.id,
        documentId: c.documentId,
        documentName: c.documentName,
        chunkIndex: c.chunkIndex,
        content: c.content,
        metadata: c.metadata,
        similarity: Math.max(0, Math.min(1.0, dot))
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return results;
}

/** Pull chunks that literally contain the question words, so a heading is not lost to a nearby embedding. */
export async function searchKeywordChunks(params: {
  terms: string[];
  filterDocIds?: string[];
  limit?: number;
}): Promise<VectorDocumentChunk[]> {
  const terms = params.terms.filter((term) => /^[a-z0-9]+$/i.test(term)).slice(0, 4);
  const pool = getDbPool();
  const healthy = await checkPostgresHealth();
  if (!pool || !healthy || terms.length === 0) return [];

  const values: unknown[] = terms.map((term) => `%${term}%`);
  const clauses = terms.map((_, index) => `content ILIKE $${index + 1}`);
  let docClause = '';
  if (params.filterDocIds && params.filterDocIds.length > 0) {
    values.push(params.filterDocIds);
    docClause = ` AND document_id = ANY($${values.length}::text[])`;
  }
  values.push(params.limit || 6);
  const result = await pool.query(
    `SELECT id, document_id as "documentId", document_name as "documentName",
            chunk_index as "chunkIndex", content, metadata
     FROM document_chunks
     WHERE (${clauses.join(' OR ')})${docClause}
     LIMIT $${values.length}`,
    values
  );
  return result.rows.map((row) => ({
    id: row.id,
    documentId: row.documentId,
    documentName: row.documentName,
    chunkIndex: row.chunkIndex,
    content: row.content,
    metadata: row.metadata || {},
    similarity: 0.55,
  }));
}
