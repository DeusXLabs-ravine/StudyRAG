const { getSearchAndUrlModel, getUrlContextModel, runDeepResearch, withRetryOnRateLimit } = require('../config/gemini');
const { TOPIC_CURRICULUM_PROMPT } = require('../utils/prompts');
const { getUserTeachingLevel } = require('./userProfileService');
const { extractGroundingData } = require('./webResearchService');

// ─── Official Documentation Registry ─────────────────────────
// Maps programming languages, frameworks, and tools to their official doc URLs.
// URL Context can fetch these directly (public, no paywall).
// Each entry has: docs (main reference), tutorials (getting started), and optional api (API reference).

const OFFICIAL_DOCS = {
  // Languages
  python: {
    docs: ['https://docs.python.org/3/tutorial/index.html', 'https://docs.python.org/3/library/index.html'],
    tutorials: ['https://docs.python.org/3/tutorial/'],
    name: 'Python',
  },
  javascript: {
    docs: ['https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference'],
    tutorials: ['https://developer.mozilla.org/en-US/docs/Learn/JavaScript'],
    name: 'JavaScript',
  },
  typescript: {
    docs: ['https://www.typescriptlang.org/docs/handbook/intro.html'],
    tutorials: ['https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html'],
    name: 'TypeScript',
  },
  java: {
    docs: ['https://docs.oracle.com/javase/tutorial/', 'https://dev.java/learn/'],
    tutorials: ['https://dev.java/learn/getting-started/'],
    name: 'Java',
  },
  'c++': {
    docs: ['https://en.cppreference.com/w/', 'https://isocpp.org/wiki/faq'],
    tutorials: ['https://www.learncpp.com/'],
    name: 'C++',
  },
  c: {
    docs: ['https://en.cppreference.com/w/c'],
    tutorials: ['https://www.learn-c.org/'],
    name: 'C',
  },
  rust: {
    docs: ['https://doc.rust-lang.org/book/', 'https://doc.rust-lang.org/std/'],
    tutorials: ['https://doc.rust-lang.org/book/ch01-00-getting-started.html'],
    name: 'Rust',
  },
  go: {
    docs: ['https://go.dev/doc/', 'https://pkg.go.dev/std'],
    tutorials: ['https://go.dev/tour/welcome/1'],
    name: 'Go',
  },
  swift: {
    docs: ['https://docs.swift.org/swift-book/documentation/the-swift-programming-language/'],
    tutorials: ['https://developer.apple.com/tutorials/swiftui'],
    name: 'Swift',
  },
  kotlin: {
    docs: ['https://kotlinlang.org/docs/home.html'],
    tutorials: ['https://kotlinlang.org/docs/getting-started.html'],
    name: 'Kotlin',
  },
  php: {
    docs: ['https://www.php.net/manual/en/'],
    tutorials: ['https://www.php.net/manual/en/tutorial.php'],
    name: 'PHP',
  },
  ruby: {
    docs: ['https://ruby-doc.org/', 'https://www.ruby-lang.org/en/documentation/'],
    tutorials: ['https://www.ruby-lang.org/en/documentation/quickstart/'],
    name: 'Ruby',
  },

  // Frameworks & Libraries
  react: {
    docs: ['https://react.dev/reference/react', 'https://react.dev/learn'],
    tutorials: ['https://react.dev/learn/tutorial-tic-tac-toe'],
    name: 'React',
  },
  nextjs: {
    docs: ['https://nextjs.org/docs'],
    tutorials: ['https://nextjs.org/learn'],
    name: 'Next.js',
  },
  vue: {
    docs: ['https://vuejs.org/guide/introduction.html'],
    tutorials: ['https://vuejs.org/tutorial/'],
    name: 'Vue.js',
  },
  angular: {
    docs: ['https://angular.dev/overview'],
    tutorials: ['https://angular.dev/tutorials'],
    name: 'Angular',
  },
  svelte: {
    docs: ['https://svelte.dev/docs'],
    tutorials: ['https://svelte.dev/tutorial'],
    name: 'Svelte',
  },
  nodejs: {
    docs: ['https://nodejs.org/docs/latest/api/', 'https://nodejs.org/en/learn'],
    tutorials: ['https://nodejs.org/en/learn/getting-started/introduction-to-nodejs'],
    name: 'Node.js',
  },
  express: {
    docs: ['https://expressjs.com/en/4x/api.html', 'https://expressjs.com/en/guide/routing.html'],
    tutorials: ['https://expressjs.com/en/starter/hello-world.html'],
    name: 'Express.js',
  },
  django: {
    docs: ['https://docs.djangoproject.com/en/5.0/'],
    tutorials: ['https://docs.djangoproject.com/en/5.0/intro/tutorial01/'],
    name: 'Django',
  },
  flask: {
    docs: ['https://flask.palletsprojects.com/en/latest/'],
    tutorials: ['https://flask.palletsprojects.com/en/latest/quickstart/'],
    name: 'Flask',
  },
  fastapi: {
    docs: ['https://fastapi.tiangolo.com/'],
    tutorials: ['https://fastapi.tiangolo.com/tutorial/'],
    name: 'FastAPI',
  },
  'spring boot': {
    docs: ['https://docs.spring.io/spring-boot/reference/'],
    tutorials: ['https://spring.io/guides/gs/spring-boot'],
    name: 'Spring Boot',
  },
  flutter: {
    docs: ['https://docs.flutter.dev/'],
    tutorials: ['https://docs.flutter.dev/get-started/codelab'],
    name: 'Flutter',
  },
  'react native': {
    docs: ['https://reactnative.dev/docs/getting-started'],
    tutorials: ['https://reactnative.dev/docs/tutorial'],
    name: 'React Native',
  },
  tailwindcss: {
    docs: ['https://tailwindcss.com/docs'],
    tutorials: ['https://tailwindcss.com/docs/utility-first'],
    name: 'Tailwind CSS',
  },

  // Databases & Tools
  postgresql: {
    docs: ['https://www.postgresql.org/docs/current/'],
    tutorials: ['https://www.postgresql.org/docs/current/tutorial.html'],
    name: 'PostgreSQL',
  },
  mongodb: {
    docs: ['https://www.mongodb.com/docs/manual/'],
    tutorials: ['https://www.mongodb.com/docs/manual/tutorial/getting-started/'],
    name: 'MongoDB',
  },
  redis: {
    docs: ['https://redis.io/docs/latest/'],
    tutorials: ['https://redis.io/docs/latest/get-started/'],
    name: 'Redis',
  },
  docker: {
    docs: ['https://docs.docker.com/'],
    tutorials: ['https://docs.docker.com/get-started/'],
    name: 'Docker',
  },
  kubernetes: {
    docs: ['https://kubernetes.io/docs/home/'],
    tutorials: ['https://kubernetes.io/docs/tutorials/'],
    name: 'Kubernetes',
  },
  git: {
    docs: ['https://git-scm.com/doc', 'https://git-scm.com/book/en/v2'],
    tutorials: ['https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control'],
    name: 'Git',
  },

  // Data Science & ML
  pandas: {
    docs: ['https://pandas.pydata.org/docs/user_guide/index.html'],
    tutorials: ['https://pandas.pydata.org/docs/getting_started/intro_tutorials/index.html'],
    name: 'pandas',
  },
  numpy: {
    docs: ['https://numpy.org/doc/stable/user/index.html'],
    tutorials: ['https://numpy.org/doc/stable/user/absolute_beginners.html'],
    name: 'NumPy',
  },
  pytorch: {
    docs: ['https://pytorch.org/docs/stable/index.html'],
    tutorials: ['https://pytorch.org/tutorials/beginner/basics/intro.html'],
    name: 'PyTorch',
  },
  tensorflow: {
    docs: ['https://www.tensorflow.org/api_docs'],
    tutorials: ['https://www.tensorflow.org/tutorials'],
    name: 'TensorFlow',
  },

  // Web Standards
  html: {
    docs: ['https://developer.mozilla.org/en-US/docs/Web/HTML'],
    tutorials: ['https://developer.mozilla.org/en-US/docs/Learn/HTML'],
    name: 'HTML',
  },
  css: {
    docs: ['https://developer.mozilla.org/en-US/docs/Web/CSS'],
    tutorials: ['https://developer.mozilla.org/en-US/docs/Learn/CSS'],
    name: 'CSS',
  },
  sql: {
    docs: ['https://www.w3schools.com/sql/', 'https://www.postgresql.org/docs/current/sql.html'],
    tutorials: ['https://www.w3schools.com/sql/sql_intro.asp'],
    name: 'SQL',
  },
};

/**
 * Detect if a topic matches a known programming/tech subject with official docs.
 * Returns the doc entry or null. Uses word-boundary matching to avoid false positives
 * (e.g. "Organic Chemistry" should NOT match "C").
 */
function detectOfficialDocs(topic) {
  const normalized = topic.toLowerCase().trim();

  // Direct match (exact)
  for (const [key, entry] of Object.entries(OFFICIAL_DOCS)) {
    if (normalized === key || normalized === entry.name.toLowerCase()) {
      return entry;
    }
  }

  // Word-boundary match — sort by key length descending so "react native" matches before "react",
  // and "c++" matches before "c"
  const sorted = Object.entries(OFFICIAL_DOCS).sort((a, b) => b[0].length - a[0].length);
  for (const [key, entry] of sorted) {
    const name = entry.name.toLowerCase();
    // Build regex with word boundaries — for keys with special chars like "c++",
    // use lookahead/lookbehind instead of \b which treats + as non-word
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameEscaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boundary = key.includes('+') || key.includes('#') || key.includes('.')
      ? `(?:^|\\s)(${escaped}|${nameEscaped})(?:\\s|$)`
      : `\\b(${escaped}|${nameEscaped})\\b`;
    const pattern = new RegExp(boundary, 'i');
    if (pattern.test(normalized)) {
      return entry;
    }
  }

  return null;
}

/**
 * Research a topic using the best available method.
 *
 * Priority order:
 * 1. Doc-grounded generation (for programming/tech with official docs) — fast + accurate
 * 2. Deep Research (async, thorough, ~5-20 min) — best for academic/non-tech topics
 * 3. Search + URL Context grounded generation (fast, ~10s) — universal fallback
 */
async function researchTopic(topic, userId = null) {
  const teachingLevel = await getUserTeachingLevel(userId);

  const prompt = TOPIC_CURRICULUM_PROMPT
    .replace('{topic}', topic)
    .replace('{teaching_level}', teachingLevel);

  // Check if this is a programming/tech topic with official documentation
  const docEntry = detectOfficialDocs(topic);
  if (docEntry) {
    try {
      return await researchTopicWithDocs(topic, teachingLevel, prompt, docEntry);
    } catch (err) {
      console.warn(`[TopicResearch] Doc-grounded generation failed for "${topic}", falling back: ${err.message}`);
    }
  }

  // Try Deep Research for non-tech/academic topics
  try {
    const deepResult = await runDeepResearch(
      `Research the topic "${topic}" thoroughly for a ${teachingLevel}-level student. ` +
      `Produce comprehensive study material covering: fundamentals, core concepts, worked examples, ` +
      `practical applications, and advanced considerations. ` +
      `Structure with clear headings, bullet points, and examples. Target 5000-15000 words. ` +
      `Only cite information from trusted academic sources.`,
      { timeoutMs: 600_000, pollIntervalMs: 8_000 }
    );

    if (deepResult?.text && deepResult.text.length >= 500) {
      console.log(`[TopicResearch] Deep Research succeeded for "${topic}" (${deepResult.text.length} chars, ${deepResult.sources?.length || 0} sources)`);
      return {
        text: deepResult.text,
        sources: deepResult.sources || [],
        metadata: {
          topic,
          teachingLevel,
          format: 'topic',
          method: 'deep-research',
          generatedAt: new Date().toISOString(),
        },
      };
    }
  } catch (err) {
    console.warn(`[TopicResearch] Deep Research unavailable for "${topic}", falling back to search grounding: ${err.message}`);
  }

  // Final fallback: Search + URL Context grounded generation
  return await researchTopicWithSearch(topic, teachingLevel, prompt);
}

/**
 * Generate curriculum for programming/tech topics using official documentation as source of truth.
 * Uses URL Context to fetch official docs, then generates content grounded in that documentation.
 */
async function researchTopicWithDocs(topic, teachingLevel, basePrompt, docEntry) {
  // Build the URL list — tutorials for beginners, full docs for advanced
  const urls = [];
  if (teachingLevel === 'dummy' || teachingLevel === 'beginner') {
    urls.push(...(docEntry.tutorials || []).slice(0, 3));
    urls.push(...(docEntry.docs || []).slice(0, 2));
  } else {
    urls.push(...(docEntry.docs || []).slice(0, 4));
    urls.push(...(docEntry.tutorials || []).slice(0, 1));
  }

  // Limit to 5 URLs (URL Context supports up to 20 but we want speed)
  const selectedUrls = urls.slice(0, 5);
  const urlList = selectedUrls.map(u => `- ${u}`).join('\n');

  const docPrompt = `${basePrompt}

OFFICIAL DOCUMENTATION — USE AS PRIMARY SOURCE OF TRUTH:
The following are official ${docEntry.name} documentation URLs. Base your content on these authoritative sources.
Your explanations, code examples, and API references must be consistent with this official documentation.
If the documentation covers a topic, prefer its explanation and examples over your training data.

${urlList}

Generate the curriculum based on the official documentation above. Include working code examples that follow the official documentation's patterns and conventions.`;

  console.log(`[TopicResearch] Using official ${docEntry.name} docs (${selectedUrls.length} URLs) for "${topic}"`);

  const result = await withRetryOnRateLimit(async () => {
    const model = getUrlContextModel('standard');
    return model.generateContent(docPrompt);
  });

  const text = result.response.text();

  if (!text || text.length < 200) {
    throw new Error('Doc-grounded generation returned insufficient content');
  }

  // Build sources from the official doc URLs we provided
  const sources = selectedUrls.map(url => ({
    title: `${docEntry.name} Official Documentation`,
    url,
  }));

  // Also extract any additional grounding URLs the model found
  try {
    const { groundingUrls } = extractGroundingData(result);
    const additional = groundingUrls.filter(g => g.url && !selectedUrls.includes(g.url));
    sources.push(...additional);
  } catch { /* URL context may not return grounding metadata */ }

  console.log(`[TopicResearch] Doc-grounded generation succeeded for "${topic}" (${text.length} chars, ${sources.length} sources)`);

  return {
    text,
    sources,
    metadata: {
      topic,
      teachingLevel,
      format: 'topic',
      method: 'doc-grounded',
      officialDocs: docEntry.name,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Fallback: Generate topic curriculum using Google Search + URL Context grounding.
 * Extracts real grounding URLs as verified sources.
 */
async function researchTopicWithSearch(topic, teachingLevel, prompt) {
  const result = await withRetryOnRateLimit(async () => {
    const model = getSearchAndUrlModel('standard');
    return model.generateContent(prompt);
  });

  const text = result.response.text();

  if (!text || text.length < 200) {
    throw new Error('Topic research returned insufficient content');
  }

  // Extract verified sources from grounding metadata
  const { groundingUrls } = extractGroundingData(result);
  const sources = groundingUrls.filter(s => s.url);

  console.log(`[TopicResearch] Search grounding succeeded for "${topic}" (${text.length} chars, ${sources.length} grounded sources)`);

  return {
    text,
    sources,
    metadata: {
      topic,
      teachingLevel,
      format: 'topic',
      method: 'search-grounded',
      generatedAt: new Date().toISOString(),
    },
  };
}

module.exports = { researchTopic, detectOfficialDocs, OFFICIAL_DOCS };
