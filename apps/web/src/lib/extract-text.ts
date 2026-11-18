import { formatDocument, normalizeText } from './document-formatter';

export interface ExtractedDocumentText {
  text: string;
  note?: string;
}

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json']);
const AUTO_DESCRIPTION = /^Reference document /;

function extensionOf(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/** The text stored and embedded for a document: the user's description, then the formatted file. */
export function composeIndexText(description: string | undefined, text: string): string {
  const note = (description || '').trim();
  const body = text.trim();
  if (!note || AUTO_DESCRIPTION.test(note) || body === note) return body;
  return body ? `${note}\n\n${body}` : note;
}

/**
 * Pulls searchable text out of an uploaded file.
 * Images are stored as-is; their description is what gets vectorized.
 */
export async function extractDocumentText(params: {
  filename: string;
  mimeType: string;
  bytes: Buffer;
  description?: string;
}): Promise<ExtractedDocumentText> {
  const ext = extensionOf(params.filename);
  const mime = (params.mimeType || '').toLowerCase();
  const description = (params.description || '').trim();

  try {
    const formatted = await formatDocument(params.filename, mime, params.bytes);
    if (formatted) {
      if (formatted.text) return { text: formatted.text };
      return {
        text: description,
        note: ext === 'pdf' || mime === 'application/pdf'
          ? 'No selectable text in this PDF. The description was indexed.'
          : 'No text found in this file. The description was indexed.',
      };
    }

    if (TEXT_EXTENSIONS.has(ext) || mime.startsWith('text/') || mime === 'application/json') {
      return { text: normalizeText(params.bytes.toString('utf8')) };
    }

    if (ext === 'ppt' || ext === 'doc') {
      return {
        text: description,
        note: 'Legacy .doc/.ppt files are stored, but text extraction needs the modern .docx or .pptx format.',
      };
    }

    if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
      const caption = [
        `Image file: ${params.filename}.`,
        description,
      ].filter(Boolean).join('\n');
      return { text: caption, note: 'Image stored in object storage. The description was vectorized.' };
    }
  } catch (err) {
    console.warn('[extractDocumentText]', err);
    return {
      text: description,
      note: 'The file was stored, but text extraction failed. The description was indexed instead.',
    };
  }

  return {
    text: description || normalizeText(params.bytes.toString('utf8').slice(0, 20000)),
    note: description ? undefined : 'Stored with a best-effort text read.',
  };
}
