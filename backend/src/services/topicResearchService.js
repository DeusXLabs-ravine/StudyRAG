const { getSearchGroundedModel, getSearchAndUrlModel, getUrlContextModel, runDeepResearch, withRetryOnRateLimit } = require('../config/gemini');
const { TOPIC_CURRICULUM_PROMPT } = require('../utils/prompts');
const { getUserTeachingLevel } = require('./userProfileService');
const { extractGroundingData } = require('./webResearchService');

// ─── Official Documentation Registry ─────────────────────────
// Maps programming languages, frameworks, and tools to their official doc URLs.
// URL Context can fetch these directly (public, no paywall).

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
 */
function detectOfficialDocs(topic) {
  const normalized = topic.toLowerCase().trim();

  for (const [key, entry] of Object.entries(OFFICIAL_DOCS)) {
    if (normalized === key || normalized === entry.name.toLowerCase()) {
      return entry;
    }
  }

  const sorted = Object.entries(OFFICIAL_DOCS).sort((a, b) => b[0].length - a[0].length);
  for (const [key, entry] of sorted) {
    const name = entry.name.toLowerCase();
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
 * Detect if a topic is programming/tech related even without a known doc entry.
 * Used to route the search fallback toward documentation-focused queries.
 */
function isProgrammingTopic(topic) {
  const t = topic.toLowerCase();
  const techSignals = [
    'programming', 'code', 'coding', 'developer', 'development', 'software',
    'api', 'framework', 'library', 'algorithm', 'data structure',
    'web', 'frontend', 'backend', 'fullstack', 'full stack', 'devops',
    'database', 'server', 'deploy', 'cloud', 'microservice',
    'oop', 'functional programming', 'design pattern', 'architecture',
    'testing', 'debugging', 'compiler', 'interpreter', 'runtime',
    'machine learning', 'deep learning', 'neural network', 'nlp',
    'cybersecurity', 'encryption', 'authentication',
  ];
  return techSignals.some(s => t.includes(s)) || detectOfficialDocs(topic) !== null;
}

// ─── Main Entry Point ─────────────────────────────────────────

/**
 * Research a topic using the best available method.
 *
 * For programming/tech topics:
 *   1. Doc-grounded (official docs via URL Context) — fast, most accurate
 *   2. Search-for-docs (Google Search finds docs → URL Context reads them) — fallback
 *   3. Search-grounded generation — final fallback
 *
 * For academic/general topics:
 *   1. Deep Research (async, thorough) — best quality
 *   2. Search-grounded generation — fast fallback
 */
async function researchTopic(topic, userId = null) {
  const teachingLevel = await getUserTeachingLevel(userId);

  const prompt = TOPIC_CURRICULUM_PROMPT
    .replace('{topic}', topic)
    .replace('{teaching_level}', teachingLevel);

  const docEntry = detectOfficialDocs(topic);
  const isTech = isProgrammingTopic(topic);

  // ── Path A: Known official docs exist ──────────────────────
  if (docEntry) {
    // A1: Direct doc-grounded (hardcoded URLs)
    try {
      return await researchTopicWithDocs(topic, teachingLevel, prompt, docEntry);
    } catch (err) {
      console.warn(`[TopicResearch] Doc-grounded failed for "${topic}": ${err.message}`);
    }

    // A2: Search Google for the docs + read them with URL Context
    try {
      return await searchAndReadDocs(topic, teachingLevel, prompt, docEntry.name);
    } catch (err) {
      console.warn(`[TopicResearch] Search-for-docs failed for "${topic}": ${err.message}`);
    }
  }

  // ── Path B: Unknown tech topic (no hardcoded docs) ─────────
  if (isTech && !docEntry) {
    // B1: Search for documentation and tutorials specifically
    try {
      return await searchAndReadDocs(topic, teachingLevel, prompt);
    } catch (err) {
      console.warn(`[TopicResearch] Search-for-docs failed for tech topic "${topic}": ${err.message}`);
    }
  }

  // ── Path C: Non-tech / academic topics ─────────────────────
  if (!isTech) {
    // C1: Deep Research (best for academic topics — thorough, cited)
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
          metadata: { topic, teachingLevel, format: 'topic', method: 'deep-research', generatedAt: new Date().toISOString() },
        };
      }
    } catch (err) {
      console.warn(`[TopicResearch] Deep Research unavailable for "${topic}": ${err.message}`);
    }
  }

  // ── Path D: Universal fallback — Search + URL Context ──────
  console.log(`[TopicResearch] Using search-grounded fallback for "${topic}"`);
  return await researchTopicWithSearch(topic, teachingLevel, prompt);
}

// ─── Strategy Implementations ─────────────────────────────────

/**
 * Strategy A1: Generate curriculum from known official documentation URLs.
 */
async function researchTopicWithDocs(topic, teachingLevel, basePrompt, docEntry) {
  const urls = [];
  if (teachingLevel === 'dummy' || teachingLevel === 'beginner') {
    urls.push(...(docEntry.tutorials || []).slice(0, 3));
    urls.push(...(docEntry.docs || []).slice(0, 2));
  } else {
    urls.push(...(docEntry.docs || []).slice(0, 4));
    urls.push(...(docEntry.tutorials || []).slice(0, 1));
  }

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
  if (!text || text.length < 200) throw new Error('Doc-grounded generation returned insufficient content');

  const sources = selectedUrls.map(url => ({ title: `${docEntry.name} Official Documentation`, url }));
  try {
    const { groundingUrls } = extractGroundingData(result);
    sources.push(...groundingUrls.filter(g => g.url && !selectedUrls.includes(g.url)));
  } catch { /* ok */ }

  console.log(`[TopicResearch] Doc-grounded succeeded for "${topic}" (${text.length} chars, ${sources.length} sources)`);
  return {
    text,
    sources,
    metadata: { topic, teachingLevel, format: 'topic', method: 'doc-grounded', officialDocs: docEntry.name, generatedAt: new Date().toISOString() },
  };
}

/**
 * Strategy A2/B1: Use Google Search to find documentation/tutorials, then read them with URL Context.
 * This is the smart fallback — it searches for "[topic] official documentation tutorial",
 * gets real URLs from grounding, then feeds those URLs back to generate content.
 */
async function searchAndReadDocs(topic, teachingLevel, basePrompt, techName = null) {
  const label = techName || topic;

  // Step 1: Search for documentation URLs
  const searchPrompt = `Find the official documentation, tutorials, and getting-started guides for "${label}".
Return a list of the most authoritative URLs for learning ${label}. Prioritize:
- Official documentation sites (*.dev, *.org, *.io, docs.*)
- Official tutorials and getting-started guides
- Reputable educational resources (.edu, MDN, W3Schools for web)
Do NOT include random blog posts, Medium articles, or unofficial sources.
List up to 8 URLs, one per line.`;

  console.log(`[TopicResearch] Searching for ${label} documentation URLs...`);

  const searchResult = await withRetryOnRateLimit(async () => {
    const model = getSearchGroundedModel('standard');
    return model.generateContent(searchPrompt);
  });

  // Extract real URLs from grounding metadata
  const { groundingUrls } = extractGroundingData(searchResult);
  const docUrls = groundingUrls
    .filter(g => g.url)
    .map(g => g.url)
    .slice(0, 6); // Cap at 6 URLs for URL Context

  if (docUrls.length === 0) {
    throw new Error('Search found no documentation URLs');
  }

  console.log(`[TopicResearch] Found ${docUrls.length} doc URLs for "${label}", reading them...`);

  // Step 2: Generate curriculum using those discovered URLs as context
  const urlList = docUrls.map(u => `- ${u}`).join('\n');
  const docPrompt = `${basePrompt}

DOCUMENTATION SOURCES — USE AS PRIMARY SOURCE OF TRUTH:
The following documentation URLs were found for "${label}". Read and use them as your primary source.
Your explanations, code examples, and references must be grounded in these sources.

${urlList}

Generate comprehensive curriculum based on the documentation above. Include working code examples that match the official patterns.`;

  const genResult = await withRetryOnRateLimit(async () => {
    const model = getUrlContextModel('standard');
    return model.generateContent(docPrompt);
  });

  const text = genResult.response.text();
  if (!text || text.length < 200) throw new Error('Doc-search generation returned insufficient content');

  const sources = docUrls.map(url => ({ title: `${label} Documentation`, url }));
  try {
    const { groundingUrls: extraUrls } = extractGroundingData(genResult);
    sources.push(...extraUrls.filter(g => g.url && !docUrls.includes(g.url)));
  } catch { /* ok */ }

  console.log(`[TopicResearch] Search-for-docs succeeded for "${topic}" (${text.length} chars, ${sources.length} sources)`);
  return {
    text,
    sources,
    metadata: { topic, teachingLevel, format: 'topic', method: 'search-doc-grounded', generatedAt: new Date().toISOString() },
  };
}

/**
 * Strategy D: Universal fallback — Google Search + URL Context grounded generation.
 * Works for any topic. Extracts real grounding URLs as verified sources.
 */
async function researchTopicWithSearch(topic, teachingLevel, prompt) {
  const result = await withRetryOnRateLimit(async () => {
    const model = getSearchAndUrlModel('standard');
    return model.generateContent(prompt);
  });

  const text = result.response.text();
  if (!text || text.length < 200) throw new Error('Topic research returned insufficient content');

  const { groundingUrls } = extractGroundingData(result);
  const sources = groundingUrls.filter(s => s.url);

  console.log(`[TopicResearch] Search-grounded succeeded for "${topic}" (${text.length} chars, ${sources.length} sources)`);
  return {
    text,
    sources,
    metadata: { topic, teachingLevel, format: 'topic', method: 'search-grounded', generatedAt: new Date().toISOString() },
  };
}

module.exports = { researchTopic, detectOfficialDocs, OFFICIAL_DOCS };
