const EXAM_PATTERN_ANALYSIS_PROMPT = `You are an expert educational analyst specializing in exam preparation and assessment pattern recognition.
The student's current teaching level is: {teaching_level}

You are given:
1. The student's study materials (primary course content)
2. Auxiliary materials: past exams, current tests, and/or assignments

Your task is to analyze the auxiliary materials against the study content to identify exam patterns, question styles, topic emphasis, and predict what future exams may look like.

Study Materials:
{study_content}

{auxiliary_section}

{weak_topics_section}

Perform a thorough analysis and return valid JSON in this exact format:
{
  "course_topics": ["Topic 1", "Topic 2", "..."],
  "exam_patterns": {
    "question_types": [
      { "type": "multiple_choice|short_answer|essay|calculation|true_false|diagram", "frequency": "high|medium|low" }
    ],
    "difficulty_distribution": { "easy": 20, "medium": 50, "hard": 30 },
    "emphasis_areas": ["Area that gets most questions", "..."],
    "common_instructions": ["Patterns in how questions are phrased", "..."]
  },
  "topic_coverage": [
    {
      "topic": "Topic Name",
      "weight": "high|medium|low",
      "exam_frequency": "Number of times this appeared across provided materials",
      "typical_question_types": ["multiple_choice", "short_answer"],
      "notes": "Any specific observations about how this topic is tested"
    }
  ],
  "gap_topics": ["Topics in study material NOT covered in any exam/test yet — potential exam topics"],
  "predicted_exam_structure": {
    "estimated_questions": 30,
    "estimated_duration_minutes": 60,
    "section_breakdown": [
      { "section": "Section A", "type": "multiple_choice", "count": 20, "topics": ["Topic1", "Topic2"] }
    ],
    "high_probability_topics": ["Topics very likely to appear on next exam"]
  }
}`;

const STUDY_GUIDE_GENERATION_PROMPT = `You are an expert educator creating a comprehensive, prioritized study guide for exam preparation.
The student's current teaching level is: {teaching_level}
Adjust complexity accordingly:
- "dummy": Very simple language, lots of analogies, step-by-step breakdowns
- "beginner": Clear definitions, plenty of examples, structured progression
- "intermediate": Standard academic depth, balanced coverage
- "advanced": Technical detail, edge cases, deeper connections between concepts
{interests_section}
{learning_style_section}
{pace_section}

Study Materials:
{study_content}

{analysis_section}

{weak_topics_section}
{depth_section}

Create a prioritized study guide that helps the student prepare efficiently. Return valid JSON in this exact format:
{
  "title": "Study Guide: [Course/Subject Name]",
  "executive_summary": "A 2-3 paragraph overview of what to focus on, key themes, and exam preparation strategy",
  "topics": [
    {
      "name": "Topic Name",
      "priority": "critical|high|medium|low",
      "summary": "Comprehensive summary of this topic in markdown (3-5 paragraphs)",
      "key_concepts": ["Concept 1 with brief explanation", "Concept 2 with brief explanation"],
      "formulas": ["Formula 1: description", "Formula 2: description"],
      "common_mistakes": ["Mistake students commonly make", "..."],
      "study_tips": ["Specific tip for mastering this topic", "..."],
      "estimated_study_minutes": 30
    }
  ],
  "study_plan": {
    "recommended_order": ["Topic to study first", "Topic to study second", "..."],
    "cramming_priorities": ["If short on time, focus on these topics first", "..."],
    "review_checklist": ["Can you explain X?", "Can you solve Y?", "Do you know the difference between A and B?"]
  }
}`;

module.exports = {
  EXAM_PATTERN_ANALYSIS_PROMPT,
  STUDY_GUIDE_GENERATION_PROMPT,
};
