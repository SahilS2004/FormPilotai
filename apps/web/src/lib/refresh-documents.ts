import { fetchDocumentFilePayload, withDatabase } from './db';
import { composeIndexText, extractDocumentText } from './extract-text';

let started = false;

/** Re-formats stored files so their links and layout match the current formatter. */
export async function refreshDocumentText(): Promise<void> {
  if (started) return;
  started = true;
  const pool = await withDatabase();
  if (!pool) return;
  const docs = await pool.query(
    `SELECT id, description, content_text
     FROM documents
     WHERE original_filename ~* '\\.(pdf|docx|pptx|html?)$'`
  );
  for (const doc of docs.rows) {
    const file = await fetchDocumentFilePayload(doc.id);
    if (!file?.fileBase64) continue;
    const extracted = await extractDocumentText({
      filename: file.originalFilename,
      mimeType: file.mimeType,
      bytes: Buffer.from(file.fileBase64, 'base64'),
      description: doc.description || '',
    });
    const text = composeIndexText(doc.description, extracted.text);
    if (!text || text === doc.content_text) continue;
    await pool.query(
      `UPDATE documents SET content_text = $2, index_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [doc.id, text]
    );
  }
}
