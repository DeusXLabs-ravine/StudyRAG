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
  pdf.destroy();
  return {
    text,
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
    metadata: {
      messages: result.messages,
    },
  };
}

/**
 * Extract text from PowerPoint .pptx files.
 * PPTX is a ZIP containing XML slides at ppt/slides/slide*.xml
 */
async function extractPptxFromBuffer(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  // Find slide XML files and sort by slide number
  const slideEntries = entries
    .filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)/)[1]);
      const numB = parseInt(b.entryName.match(/slide(\d+)/)[1]);
      return numA - numB;
    });

  const slideTexts = [];
  for (const entry of slideEntries) {
    const xml = entry.getData().toString('utf-8');
    // Extract text content from XML <a:t> tags (PowerPoint text runs)
    const textParts = [];
    const regex = /<a:t>(.*?)<\/a:t>/gs;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      textParts.push(match[1]);
    }
    if (textParts.length > 0) {
      const slideNum = entry.entryName.match(/slide(\d+)/)[1];
      slideTexts.push(`## Slide ${slideNum}\n\n${textParts.join(' ')}`);
    }
  }

  return {
    text: slideTexts.join('\n\n'),
    metadata: {
      slides: slideEntries.length,
      format: 'pptx',
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

module.exports = { extractTextFromBuffer, extractTextFromUrl };
