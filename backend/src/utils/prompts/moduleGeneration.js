const MODULE_GENERATION_PROMPT = `You are an expert educator creating structured learning modules from study materials.
The student's current teaching level is: {teaching_level}
Adjust your content complexity, vocabulary, and examples accordingly:
- "dummy": Use extremely simple language, lots of real-world analogies, step-by-step breakdowns, avoid jargon
- "beginner": Use simple language with clear definitions for technical terms, include many examples
- "intermediate": Standard academic language, balanced depth, some assumed background knowledge
- "advanced": Technical and detailed, assume strong foundational knowledge, include nuances and edge cases
{interests_section}
{learning_style_section}
{pace_section}

Given the following document content, create a set of logical learning modules that cover all the key topics.
This content was provided by the student as their study material. It is the AUTHORITATIVE source of truth for generating modules. Do not contradict it with outside knowledge.
If the content contains questions (with or without answers), treat them as practice/review material — generate modules that teach the concepts being tested, and provide correct answers with explanations grounded in the source material and trusted academic knowledge.
{legal_grounding_section}
{depth_section}

Document content:
{document_text}

Create learning modules following these rules:
- Each module covers ONE coherent topic/concept
- Modules follow a natural progression (basic → advanced)
- Each module should be self-contained but build on previous knowledge
- DO NOT reference external textbooks, websites, or resources by name (e.g. "refer to Harrison's Principles" or "search X in PubMed") unless they are explicitly mentioned in the source material. The system handles external resources separately — inventing resource names misleads the student.

For each module, provide:
1. title: Clear, descriptive module name
2. topic: A short topic label (1-3 words) for this module's subject area
3. objectives: 2-3 specific learning goals
4. content: Focused explanation ({content_word_range}) with:
   - Introduction to the concept
   - Clear explanation with one or two examples
   - Key points highlighted
5. takeaways: 2-3 bullet points summarizing main ideas
6. questions: 5 comprehension check questions with:
   - Mix of types: multiple_choice, true_false
   - Correct answers and explanations
   - Each question should have a "topic" field matching the module topic
   - SELF-CONTAINED: Each question must include all necessary context within its text. If referencing a code snippet, formula, data table, or specific example — embed it directly in the question. Do NOT write "as described above", "from the passage", "in the material", or assume the student has the content visible. The question must stand completely on its own.
{quiz_depth_section}

Return valid JSON in this exact format:
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
        },
        {
          "type": "true_false",
          "question": "Statement to evaluate?",
          "correct": "true",
          "explanation": "Why this is true/false...",
          "topic": "Topic Label"
        }
      ]
    }
  ]
}`;

const MODULE_OUTLINE_PROMPT = `You are an expert curriculum designer creating a comprehensive module outline from study materials.
The student's current teaching level is: {teaching_level}
{interests_section}
{learning_style_section}
{pace_section}

Analyze the following document content and create a detailed outline of ALL topics that should be covered as individual learning modules.
{legal_grounding_section}
{depth_section}

CRITICAL GUIDELINES:
- This text contains approximately {word_count} words
- You MUST create approximately {target_modules} modules (at minimum {min_modules})
- One module per distinct topic, concept, or subject area — do NOT merge unrelated topics into one module
- Modules should follow a natural learning progression (foundational → advanced)
- Be thorough: every significant topic in the text MUST have its own module
- Do NOT skip content or combine multiple distinct topics into one module just to keep the count low
- If in doubt, create MORE modules rather than fewer — granular is better than skipping content

Document content:
{document_text}

Return ONLY valid JSON in this exact format:
{
  "modules": [
    {
      "title": "Module Title",
      "topic": "Short Topic Label (1-3 words)",
      "description": "1-2 sentence description of what this module covers"
    }
  ]
}`;

const MODULE_BATCH_GENERATION_PROMPT = `You are an expert educator creating structured learning modules from study materials.
The student's current teaching level is: {teaching_level}
Adjust your content complexity, vocabulary, and examples accordingly:
- "dummy": Use extremely simple language, lots of real-world analogies, step-by-step breakdowns, avoid jargon
- "beginner": Use simple language with clear definitions for technical terms, include many examples
- "intermediate": Standard academic language, balanced depth, some assumed background knowledge
- "advanced": Technical and detailed, assume strong foundational knowledge, include nuances and edge cases
{interests_section}
{learning_style_section}
{pace_section}

You are generating specific learning modules from a pre-planned curriculum outline.
This content was provided by the student as their study material. It is the AUTHORITATIVE source of truth. Do not contradict it.
If the content contains questions (with or without answers), treat them as practice/review material — generate modules that teach the concepts being tested, and provide correct answers with explanations grounded in the source material and trusted academic knowledge.
DO NOT reference external textbooks, websites, or resources by name (e.g. "refer to Harrison's Principles" or "search X in PubMed") unless they are explicitly mentioned in the source material. The system handles external resources separately — inventing resource names misleads the student.
{legal_grounding_section}
{depth_section}

SOURCE MATERIAL:
{document_text}

FULL CURRICULUM OUTLINE (all planned modules for this section):
{full_outline}

YOUR TASK: Generate ONLY these specific modules:
{batch_modules}

For each module listed above, provide:
1. title: Use the title from the outline above
2. topic: Use the topic from the outline above
3. objectives: 2-3 specific learning goals
4. content: Focused explanation ({content_word_range}) with:
   - Introduction to the concept
   - Clear explanation with one or two examples
   - Key points highlighted
5. takeaways: 2-3 bullet points summarizing main ideas
6. questions: 5 comprehension check questions with:
   - Mix of types: multiple_choice, true_false
   - Correct answers and explanations
   - Each question should have a "topic" field matching the module topic
   - SELF-CONTAINED: Each question must include all necessary context within its text. If referencing a code snippet, formula, data table, or specific example — embed it directly in the question. Do NOT write "as described above", "from the passage", "in the material", or assume the student has the content visible. The question must stand completely on its own.
{quiz_depth_section}

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
        },
        {
          "type": "true_false",
          "question": "Statement to evaluate?",
          "correct": "true",
          "explanation": "Why this is true/false...",
          "topic": "Topic Label"
        }
      ]
    }
  ]
}`;

module.exports = {
  MODULE_GENERATION_PROMPT,
  MODULE_OUTLINE_PROMPT,
  MODULE_BATCH_GENERATION_PROMPT,
};
