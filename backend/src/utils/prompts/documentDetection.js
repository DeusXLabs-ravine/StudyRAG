const DOCUMENT_TYPE_DETECTION_PROMPT = `Analyze this document excerpt and classify its type. Return ONLY valid JSON:
{ "type": "syllabus|textbook|lecture_notes|problem_set|exam|general", "confidence": 0.0-1.0, "indicators": ["..."] }

Indicators for each type:
- syllabus: course schedule, grading policy, textbook list, instructor info, office hours, weekly topics
- problem_set/exam: numbered questions, point values, instructions like "answer all", "show your work", time limits
- textbook: chapters, detailed explanations, exercises at end of sections
- lecture_notes: slide-like structure, bullet points, speaker notes
- general: anything else

Document excerpt:
{document_text}`;

const SYLLABUS_EXTRACTION_PROMPT = `Extract structured data from this course syllabus. Return ONLY valid JSON:
{
  "courseTitle": "...",
  "description": "...",
  "textbooks": [{ "title": "...", "author": "...", "isbn": "...", "required": true }],
  "weeklyTopics": [{ "week": 1, "topic": "...", "readings": "..." }],
  "learningObjectives": ["..."]
}

Syllabus text:
{document_text}`;

const QA_CONTENT_PROCESSING_PROMPT = `This document contains questions (exam/problem set). For each question:
1. Identify the topic/concept being tested
2. Provide the correct answer with detailed explanation
3. Explain the underlying concept as a tutorial

Group by topic and return ONLY valid JSON:
{
  "topicGroups": [
    {
      "topic": "Topic Name",
      "tutorialContent": "Comprehensive markdown tutorial teaching the concepts tested by these questions. Include: concept explanation, worked examples, key principles, and common misconceptions. Target 300-500 words per topic.",
      "questions": [
        { "question": "Original question text", "answer": "Correct answer", "explanation": "Detailed explanation of why this is correct" }
      ]
    }
  ]
}

Document content:
{document_text}`;

module.exports = {
  DOCUMENT_TYPE_DETECTION_PROMPT,
  SYLLABUS_EXTRACTION_PROMPT,
  QA_CONTENT_PROCESSING_PROMPT,
};
