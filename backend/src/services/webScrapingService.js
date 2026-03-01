const cheerio = require('cheerio');
const { getSearchGroundedModel, withRetryOnRateLimit } = require('../config/gemini');
const { extractTextFromUrl } = require('./fileProcessor');

// Trusted academic/medical/institutional domains for source quality enforcement
const TRUSTED_DOMAINS = [
  // Academic general
  'scholar.google.com',
  'arxiv.org',
  'ieee.org',
  'acm.org',
  'researchgate.net',
  'semanticscholar.org',
  // Medical / government
  'pubmed.ncbi.nlm.nih.gov',
  'ncbi.nlm.nih.gov',
  'nih.gov',
  'who.int',
  'fda.gov',
  'cdc.gov',
  // Medical journals
  'cochranelibrary.com',
  'bmj.com',
  'thelancet.com',
  'nejm.org',
  'nature.com',
  'sciencedirect.com',
  'springer.com',
  'wiley.com',
  'oup.com',
  'cell.com',
  'jamanetwork.com',
  'ahajournals.org',
  'acpjournals.org',
  // Medical references
  'medscape.com',
  'mayoclinic.org',
  'merckmanuals.com',
  'amboss.com',
  'drugs.com',
  'rxlist.com',
  'uptodate.com',
  // Educational
  'osmosis.org',
  'khanacademy.org',
  'coursera.org',
  'edx.org',
  'mit.edu',
  // Programming documentation
  'docs.python.org',
  'developer.mozilla.org',
  'nodejs.org',
  'react.dev',
  'vuejs.org',
  'angular.io',
  'typescriptlang.org',
  'docs.oracle.com',
  'spring.io',
  'doc.rust-lang.org',
  'docs.rs',
  'go.dev',
  'pkg.go.dev',
  'en.cppreference.com',
  'learn.microsoft.com',
  'developer.apple.com',
  'swift.org',
  'kotlinlang.org',
  'ruby-doc.org',
  'php.net',
  'devdocs.io',
  'stackoverflow.com',
  // Open-access textbook sources
  'openstax.org',
  'ocw.mit.edu',
  'doabooks.org',
  'open.umn.edu',
];

// Patterns for trusted TLDs / domain suffixes
const TRUSTED_PATTERNS = [
  /\.edu$/,
  /\.ac\.\w+$/,
  /\.gov$/,
  /\.gov\.\w+$/,
];

// File extensions that indicate a downloadable document
const DOWNLOADABLE_EXTENSIONS = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.txt', '.xlsx', '.xls'];

/**
 * Check if a URL points to a downloadable file based on content-type or URL extension.
 */
function isDownloadableFile(contentType, url) {
  if (contentType) {
    const ct = contentType.toLowerCase();
    if (ct.includes('application/pdf') || ct.includes('application/msword') ||
        ct.includes('application/vnd.openxmlformats') || ct.includes('application/vnd.ms-') ||
        ct.includes('text/plain') && url.match(/\.(txt|md|csv)$/i)) {
      return true;
    }
  }

  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return DOWNLOADABLE_EXTENSIONS.some(ext => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Determine the file extension from a URL or content-type.
 */
function getFileExtension(contentType, url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const ext = DOWNLOADABLE_EXTENSIONS.find(e => pathname.endsWith(e));
    if (ext) return ext;
  } catch { /* ignore */ }

  if (contentType) {
    const ct = contentType.toLowerCase();
    if (ct.includes('application/pdf')) return '.pdf';
    if (ct.includes('application/vnd.openxmlformats-officedocument.wordprocessingml')) return '.docx';
    if (ct.includes('application/vnd.openxmlformats-officedocument.presentationml')) return '.pptx';
    if (ct.includes('text/plain')) return '.txt';
  }
  return null;
}

/**
 * Convert cheerio-parsed HTML to structured markdown-like text.
 * Walks the DOM and converts semantic elements to readable text.
 */
function htmlToStructuredText($, el) {
  const parts = [];

  function walk(node) {
    if (node.type === 'text') {
      const text = $(node).text().trim();
      if (text) parts.push(text);
      return;
    }

    if (node.type !== 'tag') return;

    const tag = node.tagName?.toLowerCase();
    const children = node.children || [];

    // Skip hidden / noise elements
    if (['script', 'style', 'noscript', 'svg', 'iframe', 'form'].includes(tag)) return;

    switch (tag) {
      case 'h1':
        parts.push(`\n# ${$(node).text().trim()}\n`);
        return;
      case 'h2':
        parts.push(`\n## ${$(node).text().trim()}\n`);
        return;
      case 'h3':
        parts.push(`\n### ${$(node).text().trim()}\n`);
        return;
      case 'h4':
      case 'h5':
      case 'h6':
        parts.push(`\n#### ${$(node).text().trim()}\n`);
        return;
      case 'p':
        parts.push(`\n${$(node).text().trim()}\n`);
        return;
      case 'br':
        parts.push('\n');
        return;
      case 'li': {
        const text = $(node).text().trim();
        if (text) parts.push(`- ${text}`);
        return;
      }
      case 'ul':
      case 'ol':
        parts.push('');
        children.forEach(child => walk(child));
        parts.push('');
        return;
      case 'pre':
      case 'code': {
        const code = $(node).text().trim();
        if (code) parts.push(`\n\`\`\`\n${code}\n\`\`\`\n`);
        return;
      }
      case 'blockquote':
        parts.push(`\n> ${$(node).text().trim()}\n`);
        return;
      case 'table': {
        const tableText = extractTable($, node);
        if (tableText) parts.push(`\n${tableText}\n`);
        return;
      }
      case 'strong':
      case 'b':
        parts.push(`**${$(node).text().trim()}**`);
        return;
      case 'em':
      case 'i':
        parts.push(`*${$(node).text().trim()}*`);
        return;
      case 'a': {
        const text = $(node).text().trim();
        const href = $(node).attr('href');
        if (text && href && href.startsWith('http')) {
          parts.push(`[${text}](${href})`);
        } else if (text) {
          parts.push(text);
        }
        return;
      }
      default:
        children.forEach(child => walk(child));
    }
  }

  const nodes = el ? $(el).contents().toArray() : $.root().contents().toArray();
  nodes.forEach(node => walk(node));

  return parts
    .join(' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')     // collapse triple+ newlines
    .replace(/  +/g, ' ')                    // collapse multiple spaces
    .trim();
}

/**
 * Extract a table element into a markdown table string.
 */
function extractTable($, tableNode) {
  const rows = [];
  $(tableNode).find('tr').each((_, tr) => {
    const cells = [];
    $(tr).find('th, td').each((_, cell) => {
      cells.push($(cell).text().trim().replace(/\|/g, '\\|'));
    });
    if (cells.length > 0) rows.push(cells);
  });

  if (rows.length === 0) return '';

  const header = '| ' + rows[0].join(' | ') + ' |';
  const separator = '| ' + rows[0].map(() => '---').join(' | ') + ' |';
  const body = rows.slice(1).map(row => '| ' + row.join(' | ') + ' |').join('\n');
  return [header, separator, body].filter(Boolean).join('\n');
}

/**
 * Strip noise elements from HTML (nav, footer, ads, sidebars, etc.).
 */
function stripNoise($) {
  const noiseSelectors = [
    'nav', 'footer', 'header', 'aside',
    '.nav', '.navbar', '.footer', '.header', '.sidebar', '.menu',
    '.ad', '.ads', '.advertisement', '.adsbygoogle',
    '.cookie', '.popup', '.modal', '.overlay',
    '.social-share', '.comments', '.related-posts',
    '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
    '#nav', '#footer', '#header', '#sidebar', '#menu',
    'script', 'style', 'noscript', 'link', 'meta',
  ];
  noiseSelectors.forEach(sel => {
    try { $(sel).remove(); } catch { /* ignore invalid selectors */ }
  });
}

/**
 * Extract content from a URL. Tiered extraction strategy:
 * 1. Validate URL (HTTP/HTTPS only)
 * 2. If downloadable file (PDF, DOCX, etc.) → delegate to fileProcessor
 * 3. Fetch HTML, parse with cheerio, strip noise, extract structured text
 * 4. If text too short (<200 chars) → fallback to Gemini grounding extraction
 *
 * @param {string} url - The URL to extract content from
 * @returns {{ text: string, pages: null, metadata: object }}
 */
async function extractContentFromUrl(url) {
  // 1. Validate URL
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are supported');
  }

  // 2. HEAD request to check content type
  let contentType = '';
  try {
    const headResp = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'StudyRAG/1.0 (Educational Content Fetcher)' },
    });
    contentType = headResp.headers.get('content-type') || '';
  } catch {
    // HEAD may fail, continue with GET
  }

  // 3. If it's a downloadable file, delegate to fileProcessor
  if (isDownloadableFile(contentType, url)) {
    const ext = getFileExtension(contentType, url);
    if (ext) {
      const result = await extractTextFromUrl(url, ext);
      return {
        ...result,
        metadata: {
          ...result.metadata,
          sourceUrl: url,
          format: ext.slice(1),
          sourceQuality: assessSourceQuality(url, '').tier,
        },
      };
    }
  }

  // 4. Fetch HTML
  let html;
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'StudyRAG/1.0 (Educational Content Fetcher)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    html = await resp.text();
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error('URL fetch timed out after 15 seconds');
    }
    throw new Error(`Failed to fetch URL: ${err.message}`);
  }

  // 5. Parse HTML with cheerio
  const $ = cheerio.load(html);
  const title = $('title').text().trim() || $('h1').first().text().trim() || parsedUrl.hostname;

  // Strip noise
  stripNoise($);

  // Try semantic containers first: article > main > body
  let contentEl = $('article').first();
  if (!contentEl.length || contentEl.text().trim().length < 100) {
    contentEl = $('main').first();
  }
  if (!contentEl.length || contentEl.text().trim().length < 100) {
    contentEl = $('body').first();
  }

  // 6. Convert to structured text
  let text = htmlToStructuredText($, contentEl.length ? contentEl : null);

  // 7. If text too short, try Gemini grounding fallback (likely JS-rendered page)
  if (text.length < 200) {
    try {
      const geminiResult = await extractViaGemini(url);
      if (geminiResult && geminiResult.length > text.length) {
        text = geminiResult;
      }
    } catch (err) {
      console.warn(`[WebScraping] Gemini fallback failed for ${url}: ${err.message}`);
      // Continue with whatever text we have
    }
  }

  if (text.length < 50) {
    throw new Error('Could not extract meaningful content from this URL. The page may require JavaScript or authentication.');
  }

  const quality = assessSourceQuality(url, title);

  return {
    text,
    pages: null,
    metadata: {
      sourceUrl: url,
      title,
      format: 'webpage',
      sourceQuality: quality.tier,
      sourceQualityReason: quality.reason,
    },
  };
}

/**
 * Fallback extraction using Gemini with search grounding.
 * Used when cheerio can't extract enough text (JS-rendered pages).
 */
async function extractViaGemini(url) {
  const prompt = `Extract the full main content from this webpage: ${url}

Return ONLY the text content of the page, preserving headings and structure.
Do not add commentary or analysis — just extract the actual page content.
Use markdown formatting for headings, lists, and emphasis.`;

  const result = await withRetryOnRateLimit(async () => {
    const model = getSearchGroundedModel('standard');
    return model.generateContent(prompt);
  }, 3, 1);
  return result.response.text();
}

/**
 * Assess the quality/trustworthiness of a URL source.
 * @param {string} url
 * @param {string} title
 * @returns {{ tier: 'trusted'|'acceptable'|'unverified', reason: string }}
 */
function assessSourceQuality(url, title) {
  let hostname;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return { tier: 'unverified', reason: 'Invalid URL' };
  }

  // Check exact domain matches
  for (const domain of TRUSTED_DOMAINS) {
    if (hostname === domain || hostname.endsWith('.' + domain)) {
      return { tier: 'trusted', reason: `Recognized academic/medical source: ${domain}` };
    }
  }

  // Check pattern matches (.edu, .ac.uk, .gov, etc.)
  for (const pattern of TRUSTED_PATTERNS) {
    if (pattern.test(hostname)) {
      return { tier: 'trusted', reason: `Institutional domain: ${hostname}` };
    }
  }

  // Acceptable: .org domains, known publishers not in the trusted list
  if (hostname.endsWith('.org')) {
    return { tier: 'acceptable', reason: 'Organization domain (.org)' };
  }

  return { tier: 'unverified', reason: 'Source not in trusted academic/medical domain list' };
}

module.exports = {
  extractContentFromUrl,
  assessSourceQuality,
  isDownloadableFile,
};
