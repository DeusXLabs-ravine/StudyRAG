// ─── Medical Resource Enrichment Prompts ───────────────────────

const MEDICAL_TOPIC_EXTRACTION_PROMPT = `Analyze this educational module and determine whether it is primarily medical or clinical in nature (healthcare, medicine, nursing, pharmacology, anatomy, physiology for clinical practice, etc.).

Be strict: content about computers, software, mathematics, physics, history, economics, language, law, or other non-healthcare subjects is NOT medical — even if it uses words like "cell", "system", "network", or "organ" in a non-clinical sense.

Module topic: {topic}
Module content:
{content}

If the content IS genuinely medical/clinical:
- Extract the key clinical terms that would benefit from PubMed, ICD-10, or WikiDoc references
- For each term, provide the PubMed search query, ICD-10 condition name (use primary/acute form only — NOT sequela or late effect), and WikiDoc article title

Return ONLY valid JSON. Examples of non-medical content: "operating systems", "data structures", "photosynthesis", "world history", "supply chain management".

If medical:
{
  "is_medical": true,
  "terms": [
    {
      "pubmed_query": "formal medical search query",
      "icd10_term": "primary acute condition name for ICD-10",
      "wikidoc_topic": "WikiDoc article title",
      "display_term": "human-readable term for the student"
    }
  ],
  "medical_specialty": "cardiology|neurology|pharmacology|anatomy|pathology|etc",
  "textbook_query": "search query for medical textbooks"
}

If NOT medical:
{ "is_medical": false, "terms": [], "medical_specialty": null, "textbook_query": null }`;

module.exports = {
  MEDICAL_TOPIC_EXTRACTION_PROMPT,
};
