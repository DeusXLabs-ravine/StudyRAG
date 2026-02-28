const QUIZ_GENERATION_PROMPT = `You are an expert quiz creator for educational assessment.
The student's current teaching level is: {teaching_level}
Adjust question complexity accordingly:
- "dummy": Very basic recall questions, simple language, obvious distractors
- "beginner": Straightforward comprehension questions with clear wording
- "intermediate": Standard difficulty testing understanding and application
- "advanced": Challenging questions requiring analysis, synthesis, and critical thinking
{interests_section}
{learning_style_section}
{pace_section}

Based on the following study material, generate a quiz with {num_questions} questions.
Difficulty: {difficulty}
{quiz_depth_section}

Study material:
{context}

Create questions that test understanding, not just memorization.
Each question MUST include a "topic" field (1-3 words) identifying the subject area being tested.

SELF-CONTAINED QUESTIONS — CRITICAL RULE:
The student will NOT have the study material visible when answering these questions. Every question MUST be fully self-contained and answerable on its own. If a question involves a code snippet, formula, equation, data table, excerpt, diagram description, or any specific content from the material — you MUST embed it directly in the question text using markdown formatting (e.g. code blocks, LaTeX, tables). NEVER write phrases like "as described in the material", "the following code snippet", "according to the passage", "as discussed in the document", "in the study material", "the code above", or any wording that assumes the student can see the source. The question text alone must provide everything needed to answer it.

Return valid JSON:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Question text?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "A",
      "explanation": "Why this is correct...",
      "topic": "Topic Label"
    },
    {
      "type": "true_false",
      "question": "Statement?",
      "correct": "true",
      "explanation": "Explanation...",
      "topic": "Topic Label"
    }
  ]
}`;

const FLASHCARD_GENERATION_PROMPT = `You are creating educational flashcards from study materials.
The student's current teaching level is: {teaching_level}
Adjust flashcard complexity:
- "dummy": Very simple terms and definitions, use analogies on the back of cards
- "beginner": Clear, straightforward Q&A with helpful context
- "intermediate": Standard academic flashcards
- "advanced": Detailed, nuanced cards that cover edge cases and deeper understanding
{interests_section}
{learning_style_section}
{pace_section}

Study material:
{context}
{depth_section}

Generate {num_cards} flashcards covering the key concepts, terms, and facts.
Each flashcard should have:
- front: A question, term, or concept prompt
- back: The answer, definition, or explanation
- topic: A short topic label (1-3 words) for the subject area

SELF-CONTAINED RULE: Each flashcard must include all necessary context directly. If the front references a code snippet, formula, equation, or specific passage — include it directly in the front text. Do NOT write "as described in the material" or assume the student has the source visible. Each card must make sense entirely on its own.

Return valid JSON:
{
  "flashcards": [
    {
      "front": "What is...?",
      "back": "It is...",
      "topic": "Topic Label"
    }
  ]
}`;

const APTITUDE_TEST_PROMPT = `You are creating an aptitude assessment to determine a student's knowledge level and learning pace for a subject.

Subject area: {subject}

Create an aptitude test with 10 questions that progressively increase in difficulty:
- Questions 1-3: Basic recall and fundamental concepts (beginner level)
- Questions 4-6: Application and comprehension (intermediate level)
- Questions 7-8: Analysis and problem-solving (advanced level)
- Questions 9-10: Synthesis and evaluation (expert level)

Each question should clearly test understanding at its difficulty tier.

Return valid JSON:
{
  "test_name": "Aptitude Test: {subject}",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Question text?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "A",
      "explanation": "Why this is correct...",
      "difficulty_tier": "beginner|intermediate|advanced|expert",
      "topic": "{subject}"
    }
  ]
}`;

const QUESTION_REGENERATION_PROMPT = `You are an expert educator creating comprehension check questions for a learning module.
The student's current teaching level is: {teaching_level}
Adjust question complexity accordingly:
- "dummy": Very basic recall questions, simple language, obvious distractors
- "beginner": Straightforward comprehension questions with clear wording
- "intermediate": Standard difficulty testing understanding and application
- "advanced": Challenging questions requiring analysis, synthesis, and critical thinking

The student has already attempted questions on this material and needs a fresh set.
Generate DIFFERENT questions from the previous ones — do NOT repeat or rephrase the same questions.

Module content:
{module_content}
{quiz_depth_section}

Previous questions the student already saw (do NOT reuse these):
{previous_questions}

Create exactly 5 NEW comprehension check questions that:
- Test understanding of the same material but from different angles
- Use different question structures and focus on different details
- Include a "topic" field matching the module topic: {topic}
- SELF-CONTAINED: Each question must include all necessary context within its text. If referencing a code snippet, formula, data table, or specific example — embed it directly in the question. Do NOT write "as described above", "from the module", "in the material", or assume the student can see the source content. The question must stand completely on its own.

Return valid JSON:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Question text?",
      "options": ["A) Option A", "B) Option B", "C) Option C", "D) Option D"],
      "correct": "A",
      "explanation": "Why A is correct...",
      "topic": "{topic}"
    },
    {
      "type": "true_false",
      "question": "Statement to evaluate?",
      "correct": "true",
      "explanation": "Why this is true/false...",
      "topic": "{topic}"
    }
  ]
}`;

const REVISION_QUESTIONS_PROMPT = `You are an expert exam question predictor creating revision questions that are likely to appear on upcoming exams.
The student's current teaching level is: {teaching_level}
Adjust question complexity accordingly:
- "dummy": Basic recall, simple language, clear options
- "beginner": Comprehension-focused, straightforward wording
- "intermediate": Application and analysis, standard difficulty
- "advanced": Synthesis, evaluation, and critical thinking

Study Materials:
{study_content}

{analysis_section}

{weak_topics_section}
{quiz_depth_section}

Generate {num_questions} predicted exam questions that cover the most important topics. Prioritize topics that are:
1. High-weight in exam analysis (if available)
2. Identified as student weak areas
3. Core concepts from the study material

SELF-CONTAINED QUESTIONS — CRITICAL RULE:
The student will NOT have the study material visible when answering. Every question MUST be fully self-contained. If a question involves a code snippet, formula, equation, data table, excerpt, or any specific content — embed it directly in the question text using markdown formatting (e.g. code blocks, LaTeX, tables). NEVER write "as described in the material", "the following code", "according to the passage", or any phrasing that assumes access to the source. The question alone must provide everything needed to answer it.

Return valid JSON in this exact format:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Question text?",
      "options": ["A) Option A", "B) Option B", "C) Option C", "D) Option D"],
      "correct": "A",
      "explanation": "Detailed explanation of why this is correct and why other options are wrong",
      "topic": "Topic Label",
      "difficulty": "easy|medium|hard",
      "exam_likelihood": "high|medium|low"
    },
    {
      "type": "short_answer",
      "question": "Question requiring a brief written response?",
      "correct": "Model answer text",
      "explanation": "What a good answer should include and common pitfalls",
      "topic": "Topic Label",
      "difficulty": "easy|medium|hard",
      "exam_likelihood": "high|medium|low"
    },
    {
      "type": "true_false",
      "question": "Statement to evaluate as true or false?",
      "correct": "true",
      "explanation": "Why this statement is true/false with supporting detail",
      "topic": "Topic Label",
      "difficulty": "easy|medium|hard",
      "exam_likelihood": "high|medium|low"
    }
  ]
}`;

const PRACTICE_EXAM_PROMPT = `You are an expert exam creator generating a realistic timed practice exam.
The student's current teaching level is: {teaching_level}
Adjust question complexity accordingly:
- "dummy": Very basic recall questions, simple language, obvious distractors
- "beginner": Straightforward comprehension questions with clear wording
- "intermediate": Standard difficulty testing understanding and application
- "advanced": Challenging questions requiring analysis, synthesis, and critical thinking

This practice exam should simulate a real exam experience. Difficulty: {difficulty}
{quiz_depth_section}

Study Materials:
{study_content}

{analysis_section}

{weak_topics_section}

Generate exactly {num_questions} exam questions. If exam pattern analysis is available, mimic the detected question type distribution and topic weighting. Each question MUST include a "topic" field.

SELF-CONTAINED QUESTIONS — CRITICAL RULE:
The student will NOT have the study material visible during this exam. Every question MUST be fully self-contained. If a question involves a code snippet, formula, equation, data table, excerpt, or any specific content — embed it directly in the question text using markdown formatting (e.g. code blocks, LaTeX, tables). NEVER write "as described in the material", "the following code", "according to the passage", "as shown in the document", or any phrasing that assumes access to the source. The question alone must provide everything needed to answer it.

Return valid JSON:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Question text?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "A",
      "explanation": "Why this is correct...",
      "topic": "Topic Label"
    },
    {
      "type": "true_false",
      "question": "Statement?",
      "correct": "true",
      "explanation": "Explanation...",
      "topic": "Topic Label"
    }
  ]
}`;

module.exports = {
  QUIZ_GENERATION_PROMPT,
  FLASHCARD_GENERATION_PROMPT,
  APTITUDE_TEST_PROMPT,
  QUESTION_REGENERATION_PROMPT,
  REVISION_QUESTIONS_PROMPT,
  PRACTICE_EXAM_PROMPT,
};
