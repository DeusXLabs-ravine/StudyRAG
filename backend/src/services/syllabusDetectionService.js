const { getGenerativeModel, getSearchGroundedModel, withRetryOnRateLimit } = require('../config/gemini');
const { DOCUMENT_TYPE_DETECTION_PROMPT, SYLLABUS_EXTRACTION_PROMPT } = require('../utils/prompts');
const courseService = require('./courseService');

/**
 * Detect the type of a document from its text content.
 * Uses a fast Gemini call on the first ~3000 chars.
 */
async function detectDocumentType(text) {
  const excerpt = text.slice(0, 3000);

  const prompt = DOCUMENT_TYPE_DETECTION_PROMPT.replace('{document_text}', excerpt);

  const result = await withRetryOnRateLimit(async () => {
    const model = getGenerativeModel('fast');
    return model.generateContent(prompt);
  }, 3, 1);
  const responseText = result.response.text();

  try {
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('[syllabusDetection] Failed to parse document type response:', e.message);
    return { type: 'general', confidence: 0, indicators: [] };
  }
}

/**
 * Extract structured syllabus data from text.
 * Uses Gemini with search grounding to identify textbooks and topics.
 */
async function extractSyllabusData(text) {
  const prompt = SYLLABUS_EXTRACTION_PROMPT.replace('{document_text}', text);

  const result = await withRetryOnRateLimit(async () => {
    const model = getSearchGroundedModel('standard');
    return model.generateContent(prompt);
  }, 3, 1);
  const responseText = result.response.text();

  try {
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('[syllabusDetection] Failed to parse syllabus extraction:', e.message);
    return {
      courseTitle: 'Unknown Course',
      description: '',
      textbooks: [],
      weeklyTopics: [],
      learningObjectives: [],
    };
  }
}

// Known open-access textbook publishers/repositories
const OPEN_ACCESS_SOURCES = [
  { name: 'OpenStax', domain: 'openstax.org' },
  { name: 'MIT OpenCourseWare', domain: 'ocw.mit.edu' },
  { name: 'NCBI Bookshelf', domain: 'ncbi.nlm.nih.gov/books' },
  { name: 'Project Gutenberg', domain: 'gutenberg.org' },
  { name: 'arXiv', domain: 'arxiv.org' },
  { name: 'PubMed Central', domain: 'ncbi.nlm.nih.gov/pmc' },
  { name: 'Directory of Open Access Books', domain: 'doabooks.org' },
  { name: 'Open Textbook Library', domain: 'open.umn.edu/opentextbooks' },
];

/**
 * Search for freely available versions of textbooks.
 * Uses Gemini with search grounding to find open-access editions.
 */
async function findFreeTextbooks(textbooks) {
  if (!textbooks || textbooks.length === 0) return [];

  // Process up to 4 books per API call instead of 1 per call
  const BATCH_SIZE = 4;
  const results = [];

  for (let i = 0; i < textbooks.length; i += BATCH_SIZE) {
    const batch = textbooks.slice(i, i + BATCH_SIZE);

    const bookList = batch.map((b, idx) =>
      `${idx + 1}. "${b.title}"${b.author ? ` by ${b.author}` : ''}${b.isbn ? ` (ISBN: ${b.isbn})` : ''}`
    ).join('\n');

    const searchPrompt = `Search for freely available online versions of these textbooks:
${bookList}

Check open-access sources: ${OPEN_ACCESS_SOURCES.map(s => s.name).join(', ')}.
Also check author websites and university open courseware.

Return ONLY a JSON array with one object per book in the same order:
[
  { "available": true/false, "url": "full URL or null", "source": "source name or null", "notes": "brief note" },
  ...
]

IMPORTANT: Only set available: true if you find a genuinely free, legal version. Do not fabricate URLs.`;

    try {
      const result = await withRetryOnRateLimit(async () => {
        const model = getSearchGroundedModel('fast');
        return model.generateContent(searchPrompt);
      }, 3, 1);
      const responseText = result.response.text();
      const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      const batchResults = Array.isArray(parsed) ? parsed : [parsed];

      batch.forEach((book, idx) => {
        const r = batchResults[idx] || {};
        results.push({
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          required: book.required,
          available: r.available || false,
          url: r.url || null,
          source: r.source || null,
          notes: r.notes || null,
        });
      });
    } catch (err) {
      console.error(`[syllabusDetection] Free textbook batch search failed:`, err.message);
      // On failure, mark whole batch as unavailable
      batch.forEach(book => {
        results.push({
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          required: book.required,
          available: false,
          url: null,
          source: null,
          notes: 'Search failed',
        });
      });
    }
  }

  return results;
}

/**
 * Create a course from a detected syllabus document.
 * Extracts syllabus data, searches for free textbooks,
 * registers available ones as URL documents, and creates the course.
 */
async function createCourseFromSyllabus(docId, syllabusData, userId = null) {
  const courseId = await courseService.createCourse(
    syllabusData.courseTitle || 'Untitled Course',
    syllabusData.description || null,
    'syllabus',
    userId
  );

  // Set syllabus document reference and store config
  await courseService.updateCourseStatus(courseId, {
    syllabusDocumentId: docId,
    config: {
      weeklyTopics: syllabusData.weeklyTopics || [],
      learningObjectives: syllabusData.learningObjectives || [],
      textbookList: syllabusData.textbooks || [],
    },
  });

  // Add the syllabus document itself to the course
  await courseService.addDocumentToCourse(courseId, docId, 'syllabus', 0);

  // Search for free textbooks
  const textbookResults = await findFreeTextbooks(syllabusData.textbooks || []);

  const availableTextbooks = textbookResults.filter(t => t.available && t.url);
  const unavailableTextbooks = textbookResults.filter(t => !t.available);

  // Register available free textbooks as URL documents and add to course
  for (let i = 0; i < availableTextbooks.length; i++) {
    try {
      // Use the internal URL registration — import lazily to avoid circular deps
      const { registerUrlInternal } = require('../controllers/documentController');
      if (registerUrlInternal) {
        const newDocId = await registerUrlInternal(availableTextbooks[i].url, userId);
        if (newDocId) {
          await courseService.addDocumentToCourse(courseId, newDocId, 'source', i + 1);
        }
      }
    } catch (err) {
      console.error(`[syllabusDetection] Failed to register free textbook URL: ${err.message}`);
    }
  }

  // Store unavailable textbooks in course config for user to upload manually
  if (unavailableTextbooks.length > 0) {
    const course = await courseService.getCourse(courseId);
    await courseService.updateCourseStatus(courseId, {
      config: {
        ...course.config,
        recommendedTextbooks: unavailableTextbooks.map(t => ({
          title: t.title,
          author: t.author,
          isbn: t.isbn,
          required: t.required,
        })),
      },
    });
  }

  // Mark course as ready (unified module generation will happen later when sources are processed)
  await courseService.updateCourseStatus(courseId, { status: 'ready' });

  console.log(`[syllabusDetection] Course created from syllabus: ${courseId} (${availableTextbooks.length} free textbooks found, ${unavailableTextbooks.length} not available)`);

  return courseId;
}

module.exports = {
  detectDocumentType,
  extractSyllabusData,
  findFreeTextbooks,
  createCourseFromSyllabus,
};
