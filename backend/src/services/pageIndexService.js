const { getGenerativeModel } = require('../config/gemini');
const { v4: uuidv4 } = require('uuid');

// Constraints matching PageIndex defaults
const MAX_PAGES_PER_LEAF = 10;

// --- LRU Cache for tree search results (#4) ---
const CACHE_MAX_SIZE = 200;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const searchCache = new Map();

function getCacheKey(docId, query) {
  // Normalize query for better cache hit rate
  return `${docId}::${query.toLowerCase().trim()}`;
}

function getCached(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  // Move to end (most recently used)
  searchCache.delete(key);
  searchCache.set(key, entry);
  return entry.value;
}

function setCache(key, value) {
  // Evict oldest if at capacity
  if (searchCache.size >= CACHE_MAX_SIZE) {
    const oldest = searchCache.keys().next().value;
    searchCache.delete(oldest);
  }
  searchCache.set(key, { value, timestamp: Date.now() });
}

function invalidateDocCache(docId) {
  for (const key of searchCache.keys()) {
    if (key.startsWith(`${docId}::`)) {
      searchCache.delete(key);
    }
  }
}

// --- Build Page Index ---

/**
 * Build a hierarchical page index for a document.
 * @param {Array<{pageNumber: number, text: string}>|null} rawPages - Native pages (PDF/PPTX) or null
 * @param {string} fullText - Full document text
 * @param {object} metadata - Document metadata
 * @returns {{ tree: object, pages: Array<{pageNumber: number, text: string, heading: string|null, summary: string}> }}
 */
async function buildPageIndex(rawPages, fullText, metadata) {
  let pages;

  if (rawPages && rawPages.length > 0) {
    // Documents with native pages (PDF, PPTX)
    pages = rawPages.map(p => ({
      pageNumber: p.pageNumber,
      text: p.text,
      heading: null,
    }));
  } else {
    // Documents without native pages — use improved virtual page creation (#5)
    pages = createVirtualPages(fullText, metadata);
  }

  if (pages.length === 0) {
    pages = [{ pageNumber: 1, text: fullText, heading: null }];
  }

  // Generate per-page summaries at index time (#6)
  await addPageSummaries(pages);

  const tree = await buildTree(pages, metadata);

  return { tree, pages };
}

/**
 * Improved virtual page creation (#5).
 * Handles code files (split by function/class), markdown (heading hierarchy),
 * and plain text (paragraph-based) separately.
 */
function createVirtualPages(text, metadata) {
  const format = metadata?.format;

  // Code files: split by function/class definitions
  if (format === 'code') {
    return createCodePages(text);
  }

  // Markdown / structured text: split by heading hierarchy
  return createHeadingPages(text);
}

/**
 * Split code files by function/class/method definitions.
 */
function createCodePages(text) {
  // Match common function/class/method patterns across languages
  const codeBlockRegex = /^(?:(?:export\s+)?(?:async\s+)?(?:function|class|const|let|var|def|fn|func|pub\s+fn|public\s+(?:static\s+)?(?:void|int|string|async))\s+\w+|(?:(?:public|private|protected)\s+)?(?:static\s+)?(?:class|interface|enum|struct)\s+\w+)/gm;

  const boundaries = [];
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    boundaries.push({ index: match.index, heading: match[0].trim() });
  }

  if (boundaries.length === 0) {
    // No function/class boundaries found, fall back to heading-based
    return createHeadingPages(text);
  }

  const pages = [];
  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i].index;
    const end = i < boundaries.length - 1 ? boundaries[i + 1].index : text.length;
    const sectionText = text.slice(start, end).trim();
    if (sectionText.length > 50) {
      pages.push({
        pageNumber: pages.length + 1,
        text: sectionText,
        heading: boundaries[i].heading.slice(0, 80),
      });
    }
  }

  // If there's text before the first boundary, add it as page 1
  if (boundaries[0].index > 100) {
    const prelude = text.slice(0, boundaries[0].index).trim();
    if (prelude.length > 50) {
      pages.unshift({
        pageNumber: 0,
        text: prelude,
        heading: 'Imports & Setup',
      });
      // Re-number
      pages.forEach((p, i) => { p.pageNumber = i + 1; });
    }
  }

  return pages.length > 0 ? pages : createHeadingPages(text);
}

/**
 * Split by markdown headings with hierarchy awareness.
 * H1 sections become top-level pages, H2/H3 become sub-pages within them.
 */
function createHeadingPages(text) {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings = [];
  let match;

  while ((match = headingRegex.exec(text)) !== null) {
    headings.push({
      level: match[1].length,
      title: match[2].trim(),
      index: match.index,
      fullMatch: match[0],
    });
  }

  // Also try ALL-CAPS headings
  const capsRegex = /^([A-Z][A-Z\s]{2,}[A-Z])$/gm;
  while ((match = capsRegex.exec(text)) !== null) {
    headings.push({
      level: 1,
      title: match[1].trim(),
      index: match.index,
      fullMatch: match[0],
    });
  }

  // Sort by position
  headings.sort((a, b) => a.index - b.index);

  if (headings.length === 0) {
    // No headings: split by paragraphs into ~2000 char pages
    return createParagraphPages(text);
  }

  const sections = [];
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index + headings[i].fullMatch.length;
    const end = i < headings.length - 1 ? headings[i + 1].index : text.length;
    const sectionText = text.slice(start, end).trim();
    if (sectionText.length > 50) {
      sections.push({
        heading: headings[i].title,
        level: headings[i].level,
        text: sectionText,
      });
    }
  }

  // Add any text before the first heading
  if (headings.length > 0 && headings[0].index > 100) {
    const prelude = text.slice(0, headings[0].index).trim();
    if (prelude.length > 50) {
      sections.unshift({ heading: null, level: 0, text: prelude });
    }
  }

  if (sections.length === 0) {
    return createParagraphPages(text);
  }

  return sections.map((s, i) => ({
    pageNumber: i + 1,
    text: s.text,
    heading: s.heading,
  }));
}

/**
 * Fallback: split by paragraphs into ~2000 char pages.
 */
function createParagraphPages(text) {
  const paragraphs = text.split(/\n\s*\n/);
  let currentPage = '';
  let pageNum = 1;
  const pages = [];

  for (const para of paragraphs) {
    if (currentPage.length + para.length > 2000 && currentPage.length > 0) {
      pages.push({ pageNumber: pageNum++, text: currentPage.trim(), heading: null });
      currentPage = para;
    } else {
      currentPage += (currentPage ? '\n\n' : '') + para;
    }
  }
  if (currentPage.trim()) {
    pages.push({ pageNumber: pageNum, text: currentPage.trim(), heading: null });
  }
  return pages;
}

// --- Per-page summaries at index time (#6, optimized) ---

/**
 * Generate one-sentence summaries for pages during indexing.
 * Uses batched multi-page prompts (10 pages per LLM call) for speed.
 * Runs up to 3 batch calls concurrently.
 */
async function addPageSummaries(pages) {
  // For very small docs, skip per-page summaries — tree summary is sufficient
  if (pages.length <= 5) {
    for (const page of pages) {
      page.summary = '';
    }
    return;
  }

  const PAGES_PER_CALL = 10;  // 10 pages summarized in a single LLM call
  const CONCURRENT_CALLS = 3; // 3 concurrent LLM calls

  const batches = [];
  for (let i = 0; i < pages.length; i += PAGES_PER_CALL) {
    batches.push(pages.slice(i, i + PAGES_PER_CALL));
  }

  // Process batches with limited concurrency
  for (let i = 0; i < batches.length; i += CONCURRENT_CALLS) {
    const concurrentBatches = batches.slice(i, i + CONCURRENT_CALLS);
    await Promise.all(concurrentBatches.map(batch => summarizeBatch(batch)));
  }
}

async function summarizeBatch(batchPages) {
  const pagesText = batchPages.map(p => {
    const preview = p.text.slice(0, 500).replace(/\n/g, ' ');
    return `Page ${p.pageNumber}: ${preview}`;
  }).join('\n---\n');

  const model = getGenerativeModel('fast');
  try {
    const result = await model.generateContent(
      `Summarize each page below in ONE sentence (max 25 words each). Return ONLY a JSON array of strings, one summary per page, in order.\n\n${pagesText}\n\nReply ONLY with a JSON array like: ["summary1", "summary2", ...]`
    );
    const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const summaries = JSON.parse(text);
    if (Array.isArray(summaries)) {
      for (let i = 0; i < batchPages.length; i++) {
        batchPages[i].summary = summaries[i] || '';
      }
      return;
    }
  } catch {
    // Fallback: empty summaries
  }
  for (const page of batchPages) {
    page.summary = '';
  }
}

// --- Tree Construction ---

async function buildTree(pages, metadata) {
  const pageCount = pages.length;

  if (pageCount <= MAX_PAGES_PER_LEAF) {
    return await buildSimpleTree(pages);
  }

  // Fast path: if pages already have heading structure, build tree directly (no LLM needed)
  const headingTree = buildTreeFromHeadings(pages);
  if (headingTree) {
    return headingTree;
  }

  // LLM path: try TOC detection first, then generate structure
  const tocResult = await detectTOC(pages);
  if (tocResult && tocResult.has_toc) {
    return await buildTreeFromTOC(tocResult.toc_text, pages);
  }

  return await generateTreeStructure(pages);
}

/**
 * Build tree directly from page headings without any LLM calls.
 * Returns null if pages don't have enough heading structure.
 */
function buildTreeFromHeadings(pages) {
  const pagesWithHeadings = pages.filter(p => p.heading);
  // Need at least 30% of pages to have headings for this to be useful
  if (pagesWithHeadings.length < pages.length * 0.3) {
    return null;
  }

  // Group consecutive pages by heading into sections
  const sections = [];
  let currentSection = null;

  for (const page of pages) {
    if (page.heading && page.heading !== currentSection?.title) {
      if (currentSection) {
        currentSection.endPage = page.pageNumber - 1;
        sections.push(currentSection);
      }
      currentSection = {
        title: page.heading,
        startPage: page.pageNumber,
        endPage: page.pageNumber,
        summary: page.summary || '',
      };
    } else if (currentSection) {
      currentSection.endPage = page.pageNumber;
      // Append summaries
      if (page.summary) {
        currentSection.summary = currentSection.summary
          ? currentSection.summary + '. ' + page.summary
          : page.summary;
      }
    } else {
      // Pages before first heading
      currentSection = {
        title: 'Introduction',
        startPage: page.pageNumber,
        endPage: page.pageNumber,
        summary: page.summary || '',
      };
    }
  }
  if (currentSection) {
    currentSection.endPage = pages[pages.length - 1].pageNumber;
    sections.push(currentSection);
  }

  if (sections.length < 2) return null;

  // Truncate long summaries
  for (const s of sections) {
    if (s.summary.length > 200) {
      s.summary = s.summary.slice(0, 200) + '...';
    }
  }

  // Build children, splitting sections that are too large
  const children = [];
  for (const section of sections) {
    const span = section.endPage - section.startPage + 1;
    if (span > MAX_PAGES_PER_LEAF) {
      // Split into sub-sections
      const numSubs = Math.ceil(span / MAX_PAGES_PER_LEAF);
      const perSub = Math.ceil(span / numSubs);
      for (let i = 0; i < numSubs; i++) {
        const subStart = section.startPage + i * perSub;
        const subEnd = Math.min(section.startPage + (i + 1) * perSub - 1, section.endPage);
        children.push({
          title: numSubs > 1 ? `${section.title} (Part ${i + 1})` : section.title,
          startPage: subStart,
          endPage: subEnd,
          summary: i === 0 ? section.summary : '',
          children: [],
        });
      }
    } else {
      children.push({
        title: section.title,
        startPage: section.startPage,
        endPage: section.endPage,
        summary: section.summary,
        children: [],
      });
    }
  }

  // Combine all page summaries for root
  const rootSummary = sections.slice(0, 5).map(s => s.summary).filter(Boolean).join('. ');

  return {
    title: sections[0]?.title || 'Document',
    startPage: 1,
    endPage: pages[pages.length - 1].pageNumber,
    summary: rootSummary.slice(0, 300),
    children,
  };
}

async function buildSimpleTree(pages) {
  const summary = await generateSummary(pages, 1, pages.length);
  return {
    title: 'Document',
    startPage: 1,
    endPage: pages.length,
    summary,
    children: [],
  };
}

async function detectTOC(pages) {
  const firstPages = pages.slice(0, Math.min(10, pages.length));
  const text = firstPages.map(p => `--- Page ${p.pageNumber} ---\n${p.text}`).join('\n\n');

  const model = getGenerativeModel('fast');
  const prompt = `Analyze the following text from the beginning of a document.
Does it contain a Table of Contents (TOC)?

A TOC is a structured list of chapter/section titles with page numbers or a clear hierarchical outline of the document's contents.

Text:
${text.slice(0, 8000)}

Reply ONLY with valid JSON (no markdown fencing):
{"has_toc": true/false, "toc_text": "the exact TOC text if found, or empty string"}`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(responseText);
  } catch {
    return null;
  }
}

async function buildTreeFromTOC(tocText, pages) {
  const model = getGenerativeModel('fast');
  const prompt = `Given this Table of Contents and a document with ${pages.length} pages, create a hierarchical tree structure.

Table of Contents:
${tocText}

Return ONLY valid JSON (no markdown fencing) with this structure:
{
  "title": "Document Title",
  "startPage": 1,
  "endPage": ${pages.length},
  "summary": "",
  "children": [
    {
      "title": "Chapter/Section Title",
      "startPage": N,
      "endPage": M,
      "summary": "",
      "children": [...]
    }
  ]
}

Rules:
- Page numbers must be between 1 and ${pages.length}
- Every page must be covered by at least one node
- Leaf nodes should cover at most ${MAX_PAGES_PER_LEAF} pages
- If a section spans more than ${MAX_PAGES_PER_LEAF} pages and has no sub-sections, split it into roughly equal parts`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const tree = JSON.parse(responseText);
    await addSummaries(tree, pages);
    return tree;
  } catch {
    return await generateTreeStructure(pages);
  }
}

async function generateTreeStructure(pages) {
  // Include per-page summaries (#6) for better structure generation
  const pageOverviews = pages.map(p => {
    const summary = p.summary || p.text.slice(0, 200).replace(/\n/g, ' ');
    return `Page ${p.pageNumber}: ${p.heading || ''} — ${summary}`;
  }).join('\n');

  const model = getGenerativeModel('fast');
  const prompt = `Analyze these document pages and create a hierarchical structure (like a table of contents).

Page overviews:
${pageOverviews.slice(0, 15000)}

Total pages: ${pages.length}

Return ONLY valid JSON (no markdown fencing) with this structure:
{
  "title": "Document Title (infer from content)",
  "startPage": 1,
  "endPage": ${pages.length},
  "summary": "Brief 1-2 sentence summary of the whole document",
  "children": [
    {
      "title": "Section Title",
      "startPage": N,
      "endPage": M,
      "summary": "Brief summary of this section",
      "children": []
    }
  ]
}

Rules:
- Group related pages into logical sections
- Leaf nodes should cover at most ${MAX_PAGES_PER_LEAF} pages
- If a section is very large, break it into sub-sections
- Every page must be covered by at least one node
- Page ranges must not overlap and must cover all pages 1 to ${pages.length}`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const tree = JSON.parse(responseText);
    fixTreePageRanges(tree, 1, pages.length);
    return tree;
  } catch {
    return createEvenTree(pages);
  }
}

function createEvenTree(pages) {
  const pageCount = pages.length;
  const numSections = Math.ceil(pageCount / MAX_PAGES_PER_LEAF);
  const pagesPerSection = Math.ceil(pageCount / numSections);

  const children = [];
  for (let i = 0; i < numSections; i++) {
    const start = i * pagesPerSection + 1;
    const end = Math.min((i + 1) * pagesPerSection, pageCount);
    children.push({
      title: `Section ${i + 1}`,
      startPage: start,
      endPage: end,
      summary: '',
      children: [],
    });
  }

  return {
    title: 'Document',
    startPage: 1,
    endPage: pageCount,
    summary: '',
    children,
  };
}

function fixTreePageRanges(node, expectedStart, expectedEnd) {
  node.startPage = Math.max(1, node.startPage || expectedStart);
  node.endPage = Math.min(expectedEnd, node.endPage || expectedEnd);

  if (!node.children || node.children.length === 0) {
    node.children = [];
    return;
  }

  node.children.sort((a, b) => (a.startPage || 0) - (b.startPage || 0));

  let currentPage = node.startPage;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    child.startPage = currentPage;
    if (i < node.children.length - 1) {
      const nextStart = node.children[i + 1].startPage || child.endPage + 1;
      child.endPage = Math.max(child.startPage, nextStart - 1);
    } else {
      child.endPage = node.endPage;
    }
    currentPage = child.endPage + 1;
    fixTreePageRanges(child, child.startPage, child.endPage);
  }
}

async function addSummaries(node, pages) {
  if (!node.summary || node.summary.trim() === '') {
    node.summary = await generateSummary(pages, node.startPage, node.endPage);
  }

  if (node.children && node.children.length > 0) {
    for (let i = 0; i < node.children.length; i += 3) {
      const batch = node.children.slice(i, i + 3);
      await Promise.all(batch.map(child => addSummaries(child, pages)));
    }
  }
}

async function generateSummary(pages, startPage, endPage) {
  const relevantPages = pages.filter(p => p.pageNumber >= startPage && p.pageNumber <= endPage);
  if (relevantPages.length === 0) return '';

  // Use per-page summaries if available (#6)
  const pageSummaries = relevantPages
    .filter(p => p.summary)
    .map(p => p.summary);

  if (pageSummaries.length > 0) {
    const combinedSummaries = pageSummaries.join('. ');
    if (combinedSummaries.length < 300) return combinedSummaries;
    // Summarize the summaries for large sections
    const model = getGenerativeModel('fast');
    try {
      const result = await model.generateContent(
        `Combine these page summaries into 2-3 sentences:\n\n${combinedSummaries.slice(0, 3000)}\n\nReply with ONLY the combined summary.`
      );
      return result.response.text().trim();
    } catch {
      return combinedSummaries.slice(0, 300);
    }
  }

  const text = relevantPages.map(p => p.text).join('\n\n');
  const truncated = text.slice(0, 6000);

  const model = getGenerativeModel('fast');
  try {
    const result = await model.generateContent(
      `Summarize the following content in 2-3 sentences, capturing the key concepts and topics covered:\n\n${truncated}\n\nReply with ONLY the summary text, no formatting or labels.`
    );
    return result.response.text().trim();
  } catch {
    return '';
  }
}

// --- Tree Search (#3 conversation-aware, #4 cached) ---

/**
 * Search a document's page index using LLM reasoning.
 * Supports conversation context for better follow-up handling (#3).
 * Results are cached per (docId, query) pair (#4).
 *
 * @param {string} query - The user's question
 * @param {object} treeJson - The document's tree index
 * @param {object} [options]
 * @param {string} [options.docId] - Document ID for caching
 * @param {Array} [options.conversationHistory] - Recent conversation for context
 * @returns {Array<{page: number, reason: string}>}
 */
async function searchPageIndex(query, treeJson, options = {}) {
  const { docId, conversationHistory } = options;

  // Check cache (#4)
  if (docId) {
    const cacheKey = getCacheKey(docId, query);
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const model = getGenerativeModel('fast');

  const treeStr = JSON.stringify(treeJson, null, 2);
  const truncatedTree = treeStr.length > 12000 ? treeStr.slice(0, 12000) + '\n...(truncated)' : treeStr;

  // Build conversation context for follow-up awareness (#3)
  let conversationSection = '';
  if (conversationHistory && conversationHistory.length > 0) {
    const recentExchanges = conversationHistory.slice(-3).map(msg =>
      `Q: ${msg.query}\nA: ${(msg.answer || '').slice(0, 200)}...`
    ).join('\n\n');
    conversationSection = `\nRecent conversation context (use this to understand follow-up references like "it", "that", "the second one", etc.):\n${recentExchanges}\n`;
  }

  const prompt = `You are navigating a document to find information relevant to a student's question.

Document structure (hierarchical index with page ranges and summaries):
${truncatedTree}
${conversationSection}
Student's question: ${query}

Which pages contain the most relevant information to answer this question?
Analyze the tree structure — look at titles, summaries, and page ranges to identify the best sections.
Then select the specific pages within those sections that are most likely to contain the answer.
${conversationHistory?.length > 0 ? 'If the question is a follow-up (e.g., "tell me more", "what about X"), use the conversation context to determine what topic they are referring to.' : ''}

Return ONLY valid JSON (no markdown fencing):
{
  "pages": [{"page": N, "reason": "brief reason why this page is relevant"}],
  "reasoning": "brief explanation of how you navigated the tree"
}

Return 3-5 most relevant pages. If the question is very broad, return up to 7 pages.`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(responseText);

    if (!parsed.pages || !Array.isArray(parsed.pages)) {
      return [];
    }

    const pages = parsed.pages
      .filter(p => typeof p.page === 'number')
      .map(p => ({ page: p.page, reason: p.reason || '' }));

    // Cache the result (#4)
    if (docId) {
      setCache(getCacheKey(docId, query), pages);
    }

    return pages;
  } catch {
    const totalPages = getTreePageCount(treeJson);
    const fallbackPages = [];
    for (let i = 1; i <= Math.min(3, totalPages); i++) {
      fallbackPages.push({ page: i, reason: 'fallback' });
    }
    return fallbackPages;
  }
}

// --- Multi-document search (#2) ---

/**
 * Search across multiple documents by building a library-level index.
 * The LLM decides which documents are relevant, then searches their trees.
 *
 * @param {string} query - The user's question
 * @param {Array<{docId: string, docName: string, treeJson: object}>} documentIndexes
 * @param {object} [options]
 * @returns {Array<{docId: string, docName: string, pages: Array<{page: number, reason: string}>}>}
 */
async function searchMultipleDocuments(query, documentIndexes, options = {}) {
  if (documentIndexes.length === 0) return [];
  if (documentIndexes.length === 1) {
    const idx = documentIndexes[0];
    const pages = await searchPageIndex(query, idx.treeJson, { docId: idx.docId, ...options });
    return [{ docId: idx.docId, docName: idx.docName, pages }];
  }

  // Build library-level overview for the LLM
  const libraryOverview = documentIndexes.map((idx, i) => {
    const tree = idx.treeJson;
    const childrenSummary = (tree.children || [])
      .map(c => `  - ${c.title} (pp. ${c.startPage}-${c.endPage}): ${c.summary || ''}`)
      .join('\n');
    return `[${i + 1}] "${idx.docName}" — ${tree.summary || tree.title || 'No summary'}\n${childrenSummary}`;
  }).join('\n\n');

  const model = getGenerativeModel('fast');
  const prompt = `You are a librarian helping a student find information across multiple documents.

Available documents:
${libraryOverview.slice(0, 10000)}

Student's question: ${query}

Which documents are most likely to contain relevant information?
Return ONLY valid JSON (no markdown fencing):
{
  "documents": [{"index": N, "reason": "why this document is relevant"}],
  "reasoning": "how you decided"
}

Select 1-3 most relevant documents. Use the 1-based index numbers from the list above.`;

  let selectedIndices;
  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(responseText);
    selectedIndices = (parsed.documents || [])
      .map(d => d.index - 1) // Convert to 0-based
      .filter(i => i >= 0 && i < documentIndexes.length);
  } catch {
    // Fallback: search all documents (capped at 3)
    selectedIndices = documentIndexes.slice(0, 3).map((_, i) => i);
  }

  if (selectedIndices.length === 0) {
    selectedIndices = [0]; // At least search the first document
  }

  // Search selected documents in parallel
  const results = await Promise.all(
    selectedIndices.map(async (idx) => {
      const docIndex = documentIndexes[idx];
      const pages = await searchPageIndex(query, docIndex.treeJson, {
        docId: docIndex.docId,
        ...options,
      });
      return { docId: docIndex.docId, docName: docIndex.docName, pages };
    })
  );

  return results.filter(r => r.pages.length > 0);
}

function getTreePageCount(tree) {
  return tree.endPage || 1;
}

module.exports = {
  buildPageIndex,
  searchPageIndex,
  searchMultipleDocuments,
  invalidateDocCache,
};
