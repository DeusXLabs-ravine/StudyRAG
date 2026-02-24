const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const AdmZip = require('adm-zip');

// Code / plain text extensions (read as UTF-8)
const CODE_EXTENSIONS = new Set([
  '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.c', '.cpp', '.h', '.hpp',
  '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.r', '.m',
  '.html', '.css', '.scss', '.sass', '.less',
  '.json', '.xml', '.csv', '.tsv', '.yaml', '.yml', '.toml', '.ini', '.cfg',
  '.sql', '.sh', '.bash', '.zsh', '.ps1', '.bat',
  '.log', '.env.example', '.gitignore', '.dockerfile',
]);

/**
 * Extract text from an in-memory buffer.
 * @param {Buffer} buffer - The file contents
 * @param {string} ext - File extension including the dot, e.g. '.pdf'
 */
async function extractTextFromBuffer(buffer, ext) {
  const lower = ext.toLowerCase();
  switch (lower) {
    case '.pdf':
      return extractPdfFromBuffer(buffer);
    case '.docx':
      return extractDocxFromBuffer(buffer);
    case '.pptx':
      return extractPptxFromBuffer(buffer);
    case '.ipynb':
      return extractNotebookFromBuffer(buffer);
    case '.txt':
    case '.md':
      return extractPlainTextFromBuffer(buffer);
    default:
      // Try code/data files
      if (CODE_EXTENSIONS.has(lower)) {
        return extractCodeFromBuffer(buffer, lower);
      }
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

async function extractPdfFromBuffer(buffer) {
  const pdf = new PDFParse({ data: new Uint8Array(buffer) });
  const { text, total } = await pdf.getText();
  const { info } = await pdf.getInfo();

  // Extract per-page text for PageIndex
  const pages = [];
  for (let i = 1; i <= total; i++) {
    try {
      const page = await pdf.getPage(i);
      const pageText = await page.getText();
      if (pageText && pageText.text && pageText.text.trim()) {
        pages.push({ pageNumber: i, text: pageText.text });
      }
    } catch {
      // Some pages may fail to parse; skip them
    }
  }

  pdf.destroy();
  return {
    text,
    pages: pages.length > 0 ? pages : null,
    metadata: {
      pages: total,
      info,
    },
  };
}

async function extractDocxFromBuffer(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    pages: null,
    metadata: {
      messages: result.messages,
    },
  };
}

/**
 * Decode XML entities to plain text.
 */
function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Extract paragraph-structured text from an XML string.
 * Respects <a:p> paragraph boundaries and joins text runs within each paragraph.
 * Returns an array of paragraph strings.
 */
function extractParagraphs(xml) {
  const paragraphs = [];
  const paraRegex = /<a:p\b[^>]*>(.*?)<\/a:p>/gs;
  let paraMatch;

  while ((paraMatch = paraRegex.exec(xml)) !== null) {
    const paraContent = paraMatch[1];
    const runs = [];
    const runRegex = /<a:t>(.*?)<\/a:t>/gs;
    let runMatch;
    while ((runMatch = runRegex.exec(paraContent)) !== null) {
      const text = decodeXmlEntities(runMatch[1]);
      if (text) runs.push(text);
    }
    if (runs.length > 0) {
      paragraphs.push(runs.join(''));
    }
  }

  return paragraphs;
}

/**
 * Extract table text from XML containing <a:tbl> elements.
 * Returns a markdown-formatted table string, or empty string if no tables found.
 */
function extractTables(xml) {
  const tables = [];
  const tableRegex = /<a:tbl\b[^>]*>(.*?)<\/a:tbl>/gs;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(xml)) !== null) {
    const tableXml = tableMatch[1];
    const rows = [];
    const rowRegex = /<a:tr\b[^>]*>(.*?)<\/a:tr>/gs;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(tableXml)) !== null) {
      const rowXml = rowMatch[1];
      const cells = [];
      const cellRegex = /<a:tc\b[^>]*>(.*?)<\/a:tc>/gs;
      let cellMatch;

      while ((cellMatch = cellRegex.exec(rowXml)) !== null) {
        const cellParagraphs = extractParagraphs(cellMatch[1]);
        cells.push(cellParagraphs.join(' ') || '');
      }

      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length > 0) {
      // Format as markdown table
      const header = '| ' + rows[0].map(c => c || ' ').join(' | ') + ' |';
      const separator = '| ' + rows[0].map(() => '---').join(' | ') + ' |';
      const body = rows.slice(1).map(row =>
        '| ' + row.map(c => c || ' ').join(' | ') + ' |'
      ).join('\n');
      tables.push([header, separator, body].filter(Boolean).join('\n'));
    }
  }

  return tables.join('\n\n');
}

/**
 * Build a map from slide number to its notes slide entry name.
 * Reads ppt/slides/_rels/slideN.xml.rels to find the notesSlide relationship.
 */
function buildNotesMap(entries) {
  const notesMap = new Map();

  const relEntries = entries.filter(e =>
    /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(e.entryName)
  );

  for (const relEntry of relEntries) {
    try {
      const slideNum = parseInt(relEntry.entryName.match(/slide(\d+)/)[1]);
      const xml = relEntry.getData().toString('utf-8');
      // Look for a relationship pointing to a notesSlide
      const noteRefRegex = /Target="\.\.\/notesSlides\/(notesSlide\d+\.xml)"/;
      const match = noteRefRegex.exec(xml);
      if (match) {
        notesMap.set(slideNum, `ppt/notesSlides/${match[1]}`);
      }
    } catch {
      // Skip malformed relationship files
    }
  }

  return notesMap;
}

/**
 * Extract text from a single slide's XML, returning structured parts.
 * Separates table content from body text to avoid duplication.
 */
function extractSlideContent(xml) {
  // Remove table XML before extracting body paragraphs to avoid duplication
  const xmlWithoutTables = xml.replace(/<a:tbl\b[^>]*>.*?<\/a:tbl>/gs, '');

  // Extract body paragraphs (main slide content, excluding tables)
  const bodyParagraphs = extractParagraphs(xmlWithoutTables);

  // Extract table content separately with structure preserved
  const tableText = extractTables(xml);

  return { bodyParagraphs, tableText };
}

/**
 * Extract text from PowerPoint .pptx files.
 * Extracts text from slides, speaker notes, tables, and SmartArt diagrams.
 * PPTX is a ZIP containing XML slides at ppt/slides/slide*.xml
 */
async function extractPptxFromBuffer(buffer) {
  let zip;
  try {
    zip = new AdmZip(buffer);
  } catch (err) {
    throw new Error(`Invalid or corrupt PPTX file: ${err.message}`);
  }

  const entries = zip.getEntries();

  // Find slide XML files and sort by slide number
  const slideEntries = entries
    .filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)/)[1]);
      const numB = parseInt(b.entryName.match(/slide(\d+)/)[1]);
      return numA - numB;
    });

  if (slideEntries.length === 0) {
    return {
      text: '',
      pages: null,
      metadata: { slides: 0, format: 'pptx' },
    };
  }

  // Build notes map: slide number -> notes entry path
  const notesMap = buildNotesMap(entries);

  // Build a lookup for all entries by name for quick access
  const entryByName = new Map();
  for (const e of entries) {
    entryByName.set(e.entryName, e);
  }

  // Extract SmartArt / diagram text (shared across slides)
  let diagramText = '';
  const diagramEntries = entries.filter(e =>
    /^ppt\/diagrams\/data\d*\.xml$/.test(e.entryName)
  );
  if (diagramEntries.length > 0) {
    const diagramParts = [];
    for (const de of diagramEntries) {
      try {
        const dxml = de.getData().toString('utf-8');
        const paragraphs = extractParagraphs(dxml);
        if (paragraphs.length > 0) {
          diagramParts.push(paragraphs.join('\n'));
        }
      } catch {
        // Skip malformed diagram files
      }
    }
    if (diagramParts.length > 0) {
      diagramText = diagramParts.join('\n');
    }
  }

  const slideTexts = [];
  const pages = [];

  for (let i = 0; i < slideEntries.length; i++) {
    const entry = slideEntries[i];
    const slideNum = parseInt(entry.entryName.match(/slide(\d+)/)[1]);

    try {
      const xml = entry.getData().toString('utf-8');
      const { bodyParagraphs, tableText } = extractSlideContent(xml);

      // Build slide text with proper structure
      const parts = [];

      // Main slide body text (paragraphs separated by newlines)
      if (bodyParagraphs.length > 0) {
        parts.push(bodyParagraphs.join('\n'));
      }

      // Tables
      if (tableText) {
        parts.push(tableText);
      }

      // Speaker notes
      const notesPath = notesMap.get(slideNum);
      if (notesPath) {
        const notesEntry = entryByName.get(notesPath);
        if (notesEntry) {
          try {
            const notesXml = notesEntry.getData().toString('utf-8');
            const notesParagraphs = extractParagraphs(notesXml);
            // Filter out slide number placeholder text that PowerPoint inserts
            const meaningfulNotes = notesParagraphs.filter(p => {
              const trimmed = p.trim();
              // Skip empty, pure numeric (slide number placeholders), and very short generic text
              return trimmed && !/^\d+$/.test(trimmed);
            });
            if (meaningfulNotes.length > 0) {
              parts.push(`Speaker Notes:\n${meaningfulNotes.join('\n')}`);
            }
          } catch {
            // Skip malformed notes
          }
        }
      }

      const slideText = parts.join('\n\n');
      if (slideText.trim()) {
        slideTexts.push(`## Slide ${slideNum}\n\n${slideText}`);
        pages.push({ pageNumber: i + 1, text: slideText });
      }
    } catch (err) {
      console.warn(`[PPTX] Failed to parse slide ${slideNum}: ${err.message}`);
      // Continue processing remaining slides
    }
  }

  // Append SmartArt text as a supplementary section if it contains text
  // not already captured in slides
  if (diagramText.trim()) {
    slideTexts.push(`## Diagrams & SmartArt\n\n${diagramText}`);
  }

  return {
    text: slideTexts.join('\n\n'),
    pages: pages.length > 0 ? pages : null,
    metadata: {
      slides: slideEntries.length,
      format: 'pptx',
      hasNotes: notesMap.size > 0,
      hasDiagrams: diagramEntries.length > 0,
    },
  };
}

/**
 * Extract text from Jupyter Notebook .ipynb files.
 * Extracts both markdown and code cells with clear labeling.
 */
async function extractNotebookFromBuffer(buffer) {
  const content = JSON.parse(buffer.toString('utf-8'));
  const cells = content.cells || [];

  const parts = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const source = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');
    if (!source.trim()) continue;

    if (cell.cell_type === 'markdown') {
      parts.push(source);
    } else if (cell.cell_type === 'code') {
      parts.push(`\`\`\`python\n${source}\n\`\`\``);
      // Include output text if available
      const outputs = cell.outputs || [];
      for (const out of outputs) {
        const outText = out.text || (out.data && out.data['text/plain']);
        if (outText) {
          const text = Array.isArray(outText) ? outText.join('') : outText;
          parts.push(`Output:\n\`\`\`\n${text}\n\`\`\``);
        }
      }
    } else if (cell.cell_type === 'raw') {
      parts.push(source);
    }
  }

  const language = content.metadata?.kernelspec?.language || 'python';

  return {
    text: parts.join('\n\n'),
    pages: null,
    metadata: {
      cellCount: cells.length,
      language,
      format: 'ipynb',
    },
  };
}

async function extractPlainTextFromBuffer(buffer) {
  const text = buffer.toString('utf-8');
  return {
    text,
    pages: null,
    metadata: {},
  };
}

/**
 * Extract text from source code files. Wraps in a code fence with language label.
 */
async function extractCodeFromBuffer(buffer, ext) {
  const text = buffer.toString('utf-8');
  const langMap = {
    '.py': 'python', '.js': 'javascript', '.ts': 'typescript',
    '.jsx': 'jsx', '.tsx': 'tsx', '.java': 'java',
    '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp',
    '.go': 'go', '.rs': 'rust', '.rb': 'ruby', '.php': 'php',
    '.swift': 'swift', '.kt': 'kotlin', '.scala': 'scala',
    '.r': 'r', '.m': 'matlab',
    '.html': 'html', '.css': 'css', '.scss': 'scss',
    '.json': 'json', '.xml': 'xml', '.yaml': 'yaml', '.yml': 'yaml',
    '.sql': 'sql', '.sh': 'bash', '.bash': 'bash',
    '.csv': 'csv', '.tsv': 'tsv', '.toml': 'toml',
  };
  const lang = langMap[ext] || 'text';

  return {
    text: `# Source Code (${lang})\n\n\`\`\`${lang}\n${text}\n\`\`\``,
    pages: null,
    metadata: {
      language: lang,
      format: 'code',
      lines: text.split('\n').length,
    },
  };
}

/**
 * Download a file from a URL and extract text from it.
 */
async function extractTextFromUrl(url, ext) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return extractTextFromBuffer(buffer, ext);
}

/**
 * Normalize typed note content into the standard { text, pages, metadata } shape
 * that runProcessingPipeline expects.
 * @param {string} content - The raw note text (may include markdown)
 * @param {string} title - The note title
 */
function extractTextFromNote(content, title = 'Untitled Note') {
  const text = title ? `# ${title}\n\n${content}` : content;
  return {
    text,
    pages: null,
    metadata: {
      title,
      format: 'note',
      charCount: content.length,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    },
  };
}

module.exports = { extractTextFromBuffer, extractTextFromUrl, extractTextFromNote };
