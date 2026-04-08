import { buildContractDocument, type ContractRenderData, type RightsTierValue } from './contracts';

type ContractPdfArgs = {
  effectiveDate: Date | string;
  producerDisplayName: string;
  producerNumber?: string | null;
  producerSignedName?: string | null;
  producerSignedDate?: Date | string | null;
  producerSignatureImageUrl?: string | null;
  platformSignatureImageUrl?: string | null;
  videoTitle: string;
  rightsTier: RightsTierValue;
  payoutSplit: number;
  platformSignatureJpeg?: Buffer | null;
  producerSignatureJpeg?: Buffer | null;
};

type PdfImageAsset = {
  name: string;
  buffer: Buffer;
  width: number;
  height: number;
};

type PdfPage = {
  commands: string[];
  images: Set<string>;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 52;
const TOP_Y = PAGE_HEIGHT - 58;
const BOTTOM_Y = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

function escapePdfText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function estimateTextWidth(text: string, fontSize: number) {
  let width = 0;
  for (const character of text) {
    if (character === ' ') {
      width += fontSize * 0.28;
    } else if ('MW@#%&'.includes(character)) {
      width += fontSize * 0.78;
    } else if ('il.,:;!|'.includes(character)) {
      width += fontSize * 0.24;
    } else {
      width += fontSize * 0.52;
    }
  }
  return width;
}

function wrapText(text: string, maxWidth: number, fontSize: number) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [''];
  }

  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && estimateTextWidth(next, fontSize) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function getJpegDimensions(buffer: Buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error('Unsupported JPEG signature image.');
  }

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }

    offset += 2 + segmentLength;
  }

  throw new Error('JPEG dimensions could not be determined.');
}

function streamObject(buffer: Buffer, extraDictionary = '') {
  return Buffer.concat([
    Buffer.from(`<< /Length ${buffer.length}${extraDictionary ? ` ${extraDictionary}` : ''} >>\nstream\n`, 'ascii'),
    buffer,
    Buffer.from('\nendstream', 'ascii')
  ]);
}

function buildImageAsset(name: string, buffer?: Buffer | null): PdfImageAsset | null {
  if (!buffer?.length) {
    return null;
  }

  try {
    const dimensions = getJpegDimensions(buffer);
    return {
      name,
      buffer,
      width: dimensions.width,
      height: dimensions.height
    };
  } catch {
    return null;
  }
}

function createPage() {
  return {
    commands: ['0 G', '0 g'],
    images: new Set<string>()
  } satisfies PdfPage;
}

function renderPdf(data: ContractRenderData, images: { platform?: PdfImageAsset | null; producer?: PdfImageAsset | null }) {
  const pages: PdfPage[] = [];
  let page = createPage();
  pages.push(page);
  let cursorY = TOP_Y;

  const newPage = () => {
    page = createPage();
    pages.push(page);
    cursorY = TOP_Y;
  };

  const ensureSpace = (height: number) => {
    if (cursorY - height < BOTTOM_Y) {
      newPage();
    }
  };

  const drawTextLine = (text: string, x: number, y: number, fontSize: number, font: 'F1' | 'F2') => {
    page.commands.push(`BT /${font} ${fontSize} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(text)}) Tj ET`);
  };

  const drawParagraph = (text: string, options?: { fontSize?: number; font?: 'F1' | 'F2'; gapAfter?: number }) => {
    const fontSize = options?.fontSize ?? 11.5;
    const font = options?.font ?? 'F1';
    const gapAfter = options?.gapAfter ?? fontSize * 0.9;
    const lines = wrapText(text, CONTENT_WIDTH, fontSize);
    const lineHeight = fontSize * 1.52;
    ensureSpace(lines.length * lineHeight + gapAfter);
    for (const line of lines) {
      drawTextLine(line, MARGIN_X, cursorY, fontSize, font);
      cursorY -= lineHeight;
    }
    cursorY -= gapAfter;
  };

  const drawMetaGrid = () => {
    const entries = [
      ['Effective Date', data.effectiveDateLabel],
      ['Producer', data.producerName],
      ['Producer Number', data.producerNumberLabel],
      ['Content Title', data.videoTitle]
    ] as const;

    const columnWidth = (CONTENT_WIDTH - 18) / 2;
    const labelFont = 9;
    const valueFont = 11.5;
    const rowHeight = 54;
    ensureSpace(rowHeight * 2 + 14);

    entries.forEach(([label, value], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = MARGIN_X + column * (columnWidth + 18);
      const y = cursorY - row * rowHeight;
      page.commands.push(`${x.toFixed(2)} ${(y - 44).toFixed(2)} ${columnWidth.toFixed(2)} 44 re S`);
      drawTextLine(label.toUpperCase(), x + 10, y - 14, labelFont, 'F2');
      for (const [lineIndex, line] of wrapText(value, columnWidth - 20, valueFont).slice(0, 2).entries()) {
        drawTextLine(line, x + 10, y - 30 - lineIndex * 14, valueFont, 'F1');
      }
    });

    cursorY -= rowHeight * 2 + 16;
  };

  const drawSignatureBlock = (
    x: number,
    width: number,
    block: ContractRenderData['platformSignature'],
    image?: PdfImageAsset | null
  ) => {
    const blockTop = cursorY;
    const lineY = blockTop - 104;
    page.commands.push(`${x.toFixed(2)} ${(blockTop - 188).toFixed(2)} ${width.toFixed(2)} 188 re S`);

    if (image) {
      const maxWidth = width - 34;
      const maxHeight = 64;
      const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
      const displayWidth = image.width * scale;
      const displayHeight = image.height * scale;
      const imageX = x + (width - displayWidth) / 2;
      const imageY = lineY + 12;
      page.commands.push(`q ${displayWidth.toFixed(2)} 0 0 ${displayHeight.toFixed(2)} ${imageX.toFixed(2)} ${imageY.toFixed(2)} cm /${image.name} Do Q`);
      page.images.add(image.name);
    } else {
      drawTextLine(block.markLabel, x + 18, blockTop - 44, 18, 'F1');
    }

    page.commands.push(`${(x + 18).toFixed(2)} ${lineY.toFixed(2)} ${(x + width - 18).toFixed(2)} ${lineY.toFixed(2)} m S`);
    drawTextLine(block.printedName, x + 18, lineY - 18, 12.5, 'F2');
    drawTextLine(block.roleLabel.toUpperCase(), x + 18, lineY - 34, 9, 'F1');
    drawTextLine(`Date: ${block.dateLabel}`, x + 18, lineY - 52, 10.5, 'F1');
  };

  drawTextLine('ACE STUDIO LEGAL RECORD', MARGIN_X, cursorY, 10, 'F2');
  cursorY -= 22;
  drawTextLine(data.title, MARGIN_X, cursorY, 24, 'F2');
  cursorY -= 30;
  drawParagraph(data.intro, { fontSize: 11.5, gapAfter: 18 });
  drawMetaGrid();

  for (const section of data.sections) {
    drawParagraph(section.title, { fontSize: 14.5, font: 'F2', gapAfter: 4 });
    drawParagraph(section.body, { fontSize: 11.5, gapAfter: 10 });
  }

  ensureSpace(220);
  drawParagraph('SIGNATURES', { fontSize: 12.5, font: 'F2', gapAfter: 8 });
  const columnGap = 18;
  const columnWidth = (CONTENT_WIDTH - columnGap) / 2;
  drawSignatureBlock(MARGIN_X, columnWidth, data.platformSignature, images.platform);
  drawSignatureBlock(MARGIN_X + columnWidth + columnGap, columnWidth, data.producerSignature, images.producer);
  cursorY -= 206;
  drawParagraph(data.footerNote, { fontSize: 9.5, gapAfter: 0 });

  const objects: Buffer[] = [];
  const addObject = (value: string | Buffer) => {
    objects.push(Buffer.isBuffer(value) ? value : Buffer.from(value, 'binary'));
    return objects.length;
  };

  const pagesRef = addObject('');
  const fontRegularRef = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBoldRef = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const imageRefs = new Map<string, number>();

  const allImages = [images.platform, images.producer].filter(Boolean) as PdfImageAsset[];
  for (const image of allImages) {
    imageRefs.set(
      image.name,
      addObject(
        streamObject(
          image.buffer,
          `/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`
        )
      )
    );
  }

  const pageRefs: number[] = [];
  for (const currentPage of pages) {
    const contentRef = addObject(streamObject(Buffer.from(currentPage.commands.join('\n'), 'ascii')));
    const imageResourceEntries = [...currentPage.images]
      .map((name) => `/${name} ${imageRefs.get(name)} 0 R`)
      .join(' ');
    const xObjectResource = imageResourceEntries ? ` /XObject << ${imageResourceEntries} >>` : '';
    const pageRef = addObject(
      `<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularRef} 0 R /F2 ${fontBoldRef} 0 R >>${xObjectResource} >> /Contents ${contentRef} 0 R >>`
    );
    pageRefs.push(pageRef);
  }

  objects[pagesRef - 1] = Buffer.from(`<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(' ')}] >>`, 'ascii');
  const catalogRef = addObject(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);

  const header = Buffer.from('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n', 'binary');
  const chunks: Buffer[] = [header];
  const offsets: number[] = [0];
  let runningOffset = header.length;

  objects.forEach((object, index) => {
    offsets.push(runningOffset);
    const objectHeader = Buffer.from(`${index + 1} 0 obj\n`, 'ascii');
    const objectFooter = Buffer.from('\nendobj\n', 'ascii');
    chunks.push(objectHeader, object, objectFooter);
    runningOffset += objectHeader.length + object.length + objectFooter.length;
  });

  const xrefOffset = runningOffset;
  const xrefLines = ['xref', `0 ${objects.length + 1}`, '0000000000 65535 f '];
  for (let index = 1; index < offsets.length; index += 1) {
    xrefLines.push(`${offsets[index].toString().padStart(10, '0')} 00000 n `);
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(Buffer.from(`${xrefLines.join('\n')}\n${trailer}`, 'ascii'));

  return Buffer.concat(chunks);
}

export function buildContractPdf(args: ContractPdfArgs) {
  const document = buildContractDocument(args);
  return renderPdf(document.data, {
    platform: buildImageAsset('SigPlatform', args.platformSignatureJpeg),
    producer: buildImageAsset('SigProducer', args.producerSignatureJpeg)
  });
}
