const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract text from an in-memory buffer.
 * @param {Buffer} buffer - The file contents
 * @param {string} ext - File extension including the dot, e.g. '.pdf'
 */
async function extractTextFromBuffer(buffer, ext) {
  switch (ext.toLowerCase()) {
    case '.pdf':
      return extractPdfFromBuffer(buffer);
    case '.docx':
      return extractDocxFromBuffer(buffer);
    case '.txt':
    case '.md':
      return extractPlainTextFromBuffer(buffer);
    default:
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

async function extractPlainTextFromBuffer(buffer) {
  const text = buffer.toString('utf-8');
  return {
    text,
    metadata: {},
  };
}

/**
 * Download a file from a URL and extract text from it.
 * @param {string} url - The file URL
 * @param {string} ext - File extension including the dot, e.g. '.pdf'
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
