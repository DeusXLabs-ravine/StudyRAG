const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/database');
const { getGenerativeModel, withRetryOnRateLimit } = require('../config/gemini');
const { MEDICAL_TOPIC_EXTRACTION_PROMPT } = require('../utils/prompts');

// ─── Constants ────────────────────────────────────────────────

const NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const ICD10_BASE = 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search';
const WIKIDOC_API = 'https://www.wikidoc.org/api.php';
const OPEN_TEXTBOOKS_BASE = 'https://open.umn.edu/opentextbooks/textbooks.json';
const MSD_SEARCH_BASE = 'https://www.msdmanuals.com/professional/SearchResults';

// NCBI recommends an API key for higher rate limits (10/sec vs 3/sec).
// Reads from env; works without one at lower throughput.
const NCBI_API_KEY = process.env.NCBI_API_KEY || '';

// Delay between NCBI calls to respect rate limits (no API key = 3/sec)
const NCBI_DELAY_MS = NCBI_API_KEY ? 100 : 350;

// ─── Network Circuit Breaker ───────────────────────────────────
// After CIRCUIT_THRESHOLD consecutive fetch failures, stop trying for
// CIRCUIT_RESET_MS milliseconds. This prevents log spam when Railway
// can't reach NIH/NLM external APIs.
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_RESET_MS = 5 * 60 * 1000; // 5 minutes
const _circuit = { failures: 0, openUntil: 0 };

function isCircuitOpen() {
  if (_circuit.openUntil > Date.now()) return true;
  if (_circuit.openUntil > 0) {
    // Reset after cooldown
    _circuit.failures = 0;
    _circuit.openUntil = 0;
  }
  return false;
}

function recordCircuitFailure(label) {
  _circuit.failures++;
  if (_circuit.failures >= CIRCUIT_THRESHOLD) {
    _circuit.openUntil = Date.now() + CIRCUIT_RESET_MS;
    console.warn(`[MedResources] External API circuit open — NIH/NLM unreachable, pausing for ${CIRCUIT_RESET_MS / 60000}min`);
  } else {
    console.warn(`[MedResources] ${label} (failure ${_circuit.failures}/${CIRCUIT_THRESHOLD})`);
  }
}

function recordCircuitSuccess() {
  _circuit.failures = 0;
  _circuit.openUntil = 0;
}

// ─── Quick Medical Content Detection (keyword-based) ──────────

const MEDICAL_KEYWORDS = [
  'diagnosis', 'symptom', 'treatment', 'pathology', 'anatomy',
  'clinical', 'patient', 'disease', 'syndrome', 'therapeutic',
  'pharmacology', 'drug', 'medication', 'dosage', 'prognosis',
  'etiology', 'epidemiology', 'morbidity', 'mortality', 'chronic',
  'acute', 'benign', 'malignant', 'carcinoma', 'tumor', 'lesion',
  'biopsy', 'surgical', 'cardiac', 'pulmonary', 'hepatic', 'renal',
  'neurological', 'gastrointestinal', 'endocrine', 'hematology',
  'immunology', 'infection', 'antibiotic', 'vaccine', 'inflammation',
  'fracture', 'artery', 'vein', 'organ', 'tissue', 'cell',
  'receptor', 'enzyme', 'hormone', 'insulin', 'hemoglobin',
  'blood pressure', 'cholesterol', 'diabetes', 'hypertension',
  'asthma', 'pneumonia', 'tuberculosis', 'hiv', 'cancer',
  'stroke', 'seizure', 'anemia', 'arthritis', 'allergy',
  'physiology', 'histology', 'microbiology', 'biochemistry',
  'nursing', 'radiology', 'oncology', 'pediatrics', 'obstetrics',
  'dermatology', 'ophthalmology', 'psychiatry', 'orthopedic',
];

/**
 * Quick keyword-based check if text is likely medical content.
 * Returns a confidence score 0-1.
 */
function quickMedicalCheck(text) {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of MEDICAL_KEYWORDS) {
    if (lower.includes(kw)) hits++;
  }
  // Normalize: 5+ hits = high confidence, 2-4 = moderate, <2 = unlikely
  return Math.min(hits / 5, 1.0);
}

// ─── LLM-Based Medical Term Extraction ────────────────────────

function parseJsonResponse(text) {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Use Gemini to extract medical terms and determine if content is medical.
 */
async function extractMedicalTerms(topic, content) {
  const prompt = MEDICAL_TOPIC_EXTRACTION_PROMPT
    .replace('{topic}', topic)
    .replace('{content}', (content || '').slice(0, 6000));

  const result = await withRetryOnRateLimit(async () => {
    const model = getGenerativeModel('fast');
    return model.generateContent(prompt);
  });

  return parseJsonResponse(result.response.text());
}

// ─── NCBI PubMed E-Utilities ──────────────────────────────────

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Search PubMed for articles related to a query.
 * Returns up to `maxResults` article summaries with PMIDs, titles, and abstracts.
 */
async function searchPubMed(query, maxResults = 5) {
  const prefix = '[PubMed]';
  try {
    // Step 1: ESearch — get PMIDs
    const searchParams = new URLSearchParams({
      db: 'pubmed',
      term: query,
      retmax: String(maxResults),
      retmode: 'json',
      sort: 'relevance',
    });
    if (NCBI_API_KEY) searchParams.set('api_key', NCBI_API_KEY);

    const searchRes = await fetch(`${NCBI_BASE}/esearch.fcgi?${searchParams}`);
    if (!searchRes.ok) throw new Error(`ESearch HTTP ${searchRes.status}`);
    const searchData = await searchRes.json();
    const ids = searchData?.esearchresult?.idlist || [];

    if (ids.length === 0) return [];

    await sleep(NCBI_DELAY_MS);

    // Step 2: ESummary — get article details
    const summaryParams = new URLSearchParams({
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'json',
    });
    if (NCBI_API_KEY) summaryParams.set('api_key', NCBI_API_KEY);

    const summaryRes = await fetch(`${NCBI_BASE}/esummary.fcgi?${summaryParams}`);
    if (!summaryRes.ok) throw new Error(`ESummary HTTP ${summaryRes.status}`);
    const summaryData = await summaryRes.json();

    const articles = [];
    const result = summaryData?.result || {};
    for (const pmid of ids) {
      const article = result[pmid];
      if (!article) continue;

      const authors = (article.authors || [])
        .slice(0, 3)
        .map(a => a.name)
        .join(', ');

      articles.push({
        pmid,
        title: article.title || '',
        authors: authors + (article.authors?.length > 3 ? ' et al.' : ''),
        journal: article.fulljournalname || article.source || '',
        pubDate: article.pubdate || '',
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        snippet: article.title, // PubMed summaries don't include abstracts; title serves as snippet
      });
    }

    return articles;
  } catch (err) {
    console.warn(`${prefix} Search failed for "${query}": ${err.message}`);
    return [];
  }
}

// ─── ICD-10 Clinical Tables API ───────────────────────────────

/**
 * Look up ICD-10-CM codes for a medical term.
 * Returns matching codes with descriptions.
 */
async function lookupICD10(term, maxResults = 5) {
  try {
    // Request extra results so we have room to filter out sequela/subsequent codes
    const fetchCount = maxResults * 4;
    const params = new URLSearchParams({
      sf: 'code,name',
      terms: term,
      maxList: String(fetchCount),
      df: 'code,name',
    });

    const res = await fetch(`${ICD10_BASE}?${params}`);
    if (!res.ok) throw new Error(`ICD-10 HTTP ${res.status}`);
    const data = await res.json();

    // Response format: [totalCount, codes[], extraData{}, displayStrings[]]
    const totalCount = data[0] || 0;
    const codes = data[1] || [];
    const displayStrings = data[3] || [];

    if (totalCount === 0) return [];

    const all = displayStrings.map((display, i) => ({
      code: codes[i] || display[0],
      name: display[1] || display[0],
      displayString: `${codes[i] || ''} — ${display[1] || display[0]}`,
    }));

    // Prefer non-sequela (S suffix) and non-subsequent-encounter (D suffix) codes.
    // These are late-effect / follow-up billing codes — not useful for education.
    const preferred = all.filter(r => !/[SD]$/.test(r.code));
    const results = preferred.length > 0 ? preferred : all;
    return results.slice(0, maxResults);
  } catch (err) {
    console.warn(`[ICD-10] Lookup failed for "${term}": ${err.message}`);
    return [];
  }
}

// ─── WikiDoc MediaWiki API ────────────────────────────────────

/**
 * Fetch a WikiDoc article extract for a medical topic.
 * Returns the intro/summary text and URL.
 */
async function fetchWikiDocArticle(topic) {
  try {
    // Step 1: Search for the article — fetch a few candidates to pick the best match
    const searchParams = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: topic,
      srlimit: '5',
      format: 'json',
      origin: '*',
    });

    const searchRes = await fetch(`${WIKIDOC_API}?${searchParams}`);
    if (!searchRes.ok) throw new Error(`WikiDoc search HTTP ${searchRes.status}`);
    const searchData = await searchRes.json();
    const results = searchData?.query?.search || [];

    if (results.length === 0) return null;

    // Pick the result whose title has the most word overlap with the topic.
    // Falls back to first result if none match at all.
    const topicWords = new Set(topic.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    let bestResult = results[0];
    let bestScore = 0;
    for (const r of results) {
      const titleWords = r.title.toLowerCase().split(/\W+/);
      const overlap = titleWords.filter(w => topicWords.has(w)).length;
      if (overlap > bestScore) { bestScore = overlap; bestResult = r; }
    }

    const pageTitle = bestResult.title;

    // Step 2: Get article extract
    const extractParams = new URLSearchParams({
      action: 'query',
      titles: pageTitle,
      prop: 'extracts',
      exintro: '1',
      explaintext: '1',
      exsectionformat: 'plain',
      format: 'json',
      origin: '*',
    });

    const extractRes = await fetch(`${WIKIDOC_API}?${extractParams}`);
    if (!extractRes.ok) throw new Error(`WikiDoc extract HTTP ${extractRes.status}`);
    const extractData = await extractRes.json();

    const pages = extractData?.query?.pages || {};
    const page = Object.values(pages)[0];
    if (!page || page.missing !== undefined) return null;

    return {
      title: page.title,
      extract: (page.extract || '').slice(0, 1000),
      url: `https://www.wikidoc.org/index.php/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    };
  } catch (err) {
    console.warn(`[WikiDoc] Fetch failed for "${topic}": ${err.message}`);
    return null;
  }
}

// ─── MSD Manual (Link Generation) ─────────────────────────────

/**
 * Generate an MSD Manual Professional search URL for a topic.
 * No public API exists, so we provide a search link.
 */
function getMSDManualLink(topic) {
  const searchUrl = `https://www.msdmanuals.com/professional/SearchResults?query=${encodeURIComponent(topic)}`;
  return {
    title: `MSD Manual — ${topic}`,
    url: searchUrl,
    snippet: `Search MSD Manual Professional Edition for "${topic}" — comprehensive clinical reference.`,
  };
}

// ─── Open Textbook Library ────────────────────────────────────

/**
 * Search the Open Textbook Library for relevant textbooks.
 */
async function searchOpenTextbooks(query, maxResults = 3) {
  try {
    const searchUrl = `https://open.umn.edu/opentextbooks/textbooks.json?q=${encodeURIComponent(query)}&limit=${maxResults}`;
    const res = await fetch(searchUrl);

    if (!res.ok) {
      // Fallback: return a search link instead
      return [{
        title: `Open Textbook Library — Search: "${query}"`,
        url: `https://open.umn.edu/opentextbooks/textbooks?q=${encodeURIComponent(query)}`,
        snippet: 'Search the Open Textbook Library for free, peer-reviewed textbooks.',
        authors: '',
        subjects: [],
      }];
    }

    const data = await res.json();
    const raw = (Array.isArray(data) ? data : data.textbooks || []);

    if (raw.length === 0) {
      return [{
        title: `Open Textbook Library — Search: "${query}"`,
        url: `https://open.umn.edu/opentextbooks/textbooks?q=${encodeURIComponent(query)}`,
        snippet: 'Search the Open Textbook Library for free, peer-reviewed textbooks.',
        authors: '',
        subjects: [],
      }];
    }

    // Score each textbook by word overlap between the query and title+subjects.
    // This weeds out completely unrelated results that the API sometimes returns.
    const queryWords = new Set(query.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const scored = raw.map(tb => {
      const titleWords = (tb.title || '').toLowerCase().split(/\W+/);
      const subjectWords = (tb.subjects || [])
        .map(s => (typeof s === 'string' ? s : s.name || '')).join(' ')
        .toLowerCase().split(/\W+/);
      const overlap = [...titleWords, ...subjectWords].filter(w => queryWords.has(w)).length;
      return { tb, overlap };
    });
    scored.sort((a, b) => b.overlap - a.overlap);
    const textbooks = scored.slice(0, maxResults).map(s => s.tb);

    return textbooks.map(tb => ({
      title: tb.title || 'Untitled',
      url: tb.url || `https://open.umn.edu/opentextbooks/textbooks/${tb.id}`,
      snippet: (tb.description || '').slice(0, 300),
      authors: Array.isArray(tb.authors)
        ? tb.authors.map(a => typeof a === 'string' ? a : a.name).join(', ')
        : (tb.authors || ''),
      subjects: tb.subjects || [],
    }));
  } catch (err) {
    console.warn(`[OpenTextbooks] Search failed for "${query}": ${err.message}`);
    return [{
      title: `Open Textbook Library — Search: "${query}"`,
      url: `https://open.umn.edu/opentextbooks/textbooks?q=${encodeURIComponent(query)}`,
      snippet: 'Search the Open Textbook Library for free, peer-reviewed textbooks.',
      authors: '',
      subjects: [],
    }];
  }
}

// ─── Main Orchestrator ────────────────────────────────────────

/**
 * Enrich a module with medical resources from all available sources.
 * Returns the array of resource records created.
 *
 * @param {Object} opts
 * @param {string} opts.moduleId
 * @param {string} opts.documentId
 * @param {string} opts.topic
 * @param {string} opts.content
 * @param {string} opts.userId
 */
async function enrichModuleWithMedicalResources({ moduleId, documentId, topic, content, userId }) {
  const prefix = `[MedResources ${(moduleId || '').slice(0, 8)}]`;

  // Quick keyword check first (fast, no LLM call)
  const confidence = quickMedicalCheck(content || '');
  if (confidence < 0.2) {
    console.log(`${prefix} Skipping — content not medical (confidence: ${confidence.toFixed(2)})`);
    return [];
  }

  // LLM-based extraction for precise terms
  let extraction;
  try {
    extraction = await extractMedicalTerms(topic, content);
  } catch (err) {
    console.warn(`${prefix} LLM term extraction failed: ${err.message}`);
    return [];
  }

  if (!extraction.is_medical || !extraction.terms || extraction.terms.length === 0) {
    console.log(`${prefix} LLM says not medical — skipping`);
    return [];
  }

  console.log(`${prefix} Medical content detected (${extraction.medical_specialty}), ${extraction.terms.length} terms`);

  const allResources = [];

  // Process each medical term in parallel
  const termPromises = extraction.terms.slice(0, 5).map(async (term) => {
    const termResources = [];

    // 1. PubMed search
    if (!isCircuitOpen()) {
      try {
        const articles = await searchPubMed(term.pubmed_query, 3);
        recordCircuitSuccess();
        for (const article of articles) {
          termResources.push({
            source_type: 'pubmed',
            title: article.title,
            url: article.url,
            snippet: `${article.authors} — ${article.journal} (${article.pubDate})`,
            topic: term.display_term,
            extra_data: { pmid: article.pmid, journal: article.journal, authors: article.authors },
          });
        }
      } catch (err) {
        recordCircuitFailure(`PubMed failed for "${term.pubmed_query}": ${err.message}`);
      }
    }

    // 2. ICD-10 lookup
    if (term.icd10_term && !isCircuitOpen()) {
      try {
        const codes = await lookupICD10(term.icd10_term, 3);
        recordCircuitSuccess();
        for (const code of codes) {
          termResources.push({
            source_type: 'icd10',
            title: `ICD-10: ${code.code} — ${code.name}`,
            url: `https://www.icd10data.com/ICD10CM/Codes/${code.code}`,
            snippet: code.displayString,
            topic: term.display_term,
            extra_data: { icd10_code: code.code, icd10_name: code.name },
          });
        }
      } catch (err) {
        recordCircuitFailure(`ICD-10 failed for "${term.icd10_term}": ${err.message}`);
      }
    }

    // 3. WikiDoc article
    if (term.wikidoc_topic) {
      try {
        const article = await fetchWikiDocArticle(term.wikidoc_topic);
        if (article) {
          termResources.push({
            source_type: 'wikidoc',
            title: `WikiDoc: ${article.title}`,
            url: article.url,
            snippet: article.extract.slice(0, 300),
            topic: term.display_term,
            extra_data: { wikidoc_title: article.title },
          });
        }
      } catch (err) {
        console.warn(`${prefix} WikiDoc failed for "${term.wikidoc_topic}": ${err.message}`);
      }
    }

    return termResources;
  });

  const termResults = await Promise.allSettled(termPromises);
  for (const result of termResults) {
    if (result.status === 'fulfilled') {
      allResources.push(...result.value);
    }
  }

  // 4. MSD Manual link (one per module, based on main topic)
  const msdLink = getMSDManualLink(topic);
  allResources.push({
    source_type: 'msd_manual',
    title: msdLink.title,
    url: msdLink.url,
    snippet: msdLink.snippet,
    topic,
    extra_data: {},
  });

  // 5. Open Textbook search (one per module)
  if (extraction.textbook_query) {
    try {
      const textbooks = await searchOpenTextbooks(extraction.textbook_query, 2);
      for (const tb of textbooks) {
        allResources.push({
          source_type: 'open_textbook',
          title: tb.title,
          url: tb.url,
          snippet: tb.snippet,
          topic,
          extra_data: { authors: tb.authors, subjects: tb.subjects },
        });
      }
    } catch (err) {
      console.warn(`${prefix} Open Textbooks failed: ${err.message}`);
    }
  }

  // Deduplicate by URL
  const seen = new Set();
  const unique = allResources.filter(r => {
    if (!r.url) return true;
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  // Store in database
  if (unique.length > 0) {
    const rows = unique.map(r => ({
      id: uuidv4(),
      document_id: documentId,
      module_id: moduleId,
      topic: r.topic,
      source_type: r.source_type,
      title: r.title,
      url: r.url || null,
      snippet: r.snippet || null,
      extra_data: r.extra_data || {},
      user_id: userId || null,
    }));

    const { error } = await supabase.from('medical_resources').insert(rows);
    if (error) {
      console.error(`${prefix} DB insert failed: ${error.message}`);
    } else {
      console.log(`${prefix} Stored ${rows.length} medical resources`);
    }
  }

  return unique;
}

// ─── CRUD ─────────────────────────────────────────────────────

/**
 * Get all medical resources for a module.
 */
async function getMedicalResourcesByModule(moduleId) {
  const { data, error } = await supabase
    .from('medical_resources')
    .select('*')
    .eq('module_id', moduleId)
    .order('source_type', { ascending: true });
  if (error) throw error;
  return (data || []).map(formatMedicalResource);
}

/**
 * Get all medical resources for a document.
 */
async function getMedicalResourcesByDocument(docId) {
  const { data, error } = await supabase
    .from('medical_resources')
    .select('*')
    .eq('document_id', docId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(formatMedicalResource);
}

function formatMedicalResource(row) {
  return {
    id: row.id,
    documentId: row.document_id,
    moduleId: row.module_id,
    topic: row.topic,
    sourceType: row.source_type,
    title: row.title,
    url: row.url,
    snippet: row.snippet,
    extraData: row.extra_data,
    createdAt: row.created_at,
  };
}

module.exports = {
  quickMedicalCheck,
  extractMedicalTerms,
  searchPubMed,
  lookupICD10,
  fetchWikiDocArticle,
  getMSDManualLink,
  searchOpenTextbooks,
  enrichModuleWithMedicalResources,
  getMedicalResourcesByModule,
  getMedicalResourcesByDocument,
};
