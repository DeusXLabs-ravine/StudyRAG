const { getGenerativeModel, getSearchGroundedModel, selectModelTier, withRetryOnRateLimit } = require('../config/gemini');
const { isDeepSeekAvailable, callDeepSeekChat } = require('../config/deepseek');
const { isSTEMQuery } = require('../utils/stemDetector');
const { getTutorDepthSection } = require('../utils/prompts/depthRouter');
const vectorStore = require('./vectorStore');
const { searchPageIndex, searchMultipleDocuments } = require('./pageIndexService');
const { getUserTeachingLevel, getWeakTopics, getUserProfile, getUserInterests, getEffectiveLearningStyle, getEffectiveLearningPace } = require('./userProfileService');

/**
 * Determine whether a user query would benefit from real-time web search.
 * Returns true when the question touches current guidelines, drug info,
 * recent research, statistics, or the user explicitly asks for web data.
 */
function shouldUseWebSearch(query) {
  if (!query) return false;
  const q = query.toLowerCase();

  // Explicit user requests for web / online / internet info
  const explicitWeb = [
    /\bsearch\s+(the\s+)?web\b/,
    /\bsearch\s+(the\s+)?internet\b/,
    /\bonline\b/,
    /\blook\s+(?:it\s+)?up\b/,
    /\bgoogle\b/,
    /\bweb\s*search\b/,
    /\breal[\s-]?time\b/,
    /\bup[\s-]?to[\s-]?date\b/,
    /\blatest\b/,
    /\brecent(?:ly)?\b/,
    /\bcurrent(?:ly)?\b/,
    /\btoday\b/,
    /\b20(?:2[3-9]|[3-9]\d)\b/,         // years 2023-2099
    /\bnew(?:est)?\s+(?:guidelines?|research|studies|findings|data|evidence|recommendations?)\b/,
  ];

  // Medical / clinical / pharma patterns
  const medicalPatterns = [
    /\bdrug\s+interact/i,
    /\bdosage\b/i,
    /\bdose\b/i,
    /\bside[\s-]?effects?\b/i,
    /\bcontraindication/i,
    /\bpharmacokinetics?\b/i,
    /\bpharmacodynamics?\b/i,
    /\bclinical\s+(?:trial|guideline|practice)/i,
    /\btreatment\s+(?:guideline|protocol|recommendation)/i,
    /\b(?:WHO|FDA|CDC|NIH|NICE|AHA|ACC)\b/,
    /\bguidelines?\b/i,
    /\bprotocol\b/i,
    /\bevidence[\s-]?based\b/i,
    /\bmeta[\s-]?analysis\b/i,
    /\bsystematic\s+review\b/i,
    /\brandomized\s+(?:controlled\s+)?trial\b/i,
    /\bincidence\b/i,
    /\bprevalence\b/i,
    /\bepidemiolog/i,
    /\bmortality\s+rate\b/i,
    /\bsurvival\s+rate\b/i,
  ];

  // Academic / research freshness patterns
  const academicPatterns = [
    /\brecent\s+(?:stud(?:y|ies)|research|paper|publication|finding)/i,
    /\bstate[\s-]?of[\s-]?the[\s-]?art\b/i,
    /\bcutting[\s-]?edge\b/i,
    /\bbreakthrough\b/i,
    /\bnew\s+discover/i,
  ];

  const allPatterns = [...explicitWeb, ...medicalPatterns, ...academicPatterns];
  return allPatterns.some(pattern => pattern.test(q));
}

/**
 * Extract web grounding sources from a Gemini search-grounded response.
 */
function extractGroundingSources(result) {
  const groundingChunks =
    result.response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return groundingChunks
    .filter(chunk => chunk.web?.uri)
    .map(chunk => ({
      title: chunk.web.title || '',
      url: chunk.web.uri,
    }));
}

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
/**
 * Get source priority label for a document based on its metadata.
 */
function getSourcePriorityLabel(doc) {
  if (!doc) return '[STUDY MATERIAL]';
  if (doc.isPrimarySource) return '[PRIMARY SOURCE ★]';
  const sourceType = doc.sourceType || 'file';
  if (sourceType === 'file') return '[UPLOADED MATERIAL]';
  if (sourceType === 'url') return '[WEB-SOURCED MATERIAL]';
  if (sourceType === 'note') return '[STUDENT NOTES]';
  return '[STUDY MATERIAL]';
}

async function queryMultiDocument(query, conversationHistory, userId = null) {
  const [allIndexes, allDocs] = await Promise.all([
    vectorStore.getAllPageIndexes(userId),
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

  // Build context with source priority labels
  // Keep up to 10 pages but enforce a total context budget below
  const cappedPages = flatPages.slice(0, 10);

  // Sort: primary sources first, then uploaded files, then url/notes
  const sortedPages = [...cappedPages].sort((a, b) => {
    const docA = docMap.get(a.docId);
    const docB = docMap.get(b.docId);
    const priorityOrder = { 'PRIMARY SOURCE ★': 0, 'UPLOADED MATERIAL': 1, 'STUDENT NOTES': 2, 'WEB-SOURCED MATERIAL': 3, 'STUDY MATERIAL': 1 };
    const labelA = getSourcePriorityLabel(docA);
    const labelB = getSourcePriorityLabel(docB);
    const keyA = Object.keys(priorityOrder).find(k => labelA.includes(k)) || 'STUDY MATERIAL';
    const keyB = Object.keys(priorityOrder).find(k => labelB.includes(k)) || 'STUDY MATERIAL';
    return (priorityOrder[keyA] || 1) - (priorityOrder[keyB] || 1);
  });

  // Smart context budget: full pages until ~30K chars, then truncate remaining
  const CONTEXT_BUDGET = 30000;
  let charsSoFar = 0;
  const context = sortedPages.map((p, i) => {
    const doc = docMap.get(p.docId);
    const priorityLabel = getSourcePriorityLabel(doc);
    let text = p.text;
    charsSoFar += text.length;
    if (charsSoFar > CONTEXT_BUDGET) {
      const remaining = Math.max(800, CONTEXT_BUDGET - (charsSoFar - text.length));
      text = text.slice(0, remaining) + '\n[... truncated — full page available in source]';
    }
    return `${priorityLabel} [Source ${i + 1}: ${p.docName} — Page ${p.pageNumber}${p.heading ? ` - ${p.heading}` : ''}]\n${text}`;
  }).join('\n\n---\n\n');

  const { teachingHint, conversationContext, weakTopicHint, resourceContext, learningStyleHint, paceHint } =
    await buildPromptParts(query, null, conversationHistory, userId);

  const useWeb = shouldUseWebSearch(query);
  const tier = selectModelTier({});

  const webSearchNote = useWeb
    ? `\n\nYou also have access to real-time web search. After addressing the student's question using their study materials, you may supplement your answer with current, authoritative information from the web (e.g., latest guidelines, drug data, recent research). Clearly label any web-sourced information with a "🌐 Web Source:" prefix so the student can distinguish it from their own materials.`
    : '';

  const sourceHierarchy = `
SOURCE PRIORITY HIERARCHY (STRICTLY follow this order):
1. PRIMARY SOURCES (★ starred by student) — Maximum authority. Never contradict.
2. UPLOADED STUDY MATERIALS — Student's own documents. High authority.
3. STUDENT NOTES — Student's typed notes. High authority.
4. WEB-SOURCED MATERIALS — URLs student added. Verify against primary sources.
5. SUPPLEMENTARY WEB RESEARCH — Auto-discovered. Optional further reading only.
When sources conflict, ALWAYS prefer higher-priority sources.`;

  const prompt = `You are a helpful, knowledgeable tutor assisting a student with their studies.
${teachingHint}
${learningStyleHint}
${paceHint}
${sourceHierarchy}
${conversationContext}
STUDY MATERIALS (labeled by priority level):
${context}
${resourceContext}
${weakTopicHint}
Student's question: ${query}

IMPORTANT: The student's study materials above are your AUTHORITATIVE source. Base your answer on those materials first and foremost.
- Sources marked [PRIMARY SOURCE ★] have maximum authority — NEVER contradict them.
- Always ground your response in the student's own materials. Quote or reference them directly.
- When citing information, mention the document name and page number (e.g., "As discussed in 'Physics Notes' Page 5...").
- If the student's materials contain questions (with or without answers), help explain the correct answers using the study materials and trusted academic sources.
- If the context doesn't contain enough information, say so honestly.${webSearchNote}
Format your response with clear structure using markdown.`;

  const result = await withRetryOnRateLimit(async () => {
    const model = useWeb ? getSearchGroundedModel(tier) : getGenerativeModel(tier);
    return model.generateContent(prompt);
  }, 3, 0);
  const answerText = result.response.text();

  const sources = flatPages.map((page) => ({
    documentId: page.docId,
    documentName: page.docName,
    heading: page.heading,
    pageNumber: page.pageNumber,
    excerpt: page.text.slice(0, 200) + '...',
    relevanceReason: page.reason,
  }));

  // Extract web grounding sources when search was used
  const webSources = useWeb ? extractGroundingSources(result) : [];

  return { answer: answerText, sources, webSources, suggestSolver: looksLikeProblem(query) };
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

  // Keep up to 10 pages but enforce a total context budget (see below)
  const topResults = relevantPageResults.slice(0, 10);
  const pageNumbers = topResults.map(r => r.page);

  // Hybrid retrieval: skip vector search if page-index already found enough results
  const needsVectorFallback = topResults.length < 3;
  const [pages, vectorChunks] = await Promise.all([
    vectorStore.getPages(docId, pageNumbers),
    needsVectorFallback ? vectorStore.search(query, 3, docId).catch(() => []) : [],
  ]);

  if (pages.length === 0) {
    return {
      answer: "I couldn't find relevant information in your study materials to answer this question. Try rephrasing your question.",
      sources: [],
    };
  }

  const docMeta = await vectorStore.getDocument(docId);
  const docName = docMeta?.originalName || 'Unknown Document';
  const priorityLabel = getSourcePriorityLabel(docMeta);

  // Smart context budget: include full pages until we hit ~30K chars total,
  // then truncate remaining pages so short pages are never penalized
  const CONTEXT_BUDGET = 30000;
  let charsSoFar = 0;
  let context = pages.map((p, i) => {
    let text = p.text;
    charsSoFar += text.length;
    if (charsSoFar > CONTEXT_BUDGET) {
      // Over budget — truncate this page to fit remaining space, minimum 800 chars
      const remaining = Math.max(800, CONTEXT_BUDGET - (charsSoFar - text.length));
      text = text.slice(0, remaining) + '\n[... truncated — full page available in source]';
    }
    return `${priorityLabel} [Source ${i + 1}: ${docName} — Page ${p.pageNumber}${p.heading ? ` - ${p.heading}` : ''}]\n${text}`;
  }).join('\n\n---\n\n');

  // Hybrid (#1): append vector-matched chunks that aren't already in page results
  if (vectorChunks.length > 0) {
    const pageTextsSet = new Set(pages.map(p => p.text.slice(0, 100)));
    const uniqueChunks = vectorChunks.filter(c =>
      !pageTextsSet.has(c.text.slice(0, 100))
    );
    if (uniqueChunks.length > 0) {
      const chunkContext = uniqueChunks.map((c, i) =>
        `${priorityLabel} [Vector Match ${i + 1}: ${docName}${c.heading ? ` - ${c.heading}` : ''}]\n${c.text}`
      ).join('\n\n---\n\n');
      context += '\n\n---\n\n[Additional relevant passages found via semantic search:]\n' + chunkContext;
    }
  }

  const { teachingHint, conversationContext, weakTopicHint, resourceContext, learningStyleHint, paceHint } = promptParts;

  const useWeb = shouldUseWebSearch(query);
  const tier = selectModelTier({});

  const webSearchNote = useWeb
    ? `\n\nYou also have access to real-time web search. After addressing the student's question using their study materials, you may supplement your answer with current, authoritative information from the web (e.g., latest guidelines, drug data, recent research). Clearly label any web-sourced information with a "🌐 Web Source:" prefix so the student can distinguish it from their own materials.`
    : '';

  const sourceHierarchy = `
SOURCE PRIORITY HIERARCHY (STRICTLY follow this order):
1. PRIMARY SOURCES (★ starred by student) — Maximum authority. Never contradict.
2. UPLOADED STUDY MATERIALS — Student's own documents. High authority.
3. STUDENT NOTES — Student's typed notes. High authority.
4. WEB-SOURCED MATERIALS — URLs student added. Verify against primary sources.
5. SUPPLEMENTARY WEB RESEARCH — Auto-discovered. Optional further reading only.
When sources conflict, ALWAYS prefer higher-priority sources.`;

  const prompt = `You are a helpful, knowledgeable tutor assisting a student with their studies.
${teachingHint}
${learningStyleHint}
${paceHint}
${sourceHierarchy}
${conversationContext}
STUDY MATERIALS (labeled by priority level):
${context}
${resourceContext}
${weakTopicHint}
Student's question: ${query}

IMPORTANT: The student's study materials above are your AUTHORITATIVE source. Base your answer on those materials first and foremost.
- Sources marked [PRIMARY SOURCE ★] have maximum authority — NEVER contradict them.
- Always ground your response in the student's own materials. Quote or reference them directly.
- When citing information, mention the page number (e.g., "As discussed on Page 5...").
- If the student's materials contain questions (with or without answers), help explain the correct answers using the study materials and trusted academic sources.
- If supplementary web resources are listed, treat them as optional further reading ONLY.
- If the student's materials contain enough information, you do NOT need to reference external resources at all.${webSearchNote}
If the context doesn't contain enough information, say so honestly.
Format your response with clear structure using markdown.
If the student seems confused, offer to explain in simpler terms.`;

  const result = await withRetryOnRateLimit(async () => {
    const model = useWeb ? getSearchGroundedModel(tier) : getGenerativeModel(tier);
    return model.generateContent(prompt);
  }, 3, 0);
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

  // Extract web grounding sources when search was used
  const webSources = useWeb ? extractGroundingSources(result) : [];

  return { answer, sources, webSources, suggestSolver: looksLikeProblem(query) };
}

/**
 * Build common prompt parts in parallel (#10).
 * Fetches teaching level, weak topics, learning style, pace, and resources concurrently.
 */
async function buildPromptParts(query, docId, conversationHistory, userId = null) {
  const { buildLearningStyleSection, buildPaceSection } = require('../utils/prompts');

  const [teachingLevel, weakTopicRows, resourceContext, learningStyle, learningPace] = await Promise.all([
    getUserTeachingLevel(userId),
    getWeakTopics(5, 0.6, userId),
    fetchResourceContext(docId),
    getEffectiveLearningStyle(userId),
    getEffectiveLearningPace(userId),
  ]);

  const teachingHint = getTeachingHint(teachingLevel);
  const learningStyleHint = buildLearningStyleSection(learningStyle);
  const paceHint = buildPaceSection(learningPace);

  const weakTopicNames = weakTopicRows.map(r => r.topic);
  let weakTopicHint = '';
  if (weakTopicNames.length > 0) {
    weakTopicHint = `\n\nNote: The student has been struggling with these topics: ${weakTopicNames.join(', ')}. If relevant to their question, provide extra clarity on these areas.\n`;
  }

  let conversationContext = '';
  if (conversationHistory.length > 0) {
    // Keep only last 3 exchanges and truncate long answers to keep prompt lean
    const recentHistory = conversationHistory.slice(-3);
    conversationContext = '\nRecent conversation:\n' +
      recentHistory.map(msg => {
        const answer = msg.answer?.length > 500 ? msg.answer.slice(0, 500) + '...' : (msg.answer || '');
        return `Student: ${msg.query}\nTutor: ${answer}`;
      }).join('\n\n') + '\n\n';
  }

  return { teachingHint, conversationContext, weakTopicHint, resourceContext, learningStyleHint, paceHint };
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

  // Batch-fetch all referenced documents in one query (fixes N+1)
  const uniqueDocIds = [...new Set(relevantChunks.map(c => c.docId))];
  const docMap = await vectorStore.getDocumentsBatch(uniqueDocIds);

  const contextParts = relevantChunks.map((chunk, i) => {
    const docMeta = docMap.get(chunk.docId);
    const docName = docMeta?.originalName || 'Unknown Document';
    return `[Source ${i + 1}: ${docName}${chunk.heading ? ` - ${chunk.heading}` : ''}]\n${chunk.text}`;
  });
  const context = contextParts.join('\n\n---\n\n');

  const { teachingHint, conversationContext, weakTopicHint, resourceContext, learningStyleHint, paceHint } =
    await buildPromptParts(query, docId, conversationHistory, userId);

  const useWeb = shouldUseWebSearch(query);
  const tier = selectModelTier({});

  const webSearchNote = useWeb
    ? `\n\nYou also have access to real-time web search. After addressing the student's question using their study materials, you may supplement your answer with current, authoritative information from the web (e.g., latest guidelines, drug data, recent research). Clearly label any web-sourced information with a "🌐 Web Source:" prefix so the student can distinguish it from their own materials.`
    : '';

  const prompt = `You are a helpful, knowledgeable tutor assisting a student with their studies.
${teachingHint}
${learningStyleHint}
${paceHint}
${conversationContext}
PRIMARY SOURCE — Student's own study materials (use these as your main reference):
${context}
${resourceContext}
${weakTopicHint}
Student's question: ${query}

IMPORTANT: The student's uploaded study materials above are your PRIMARY and AUTHORITATIVE source. Base your answer on those materials first and foremost.
- Always ground your response in the student's own materials. Quote or reference them directly.
- If supplementary web resources are listed, treat them as optional further reading ONLY.${webSearchNote}
If the context doesn't contain enough information, say so honestly.
Format your response with clear structure using markdown.
If the student seems confused, offer to explain in simpler terms.`;

  const result = await withRetryOnRateLimit(async () => {
    const model = useWeb ? getSearchGroundedModel(tier) : getGenerativeModel(tier);
    return model.generateContent(prompt);
  }, 3, 0);
  const answer = result.response.text();

  // Reuse the batch-fetched docMap from above (no extra queries)
  const sources = relevantChunks.map(chunk => {
    const docMeta = docMap.get(chunk.docId);
    return {
      documentId: chunk.docId,
      documentName: docMeta?.originalName || 'Unknown',
      heading: chunk.heading,
      excerpt: chunk.text.slice(0, 200) + '...',
      score: chunk.score,
    };
  });

  // Extract web grounding sources when search was used
  const webSources = useWeb ? extractGroundingSources(result) : [];

  return { answer, sources, webSources, suggestSolver: looksLikeProblem(query) };
}

async function explainSimply(lessonContent, userQuestion = '', userId = null) {
  const { EXPLAIN_SIMPLY_PROMPT, buildInterestsSection } = require('../utils/prompts');
  const { getUserInterests } = require('./userProfileService');
  const interests = await getUserInterests(userId);
  const prompt = EXPLAIN_SIMPLY_PROMPT
    .replace('{lesson_content}', lessonContent)
    .replace('{user_question}', userQuestion || 'No specific question provided')
    .replace('{interests_section}', buildInterestsSection(interests));
  const result = await withRetryOnRateLimit(async () => {
    const model = getGenerativeModel('standard');
    return model.generateContent(prompt);
  }, 3, 0);
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

async function tutorGreeting(moduleContent, moduleTitle, moduleTopic, userId) {
  const { TUTOR_GREETING_PROMPT } = require('../utils/prompts');

  const profile = await getUserProfile(userId);
  const studentName = profile?.first_name || profile?.full_name?.split(' ')[0] || '';

  const prompt = TUTOR_GREETING_PROMPT
    .replace(/{student_name}/g, studentName || 'there')
    .replace('{module_title}', moduleTitle || 'this lesson')
    .replace('{module_topic}', moduleTopic || 'this topic');

  const result = await withRetryOnRateLimit(async () => {
    const model = getGenerativeModel('fast');
    return model.generateContent(prompt);
  }, 3, 0);
  return result.response.text();
}

async function tutorChat(moduleContent, moduleTitle, moduleTopic, message, conversationHistory, userId) {
  const { TUTOR_CHAT_PROMPT, buildInterestsSection, buildLearningStyleSection, buildPaceSection } = require('../utils/prompts');

  const [profile, interests, teachingLevel, weakTopicRows, learningStyle, learningPace] = await Promise.all([
    getUserProfile(userId),
    getUserInterests(userId),
    getUserTeachingLevel(userId),
    getWeakTopics(5, 0.6, userId),
    getEffectiveLearningStyle(userId),
    getEffectiveLearningPace(userId),
  ]);

  const studentName = profile?.first_name || profile?.full_name?.split(' ')[0] || '';
  const studentAge = profile?.age || '';

  const interestsSection = buildInterestsSection(interests, teachingLevel);
  const learningStyleSection = buildLearningStyleSection(learningStyle);
  const paceSection = buildPaceSection(learningPace);

  const weakTopicNames = weakTopicRows.map(r => r.topic);
  let weakTopicsSection = '';
  if (weakTopicNames.length > 0) {
    weakTopicsSection = `The student has been struggling with these topics: ${weakTopicNames.join(', ')}. Give extra care and patience when these come up.`;
  }

  // Format conversation history as Student: / Sage: pairs
  let historyText = '';
  if (conversationHistory && conversationHistory.length > 0) {
    historyText = conversationHistory
      .map(entry => `${entry.role === 'student' ? 'Student' : 'Sage'}: ${entry.text}`)
      .join('\n');
  }

  // ─── Auto-fetch URLs pasted in the message ──────────────────
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
  const pastedUrls = (message.match(urlRegex) || []).slice(0, 3); // max 3 URLs
  let fetchedContent = '';
  const fetchedSources = [];

  if (pastedUrls.length > 0) {
    const { extractContentFromUrl } = require('./webScrapingService');
    const fetches = await Promise.allSettled(
      pastedUrls.map(async (url) => {
        try {
          const result = await extractContentFromUrl(url);
          const title = result.metadata?.title || url;
          // Truncate to ~4000 chars per URL to stay within prompt limits
          const text = result.text.length > 4000
            ? result.text.slice(0, 4000) + '\n\n[... content truncated for length]'
            : result.text;
          return { url, title, text };
        } catch (err) {
          console.warn(`[TutorChat] Failed to fetch URL ${url}: ${err.message}`);
          return { url, title: url, text: null, error: err.message };
        }
      })
    );

    for (const result of fetches) {
      if (result.status === 'fulfilled' && result.value.text) {
        const { url, title, text } = result.value;
        fetchedContent += `\n\n--- Content from: ${title} (${url}) ---\n${text}\n--- End of fetched content ---\n`;
        fetchedSources.push({ url, title });
      }
    }
  }

  const fetchedContentHint = fetchedContent
    ? `\n\nThe student pasted URL(s) in their message. Here is the content fetched from those pages — use it to answer their question:\n${fetchedContent}`
    : '';

  const useWeb = shouldUseWebSearch(message) || pastedUrls.length > 0;

  const webSearchHint = useWeb && !fetchedContent
    ? `\n\nIMPORTANT: The student's question may benefit from current, real-time information. You have access to web search. After grounding your answer in the lesson content, you may supplement with authoritative web sources (e.g., current guidelines, recent studies, drug data). Clearly label any web-sourced information with "🌐 Web Source:" so the student knows what came from the web versus their lesson.`
    : '';

  const tutorDepthSection = getTutorDepthSection(moduleContent || '');

  const prompt = TUTOR_CHAT_PROMPT
    .replace('{student_name}', studentName || 'there')
    .replace('{student_age}', studentAge ? `${studentAge}` : 'Not provided')
    .replace('{teaching_level}', teachingLevel)
    .replace('{interests_section}', interestsSection ? `Student interests:\n${interestsSection}` : '')
    .replace('{learning_style_section}', learningStyleSection)
    .replace('{pace_section}', paceSection)
    .replace('{weak_topics_section}', weakTopicsSection)
    .replace('{tutor_depth_section}', tutorDepthSection)
    .replace('{module_title}', moduleTitle || 'this lesson')
    .replace('{module_topic}', moduleTopic || 'this topic')
    .replace('{module_content}', moduleContent || '')
    .replace('{conversation_history}', historyText || '(This is the start of the conversation)')
    .replace('{student_message}', message + fetchedContentHint + webSearchHint);

  // Try DeepSeek Chat for STEM queries (faster than R1, still strong at STEM)
  // Skip when useWeb is true — web search grounding is Gemini-specific
  const stemCheck = isSTEMQuery(message);
  if (stemCheck.isSTEM && isDeepSeekAvailable() && !useWeb) {
    try {
      console.log(`[TutorChat] Using DeepSeek Chat for STEM query (subjects: ${stemCheck.subjects.join(', ')})`);
      const reply = await callDeepSeekChat(null, prompt);
      return { reply, webSources: fetchedSources };
    } catch (err) {
      console.warn('[TutorChat] DeepSeek Chat failed, falling back to Gemini:', err.message);
    }
  }

  const result = await withRetryOnRateLimit(async () => {
    const model = useWeb ? getSearchGroundedModel('standard') : getGenerativeModel('standard');
    return model.generateContent(prompt);
  }, 3, 0);
  const replyText = result.response.text();

  // Extract web grounding sources when search was used
  const webSources = [
    ...(useWeb ? extractGroundingSources(result) : []),
    ...fetchedSources,
  ];

  return { reply: replyText, webSources };
}

module.exports = { queryWithRAG, explainSimply, tutorGreeting, tutorChat };
