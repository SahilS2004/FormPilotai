import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/** Builds a simple multi-page PDF from plain text paragraphs. */
export async function textToPdf(title: string, body: string): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 54;
  const maxWidth = pageWidth - margin * 2;
  const bodySize = 11;
  const lineHeight = 16;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawWrapped = (text: string, size: number, face: typeof font, gap = lineHeight) => {
    const words = text.split(/\s+/).filter(Boolean);
    let line = '';
    const flush = () => {
      if (!line) return;
      if (y < margin + gap) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(line, { x: margin, y, size, font: face, color: rgb(0.1, 0.1, 0.12) });
      y -= gap;
      line = '';
    };
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (face.widthOfTextAtSize(next, size) > maxWidth) {
        flush();
        line = word;
      } else {
        line = next;
      }
    }
    flush();
  };

  drawWrapped(title, 16, bold, 22);
  y -= 8;

  for (const paragraph of body.split(/\n+/).map((part) => part.trim()).filter(Boolean)) {
    drawWrapped(paragraph, bodySize, font);
    y -= 8;
  }

  return Buffer.from(await pdf.save());
}
