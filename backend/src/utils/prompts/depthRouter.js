/**
 * Depth Router — Dynamically routes to the appropriate subject-specific prompt file
 * based on detected subject domain from subjectDetector.
 *
 * Supports 22 academic domains. For each recognized domain, returns thorough,
 * in-depth prompt sections. For unrecognized domains: returns empty strings
 * (preserving the current generic behavior).
 *
 * Each subject prompt file exports 3 functions:
 *   build<Subject>DepthSection(subdisciplines)      → module generation depth
 *   build<Subject>QuizDepthSection(subdisciplines)   → quiz/question depth
 *   build<Subject>TutorDepthSection(subdisciplines)  → tutor chat depth
 */

const { detectSubjectDomain } = require('../subjectDetector');

// ─── Domain → prompt file mapping ──────────────────────────────
// Each entry: [fileName, depthFn, quizFn, tutorFn]
const DOMAIN_MAP = {
  law:                   { file: './lawPrompts',                depth: 'buildLawDepthSection',                quiz: 'buildLawQuizDepthSection',                tutor: 'buildLawTutorDepthSection' },
  engineering:           { file: './engineeringPrompts',        depth: 'buildEngineeringDepthSection',        quiz: 'buildEngineeringQuizDepthSection',        tutor: 'buildEngineeringTutorDepthSection' },
  medicine:              { file: './medicinePrompts',           depth: 'buildMedicineDepthSection',           quiz: 'buildMedicineQuizDepthSection',           tutor: 'buildMedicineTutorDepthSection' },
  computer_science:      { file: './computerSciencePrompts',    depth: 'buildComputerScienceDepthSection',    quiz: 'buildComputerScienceQuizDepthSection',    tutor: 'buildComputerScienceTutorDepthSection' },
  mathematics:           { file: './mathematicsPrompts',        depth: 'buildMathematicsDepthSection',        quiz: 'buildMathematicsQuizDepthSection',        tutor: 'buildMathematicsTutorDepthSection' },
  physics:               { file: './physicsPrompts',            depth: 'buildPhysicsDepthSection',            quiz: 'buildPhysicsQuizDepthSection',            tutor: 'buildPhysicsTutorDepthSection' },
  chemistry:             { file: './chemistryPrompts',          depth: 'buildChemistryDepthSection',          quiz: 'buildChemistryQuizDepthSection',          tutor: 'buildChemistryTutorDepthSection' },
  biology:               { file: './biologyPrompts',            depth: 'buildBiologyDepthSection',            quiz: 'buildBiologyQuizDepthSection',            tutor: 'buildBiologyTutorDepthSection' },
  economics:             { file: './economicsPrompts',          depth: 'buildEconomicsDepthSection',          quiz: 'buildEconomicsQuizDepthSection',          tutor: 'buildEconomicsTutorDepthSection' },
  accounting:            { file: './accountingPrompts',         depth: 'buildAccountingDepthSection',         quiz: 'buildAccountingQuizDepthSection',         tutor: 'buildAccountingTutorDepthSection' },
  psychology:            { file: './psychologyPrompts',         depth: 'buildPsychologyDepthSection',         quiz: 'buildPsychologyQuizDepthSection',         tutor: 'buildPsychologyTutorDepthSection' },
  nursing:               { file: './nursingPrompts',            depth: 'buildNursingDepthSection',            quiz: 'buildNursingQuizDepthSection',            tutor: 'buildNursingTutorDepthSection' },
  pharmacy:              { file: './pharmacyPrompts',           depth: 'buildPharmacyDepthSection',           quiz: 'buildPharmacyQuizDepthSection',           tutor: 'buildPharmacyTutorDepthSection' },
  business:              { file: './businessPrompts',           depth: 'buildBusinessDepthSection',           quiz: 'buildBusinessQuizDepthSection',           tutor: 'buildBusinessTutorDepthSection' },
  political_science:     { file: './politicalSciencePrompts',   depth: 'buildPoliticalScienceDepthSection',   quiz: 'buildPoliticalScienceQuizDepthSection',   tutor: 'buildPoliticalScienceTutorDepthSection' },
  history:               { file: './historyPrompts',            depth: 'buildHistoryDepthSection',            quiz: 'buildHistoryQuizDepthSection',            tutor: 'buildHistoryTutorDepthSection' },
  sociology:             { file: './sociologyPrompts',          depth: 'buildSociologyDepthSection',          quiz: 'buildSociologyQuizDepthSection',          tutor: 'buildSociologyTutorDepthSection' },
  philosophy:            { file: './philosophyPrompts',         depth: 'buildPhilosophyDepthSection',         quiz: 'buildPhilosophyQuizDepthSection',         tutor: 'buildPhilosophyTutorDepthSection' },
  education:             { file: './educationPrompts',          depth: 'buildEducationDepthSection',          quiz: 'buildEducationQuizDepthSection',          tutor: 'buildEducationTutorDepthSection' },
  environmental_science: { file: './environmentalSciencePrompts', depth: 'buildEnvironmentalScienceDepthSection', quiz: 'buildEnvironmentalScienceQuizDepthSection', tutor: 'buildEnvironmentalScienceTutorDepthSection' },
  agriculture:           { file: './agriculturePrompts',        depth: 'buildAgricultureDepthSection',        quiz: 'buildAgricultureQuizDepthSection',        tutor: 'buildAgricultureTutorDepthSection' },
  architecture:          { file: './architecturePrompts',       depth: 'buildArchitectureDepthSection',       quiz: 'buildArchitectureQuizDepthSection',       tutor: 'buildArchitectureTutorDepthSection' },
};

// Lazy-loaded module cache
const _cache = {};

/**
 * Load a subject prompt module (lazy, cached).
 */
function loadPromptModule(domain) {
  const config = DOMAIN_MAP[domain];
  if (!config) return null;

  if (!_cache[domain]) {
    try {
      _cache[domain] = require(config.file);
    } catch (err) {
      console.warn(`[depthRouter] Failed to load prompt module for "${domain}": ${err.message}`);
      _cache[domain] = null;
    }
  }
  return _cache[domain];
}

/**
 * Call a named function from a domain's prompt module.
 */
function callDomainFn(domain, fnType, subdisciplines) {
  const config = DOMAIN_MAP[domain];
  if (!config) return '';

  const mod = loadPromptModule(domain);
  if (!mod) return '';

  const fnName = config[fnType];
  if (typeof mod[fnName] !== 'function') {
    console.warn(`[depthRouter] Function "${fnName}" not found in ${config.file}`);
    return '';
  }

  return mod[fnName](subdisciplines);
}

/**
 * Get the depth section for module generation based on document content.
 * @param {string} documentText - The document text to analyze
 * @returns {{ depthSection: string, domain: string|null, subdisciplines: string[] }}
 */
function getModuleDepthSection(documentText) {
  const detection = detectSubjectDomain(documentText);
  if (!detection) return { depthSection: '', domain: null, subdisciplines: [] };

  const { domain, subdisciplines } = detection;
  const depthSection = callDomainFn(domain, 'depth', subdisciplines);

  return { depthSection, domain, subdisciplines };
}

/**
 * Get the depth section for quiz/question generation based on document content.
 * @param {string} documentText - The document text to analyze
 * @returns {string}
 */
function getQuizDepthSection(documentText) {
  const detection = detectSubjectDomain(documentText);
  if (!detection) return '';

  return callDomainFn(detection.domain, 'quiz', detection.subdisciplines);
}

/**
 * Get the depth section for tutor chat based on document/module content.
 * @param {string} contentText - The module or document text to analyze
 * @returns {string}
 */
function getTutorDepthSection(contentText) {
  const detection = detectSubjectDomain(contentText);
  if (!detection) return '';

  return callDomainFn(detection.domain, 'tutor', detection.subdisciplines);
}

module.exports = {
  getModuleDepthSection,
  getQuizDepthSection,
  getTutorDepthSection,
  detectSubjectDomain,
};
