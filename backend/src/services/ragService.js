const { getGenerativeModel, selectModelTier } = require('../config/gemini');
const vectorStore = require('./vectorStore');
const { searchPageIndex, searchMultipleDocuments } = require('./pageIndexService');
const { getUserTeachingLevel, getWeakTopics } = require('./userProfileService');

async function queryWithRAG(query, docId = null, conversationHistory = [], userId = null) {
  if (docId) {
    // Single-document query
    const pageIndex = await vectorStore.getPageIndex(docId);
    if (pageIndex) {
      return queryWithPageIndex(query, docId, pageIndex, conversationHistory, userId);
    }
    // Fallback: legacy vector search
    return queryWithVectorRAG(query, docId, conversationHistory, userId);
  }

  // No docId: multi-document search across all indexed documents (#2)
  return queryMultiDocument(query, conversationHistory, userId);
}

/**
 * Multi-document search (#2).
 * When no specific docId is given, search across all documents with page indexes.
 */
async function queryMultiDocument(query, conversationHistory, userId = null) {
  const [allIndexes, allDocs] = await Promise.all([
    vectorStore.getAllPageIndexes(),
    vectorStore.getAllDocuments(userId),
  ]);

  if (allIndexes.length === 0) {
    // No page-indexed documents, fall back to vector search
    return queryWithVectorRAG(query, null, conversationHistory, userId);
  }

  // Build document index list with names
  const docMap = new Map(allDocs.map(d => [d.id, d]));
  const documentIndexes = allIndexes
    .filter(idx => docMap.has(idx.docId))
    .map(idx => ({
      docId: idx.docId,
      docName: docMap.get(idx.docId).originalName,
      treeJson: idx.treeJson,
    }));

  if (documentIndexes.length === 0) {
    return queryWithVectorRAG(query, null, conversationHistory, userId);
  }

  const searchResults = await searchMultipleDocuments(query, documentIndexes, {
    conversationHistory,
  });

  if (searchResults.length === 0) {
    return {
      answer: "I couldn't find relevant information in your study materials. Try uploading more documents or rephrasing your question.",
      sources: [],
    };
  }

  // Fetch pages from all relevant documents in parallel
  const allPages = await Promise.all(
    searchResults.map(async (result) => {
      const pageNumbers = result.pages.map(r => r.page);
      const pages = await vectorStore.getPages(result.docId, pageNumbers);
      return pages.map(p => ({
        ...p,
        docId: result.docId,
        docName: result.docName,
        reason: result.pages.find(r => r.page === p.pageNumber)?.reason || '',
      }));
    })
  );
  const flatPages = allPages.flat();

  if (flatPages.length === 0) {
    return {
      answer: "I couldn't find relevant information in your study materials.",
      sources: [],
    };
  }

  // Build context
  const context = flatPages.map((p, i) =>
    `[Source ${i + 1}: ${p.docName} — Page ${p.pageNumber}${p.heading ? ` - ${p.heading}` : ''}]\n${p.text}`
  ).join('\n\n---\n\n');

  const { teachingHint, conversationContext, weakTopicHint, resourceContext } =
    await buildPromptParts(query, null, conversationHistory, userId);

  const tier = selectModelTier({});
  const model = getGenerativeModel(tier);

  const prompt = `You are a helpful, knowledgeable tutor assisting a student with their studies.
${teachingHint}
${conversationContext}
PRIMARY SOURCE — Student's own study materials (use these as your main reference):
${context}
${resourceContext}
${weakTopicHint}
Student's question: ${query}

IMPORTANT: The student's uploaded study materials above are your PRIMARY and AUTHORITATIVE source. Base your answer on those materials first and foremost.
- Always ground your response in the student's own materials. Quote or reference them directly.
- When citing information, mention the document name and page number (e.g., "As discussed in 'Physics Notes' Page 5...").
- If the context doesn't contain enough information, say so honestly.
Format your response with clear structure using markdown.`;

  const result = await model.generateContent(prompt);
  const answerText = result.response.text();

  const sources = flatPages.map((page) => ({
    documentId: page.docId,
    documentName: page.docName,
    heading: page.heading,
    pageNumber: page.pageNumber,
    excerpt: page.text.slice(0, 200) + '...',
    relevanceReason: page.reason,
  }));

  return { answer: answerText, sources, suggestSolver: looksLikeProblem(query) };
}

/**
 * Page index-based retrieval with hybrid re-ranking (#1) and parallel prefetch (#10).
 */
async function queryWithPageIndex(query, docId, pageIndex, conversationHistory, userId = null) {
  // Parallel prefetch (#10): start tree search, user profile, and resources concurrently
  const [relevantPageResults, promptParts] = await Promise.all([
    searchPageIndex(query, pageIndex.treeJson, { docId, conversationHistory }),
    buildPromptParts(query, docId, conversationHistory, userId),
  ]);

  if (relevantPageResults.length === 0) {
    return {
      answer: "I couldn't find relevant information in your study materials to answer this question. Try rephrasing your question.",
      sources: [],
    };
  }

  const pageNumbers = relevantPageResults.map(r => r.page);

  // Hybrid retrieval (#1): also run vector search and merge results
  const [pages, vectorChunks] = await Promise.all([
    vectorStore.getPages(docId, pageNumbers),
    vectorStore.search(query, 3, docId).catch(() => []),
  ]);

  if (pages.length === 0) {
    return {
      answer: "I couldn't find relevant information in your study materials to answer this question. Try rephrasing your question.",
      sources: [],
    };
  }

  const docMeta = await vectorStore.getDocument(docId);
  const docName = docMeta?.originalName || 'Unknown Document';

  // Build context from full pages (primary)
  let context = pages.map((p, i) =>
    `[Source ${i + 1}: ${docName} — Page ${p.pageNumber}${p.heading ? ` - ${p.heading}` : ''}]\n${p.text}`
  ).join('\n\n---\n\n');

  // Hybrid (#1): append vector-matched chunks that aren't already in page results
  if (vectorChunks.length > 0) {
    const pageTextsSet = new Set(pages.map(p => p.text.slice(0, 100)));
    const uniqueChunks = vectorChunks.filter(c =>
      !pageTextsSet.has(c.text.slice(0, 100))
    );
    if (uniqueChunks.length > 0) {
      const chunkContext = uniqueChunks.map((c, i) =>
        `[Vector Match ${i + 1}: ${docName}${c.heading ? ` - ${c.heading}` : ''}]\n${c.text}`
      ).join('\n\n---\n\n');
      context += '\n\n---\n\n[Additional relevant passages found via semantic search:]\n' + chunkContext;
    }
  }

  const { teachingHint, conversationContext, weakTopicHint, resourceContext } = promptParts;

  const tier = selectModelTier({});
  const model = getGenerativeModel(tier);

  const prompt = `You are a helpful, knowledgeable tutor assisting a student with their studies.
${teachingHint}
${conversationContext}
PRIMARY SOURCE — Student's own study materials (use these as your main reference):
${context}
${resourceContext}
${weakTopicHint}
Student's question: ${query}

IMPORTANT: The student's uploaded study materials above are your PRIMARY and AUTHORITATIVE source. Base your answer on those materials first and foremost.
- Always ground your response in the student's own materials. Quote or reference them directly.
- When citing information, mention the page number (e.g., "As discussed on Page 5...").
- If supplementary web resources are listed, treat them as optional further reading ONLY.
- If the student's materials contain enough information, you do NOT need to reference external resources at all.
If the context doesn't contain enough information, say so honestly.
Format your response with clear structure using markdown.
If the student seems confused, offer to explain in simpler terms.`;

  const result = await model.generateContent(prompt);
  const answer = result.response.text();

  const sources = pages.map((page) => {
    const searchResult = relevantPageResults.find(r => r.page === page.pageNumber);
    return {
      documentId: docId,
      documentName: docName,
      heading: page.heading,
      pageNumber: page.pageNumber,
      excerpt: page.text.slice(0, 200) + '...',
      relevanceReason: searchResult?.reason || '',
    };
  });

  return { answer, sources, suggestSolver: looksLikeProblem(query) };
}

/**
 * Build common prompt parts in parallel (#10).
 * Fetches teaching level, weak topics, and resources concurrently.
 */
async function buildPromptParts(query, docId, conversationHistory, userId = null) {
  const [teachingLevel, weakTopicRows, resourceContext] = await Promise.all([
    getUserTeachingLevel(userId),
    getWeakTopics(5, 0.6, userId),
    fetchResourceContext(docId),
  ]);

  const teachingHint = getTeachingHint(teachingLevel);
  const weakTopicNames = weakTopicRows.map(r => r.topic);
  let weakTopicHint = '';
  if (weakTopicNames.length > 0) {
    weakTopicHint = `\n\nNote: The student has been struggling with these topics: ${weakTopicNames.join(', ')}. If relevant to their question, provide extra clarity on these areas.\n`;
  }

  let conversationContext = '';
  if (conversationHistory.length > 0) {
    conversationContext = '\nRecent conversation:\n' +
      conversationHistory.map(msg =>
        `Student: ${msg.query}\nTutor: ${msg.answer}`
      ).join('\n\n') + '\n\n';
  }

  return { teachingHint, conversationContext, weakTopicHint, resourceContext };
}

async function fetchResourceContext(docId) {
  if (!docId) return '';
  try {
    const { getResourcesByDocument } = require('./webResearchService');
    const resources = await getResourcesByDocument(docId);
    if (resources.length > 0) {
      return '\n\n[SUPPLEMENTARY — lower priority than the study materials above]\n' +
        'The following are optional external resources for further reading only:\n' +
        resources.slice(0, 5).map(r =>
          `- ${r.title} (${r.resourceType})${r.url ? ': ' + r.url : ''} — ${r.snippet || ''}`
        ).join('\n');
    }
  } catch {
    // Non-blocking
  }
  return '';
}

/**
 * Vector-based retrieval (legacy fallback).
 */
async function queryWithVectorRAG(query, docId, conversationHistory, userId = null) {
  const relevantChunks = await vectorStore.search(query, 5, docId);

  if (relevantChunks.length === 0) {
    return {
      answer: "I couldn't find relevant information in your study materials to answer this question. Try uploading more documents or rephrasing your question.",
      sources: [],
    };
  }

  const contextParts = await Promise.all(
    relevantChunks.map(async (chunk, i) => {
      const docMeta = await vectorStore.getDocument(chunk.docId);
      const docName = docMeta?.originalName || 'Unknown Document';
      return `[Source ${i + 1}: ${docName}${chunk.heading ? ` - ${chunk.heading}` : ''}]\n${chunk.text}`;
    })
  );
  const context = contextParts.join('\n\n---\n\n');

  const { teachingHint, conversationContext, weakTopicHint, resourceContext } =
    await buildPromptParts(query, docId, conversationHistory, userId);

  const tier = selectModelTier({});
  const model = getGenerativeModel(tier);

  const prompt = `You are a helpful, knowledgeable tutor assisting a student with their studies.
${teachingHint}
${conversationContext}
PRIMARY SOURCE — Student's own study materials (use these as your main reference):
${context}
${resourceContext}
${weakTopicHint}
Student's question: ${query}

IMPORTANT: The student's uploaded study materials above are your PRIMARY and AUTHORITATIVE source. Base your answer on those materials first and foremost.
- Always ground your response in the student's own materials. Quote or reference them directly.
- If supplementary web resources are listed, treat them as optional further reading ONLY.
If the context doesn't contain enough information, say so honestly.
Format your response with clear structure using markdown.
If the student seems confused, offer to explain in simpler terms.`;

  const result = await model.generateContent(prompt);
  const answer = result.response.text();

  const sources = await Promise.all(
    relevantChunks.map(async (chunk) => {
      const docMeta = await vectorStore.getDocument(chunk.docId);
      return {
        documentId: chunk.docId,
        documentName: docMeta?.originalName || 'Unknown',
        heading: chunk.heading,
        excerpt: chunk.text.slice(0, 200) + '...',
        score: chunk.score,
      };
    })
  );

  return { answer, sources, suggestSolver: looksLikeProblem(query) };
}

async function explainSimply(lessonContent, userQuestion = '', userId = null) {
  const { EXPLAIN_SIMPLY_PROMPT, buildInterestsSection } = require('../utils/prompts');
  const { getUserInterests } = require('./userProfileService');
  const interests = await getUserInterests(userId);
  const prompt = EXPLAIN_SIMPLY_PROMPT
    .replace('{lesson_content}', lessonContent)
    .replace('{user_question}', userQuestion || 'No specific question provided')
    .replace('{interests_section}', buildInterestsSection(interests));
  const model = getGenerativeModel('standard');
  const result = await model.generateContent(prompt);
  return result.response.text();
}

function getTeachingHint(level) {
  switch (level) {
    case 'dummy':
      return 'The student learns best with very simple language, everyday analogies, and step-by-step explanations. Avoid technical jargon.';
    case 'beginner':
      return 'The student is a beginner. Use clear, simple language. Define technical terms when you use them. Provide plenty of examples.';
    case 'advanced':
      return 'The student has strong foundational knowledge. You can use technical language freely, discuss nuances, and cover advanced implications.';
    default:
      return 'Use standard academic language with a balanced level of depth.';
  }
}

function looksLikeProblem(query) {
  const problemIndicators = [
    /\bsolve\b/i, /\bcalculate\b/i, /\bcompute\b/i, /\bderive\b/i, /\bprove\b/i,
    /\bfind the value\b/i, /\bwrite (?:a |the )?(?:code|program|function|script)\b/i,
    /\bimplement\b/i, /\d\s*[\+\-\*\/\=]\s*\d/,
    /\b(?:integral|derivative|limit|equation|formula)\b/i,
    /\bbalance the (?:equation|reaction)\b/i, /\bhow (?:many|much|far|long|fast)\b.*\?/i,
    /\bstep.by.step\b/i, /\bsimplify\b/i, /\bfactor(?:ize|ise)?\b/i, /\bconvert\b.*\bto\b/i,
  ];
  return problemIndicators.some(pattern => pattern.test(query));
}

module.exports = { queryWithRAG, explainSimply };
