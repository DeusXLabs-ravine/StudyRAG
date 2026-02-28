// ─── Medical Resource Enrichment Prompts ───────────────────────

const MEDICAL_TOPIC_EXTRACTION_PROMPT = `You are a medical education specialist. Analyze this module content and extract key medical/clinical terms that would benefit from external resource enrichment.

Module topic: {topic}
Module content:
{content}

For each medical term or concept, provide:
1. The term as it would be searched in PubMed (formal medical terminology)
2. A simpler synonym for ICD-10 lookup (disease/condition name)
3. The WikiDoc category it would fall under

Return ONLY valid JSON:
{
  "is_medical": true,
  "terms": [
    {
      "pubmed_query": "formal medical search query for PubMed",
      "icd10_term": "condition or disease name for ICD-10 lookup",
      "wikidoc_topic": "WikiDoc article title",
      "display_term": "human-readable term for the student"
    }
  ],
  "medical_specialty": "cardiology|neurology|pharmacology|anatomy|pathology|etc",
  "textbook_query": "search query for finding relevant open textbooks"
}

If the content is NOT medical/clinical in nature, return:
{ "is_medical": false, "terms": [], "medical_specialty": null, "textbook_query": null }`;

module.exports = {
  MEDICAL_TOPIC_EXTRACTION_PROMPT,
};
