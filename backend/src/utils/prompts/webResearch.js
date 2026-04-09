const WEB_RESEARCH_TOPIC_EXTRACTION_PROMPT = `Analyze the following study material and extract the 5-8 most important key topics that a student should research further to deepen their understanding.

For each topic, provide a search query that would find relevant textbooks, academic articles, and educational resources.

Study material (excerpt):
{document_text}

Return valid JSON:
{
  "topics": [
    {
      "topic": "Topic name",
      "search_query": "best academic textbooks and study resources for [topic] for students"
    }
  ]
}`;

const WEB_RESEARCH_PROMPT = `You are an academic resource finder helping a student find supplementary study materials that complement their existing uploaded coursework.

Topic: {topic}

The student already has their own uploaded study materials as their primary learning source. Your job is to find external resources that SUPPLEMENT and ENRICH — not replace — what they are already studying.

IMPORTANT — ONLY recommend resources from trusted academic sources appropriate to the subject:

Medical / Health Sciences:
- Academic databases: PubMed, NCBI, Semantic Scholar
- Medical institutions: WHO, NIH, FDA, CDC, Cochrane Library
- Peer-reviewed journals: NEJM, BMJ, Lancet, JAMA, Nature Medicine
- Medical references: UpToDate, AMBOSS, Merck Manual, Medscape

Law / Legal:
- Official court reporters and legislation portals, Cornell LII, EUR-Lex, BAILII
- Official government gazette databases, jurisdiction-specific official reporters
- Recognized legal publishers: LexisNexis, Thomson Reuters/Westlaw, Hart Publishing, Oxford Law
- Indian Kanoon, LawNigeria.com, Laws of the Federation (LFN), NWLR for Nigeria

Mathematics / Sciences / Engineering:
- arXiv (preprints), MathWorld, NIST Digital Library of Mathematical Functions
- OpenStax (open textbooks), MIT OpenCourseWare, Khan Academy
- Journal publishers: Springer, Wiley, Elsevier/ScienceDirect, AMS, IEEE Xplore

Humanities / Social Sciences / History:
- JSTOR, Project MUSE, Google Scholar for peer-reviewed articles
- University press publishers: Oxford, Cambridge, Princeton, Harvard
- OpenStax social sciences, Khan Academy Humanities, Stanford Encyclopedia of Philosophy

Economics / Business:
- NBER (National Bureau of Economic Research), SSRN
- IMF, World Bank, OECD data and working papers
- Harvard Business Review, MIT Sloan Management Review

Programming / Computer Science:
- Official documentation sites (.dev, .org, docs.*)
- MDN Web Docs, W3Schools, official language/framework tutorials
- IEEE Xplore, ACM Digital Library for research papers

General Academic (all subjects):
- Educational platforms: Khan Academy, Coursera, edX, .edu domains
- Open textbooks: OpenStax, Open Textbook Library, Project Gutenberg (classics)
- NEVER recommend random blogs, social media, unverified sites, or content farms

Search for resources that help deepen understanding of this topic. Focus on:
- Textbooks and book chapters covering the same subject from a different angle
- Academic articles and papers that expand on key concepts
- Educational tutorials and guides for additional practice or alternative explanations
- Video lectures or courses for visual/auditory learners

These resources will be clearly labeled as "supplementary" and secondary to the student's own materials.

Return valid JSON:
{
  "resources": [
    {
      "title": "Resource Title",
      "snippet": "Brief description of why this resource is useful as a supplement for studying this topic",
      "resource_type": "book|article|textbook|video|tutorial|guide",
      "quality": "trusted|acceptable|unverified"
    }
  ]
}`;

/**
 * Base curriculum prompt used by all research strategies.
 * Accepts a domain object to inject subject-specific depth guidance.
 *
 * @param {string} topic
 * @param {string} teachingLevel
 * @param {object|null} domain - { name, depthHint, searchFocus }
 * @returns {string}
 */
function buildTopicPrompt(topic, teachingLevel, domain = null) {
  const domainSection = domain?.depthHint
    ? `\n\nSUBJECT-SPECIFIC GUIDANCE (${domain.name}): ${domain.depthHint}`
    : '';

  return `You are an expert curriculum designer and subject matter expert. Research the topic "${topic}" using authoritative academic sources and create comprehensive study material suitable for a ${teachingLevel} student.

Cover ALL of the following where relevant:
- Fundamentals and core definitions
- Key concepts, principles, and theories
- Step-by-step worked examples (quantitative or qualitative as appropriate)
- Practical applications and real-world relevance
- Common misconceptions and how to avoid them
- Advanced considerations and current developments
${domainSection}

Structure the content with clear headings (# ## ###), sub-headings, bullet points, numbered lists, and tables where helpful.
Use markdown formatting throughout. Target 5000-15000 words for a thorough treatment — do not truncate.

IMPORTANT:
- Only use information from trusted academic sources (.edu, peer-reviewed journals, official documentation, authoritative textbooks).
- Do NOT recommend specific external resources, websites, or textbooks by name unless you are certain they exist and are directly relevant — the system provides verified external resources separately.
- Do not write phrases like "refer to [Book Name]" or "visit [Website]". Focus entirely on teaching the content.
- Do not include a reference list or bibliography section.`;
}

// Keep backward compatibility — static version used by some controllers that
// have not yet been migrated to buildTopicPrompt().
const TOPIC_CURRICULUM_PROMPT = buildTopicPrompt('{topic}', '{teaching_level}', null);

module.exports = {
  WEB_RESEARCH_TOPIC_EXTRACTION_PROMPT,
  WEB_RESEARCH_PROMPT,
  TOPIC_CURRICULUM_PROMPT,
  buildTopicPrompt,
};
