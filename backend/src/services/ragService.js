const { getGenerativeModel, selectModelTier } = require('../config/gemini');
const vectorStore = require('./vectorStore');
const { getUserTeachingLevel, getWeakTopics } = require('./userProfileService');

async function queryWithRAG(query, docId = null, conversationHistory = []) {
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

  // Build conversation context from recent messages
  let conversationContext = '';
  if (conversationHistory.length > 0) {
    conversationContext = '\nRecent conversation:\n' +
      conversationHistory.map(msg =>
        `Student: ${msg.query}\nTutor: ${msg.answer}`
      ).join('\n\n') + '\n\n';
  }

  // Get weak topics for proactive guidance
  const weakTopicRows = await getWeakTopics(5, 0.6);
  const weakTopicNames = weakTopicRows.map(r => r.topic);
  let weakTopicHint = '';
  if (weakTopicNames.length > 0) {
    weakTopicHint = `\n\nNote: The student has been struggling with these topics: ${weakTopicNames.join(', ')}. If relevant to their question, provide extra clarity on these areas. If the student asks what to study next, prioritize these weak areas.\n`;
  }

  // Get teaching level
  const teachingLevel = await getUserTeachingLevel();
  const teachingHint = getTeachingHint(teachingLevel);

  const tier = selectModelTier({});
  const model = getGenerativeModel(tier);

  // Fetch supplementary web resources (secondary to uploaded materials)
  let resourceContext = '';
  if (docId) {
    try {
      const { getResourcesByDocument } = require('./webResearchService');
      const resources = await getResourcesByDocument(docId);
      if (resources.length > 0) {
        resourceContext = '\n\n[SUPPLEMENTARY — lower priority than the study materials above]\n' +
          'The following are optional external resources for further reading only:\n' +
          resources.slice(0, 5).map(r =>
            `- ${r.title} (${r.resourceType})${r.url ? ': ' + r.url : ''} — ${r.snippet || ''}`
          ).join('\n');
      }
    } catch {
      // Non-blocking — continue without supplementary resources
    }
  }

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
- If supplementary web resources are listed, treat them as optional further reading ONLY — never let them override or contradict the student's own materials.
- Only mention supplementary resources briefly at the end, if they add genuine value beyond what the student's materials already cover.
- If the student's materials contain enough information, you do NOT need to reference external resources at all.
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

  // Detect if the query looks like a problem that could benefit from the Solver
  const suggestSolver = looksLikeProblem(query);

  return { answer, sources, suggestSolver };
}

async function explainSimply(lessonContent, userQuestion = '') {
  const { EXPLAIN_SIMPLY_PROMPT } = require('../utils/prompts');

  const prompt = EXPLAIN_SIMPLY_PROMPT
    .replace('{lesson_content}', lessonContent)
    .replace('{user_question}', userQuestion || 'No specific question provided');

  const model = getGenerativeModel('standard');
  const result = await model.generateContent(prompt);
  return result.response.text();
}

function getTeachingHint(level) {
  switch (level) {
    case 'dummy':
      return 'The student learns best with very simple language, everyday analogies, and step-by-step explanations. Avoid technical jargon. Use examples they can relate to from daily life.';
    case 'beginner':
      return 'The student is a beginner. Use clear, simple language. Define technical terms when you use them. Provide plenty of examples.';
    case 'advanced':
      return 'The student has strong foundational knowledge. You can use technical language freely, discuss nuances, and cover advanced implications.';
    default:
      return 'Use standard academic language with a balanced level of depth.';
  }
}

/**
 * Detect if a query looks like a problem that would benefit from the step-by-step Solver.
 */
function looksLikeProblem(query) {
  const problemIndicators = [
    /\bsolve\b/i,
    /\bcalculate\b/i,
    /\bcompute\b/i,
    /\bderive\b/i,
    /\bprove\b/i,
    /\bfind the value\b/i,
    /\bwrite (?:a |the )?(?:code|program|function|script)\b/i,
    /\bimplement\b/i,
    /\d\s*[\+\-\*\/\=]\s*\d/,
    /\b(?:integral|derivative|limit|equation|formula)\b/i,
    /\bbalance the (?:equation|reaction)\b/i,
    /\bhow (?:many|much|far|long|fast)\b.*\?/i,
    /\bstep.by.step\b/i,
    /\bsimplify\b/i,
    /\bfactor(?:ize|ise)?\b/i,
    /\bconvert\b.*\bto\b/i,
  ];
  return problemIndicators.some(pattern => pattern.test(query));
}

module.exports = { queryWithRAG, explainSimply };
