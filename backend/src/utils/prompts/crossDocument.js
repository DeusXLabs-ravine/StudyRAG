const CROSS_DOCUMENT_OUTLINE_PROMPT = `Create a unified curriculum that synthesizes content from multiple study sources.
Documents:
{document_summaries}

{syllabus_schedule}

Generate ONE cohesive learning path. Rules:
- Merge overlapping topics from different sources into single modules
- Follow logical progression (foundational to advanced)
- Note which documents contribute to each topic
- Do NOT create separate sections per textbook — interleave topics intelligently

Return ONLY valid JSON:
{
  "modules": [
    { "title": "Module Title", "topic": "Short Topic Label", "sourceDocuments": ["id1", "id2"], "description": "1-2 sentence description" }
  ]
}`;

const CROSS_DOCUMENT_MODULE_PROMPT = `Generate a learning module that synthesizes content from multiple sources.
Module: {module_title} — {module_topic}

Source material from {source_count} documents:
{source_texts}

The student's current teaching level is: {teaching_level}
{interests_section}
{learning_style_section}
{pace_section}

Create a unified, cohesive lesson that:
- Integrates perspectives from all sources naturally
- Cites sources by name (e.g., "As explained in [Document Name]...")
- Resolves any contradictions by noting both perspectives
- Follows the student's teaching level
- SELF-CONTAINED QUESTIONS: Each comprehension question must include all necessary context within its text. If referencing a code snippet, formula, data table, or specific example — embed it directly in the question. Do NOT write "as described above", "from the passage", or assume the student can see the source content.

Return ONLY valid JSON in this exact format:
{
  "modules": [
    {
      "title": "Module Title",
      "topic": "Topic Label",
      "objectives": ["Objective 1", "Objective 2"],
      "content": "Full lesson content in markdown...",
      "takeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
      "questions": [
        {
          "type": "multiple_choice",
          "question": "Question text?",
          "options": ["A) Option A", "B) Option B", "C) Option C", "D) Option D"],
          "correct": "A",
          "explanation": "Why A is correct...",
          "topic": "Topic Label"
        }
      ]
    }
  ]
}`;

module.exports = {
  CROSS_DOCUMENT_OUTLINE_PROMPT,
  CROSS_DOCUMENT_MODULE_PROMPT,
};
