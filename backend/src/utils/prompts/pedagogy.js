/**
 * Shared pedagogy blocks.
 *
 * These are the evidence-based teaching principles injected into every content
 * generator (modules, tutor, quizzes, flashcards) regardless of which model
 * runs them — Gemini or DeepSeek. Keeping them in one place means the teaching
 * quality is consistent across surfaces and can be improved in a single edit.
 *
 * Sources for the principles encoded here:
 *  - Zone of Proximal Development (Vygotsky): teach just beyond current ability.
 *  - Storage vs retrieval strength (Bjork): fluency in the moment is not retention.
 *  - Desirable difficulty (Bjork): effortful retrieval builds durable memory.
 *  - Backward design (Wiggins & McTighe): outcome -> assessment -> content.
 *  - Retrieval practice, spacing, interleaving (Roediger, Dunlosky).
 *  - Cognitive load theory (Sweller): protect working memory while acquiring knowledge.
 */

// ─── Core teaching stance ─────────────────────────────────────
// Injected into every content-producing prompt.
const PEDAGOGY_CORE = `
TEACHING PRINCIPLES (follow these — they matter more than covering ground):

1. ZONE OF PROXIMAL DEVELOPMENT — Pitch every explanation just beyond what the
   student can already do alone: hard enough to require thought, close enough to
   reach. Too easy is boring and teaches nothing; too hard causes shutdown.

2. PROTECT WORKING MEMORY WHILE TEACHING KNOWLEDGE — When introducing a new idea,
   difficulty is the ENEMY. Strip jargon, use one idea per sentence, and give a
   concrete example before the abstract rule. Never introduce two new terms in one
   sentence.

3. USE DIFFICULTY WHEN BUILDING SKILL — When the student PRACTISES, difficulty is
   the TOOL. Effortful recall builds long-term retention; recognition does not.
   Make them retrieve from memory before you show the answer.

4. TEACH FOR RETENTION, NOT FOR THE FEELING OF UNDERSTANDING — A student who
   nods along has fluency, not memory. Build in recall, not re-reading.

5. ONE TANGIBLE WIN PER MODULE — Each module must leave the student able to DO or
   EXPLAIN one specific thing they could not before. Name that thing explicitly.
`;

// ─── Backward design ──────────────────────────────────────────
const BACKWARD_DESIGN_BLOCK = `
BACKWARD DESIGN — Build each module in this order (outcome first, content last):
  a) Decide the OUTCOME: what should the student be able to do afterwards?
     Tag it with its Bloom level: remember | understand | apply | analyse | evaluate | create.
  b) Decide the EVIDENCE: what question would prove they can do it?
  c) Only THEN write the content — and include nothing that does not serve (a).
Content that does not serve the stated outcome is noise. Cut it.
`;

// ─── Retrieval practice / desirable difficulty ────────────────
const RETRIEVAL_PRACTICE_BLOCK = `
RETRIEVAL STRUCTURE — Every module's content must include, in this order:
  1. A concrete hook or example the student can picture.
  2. The explanation itself (plain language first, precise terminology second).
  3. A "Pause and recall" line that asks the student to answer from memory BEFORE
     reading on — phrased as a direct question, with the answer appearing after it.
  4. The key points, stated as compressed, quotable facts.
Never place the answer on the same line as its recall question.
`;

// ─── Quiz hygiene (anti-guessing) ─────────────────────────────
// Fixes a real failure mode: LLMs write the correct option longer, more hedged and
// more technical than the distractors, so students can score well by pattern-matching
// without understanding anything.
const QUIZ_HYGIENE_BLOCK = `
QUESTION QUALITY RULES (violating these makes the quiz worthless — a student can
score highly by spotting the pattern instead of knowing the material):

- EQUAL LENGTH: every option in a multiple-choice question must be within a few
  characters of the same length. Never let the correct answer be the longest,
  the most detailed, or the most cautiously worded one.
- EQUAL SPECIFICITY: if the correct answer names a number, mechanism or condition,
  every distractor must name one too. No vague filler options.
- NO GIVEAWAY LANGUAGE: never use "all of the above", "none of the above", or
  absolute words ("always", "never") that only appear in wrong answers.
- PLAUSIBLE DISTRACTORS: each wrong option must be a mistake a real student would
  actually make — a confused adjacent concept, a reversed cause and effect, a
  common misreading. Never use obviously silly options.
- ONE DEFENSIBLE ANSWER: the correct option must be unambiguously correct from the
  source material alone.
- TEST UNDERSTANDING, NOT RECALL OF WORDING: do not quote a sentence from the
  material and blank out a word. Ask what the idea MEANS or how it APPLIES.
- SELF-CONTAINED: embed any code, formula or data the question depends on. Never
  write "as described above" or assume the material is on screen.
`;

// ─── Optional, learner-specific sections ──────────────────────

/**
 * The learner's reason for studying. Grounding lessons in a real goal is what
 * stops content feeling abstract, and is the strongest lever on motivation.
 */
function buildMissionSection(mission) {
  if (!mission) return '';
  return `
THIS STUDENT'S GOAL: ${mission}
Tie explanations and examples back to this goal wherever it is honest to do so.
Do not force it where it does not fit — a strained connection is worse than none.
`;
}

/**
 * Adaptive block: what we know about this learner's current state with the topic.
 * Drives regeneration — a module rewritten after a failed comprehension check
 * carries the specific misconception so the new version attacks it directly.
 *
 * @param {object} state
 * @param {string[]} [state.misconceptions]  Specific wrong beliefs to correct head-on.
 * @param {string[]} [state.masteredTopics]  Already demonstrated — do not re-teach.
 * @param {string[]} [state.strugglingTopics] Needs a different angle.
 * @param {string}   [state.preferredAnalogyDomain] e.g. "football", "cooking", "music".
 * @param {string}   [state.pace] 'slow' | 'standard' | 'fast'
 * @param {number}   [state.attemptNumber] How many times they've taken this module.
 */
function buildLearnerStateSection(state = {}) {
  const {
    misconceptions = [],
    masteredTopics = [],
    strugglingTopics = [],
    preferredAnalogyDomain,
    pace,
    attemptNumber,
  } = state;

  const parts = [];

  if (attemptNumber > 1) {
    parts.push(`This student has already worked through this material ${attemptNumber} times and it has not stuck.
Do NOT restate the previous explanation in different words — that has already failed.
Change the APPROACH: lead with a different concrete example, a different analogy, or
break the idea into smaller steps than before.`);
  }

  if (misconceptions.length) {
    parts.push(`KNOWN MISCONCEPTIONS to correct directly (name the wrong idea, show why it
is wrong, then give the correct one — do not just state the correct version and hope):
${misconceptions.map(m => `  - ${m}`).join('\n')}`);
  }

  if (strugglingTopics.length) {
    parts.push(`STRUGGLING WITH: ${strugglingTopics.join(', ')}.
Slow down here, add a worked example, and check understanding before moving on.`);
  }

  if (masteredTopics.length) {
    parts.push(`ALREADY MASTERED (do not re-explain from scratch — reference briefly and build on it):
${masteredTopics.join(', ')}.`);
  }

  if (preferredAnalogyDomain) {
    parts.push(`This student's explanations land best when drawn from: ${preferredAnalogyDomain}.
Prefer analogies from that world when one fits naturally.`);
  }

  if (pace === 'slow') {
    parts.push(`PACE: Break content into smaller steps and add an extra worked example.`);
  } else if (pace === 'fast') {
    parts.push(`PACE: Be concise and move quickly. Skip belabouring basics.`);
  }

  if (!parts.length) return '';
  return `\nWHAT WE KNOW ABOUT THIS STUDENT:\n${parts.join('\n\n')}\n`;
}

/**
 * Focus / attention accommodations. Built for learners (like this platform's
 * author) whose attention does not fit the assumed-default classroom shape.
 */
function buildFocusSection(focusMode) {
  if (!focusMode) return '';
  return `
ATTENTION ACCOMMODATIONS (this student finds long unbroken content hard to sustain):
- Keep each section short enough to finish in one sitting of a few minutes.
- Put the single most important sentence FIRST, before any build-up.
- Use frequent headers and short paragraphs — never a wall of text.
- Make every section visibly finishable: the student should always see the end of
  the current chunk from where they are.
- Front-load the "why this matters" — do not save the payoff for the end.
`;
}

/**
 * Interleaving: pull a small number of earlier topics into current practice.
 * Mixing topics beats blocked practice for long-term retention.
 */
function buildInterleavingSection(priorTopics = []) {
  if (!priorTopics.length) return '';
  const sample = priorTopics.slice(0, 5);
  return `
INTERLEAVING — Include 1-2 questions that connect the current topic back to
previously studied material (${sample.join(', ')}). Mixing topics during practice
produces markedly better long-term retention than practising one topic in isolation.
`;
}

module.exports = {
  PEDAGOGY_CORE,
  BACKWARD_DESIGN_BLOCK,
  RETRIEVAL_PRACTICE_BLOCK,
  QUIZ_HYGIENE_BLOCK,
  buildMissionSection,
  buildLearnerStateSection,
  buildFocusSection,
  buildInterleavingSection,
};
