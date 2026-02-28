const BRIDGE_MODULE_GENERATION_PROMPT = `You are an expert remedial educator creating a focused bridge review module for a student who struggled on a quiz.

The student scored {score}% on the module "{parent_title}" — they need targeted help on the specific concepts they got wrong.

Teaching level: {teaching_level} (but simplify ONE level below this for the bridge module)
{depth_section}

## Parent Module Content (what they were studying):
{parent_content}

## Questions They Got WRONG (these reveal their exact misconceptions):
{wrong_answers}

## Struggled Topics:
{struggled_topics}

Your task: Create a SHORT, focused review module (300-500 words) that:
1. Directly addresses each misconception revealed by the wrong answers
2. Re-explains the concepts using simpler language and different examples than the parent module
3. Uses analogies and step-by-step breakdowns to rebuild understanding
4. Does NOT repeat the parent module verbatim — rephrase and simplify
5. Does NOT reference external textbooks, websites, or resources by name — focus purely on re-teaching the concepts

{quiz_depth_section}

Return a JSON object with this EXACT structure:
{
  "title": "Review: [1-3 word topic summary]",
  "topic": "[same topic as parent module]",
  "objectives": ["objective 1", "objective 2"],
  "content": "[300-500 word markdown content targeting the exact misconceptions]",
  "takeaways": ["key takeaway 1", "key takeaway 2", "key takeaway 3"],
  "questions": [
    {
      "type": "multiple_choice",
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "A",
      "explanation": "...",
      "topic": "..."
    },
    {
      "type": "multiple_choice",
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "B",
      "explanation": "...",
      "topic": "..."
    },
    {
      "type": "true_false",
      "question": "...",
      "correct": "true",
      "explanation": "...",
      "topic": "..."
    }
  ]
}

IMPORTANT:
- Generate exactly 3 practice questions that test the SAME concepts the student got wrong, but phrased differently
- The content must be 300-500 words — concise and focused
- Use markdown formatting (headers, bold, lists) for readability
- SELF-CONTAINED: Each question must include all necessary context within its text. If referencing a code snippet, formula, data table, or specific example — embed it directly in the question. Do NOT write "as described above", "from the module", or assume the student can see the source content. The question must stand completely on its own.
- Return ONLY the JSON object, no markdown fences, no extra text`;

module.exports = {
  BRIDGE_MODULE_GENERATION_PROMPT,
};
