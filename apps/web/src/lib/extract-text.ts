export interface ExtractedDocumentText {
  text: string;
  note?: string;
}

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json', 'html', 'htm']);

function extensionOf(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function extractPptx(buffer: Buffer): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/)?.[1] || 0);
      const nb = Number(b.match(/slide(\d+)/)?.[1] || 0);
      return na - nb;
    });

  const slides: string[] = [];
  for (const name of slideNames) {
    const xml = await zip.files[name].async('string');
    const bits = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((match) => decodeXmlText(match[1]));
    if (bits.length > 0) slides.push(bits.join(' '));
  }
  return slides.join('\n\n');
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammothModule = await import('mammoth');
  const mammoth = (mammothModule as { default?: { extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }> } }).default || mammothModule;
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const { extractText } = await import('unpdf');
  const result = await extractText(new Uint8Array(buffer), { mergePages: true });
  const text = result.text as string | string[];
  const body = Array.isArray(text) ? text.join('\n\n') : text;
  const links = await extractPdfLinks(buffer);
  return links.length > 0 ? `${body}\n\nLinks:\n${links.join('\n')}` : body;
}

/** Hyperlinks stored as PDF annotations. Text extraction drops these. */
export async function extractPdfLinks(bytes: Buffer): Promise<string[]> {
  try {
    const { getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const urls = new Set<string>();
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const annotations = await page.getAnnotations();
      for (const annotation of annotations) {
        const url = annotation.url || annotation.unsafeUrl;
        if (typeof url === 'string' && /^https?:\/\//i.test(url)) urls.add(url);
      }
    }
    return [...urls];
  } catch (error) {
    console.warn('[extractPdfLinks]', error);
    return [];
  }
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
    if (TEXT_EXTENSIONS.has(ext) || mime.startsWith('text/') || mime === 'application/json') {
      const text = params.bytes.toString('utf8');
      return { text: text.replace(/\u0000/g, '') };
    }

    if (ext === 'pdf' || mime === 'application/pdf') {
      const text = (await extractPdf(params.bytes)).replace(/\u0000/g, '').trim();
      return { text: text || description, note: text ? undefined : 'No selectable text in this PDF. The description was indexed.' };
    }

    if (ext === 'docx' || mime.includes('wordprocessingml')) {
      const text = (await extractDocx(params.bytes)).trim();
      return { text: text || description };
    }

    if (ext === 'pptx' || mime.includes('presentationml')) {
      const text = (await extractPptx(params.bytes)).trim();
      return { text: text || description, note: text ? undefined : 'No slide text found. The description was indexed.' };
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
    text: description || params.bytes.toString('utf8').slice(0, 20000),
    note: description ? undefined : 'Stored with a best-effort text read.',
  };
}
