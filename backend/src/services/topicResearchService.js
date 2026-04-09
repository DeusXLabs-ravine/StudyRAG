const {
  getSearchGroundedModel, getSearchAndUrlModel, getUrlContextModel,
  runDeepResearch, withRetryOnRateLimit,
} = require('../config/gemini');
const { buildTopicPrompt } = require('../utils/prompts/webResearch');
const { getUserTeachingLevel } = require('./userProfileService');
const { extractGroundingData } = require('./webResearchService');
const { lookupTopicResearch, storeTopicResearch } = require('./sharedResearchCache');

// ─── Topic Cache (in-memory, 4 h TTL) ─────────────────────────
// Prevents re-researching the same topic on repeat requests.
const _topicCache = new Map();
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

function cacheGet(key) {
  const entry = _topicCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) { _topicCache.delete(key); return null; }
  return entry.data;
}
function cacheSet(key, data) {
  _topicCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Official Documentation Registry (Programming) ────────────
const OFFICIAL_DOCS = {
  python:       { docs: ['https://docs.python.org/3/tutorial/index.html', 'https://docs.python.org/3/library/index.html'], tutorials: ['https://docs.python.org/3/tutorial/'], name: 'Python' },
  javascript:   { docs: ['https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference'], tutorials: ['https://developer.mozilla.org/en-US/docs/Learn/JavaScript'], name: 'JavaScript' },
  typescript:   { docs: ['https://www.typescriptlang.org/docs/handbook/intro.html'], tutorials: ['https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html'], name: 'TypeScript' },
  java:         { docs: ['https://docs.oracle.com/javase/tutorial/', 'https://dev.java/learn/'], tutorials: ['https://dev.java/learn/getting-started/'], name: 'Java' },
  'c++':        { docs: ['https://en.cppreference.com/w/', 'https://isocpp.org/wiki/faq'], tutorials: ['https://www.learncpp.com/'], name: 'C++' },
  c:            { docs: ['https://en.cppreference.com/w/c'], tutorials: ['https://www.learn-c.org/'], name: 'C' },
  rust:         { docs: ['https://doc.rust-lang.org/book/', 'https://doc.rust-lang.org/std/'], tutorials: ['https://doc.rust-lang.org/book/ch01-00-getting-started.html'], name: 'Rust' },
  go:           { docs: ['https://go.dev/doc/', 'https://pkg.go.dev/std'], tutorials: ['https://go.dev/tour/welcome/1'], name: 'Go' },
  swift:        { docs: ['https://docs.swift.org/swift-book/documentation/the-swift-programming-language/'], tutorials: ['https://developer.apple.com/tutorials/swiftui'], name: 'Swift' },
  kotlin:       { docs: ['https://kotlinlang.org/docs/home.html'], tutorials: ['https://kotlinlang.org/docs/getting-started.html'], name: 'Kotlin' },
  php:          { docs: ['https://www.php.net/manual/en/'], tutorials: ['https://www.php.net/manual/en/tutorial.php'], name: 'PHP' },
  ruby:         { docs: ['https://ruby-doc.org/'], tutorials: ['https://www.ruby-lang.org/en/documentation/quickstart/'], name: 'Ruby' },
  react:        { docs: ['https://react.dev/reference/react', 'https://react.dev/learn'], tutorials: ['https://react.dev/learn/tutorial-tic-tac-toe'], name: 'React' },
  nextjs:       { docs: ['https://nextjs.org/docs'], tutorials: ['https://nextjs.org/learn'], name: 'Next.js' },
  vue:          { docs: ['https://vuejs.org/guide/introduction.html'], tutorials: ['https://vuejs.org/tutorial/'], name: 'Vue.js' },
  angular:      { docs: ['https://angular.dev/overview'], tutorials: ['https://angular.dev/tutorials'], name: 'Angular' },
  svelte:       { docs: ['https://svelte.dev/docs'], tutorials: ['https://svelte.dev/tutorial'], name: 'Svelte' },
  nodejs:       { docs: ['https://nodejs.org/docs/latest/api/', 'https://nodejs.org/en/learn'], tutorials: ['https://nodejs.org/en/learn/getting-started/introduction-to-nodejs'], name: 'Node.js' },
  express:      { docs: ['https://expressjs.com/en/4x/api.html', 'https://expressjs.com/en/guide/routing.html'], tutorials: ['https://expressjs.com/en/starter/hello-world.html'], name: 'Express.js' },
  django:       { docs: ['https://docs.djangoproject.com/en/5.0/'], tutorials: ['https://docs.djangoproject.com/en/5.0/intro/tutorial01/'], name: 'Django' },
  flask:        { docs: ['https://flask.palletsprojects.com/en/latest/'], tutorials: ['https://flask.palletsprojects.com/en/latest/quickstart/'], name: 'Flask' },
  fastapi:      { docs: ['https://fastapi.tiangolo.com/'], tutorials: ['https://fastapi.tiangolo.com/tutorial/'], name: 'FastAPI' },
  'spring boot':{ docs: ['https://docs.spring.io/spring-boot/reference/'], tutorials: ['https://spring.io/guides/gs/spring-boot'], name: 'Spring Boot' },
  flutter:      { docs: ['https://docs.flutter.dev/'], tutorials: ['https://docs.flutter.dev/get-started/codelab'], name: 'Flutter' },
  'react native':{ docs: ['https://reactnative.dev/docs/getting-started'], tutorials: ['https://reactnative.dev/docs/tutorial'], name: 'React Native' },
  tailwindcss:  { docs: ['https://tailwindcss.com/docs'], tutorials: ['https://tailwindcss.com/docs/utility-first'], name: 'Tailwind CSS' },
  postgresql:   { docs: ['https://www.postgresql.org/docs/current/'], tutorials: ['https://www.postgresql.org/docs/current/tutorial.html'], name: 'PostgreSQL' },
  mongodb:      { docs: ['https://www.mongodb.com/docs/manual/'], tutorials: ['https://www.mongodb.com/docs/manual/tutorial/getting-started/'], name: 'MongoDB' },
  redis:        { docs: ['https://redis.io/docs/latest/'], tutorials: ['https://redis.io/docs/latest/get-started/'], name: 'Redis' },
  docker:       { docs: ['https://docs.docker.com/'], tutorials: ['https://docs.docker.com/get-started/'], name: 'Docker' },
  kubernetes:   { docs: ['https://kubernetes.io/docs/home/'], tutorials: ['https://kubernetes.io/docs/tutorials/'], name: 'Kubernetes' },
  git:          { docs: ['https://git-scm.com/doc', 'https://git-scm.com/book/en/v2'], tutorials: ['https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control'], name: 'Git' },
  pandas:       { docs: ['https://pandas.pydata.org/docs/user_guide/index.html'], tutorials: ['https://pandas.pydata.org/docs/getting_started/intro_tutorials/index.html'], name: 'pandas' },
  numpy:        { docs: ['https://numpy.org/doc/stable/user/index.html'], tutorials: ['https://numpy.org/doc/stable/user/absolute_beginners.html'], name: 'NumPy' },
  pytorch:      { docs: ['https://pytorch.org/docs/stable/index.html'], tutorials: ['https://pytorch.org/tutorials/beginner/basics/intro.html'], name: 'PyTorch' },
  tensorflow:   { docs: ['https://www.tensorflow.org/api_docs'], tutorials: ['https://www.tensorflow.org/tutorials'], name: 'TensorFlow' },
  html:         { docs: ['https://developer.mozilla.org/en-US/docs/Web/HTML'], tutorials: ['https://developer.mozilla.org/en-US/docs/Learn/HTML'], name: 'HTML' },
  css:          { docs: ['https://developer.mozilla.org/en-US/docs/Web/CSS'], tutorials: ['https://developer.mozilla.org/en-US/docs/Learn/CSS'], name: 'CSS' },
  sql:          { docs: ['https://www.postgresql.org/docs/current/sql.html'], tutorials: ['https://www.w3schools.com/sql/sql_intro.asp'], name: 'SQL' },
};

// ─── Academic Domain Registry ─────────────────────────────────
// Authoritative educational URLs + metadata per academic subject domain.
const ACADEMIC_DOMAIN_REGISTRY = {
  medical: {
    name: 'Medical / Clinical',
    signals: [
      'anatomy', 'physiology', 'pharmacology', 'biochemistry', 'pathology',
      'microbiology', 'immunology', 'histology', 'embryology', 'neuroscience',
      'cardiology', 'respiratory', 'gastrointestinal', 'endocrinology', 'nephrology',
      'hepatology', 'hematology', 'oncology', 'surgery', 'clinical medicine',
      'nursing', 'nclex', 'usmle', 'disease', 'diagnosis', 'drug', 'medication',
      'treatment', 'medical', 'psychiatry', 'dermatology', 'orthopedics', 'radiology',
    ],
    urls: [
      'https://www.khanacademy.org/science/health-and-medicine',
      'https://www.merckmanuals.com/professional',
      'https://www.ncbi.nlm.nih.gov/books/',
    ],
    searchFocus: 'medical textbooks, clinical guidelines, PubMed abstracts, academic medical resources',
    depthHint: 'Use precise anatomical and medical terminology. Include pathophysiology, mechanisms of disease, clinical correlations, diagnostic criteria, and evidence-based treatment approaches. Reference organ systems and physiological pathways clearly.',
  },
  law: {
    name: 'Law / Legal',
    signals: [
      'law', 'legal', 'jurisprudence', 'constitutional', 'criminal law', 'civil law',
      'contract', 'tort', 'statute', 'legislation', 'court', 'judge', 'precedent',
      'jurisdiction', 'llb', 'llm', 'legal theory', 'international law', 'human rights',
      'legal procedure', 'equity', 'property law', 'administrative law', 'arbitration',
    ],
    urls: [
      'https://www.law.cornell.edu/wex',
      'https://openstax.org/subjects/law',
    ],
    searchFocus: 'law textbooks, case law, legal statutes, academic legal resources, official law reports',
    depthHint: 'Reference key cases and statutes by name. Distinguish between jurisdictions where relevant. Explain legal principles, their rationale, and practical application. Include landmark cases and their significance. Use precise legal terminology.',
  },
  mathematics: {
    name: 'Mathematics',
    signals: [
      'mathematics', 'maths', 'algebra', 'calculus', 'statistics', 'probability',
      'geometry', 'topology', 'number theory', 'linear algebra', 'differential equations',
      'discrete mathematics', 'combinatorics', 'real analysis', 'complex analysis',
      'theorem', 'proof', 'vector', 'matrix', 'integral', 'derivative', 'limit',
      'trigonometry', 'set theory', 'graph theory', 'mathematical', 'numerical methods',
    ],
    urls: [
      'https://www.khanacademy.org/math',
      'https://tutorial.math.lamar.edu/',
      'https://mathworld.wolfram.com/',
    ],
    searchFocus: 'mathematics textbooks, proofs, worked examples, academic math lecture notes',
    depthHint: 'Include formal definitions, key theorems with proof outlines, and multiple step-by-step worked numerical examples at each level of difficulty. Use clear mathematical notation. Build rigorously from fundamentals to advanced concepts.',
  },
  physics: {
    name: 'Physics',
    signals: [
      'physics', 'mechanics', 'thermodynamics', 'electromagnetism', 'quantum mechanics',
      'relativity', 'optics', 'nuclear physics', 'particle physics', 'astrophysics',
      'kinematics', 'dynamics', 'waves', 'force', 'energy', 'momentum', 'electric field',
      'magnetic field', 'gravitational', 'velocity', 'acceleration', 'pressure',
      'entropy', 'photon', 'electron', 'atomic',
    ],
    urls: [
      'https://www.khanacademy.org/science/physics',
      'https://hyperphysics.phy-astr.gsu.edu/hbase/hph.html',
      'https://openstax.org/subjects/science',
    ],
    searchFocus: 'physics textbooks, problem sets, lecture notes, academic physics resources',
    depthHint: 'State physical laws clearly and derive key equations where feasible. Include dimensional analysis and quantitative examples with SI units. Explain the physical intuition behind equations. Reference key experiments and real-world applications.',
  },
  chemistry: {
    name: 'Chemistry',
    signals: [
      'chemistry', 'organic chemistry', 'inorganic chemistry', 'physical chemistry',
      'analytical chemistry', 'molecule', 'atom', 'chemical reaction', 'compound',
      'element', 'periodic table', 'chemical bond', 'stoichiometry', 'thermochemistry',
      'electrochemistry', 'titration', 'mole', 'oxidation', 'reduction', 'acid', 'base',
      'polymer', 'isomer', 'spectroscopy', 'chromatography',
    ],
    urls: [
      'https://www.khanacademy.org/science/chemistry',
      'https://openstax.org/subjects/science',
      'https://chemguide.co.uk/',
    ],
    searchFocus: 'chemistry textbooks, reaction mechanisms, academic chemistry resources',
    depthHint: 'Include reaction mechanisms with arrow-pushing description, balanced chemical equations, IUPAC nomenclature, and quantitative problems. Explain thermodynamic and kinetic principles with relevant equations. Describe structure-reactivity relationships.',
  },
  biology: {
    name: 'Biology',
    signals: [
      'biology', 'cell biology', 'molecular biology', 'genetics', 'ecology',
      'evolution', 'botany', 'zoology', 'microbiology', 'virology', 'taxonomy',
      'photosynthesis', 'cellular respiration', 'dna', 'rna', 'protein synthesis',
      'gene expression', 'chromosome', 'organism', 'ecosystem', 'natural selection',
      'mitosis', 'meiosis', 'receptor', 'enzyme', 'membrane', 'organelle',
    ],
    urls: [
      'https://www.khanacademy.org/science/biology',
      'https://openstax.org/subjects/science',
      'https://www.ncbi.nlm.nih.gov/books/NBK21054/',
    ],
    searchFocus: 'biology textbooks, molecular biology resources, academic biology materials',
    depthHint: 'Include molecular mechanisms, evolutionary context, and biological examples. Reference key experiments and discoveries (e.g. Watson & Crick, Meselson-Stahl). Explain cellular and systemic processes with appropriate depth for the level.',
  },
  economics: {
    name: 'Economics',
    signals: [
      'economics', 'macroeconomics', 'microeconomics', 'supply and demand', 'market equilibrium',
      'gdp', 'inflation', 'monetary policy', 'fiscal policy', 'international trade',
      'investment', 'banking', 'elasticity', 'utility', 'opportunity cost', 'game theory',
      'econometrics', 'keynesian', 'market failure', 'externality', 'oligopoly', 'monopoly',
    ],
    urls: [
      'https://www.khanacademy.org/economics-finance-domain',
      'https://openstax.org/subjects/social-sciences',
    ],
    searchFocus: 'economics textbooks, academic economics resources, economic theory, empirical studies',
    depthHint: 'Include economic models and graphical analysis descriptions. Provide quantitative examples and real-world policy applications. Distinguish normative from positive economics. Reference major schools of thought (Keynesian, Monetarist, Classical, etc.).',
  },
  history: {
    name: 'History',
    signals: [
      'history', 'ancient history', 'medieval history', 'modern history', 'world war',
      'civilization', 'empire', 'revolution', 'colonialism', 'cultural history', 'social history',
      'political history', 'historical period', 'dynasty', 'historical event', 'renaissance',
      'enlightenment', 'industrial revolution', 'cold war', 'archaeological',
    ],
    urls: [
      'https://www.khanacademy.org/humanities/world-history',
      'https://www.bbc.co.uk/history',
    ],
    searchFocus: 'history textbooks, academic historical resources, primary and secondary sources',
    depthHint: 'Include specific dates, key figures, geographic context, and causal analysis (causes and consequences). Discuss historiographical debates where relevant. Connect events to broader historical patterns and long-term significance.',
  },
  psychology: {
    name: 'Psychology',
    signals: [
      'psychology', 'cognitive psychology', 'behavioral psychology', 'developmental psychology',
      'social psychology', 'neuroscience', 'mental health', 'psychiatric', 'perception',
      'memory', 'learning theory', 'personality', 'therapy', 'counseling', 'psychoanalysis',
      'behaviorism', 'cognition', 'emotion', 'motivation', 'attachment', 'trauma',
      'classical conditioning', 'operant conditioning', 'piaget', 'erikson', 'freud',
    ],
    urls: [
      'https://www.khanacademy.org/science/ap-psychology',
      'https://openstax.org/subjects/social-sciences',
      'https://www.apa.org/topics',
    ],
    searchFocus: 'psychology textbooks, peer-reviewed psychology research, APA resources',
    depthHint: 'Include major theories and their proponents, key empirical research findings, clinical applications, and DSM criteria where applicable. Distinguish between evidence-based and speculative claims. Include experimental methods and limitations.',
  },
  literature: {
    name: 'Literature & Humanities',
    signals: [
      'literature', 'literary theory', 'poetry', 'novel', 'fiction', 'prose',
      'drama', 'rhetoric', 'linguistics', 'philosophy', 'ethics', 'metaphysics',
      'epistemology', 'aesthetics', 'narrative', 'humanities', 'cultural studies',
      'literary criticism', 'postcolonial', 'structuralism', 'postmodernism',
      'existentialism', 'feminism', 'shakespeare', 'modernism',
    ],
    urls: [
      'https://www.khanacademy.org/humanities',
      'https://plato.stanford.edu/',
    ],
    searchFocus: 'literary analysis, academic humanities resources, philosophical texts, literary criticism',
    depthHint: 'Include textual analysis, historical and cultural context, major themes, and scholarly interpretations. Reference canonical works, key critics, and major theoretical schools. Engage with primary texts and secondary scholarship.',
  },
  business: {
    name: 'Business & Management',
    signals: [
      'business', 'management', 'marketing', 'accounting', 'entrepreneurship',
      'strategy', 'operations management', 'supply chain', 'human resources',
      'organizational behavior', 'leadership', 'corporate finance', 'mba',
      'business model', 'competitive advantage', 'branding', 'consumer behavior',
      'financial statement', 'balance sheet', 'income statement', 'cash flow',
    ],
    urls: [
      'https://openstax.org/subjects/business',
    ],
    searchFocus: 'business textbooks, management frameworks, case studies, academic business resources',
    depthHint: 'Include practical frameworks and models (Porter\'s Five Forces, SWOT, BCG Matrix, etc.). Reference recognized business theories with their originators. Include quantitative financial concepts with formulas. Use real company examples where helpful.',
  },
  engineering: {
    name: 'Engineering',
    signals: [
      'engineering', 'civil engineering', 'mechanical engineering', 'electrical engineering',
      'chemical engineering', 'structural', 'circuits', 'signal processing', 'control systems',
      'fluid mechanics', 'heat transfer', 'materials science', 'cad', 'manufacturing',
      'statics', 'dynamics', 'stress', 'strain', 'voltage', 'current', 'resistance',
      'transistor', 'semiconductor', 'fourier', 'laplace',
    ],
    urls: [
      'https://www.khanacademy.org/science/ap-college-physics-1',
      'https://openstax.org/subjects/science',
    ],
    searchFocus: 'engineering textbooks, technical references, academic engineering resources',
    depthHint: 'Include design principles, mathematical modeling with derivations, and worked engineering problems with units. Reference relevant standards and codes (IEEE, ASME, etc.) where applicable. Emphasize practical problem-solving and design trade-offs.',
  },
  geography: {
    name: 'Geography & Earth Sciences',
    signals: [
      'geography', 'physical geography', 'human geography', 'cartography', 'geomorphology',
      'climate', 'weather', 'atmosphere', 'oceanography', 'geology', 'tectonics',
      'hydrology', 'soil science', 'urban geography', 'demographic', 'migration',
      'geopolitics', 'population', 'biome', 'erosion', 'landform',
    ],
    urls: [
      'https://www.khanacademy.org/humanities/world-history',
      'https://www.nationalgeographic.org/education/',
    ],
    searchFocus: 'geography textbooks, earth science resources, academic geographic studies',
    depthHint: 'Include physical processes with spatial context, maps descriptions, case studies of specific regions, and human-environment interactions. Reference relevant data sources (UN, World Bank, USGS) where appropriate.',
  },
  arts: {
    name: 'Visual Arts & Music',
    signals: [
      'art', 'painting', 'sculpture', 'drawing', 'architecture', 'design',
      'music theory', 'harmony', 'melody', 'rhythm', 'counterpoint', 'musical form',
      'art history', 'renaissance art', 'baroque', 'impressionism', 'modern art',
      'photography', 'film', 'cinema', 'animation', 'graphic design',
    ],
    urls: [
      'https://www.khanacademy.org/humanities/art-history',
    ],
    searchFocus: 'art history textbooks, music theory resources, academic art and music references',
    depthHint: 'Include historical context, major movements and their characteristics, key artists/composers and their contributions, and formal analysis of works. Use appropriate technical terminology for the discipline.',
  },
};

// ─── Domain Detection ─────────────────────────────────────────

function detectOfficialDocs(topic) {
  const normalized = topic.toLowerCase().trim();
  for (const [key, entry] of Object.entries(OFFICIAL_DOCS)) {
    if (normalized === key || normalized === entry.name.toLowerCase()) return entry;
  }
  const sorted = Object.entries(OFFICIAL_DOCS).sort((a, b) => b[0].length - a[0].length);
  for (const [key, entry] of sorted) {
    const name = entry.name.toLowerCase();
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameEscaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boundary = key.includes('+') || key.includes('#') || key.includes('.')
      ? `(?:^|\\s)(${escaped}|${nameEscaped})(?:\\s|$)`
      : `\\b(${escaped}|${nameEscaped})\\b`;
    if (new RegExp(boundary, 'i').test(normalized)) return entry;
  }
  return null;
}

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

/**
 * Detect the subject domain of a topic.
 * Returns one of the entries in ACADEMIC_DOMAIN_REGISTRY, or a general fallback.
 */
function detectSubjectDomain(topic) {
  if (detectOfficialDocs(topic) || isProgrammingTopic(topic)) {
    return {
      key: 'programming', name: 'Programming / Technology', urls: [],
      searchFocus: 'official documentation, tutorials, technical references',
      depthHint: 'Include working code examples following official documentation patterns, API references, and language/framework best practices.',
    };
  }

  const lower = topic.toLowerCase().trim();
  let bestDomain = null;
  let bestScore = 0;

  for (const [key, domain] of Object.entries(ACADEMIC_DOMAIN_REGISTRY)) {
    const score = domain.signals.filter(s => lower.includes(s)).length;
    if (score > bestScore) { bestScore = score; bestDomain = { key, ...domain }; }
  }

  return bestDomain || {
    key: 'general', name: 'General Academic', urls: [],
    searchFocus: 'academic textbooks, educational resources, scholarly articles',
    depthHint: 'Provide a rigorous, well-structured treatment with clear definitions, examples, and real-world applications.',
  };
}

// ─── Research Agents ──────────────────────────────────────────

/**
 * Agent A: URL-context with known authoritative domain URLs.
 * Fast (10-20 s), grounded in authoritative sources.
 */
async function domainUrlAgent(topic, teachingLevel, prompt, domain) {
  const urls = (domain.urls || []).slice(0, 4);
  if (urls.length === 0) throw new Error('No domain URLs available');

  const urlList = urls.map(u => `- ${u}`).join('\n');
  const docPrompt = `${prompt}

AUTHORITATIVE SOURCES — USE AS PRIMARY REFERENCE:
${urlList}

Generate comprehensive curriculum grounded in these authoritative sources.`;

  const t0 = Date.now();
  const result = await withRetryOnRateLimit(async () => {
    const model = getUrlContextModel('standard');
    return model.generateContent(docPrompt);
  });

  const text = result.response.text();
  if (!text || text.length < 300) throw new Error('Domain URL agent: insufficient content');

  const sources = urls.map(url => ({ title: `${domain.name} Educational Resource`, url }));
  console.log(`[DomainURL] OK: "${topic}" — ${text.length} chars in ${Date.now() - t0}ms`);
  return {
    text,
    sources,
    metadata: { topic, teachingLevel, format: 'topic', method: 'domain-url', domain: domain.key, generatedAt: new Date().toISOString() },
  };
}

/**
 * Agent B: Google Search + URL Context grounded generation.
 * Fast (5-15 s), real web sources, good breadth.
 */
async function searchGroundedAgent(topic, teachingLevel, prompt, domain) {
  const searchHint = domain?.searchFocus ? `\n\nPrioritize sources: ${domain.searchFocus}.` : '';
  const t0 = Date.now();

  const result = await withRetryOnRateLimit(async () => {
    const model = getSearchAndUrlModel('standard');
    return model.generateContent(prompt + searchHint);
  });

  const text = result.response.text();
  if (!text || text.length < 300) throw new Error('Search agent: insufficient content');

  const { groundingUrls } = extractGroundingData(result);
  const sources = groundingUrls.filter(s => s.url);

  console.log(`[Search] OK: "${topic}" — ${text.length} chars, ${sources.length} sources in ${Date.now() - t0}ms`);
  return {
    text,
    sources,
    metadata: { topic, teachingLevel, format: 'topic', method: 'search-grounded', domain: domain?.key, generatedAt: new Date().toISOString() },
  };
}

/**
 * Agent C: Gemini Deep Research — most thorough, longer wait (30-90 s).
 */
async function deepResearchAgent(topic, teachingLevel, domain, timeoutMs = 90_000) {
  const domainHint = domain?.depthHint ? ` ${domain.depthHint}` : '';
  const t0 = Date.now();

  const deepResult = await runDeepResearch(
    `Research the topic "${topic}" thoroughly for a ${teachingLevel}-level student. ` +
    `Produce comprehensive study material: fundamentals, core concepts, worked examples, ` +
    `practical applications, and advanced considerations. ` +
    `Structure with clear markdown headings, bullet points, and examples. ` +
    `Target 5000-15000 words. Only cite trusted academic sources.${domainHint}`,
    { timeoutMs, pollIntervalMs: 6_000 },
  );

  if (!deepResult?.text || deepResult.text.length < 500) {
    throw new Error('Deep Research: insufficient content');
  }

  console.log(`[DeepResearch] OK: "${topic}" — ${deepResult.text.length} chars, ${deepResult.sources?.length || 0} sources in ${Date.now() - t0}ms`);
  return {
    text: deepResult.text,
    sources: deepResult.sources || [],
    metadata: { topic, teachingLevel, format: 'topic', method: 'deep-research', domain: domain?.key, generatedAt: new Date().toISOString() },
  };
}

/**
 * Agent D: Search for authoritative docs, then read them via URL Context.
 * Used for tech topics without a hardcoded OFFICIAL_DOCS entry.
 */
async function searchAndReadDocs(topic, teachingLevel, prompt, techName = null) {
  const label = techName || topic;
  const t0 = Date.now();

  const searchResult = await withRetryOnRateLimit(async () => {
    const model = getSearchGroundedModel('standard');
    return model.generateContent(
      `Find the official documentation and tutorials for "${label}". ` +
      `Return URLs of authoritative sources (.dev, .org, docs.*, MDN, official tutorials). ` +
      `List up to 8 URLs, one per line. Do NOT include random blogs.`,
    );
  });

  const { groundingUrls } = extractGroundingData(searchResult);
  const docUrls = groundingUrls.filter(g => g.url).map(g => g.url).slice(0, 6);
  if (docUrls.length === 0) throw new Error('Search found no documentation URLs');

  const urlList = docUrls.map(u => `- ${u}`).join('\n');
  const docPrompt = `${prompt}\n\nDOCUMENTATION SOURCES:\n${urlList}\n\nGenerate curriculum based on these docs.`;

  const genResult = await withRetryOnRateLimit(async () => {
    const model = getUrlContextModel('standard');
    return model.generateContent(docPrompt);
  });

  const text = genResult.response.text();
  if (!text || text.length < 300) throw new Error('Search-for-docs: insufficient content');

  const sources = docUrls.map(url => ({ title: `${label} Documentation`, url }));
  console.log(`[SearchDocs] OK: "${topic}" — ${text.length} chars in ${Date.now() - t0}ms`);
  return {
    text,
    sources,
    metadata: { topic, teachingLevel, format: 'topic', method: 'search-doc-grounded', generatedAt: new Date().toISOString() },
  };
}

// ─── Swarm Orchestrator ────────────────────────────────────────

/**
 * Academic Research Swarm:
 * Fires all agents in parallel — Deep Research (90 s cap), Domain URL, and Search.
 * Returns the best result ranked: deep > domain-url > search.
 * If any agent finishes with good content, others still run but the best wins at the end.
 */
async function academicResearchSwarm(topic, teachingLevel, basePrompt, domain) {
  const agentJobs = [
    { name: 'deep-research', priority: 1, run: () => deepResearchAgent(topic, teachingLevel, domain, 90_000) },
    ...(domain.urls?.length > 0
      ? [{ name: 'domain-url', priority: 2, run: () => domainUrlAgent(topic, teachingLevel, basePrompt, domain) }]
      : []),
    { name: 'search', priority: 3, run: () => searchGroundedAgent(topic, teachingLevel, basePrompt, domain) },
  ];

  console.log(`[ResearchSwarm] Launching ${agentJobs.length} agents for "${topic}" (${domain.name})`);

  const results = await Promise.allSettled(agentJobs.map(j => j.run()));

  const successful = agentJobs
    .map((job, i) => ({ job, res: results[i] }))
    .filter(({ res }) => res.status === 'fulfilled' && res.value?.text?.length >= 400)
    .sort((a, b) => a.job.priority - b.job.priority);

  if (successful.length === 0) {
    const errors = results.map((r, i) => `${agentJobs[i].name}: ${r.reason?.message || 'failed'}`).join('; ');
    throw new Error(`All agents failed for "${topic}": ${errors}`);
  }

  const winner = successful[0];
  console.log(`[ResearchSwarm] Winner: "${winner.job.name}" for "${topic}" (${winner.res.value.text.length} chars)`);
  return winner.res.value;
}

/**
 * Programming Research:
 * Doc-grounded → Search-for-docs → Search-grounded (sequential, each is fast).
 */
async function programmingResearch(topic, teachingLevel, basePrompt, docEntry) {
  if (docEntry) {
    const urls = (teachingLevel === 'dummy' || teachingLevel === 'beginner')
      ? [...(docEntry.tutorials || []).slice(0, 3), ...(docEntry.docs || []).slice(0, 2)]
      : [...(docEntry.docs || []).slice(0, 4), ...(docEntry.tutorials || []).slice(0, 1)];

    const selectedUrls = urls.slice(0, 5);
    const urlList = selectedUrls.map(u => `- ${u}`).join('\n');
    const docPrompt = `${basePrompt}\n\nOFFICIAL ${docEntry.name.toUpperCase()} DOCS:\n${urlList}\n\nBase your content on the official documentation above.`;

    try {
      const t0 = Date.now();
      const result = await withRetryOnRateLimit(async () => {
        const model = getUrlContextModel('standard');
        return model.generateContent(docPrompt);
      });
      const text = result.response.text();
      if (text && text.length >= 300) {
        const sources = selectedUrls.map(url => ({ title: `${docEntry.name} Official Documentation`, url }));
        console.log(`[OfficialDocs] OK: "${topic}" — ${text.length} chars in ${Date.now() - t0}ms`);
        return { text, sources, metadata: { topic, teachingLevel, format: 'topic', method: 'doc-grounded', officialDocs: docEntry.name, generatedAt: new Date().toISOString() } };
      }
    } catch (err) {
      console.warn(`[OfficialDocs] Failed for "${topic}": ${err.message}`);
    }
  }

  try {
    return await searchAndReadDocs(topic, teachingLevel, basePrompt, docEntry?.name);
  } catch (err) {
    console.warn(`[SearchDocs] Failed for "${topic}": ${err.message}`);
  }

  const domain = { key: 'programming', name: 'Programming', urls: [], searchFocus: 'official documentation, tutorials', depthHint: '' };
  return await searchGroundedAgent(topic, teachingLevel, basePrompt, domain);
}

// ─── Main Entry Point ─────────────────────────────────────────

/**
 * Research a topic and return structured study material.
 * Uses an in-memory cache (4 h TTL) to avoid redundant API calls.
 *
 * Routes to:
 *  - programmingResearch() for tech/code topics
 *  - academicResearchSwarm() for all other subjects (parallel agents)
 */
async function researchTopic(topic, userId = null) {
  const cacheKey = `topic:${topic.toLowerCase().trim()}`;

  // 1. In-memory cache (fastest — same worker, 4 h TTL)
  const cached = cacheGet(cacheKey);
  if (cached) {
    console.log(`[TopicResearch] In-memory cache hit for "${topic}"`);
    return { ...cached, metadata: { ...cached.metadata, fromCache: true } };
  }

  // 2. Shared cross-user DB cache (persists across workers / restarts)
  try {
    const sharedHit = await lookupTopicResearch(topic);
    if (sharedHit) {
      cacheSet(cacheKey, sharedHit); // warm local cache too
      return { ...sharedHit, metadata: { ...sharedHit.metadata, fromCache: true } };
    }
  } catch (err) {
    console.warn(`[TopicResearch] Shared cache lookup error (continuing): ${err.message}`);
  }

  const t0 = Date.now();
  const [teachingLevel, domain] = await Promise.all([
    getUserTeachingLevel(userId),
    Promise.resolve(detectSubjectDomain(topic)),
  ]);
  const basePrompt = buildTopicPrompt(topic, teachingLevel, domain);

  console.log(`[TopicResearch] Starting — topic: "${topic}", domain: ${domain.name}, level: ${teachingLevel}`);

  let result;
  if (domain.key === 'programming') {
    const docEntry = detectOfficialDocs(topic);
    result = await programmingResearch(topic, teachingLevel, basePrompt, docEntry);
  } else {
    result = await academicResearchSwarm(topic, teachingLevel, basePrompt, domain);
  }

  console.log(`[TopicResearch] Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — method: ${result.metadata?.method}`);

  // 3. Persist in shared DB cache (fire-and-forget) then warm local cache
  storeTopicResearch(topic, result).catch(() => {});
  cacheSet(cacheKey, result);
  return result;
}

module.exports = { researchTopic, detectOfficialDocs, detectSubjectDomain, OFFICIAL_DOCS, ACADEMIC_DOMAIN_REGISTRY };
