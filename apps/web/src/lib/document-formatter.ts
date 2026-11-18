/**
 * Turns an uploaded file into plain text for the knowledge base.
 * Each hyperlink is written next to the words it was attached to and again
 * in a labeled list, so a model can tell a profile link from a project link.
 */

export interface DocumentLink {
  label: string;
  context: string;
  url: string;
}

export interface FormattedDocument {
  text: string;
  links: DocumentLink[];
}

type Segment = { text: string; url?: string };
type Line = Segment[];

const GENERIC_ANCHORS = new Set([
  'github', 'git', 'code', 'repo', 'repository', 'source', 'demo', 'live', 'link', 'here',
  'click here', 'website', 'site', 'view', 'open', 'url', 'project', 'certificate', 'details',
]);

const MONTH_WORD = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[.,]?$/i;

export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200b-\u200d\u2060\ufeff\u0000]/g, '')
    .replace(/[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
    .replace(/[\u2018\u2019\u201a\u2032]/g, "'")
    .replace(/[\u201c\u201d\u201e\u2033]/g, '"')
    .replace(/^[ \t]*[•●▪◦‣∙■□➢➤►▸-][ \t]*/gm, '- ')
    .replace(/[ \t]*[•●▪◦‣∙][ \t]*/g, ' | ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ +$/gm, '')
    .replace(/^ +/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanUrl(url: string): string {
  return url.trim().replace(/[),.;]+$/g, '');
}

function isLinkUrl(url: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(url);
}

function stripWrapping(value: string): string {
  return value.replace(/^[\s([{<|•:,-]+|[\s)\]}>|•:,-]+$/g, '').trim();
}

function mergeSegments(line: Line): Line {
  const merged: Line = [];
  for (const segment of line) {
    const last = merged[merged.length - 1];
    if (last && last.url === segment.url) {
      last.text += segment.text;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}

function contextFor(line: Line): string {
  const rest = line
    .filter((segment) => !segment.url)
    .map((segment) => segment.text)
    .join(' ')
    .replace(/\S+@\S+\.\S+/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .split(/\s+/)
    .filter((word) => /[a-z]/i.test(word) && !MONTH_WORD.test(word))
    .join(' ');
  const cleaned = stripWrapping(rest.replace(/(\s*[|•]\s*)+/g, ' | ').replace(/(\|\s*)+$/g, ''));
  return cleaned.replace(/[^a-z]/gi, '').length >= 3 ? cleaned.slice(0, 120) : '';
}

function describeLink(url: string): string {
  if (/^mailto:/i.test(url)) return 'Email';
  if (/^tel:/i.test(url)) return 'Phone';
  if (/linkedin\.com/i.test(url)) return 'LinkedIn';
  if (/github\.com\/[^/]+\/?$/i.test(url)) return 'GitHub profile';
  if (/github\.com/i.test(url)) return 'GitHub';
  return 'Link';
}

function linkTarget(url: string): string {
  return url.replace(/^(mailto|tel):/i, '');
}

function render(lines: Line[], extraUrls: string[] = []): FormattedDocument {
  const prepared = lines.map(mergeSegments);
  const urlsByAnchor = new Map<string, Set<string>>();
  for (const line of prepared) {
    for (const segment of line) {
      if (!segment.url) continue;
      const anchor = stripWrapping(segment.text).toLowerCase();
      if (!urlsByAnchor.has(anchor)) urlsByAnchor.set(anchor, new Set());
      urlsByAnchor.get(anchor)!.add(segment.url);
    }
  }

  const body: string[] = [];
  const links: DocumentLink[] = [];
  const seen = new Set<string>();
  let previousText = '';

  for (const line of prepared) {
    const plain = line.map((segment) => segment.text).join('');
    const written = line.map((segment) => {
      if (!segment.url) return segment.text;
      const target = linkTarget(segment.url);
      const trailing = segment.text.match(/\s*$/)?.[0] || '';
      const words = segment.text.slice(0, segment.text.length - trailing.length);
      if (words.toLowerCase().includes(target.toLowerCase())) return segment.text;
      return `${words} <${target}>${trailing}`;
    }).join('');
    body.push(written);

    for (const segment of line) {
      if (!segment.url) continue;
      const anchor = stripWrapping(segment.text);
      const key = anchor.toLowerCase();
      const ambiguous = (urlsByAnchor.get(key)?.size || 0) > 1 || GENERIC_ANCHORS.has(key) || !/[a-z]/i.test(key);
      const profile = /github\.com\/[^/]+\/?$/i.test(segment.url);
      let context = ambiguous ? (profile ? 'profile' : contextFor(line)) : '';
      if (ambiguous && !context) context = contextFor([{ text: previousText }]);
      const label = /[a-z]/i.test(anchor) && !anchor.toLowerCase().includes(linkTarget(segment.url).toLowerCase())
        ? anchor
        : describeLink(segment.url);
      const dedupe = `${label}|${segment.url}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      links.push({ label, context, url: segment.url });
    }
    if (plain.trim()) previousText = plain;
  }

  for (const url of extraUrls) {
    if (links.some((link) => link.url === url)) continue;
    links.push({ label: describeLink(url), context: '', url });
  }

  const listed = links.map((link) => {
    const name = link.context ? `${link.label} (${link.context})` : link.label;
    return `- ${name}: ${linkTarget(link.url)}`;
  });
  const text = normalizeText(body.join('\n'));
  return {
    text: listed.length > 0 ? `${text}\n\nLinks:\n${listed.join('\n')}` : text,
    links,
  };
}

type PdfTextItem = { str: string; transform: number[]; width: number; height: number };
type PdfAnnotation = { rect: number[]; url?: string; unsafeUrl?: string };

function pdfWords(item: PdfTextItem): Array<{ text: string; x1: number; x2: number }> {
  const x = item.transform[4];
  const length = item.str.length || 1;
  const perChar = (item.width || 0) / length;
  const words: Array<{ text: string; x1: number; x2: number }> = [];
  for (const match of item.str.matchAll(/\S+\s*/g)) {
    const start = match.index || 0;
    const end = start + match[0].trimEnd().length;
    words.push({ text: match[0], x1: x + start * perChar, x2: x + end * perChar });
  }
  return words;
}

async function formatPdf(bytes: Buffer): Promise<FormattedDocument> {
  const { getDocumentProxy, extractText } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const lines: Line[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const annotations = (await page.getAnnotations()) as PdfAnnotation[];
    const linkRects = annotations
      .map((annotation) => {
        const raw = typeof annotation.url === 'string' ? annotation.url : annotation.unsafeUrl;
        return { rect: annotation.rect, url: typeof raw === 'string' ? cleanUrl(raw) : '' };
      })
      .filter((link) => link.rect && isLinkUrl(link.url));

    const items = (content.items as unknown[])
      .filter((item): item is PdfTextItem => typeof (item as PdfTextItem).str === 'string' && Array.isArray((item as PdfTextItem).transform))
      .filter((item) => item.str.length > 0);

    const rows: Array<{ y: number; size: number; items: PdfTextItem[] }> = [];
    for (const item of items) {
      const y = item.transform[5];
      const size = Math.abs(item.height || item.transform[3] || 10);
      const row = rows.find((candidate) => Math.abs(candidate.y - y) <= Math.max(2, Math.min(candidate.size, size) * 0.4));
      if (row) row.items.push(item);
      else rows.push({ y, size, items: [item] });
    }
    rows.sort((a, b) => b.y - a.y);

    for (const row of rows) {
      row.items.sort((a, b) => a.transform[4] - b.transform[4]);
      const line: Line = [];
      let previousEnd: number | null = null;
      for (const item of row.items) {
        const y = item.transform[5];
        for (const word of pdfWords(item)) {
          if (previousEnd !== null && word.x1 - previousEnd > row.size * 0.15) {
            const last = line[line.length - 1];
            if (last && !/\s$/.test(last.text)) last.text += ' ';
          }
          const center = (word.x1 + word.x2) / 2;
          const link = linkRects.find(({ rect }) => {
            const [x1, y1, x2, y2] = rect;
            return center >= Math.min(x1, x2) - 1 && center <= Math.max(x1, x2) + 1
              && y >= Math.min(y1, y2) - 3 && y <= Math.max(y1, y2) + 3;
          });
          line.push({ text: word.text, url: link?.url });
          previousEnd = word.x2;
        }
      }
      lines.push(line);
    }
  }

  const formatted = render(lines, urlsFromBytes(bytes));
  const reconstructed = lines.flat().map((segment) => segment.text).join('').replace(/\s/g, '').length;
  const result = await extractText(new Uint8Array(bytes), { mergePages: true });
  const raw = Array.isArray(result.text) ? result.text.join('\n\n') : String(result.text || '');
  if (raw.replace(/\s/g, '').length > reconstructed * 1.4) {
    const listed = formatted.links.map((link) => `- ${link.context ? `${link.label} (${link.context})` : link.label}: ${linkTarget(link.url)}`);
    const text = normalizeText(raw);
    return { text: listed.length > 0 ? `${text}\n\nLinks:\n${listed.join('\n')}` : text, links: formatted.links };
  }
  return formatted;
}

function urlsFromBytes(bytes: Buffer): string[] {
  const raw = bytes.toString('latin1');
  const found = [
    ...(raw.match(/https?:\/\/[^\s<>"')\]]+/gi) || []),
    ...[...raw.matchAll(/\/URI\s*\(([^)]+)\)/g)].map((match) => match[1]),
  ];
  const urls = new Set<string>();
  for (const value of found) {
    const url = cleanUrl(value);
    if (/^https?:\/\/[^/\s]+\.[^/\s]+/i.test(url) && !/(adobe|w3\.org|purl\.org|ns\.|xmlns|iptc\.org|openxmlformats|microsoft\.com\/office)/i.test(url)) {
      urls.add(url);
    }
  }
  return [...urls];
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function htmlToLines(html: string): Line[] {
  const prepared = html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(td|th)>/gi, ' | ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|h[1-6]|table|ul|ol|section|article|header|footer)>/gi, '\n');

  const lines: Line[] = [[]];
  const pattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>|([^<]+)|<[^>]+>/gi;
  for (const match of prepared.matchAll(pattern)) {
    const [, href, anchorHtml, plain] = match;
    if (href !== undefined) {
      const text = decodeEntities(anchorHtml.replace(/<[^>]+>/g, ''));
      const url = cleanUrl(decodeEntities(href));
      lines[lines.length - 1].push({ text, url: isLinkUrl(url) ? url : undefined });
      continue;
    }
    if (plain === undefined) continue;
    const parts = decodeEntities(plain).split('\n');
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ text: part });
    });
  }
  return lines;
}

async function formatDocx(bytes: Buffer): Promise<FormattedDocument> {
  const mammothModule = await import('mammoth');
  const mammoth = (mammothModule as { default?: { convertToHtml: (input: { buffer: Buffer }) => Promise<{ value: string }> } }).default
    || (mammothModule as unknown as { convertToHtml: (input: { buffer: Buffer }) => Promise<{ value: string }> });
  const result = await mammoth.convertToHtml({ buffer: bytes });
  return render(htmlToLines(result.value || ''));
}

async function formatPptx(bytes: Buffer): Promise<FormattedDocument> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(bytes);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1] || 0) - Number(b.match(/slide(\d+)/)?.[1] || 0));

  const lines: Line[] = [];
  for (const name of slideNames) {
    const xml = await zip.files[name].async('string');
    const relsName = name.replace(/slides\/(slide\d+\.xml)$/i, 'slides/_rels/$1.rels');
    const relsXml = zip.file(relsName) ? await zip.file(relsName)!.async('string') : '';
    const targets = new Map<string, string>();
    for (const rel of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
      const id = rel[0].match(/Id="([^"]+)"/)?.[1];
      const target = rel[0].match(/Target="([^"]+)"/)?.[1];
      if (id && target) targets.set(id, decodeEntities(target));
    }
    for (const paragraph of xml.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)) {
      const line: Line = [];
      for (const run of paragraph[0].matchAll(/<a:r\b[\s\S]*?<\/a:r>/g)) {
        const text = decodeEntities(run[0].match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/)?.[1] || '');
        const relId = run[0].match(/<a:hlinkClick\b[^>]*r:id="([^"]+)"/)?.[1];
        const url = relId ? cleanUrl(targets.get(relId) || '') : '';
        line.push({ text, url: isLinkUrl(url) ? url : undefined });
      }
      if (line.length > 0) lines.push(line);
    }
    lines.push([]);
  }
  return render(lines);
}

/** Labeled links in a stored file, without reading the rest of the text. */
export async function extractDocumentLinks(filename: string, mimeType: string, bytes: Buffer): Promise<DocumentLink[]> {
  const formatted = await formatDocument(filename, mimeType, bytes);
  return formatted?.links.filter((link) => /^https?:/i.test(link.url)) || [];
}

/** Returns null for formats this module does not handle. */
export async function formatDocument(filename: string, mimeType: string, bytes: Buffer): Promise<FormattedDocument | null> {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const mime = (mimeType || '').toLowerCase();
  if (ext === 'pdf' || mime === 'application/pdf') return formatPdf(bytes);
  if (ext === 'docx' || mime.includes('wordprocessingml')) return formatDocx(bytes);
  if (ext === 'pptx' || mime.includes('presentationml')) return formatPptx(bytes);
  if (ext === 'html' || ext === 'htm' || mime === 'text/html') return render(htmlToLines(bytes.toString('utf8')));
  return null;
}
