/**
 * Barrel re-export for all prompt constants and helper functions.
 * Individual prompts are organized in the prompts/ directory by domain.
 *
 * All existing `require('../utils/prompts')` calls continue to work unchanged.
 */

const { MODULE_GENERATION_PROMPT, MODULE_OUTLINE_PROMPT, MODULE_BATCH_GENERATION_PROMPT, INTRO_MODULE_PROMPT } = require('./prompts/moduleGeneration');
const { QUIZ_GENERATION_PROMPT, FLASHCARD_GENERATION_PROMPT, APTITUDE_TEST_PROMPT, QUESTION_REGENERATION_PROMPT, REVISION_QUESTIONS_PROMPT, PRACTICE_EXAM_PROMPT } = require('./prompts/quizAssessment');
const { WEB_RESEARCH_TOPIC_EXTRACTION_PROMPT, WEB_RESEARCH_PROMPT, TOPIC_CURRICULUM_PROMPT, buildTopicPrompt } = require('./prompts/webResearch');
const { SOLVER_PROMPT, SOLVER_FOLLOWUP_PROMPT } = require('./prompts/solver');
const { EXAM_PATTERN_ANALYSIS_PROMPT, STUDY_GUIDE_GENERATION_PROMPT } = require('./prompts/examPrep');
const { EXPLAIN_SIMPLY_PROMPT, TUTOR_GREETING_PROMPT, TUTOR_CHAT_PROMPT } = require('./prompts/tutor');
const { DIAGRAM_DETECTION_PROMPT, DIAGRAM_ANALYSIS_PROMPT, DIAGRAM_SIMPLIFY_PROMPT, DIAGRAM_GENERATION_PROMPT, D2_DIAGRAM_GENERATION_PROMPT, DIAGRAM_TYPE_SELECTOR_PROMPT, buildDiagramInterestsSection } = require('./prompts/diagrams');
const { DOCUMENT_TYPE_DETECTION_PROMPT, SYLLABUS_EXTRACTION_PROMPT, QA_CONTENT_PROCESSING_PROMPT } = require('./prompts/documentDetection');
const { CROSS_DOCUMENT_OUTLINE_PROMPT, CROSS_DOCUMENT_MODULE_PROMPT } = require('./prompts/crossDocument');
const { MEDICAL_TOPIC_EXTRACTION_PROMPT } = require('./prompts/medical');
const { GAME_GENERATION_PROMPT, SIMULATION_GENERATION_PROMPT } = require('./prompts/games');
const { BRIDGE_MODULE_GENERATION_PROMPT } = require('./prompts/bridge');
const { buildInterestsSection, buildLearningStyleSection, buildPaceSection, buildLegalGroundingSection } = require('./prompts/helpers');
const { getModuleDepthSection, getQuizDepthSection, getTutorDepthSection } = require('./prompts/depthRouter');
const { PEDAGOGY_CORE, BACKWARD_DESIGN_BLOCK, RETRIEVAL_PRACTICE_BLOCK, QUIZ_HYGIENE_BLOCK, buildMissionSection, buildLearnerStateSection, buildFocusSection, buildInterleavingSection } = require('./prompts/pedagogy');

module.exports = {
  // Module generation
  MODULE_GENERATION_PROMPT,
  MODULE_OUTLINE_PROMPT,
  MODULE_BATCH_GENERATION_PROMPT,
  INTRO_MODULE_PROMPT,

  // Quiz & assessment
  QUIZ_GENERATION_PROMPT,
  FLASHCARD_GENERATION_PROMPT,
  APTITUDE_TEST_PROMPT,
  QUESTION_REGENERATION_PROMPT,
  REVISION_QUESTIONS_PROMPT,
  PRACTICE_EXAM_PROMPT,

  // Web research & topic curriculum
  WEB_RESEARCH_TOPIC_EXTRACTION_PROMPT,
  WEB_RESEARCH_PROMPT,
  TOPIC_CURRICULUM_PROMPT,
  buildTopicPrompt,

  // Problem solver
  SOLVER_PROMPT,
  SOLVER_FOLLOWUP_PROMPT,

  // Exam preparation
  EXAM_PATTERN_ANALYSIS_PROMPT,
  STUDY_GUIDE_GENERATION_PROMPT,

  // Tutor
  EXPLAIN_SIMPLY_PROMPT,
  TUTOR_GREETING_PROMPT,
  TUTOR_CHAT_PROMPT,

  // Diagrams
  DIAGRAM_DETECTION_PROMPT,
  DIAGRAM_ANALYSIS_PROMPT,
  DIAGRAM_SIMPLIFY_PROMPT,
  DIAGRAM_GENERATION_PROMPT,
  D2_DIAGRAM_GENERATION_PROMPT,
  DIAGRAM_TYPE_SELECTOR_PROMPT,
  buildDiagramInterestsSection,

  // Document detection
  DOCUMENT_TYPE_DETECTION_PROMPT,
  SYLLABUS_EXTRACTION_PROMPT,
  QA_CONTENT_PROCESSING_PROMPT,

  // Cross-document
  CROSS_DOCUMENT_OUTLINE_PROMPT,
  CROSS_DOCUMENT_MODULE_PROMPT,

  // Medical
  MEDICAL_TOPIC_EXTRACTION_PROMPT,

  // Games & simulation
  GAME_GENERATION_PROMPT,
  SIMULATION_GENERATION_PROMPT,

  // Bridge module
  BRIDGE_MODULE_GENERATION_PROMPT,

  // Helper functions
  buildInterestsSection,
  buildLearningStyleSection,
  buildPaceSection,
  buildLegalGroundingSection,

  // Depth router
  getModuleDepthSection,
  getQuizDepthSection,
  getTutorDepthSection,

  // Pedagogy (shared across every model — Gemini and DeepSeek alike)
  PEDAGOGY_CORE,
  BACKWARD_DESIGN_BLOCK,
  RETRIEVAL_PRACTICE_BLOCK,
  QUIZ_HYGIENE_BLOCK,
  buildMissionSection,
  buildLearnerStateSection,
  buildFocusSection,
  buildInterleavingSection,
};
