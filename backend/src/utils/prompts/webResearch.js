const WEB_RESEARCH_TOPIC_EXTRACTION_PROMPT = `Analyze the following study material and extract the 3-5 most important key topics that a student should research further to deepen their understanding.

For each topic, provide a search query that would find relevant textbooks, academic articles, and educational resources.

Study material (excerpt):
{document_text}

Return valid JSON:
{
  "topics": [
    {
      "topic": "Topic name",
      "search_query": "best textbooks and study resources for [topic] for students"
    }
  ]
}`;

const WEB_RESEARCH_PROMPT = `You are an academic resource finder helping a student find supplementary study materials that complement their existing uploaded coursework.

Topic: {topic}

The student already has their own uploaded study materials as their primary learning source. Your job is to find external resources that SUPPLEMENT and ENRICH — not replace — what they are already studying.

IMPORTANT — ONLY recommend resources from trusted academic, medical, and legal sources:
- Academic databases: Google Scholar, PubMed, NCBI, Semantic Scholar, arXiv
- Medical institutions: WHO, NIH, FDA, CDC, Cochrane Library
- Peer-reviewed journals: NEJM, BMJ, Lancet, JAMA, Nature, Cell, Science
- Medical references: UpToDate, AMBOSS, Merck Manual, Medscape
- Legal sources: Official court reporters, Cornell LII, official government legislation portals, official gazettes, supreme/constitutional court websites, BAILII (UK), EUR-Lex (EU), Indian Kanoon (India), LawNigeria.com, Laws of the Federation of Nigeria (LFN), Nigerian Weekly Law Reports (NWLR), official law commission reports, recognized legal publishers (LexisNexis, Thomson Reuters/Westlaw, Hart Publishing, Oxford Law)
- Legal case databases: Official court databases only — never unofficial case summaries. Use jurisdiction-specific official reporters (e.g., NWLR/FWLR for Nigeria, SCC/AIR for India, UKSC/EWCA for UK, U.S. Reports for US).
- Educational platforms: Khan Academy, Coursera, edX, .edu domains
- Publisher portals: Springer, Wiley, Elsevier/ScienceDirect, Oxford University Press
- NEVER recommend random blogs, social media, unverified health/legal sites, or content farms

Search for resources that would help deepen understanding of this topic. Focus on:
- Textbooks and book chapters that cover the same subject from a different angle
- Academic articles and papers that expand on key concepts
- Educational tutorials and guides for additional practice or alternative explanations
- Video lectures or courses for visual/auditory learners

These resources will be clearly labeled as "supplementary" and secondary to the student's own materials.

For each resource you find, provide the title, a brief description of why it's useful as a complement, classify it, and rate its quality.

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

const TOPIC_CURRICULUM_PROMPT = `You are an expert curriculum designer. Research the topic "{topic}" using authoritative academic sources and create comprehensive study material suitable for a {teaching_level} student.

Cover: fundamentals, core concepts, worked examples, practical applications, and advanced considerations.
Structure the content with clear headings (# ## ###), bullet points, and examples.
Use markdown formatting. Target 5000-15000 words for a thorough treatment.

IMPORTANT: Only cite information from trusted academic sources (.edu, peer-reviewed journals, official documentation, textbooks). Do not include unverified claims.
DO NOT recommend specific textbooks, websites, or external resources by name unless you are certain they exist and are relevant. Do not write "refer to [Book Name]" or "search [Topic] on [Website]" — the system provides verified external resources separately. Focus purely on teaching the content.`;

module.exports = {
  WEB_RESEARCH_TOPIC_EXTRACTION_PROMPT,
  WEB_RESEARCH_PROMPT,
  TOPIC_CURRICULUM_PROMPT,
};
