const path = require('path');
const sharp = require('sharp');
const AdmZip = require('adm-zip');

const MAX_IMAGE_DIMENSION = 1568; // Gemini Vision sweet spot
const PDF_RENDER_SCALE = 2;       // 2x for better quality
const PAGE_BATCH_SIZE = 5;        // Process pages in batches for memory management

// Keywords that hint a page likely contains a diagram/figure
const DIAGRAM_KEYWORDS = [
  'figure', 'fig.', 'fig ', 'diagram', 'chart', 'graph', 'table',
  'illustration', 'schematic', 'flowchart', 'process flow',
  'architecture', 'topology', 'circuit', 'anatomy',
];

// Short-text threshold: pages with less text than this are candidate diagram pages
const SHORT_TEXT_THRESHOLD = 500;

/**
 * Determine which PDF pages are likely to contain diagrams using heuristics.
 * Uses the already-extracted page texts — no vision needed.
 */
function getCandidatePages(pageTexts, totalPages) {
  if (!pageTexts || pageTexts.length === 0) {
    // No page text info — treat all pages as candidates
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const candidates = new Set();

  for (const { pageNumber, text } of pageTexts) {
    const lower = (text || '').toLowerCase();

    // Heuristic 1: Short text relative to page (likely visual content)
    if (lower.length < SHORT_TEXT_THRESHOLD) {
      candidates.add(pageNumber);
      continue;
    }

    // Heuristic 2: Contains diagram-related keywords
    if (DIAGRAM_KEYWORDS.some(kw => lower.includes(kw))) {
      candidates.add(pageNumber);
    }
  }

  return Array.from(candidates).sort((a, b) => a - b);
}

/**
 * Resize an image buffer to fit within MAX_IMAGE_DIMENSION while preserving aspect ratio.
 */
async function resizeImage(imageBuffer, mimeType) {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) return imageBuffer;
    if (metadata.width <= MAX_IMAGE_DIMENSION && metadata.height <= MAX_IMAGE_DIMENSION) {
      return imageBuffer;
    }

    const resized = await image
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    return resized;
  } catch {
    return imageBuffer;
  }
}

/**
 * Extract candidate page images from a PDF buffer.
 * Uses pdfjs-dist + canvas to render pages, then resizes with sharp.
 */
async function extractPdfImages(buffer, pageTexts) {
  // Dynamic import for ESM-only pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { createCanvas } = require('canvas');

  const data = new Uint8Array(buffer);
  const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

  const candidatePages = getCandidatePages(pageTexts, pdf.numPages);
  if (candidatePages.length === 0) {
    pdf.destroy();
    return [];
  }

  console.log(`[ImageExtractor] PDF: ${pdf.numPages} pages, ${candidatePages.length} candidates`);

  const results = [];

  // Process in batches to limit memory usage
  for (let i = 0; i < candidatePages.length; i += PAGE_BATCH_SIZE) {
    const batch = candidatePages.slice(i, i + PAGE_BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (pageNum) => {
        try {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });

          const canvas = createCanvas(viewport.width, viewport.height);
          const ctx = canvas.getContext('2d');

          await page.render({ canvasContext: ctx, viewport }).promise;

          const pngBuffer = canvas.toBuffer('image/png');
          const resized = await resizeImage(pngBuffer, 'image/png');

          return { pageNumber: pageNum, imageBuffer: resized, mimeType: 'image/png' };
        } catch (err) {
          console.warn(`[ImageExtractor] Failed to render PDF page ${pageNum}: ${err.message}`);
          return null;
        }
      })
    );

    results.push(...batchResults.filter(Boolean));
  }

  pdf.destroy();
  return results;
}

/**
 * Extract embedded images from a PPTX buffer.
 * Reads the ZIP structure to find images in ppt/media/.
 */
async function extractPptxImages(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  // Find all slide relationship files to map images to slides
  const slideRels = entries
    .filter(e => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)/)[1]);
      const numB = parseInt(b.entryName.match(/slide(\d+)/)[1]);
      return numA - numB;
    });

  const results = [];
  const processedMedia = new Set();

  for (const relEntry of slideRels) {
    const slideNum = parseInt(relEntry.entryName.match(/slide(\d+)/)[1]);
    const xml = relEntry.getData().toString('utf-8');

    // Find image references in the relationships XML
    const imageRefs = [];
    const regex = /Target="\.\.\/media\/(image\d+\.\w+)"/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      imageRefs.push(match[1]);
    }

    for (const imageName of imageRefs) {
      const mediaPath = `ppt/media/${imageName}`;
      if (processedMedia.has(mediaPath)) continue;
      processedMedia.add(mediaPath);

      const ext = path.extname(imageName).toLowerCase();
      // Skip Windows-only vector formats
      if (ext === '.emf' || ext === '.wmf') continue;

      const mediaEntry = entries.find(e => e.entryName === mediaPath);
      if (!mediaEntry) continue;

      try {
        const imageBuffer = mediaEntry.getData();
        const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
        const resized = await resizeImage(imageBuffer, mimeType);
        results.push({ pageNumber: slideNum, imageBuffer: resized, mimeType });
      } catch (err) {
        console.warn(`[ImageExtractor] Failed to process PPTX image ${imageName}: ${err.message}`);
      }
    }
  }

  return results;
}

/**
 * Extract candidate images from a document buffer.
 * @param {Buffer} buffer - File contents
 * @param {string} ext - File extension (e.g. '.pdf', '.pptx')
 * @param {Array<{pageNumber: number, text: string}>} pageTexts - Already-extracted page texts (for heuristic filtering)
 * @returns {Promise<Array<{pageNumber: number, imageBuffer: Buffer, mimeType: string}>>}
 */
async function extractImagesFromBuffer(buffer, ext, pageTexts = []) {
  const lower = ext.toLowerCase();

  switch (lower) {
    case '.pdf':
      return extractPdfImages(buffer, pageTexts);
    case '.pptx':
      return extractPptxImages(buffer);
    default:
      // Other file types don't have extractable images
      return [];
  }
}

module.exports = { extractImagesFromBuffer };
