/**
 * History-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce prompt sections that get injected into module generation,
 * quiz generation, flashcard generation, and tutor chat prompts when the subject
 * detector identifies the uploaded material as history content. The goal is to
 * replace generic "200-400 words" instructions with rigorous, source-grounded,
 * historiographically aware depth that history students actually need.
 *
 * Each builder accepts a `subdisciplines` array (e.g. ['ancient', 'modern'])
 * produced by subjectDetector.js and returns a plain string ready for template
 * injection via `.replace('{history_depth_section}', ...)`.
 */

// ─── Subdiscipline-Specific Instruction Blocks ──────────────────

/**
 * Map of subdiscipline keys to their mandatory coverage requirements.
 * These get appended to the base depth section when the corresponding
 * subdiscipline is detected in the student's material.
 */
const SUBDISCIPLINE_MODULE_INSTRUCTIONS = {
  ancient: `
ANCIENT HISTORY — MANDATORY COVERAGE:
- For every event, figure, or period discussed, specify approximate or exact dates (e.g., "the Battle of Marathon, 490 BCE" not just "the Persian Wars")
- Acknowledge the limited and fragmentary nature of ancient sources:
  (a) Identify primary sources by author, title, and approximate date of composition (e.g., "Herodotus, Histories, c. 440 BCE"; "Livy, Ab Urbe Condita, c. 25 BCE")
  (b) Discuss the reliability and biases of ancient authors: who were they writing for? What political or cultural agenda might they have had?
  (c) Reference archaeological evidence where it supplements, contradicts, or fills gaps in literary sources
- Cover material culture and archaeology: inscriptions (epigraphy), coins (numismatics), pottery, architecture, and other non-literary evidence where relevant
- Address the historiographical debate: how have modern historians interpreted the ancient evidence differently? Reference at least two modern scholarly interpretations where significant disagreement exists
- Avoid anachronistic application of modern concepts to ancient societies — when drawing parallels, explicitly acknowledge the differences in context`,

  medieval: `
MEDIEVAL HISTORY — MANDATORY COVERAGE:
- For every event or development discussed, provide precise chronological anchoring with dates (years or decades) and geographical specificity
- Engage with primary source types characteristic of the medieval period:
  (a) Chronicles and annals: identify the author (if known), their institutional affiliation (monastery, court), and their likely biases
  (b) Charters, legal documents, and administrative records: explain what these sources reveal about social, economic, and political structures
  (c) Material and visual sources: manuscript illuminations, church architecture, seals, and coinage as evidence of cultural values and power relationships
- Address the periodisation debates: when did the "medieval" period begin and end? In what ways is the term itself contested or Eurocentric?
- Cover the interplay of religious and secular authority: the role of the Church, papal-imperial conflicts, canon law, and the relationship between Christian, Islamic, and Jewish intellectual traditions
- Discuss long-term structural changes: feudalism debates (was it a coherent system or a modern construct?), manorialism, urbanisation, demographic change, and the transition to early modernity`,

  modern: `
MODERN HISTORY — MANDATORY COVERAGE:
- For every event or development discussed, provide precise dates and situate it within the broader chronological framework of modernity (c. 1500-present)
- Engage critically with the volume and diversity of modern sources:
  (a) State documents, diplomatic correspondence, parliamentary records: cite specific documents where possible (e.g., "the Treaty of Westphalia, 1648"; "Wilson's Fourteen Points, January 1918")
  (b) Press, propaganda, and public discourse: analyse how media shaped public understanding of events
  (c) Personal sources (letters, diaries, memoirs): discuss their value and limitations as historical evidence
  (d) Statistical and quantitative data: economic indicators, demographic data, election results — use specific figures where available
- Address multiple perspectives on contested events: colonial vs. anti-colonial perspectives, victor vs. vanquished narratives, elite vs. popular experiences
- Cover the major historiographical schools and their evolving interpretations:
  - Whig/progressive history vs. revisionist challenges
  - Marxist/social history vs. political/diplomatic history
  - Cultural/linguistic turn and its impact on historical methodology
  - Global/transnational history vs. nation-state-centred narratives
- Discuss causation with sophistication: distinguish between structural/long-term causes, medium-term causes, and immediate triggers; avoid monocausal explanations`,

  regional: `
REGIONAL HISTORY — MANDATORY COVERAGE:
- For every region discussed, provide the specific geographical boundaries and how they changed over time
- Engage with sources in their regional and cultural context:
  (a) Identify locally produced primary sources (oral traditions, indigenous texts, regional archives) alongside externally produced sources (colonial records, travellers' accounts)
  (b) Discuss the power dynamics of source production: whose voices are preserved in the archive, and whose are absent or mediated?
  (c) Reference recent scholarship that has recovered marginalised perspectives or challenged dominant narratives
- Avoid Eurocentric framing: do not treat non-Western history as a response to or deviation from European norms
  - Present regional developments on their own terms with their own periodisation and analytical categories
  - Where interactions with European/global forces are relevant, analyse them as encounters between agents, not as the impact of an active West on a passive periphery
- Address the legacy of colonialism and its impact on historical knowledge production: how has colonial-era scholarship shaped (and distorted) understanding of the region's history?
- Discuss connections and comparisons: how does this region's experience compare to other regions facing similar structural conditions (e.g., decolonisation, state formation, economic development)?`,
};

const SUBDISCIPLINE_QUIZ_INSTRUCTIONS = {
  ancient: `
- Include questions presenting an ancient source excerpt and requiring the student to identify its author, assess its reliability, and explain what it reveals about the period
- Test chronological knowledge with timeline-ordering questions for key events and developments
- Include questions requiring the student to evaluate competing modern interpretations of ancient evidence
- Present archaeological evidence descriptions and ask what historical conclusions can and cannot be drawn from them`,

  medieval: `
- Include questions presenting a medieval primary source excerpt (chronicle passage, charter clause, visual description) and requiring contextual analysis
- Test understanding of medieval institutional structures: feudal relationships, ecclesiastical hierarchy, urban governance
- Include questions requiring the student to evaluate periodisation debates and the usefulness of the "medieval" category
- Present scenarios requiring the student to distinguish between primary evidence and later historiographical interpretation`,

  modern: `
- Include questions presenting competing accounts of the same event (e.g., two newspaper editorials, a government report vs. a personal diary) and requiring source comparison and evaluation
- Test causation analysis: present an event and require the student to distinguish between long-term, medium-term, and immediate causes
- Include counterfactual reasoning questions: "If [factor X] had been different, how might the outcome have changed? What evidence supports your reasoning?"
- Present historiographical debate questions: "Historian A argues X, while Historian B argues Y — evaluate both interpretations with reference to the evidence"`,

  regional: `
- Include questions requiring the student to analyse a source produced by an outsider (colonial official, traveller, missionary) and identify its biases and limitations
- Test the student's ability to avoid Eurocentric framing: present a development and ask for analysis on its own regional terms
- Include questions requiring comparison of similar processes (e.g., state formation, decolonisation) across different regions
- Present questions about the relationship between colonialism and historical knowledge production`,
};

const SUBDISCIPLINE_TUTOR_INSTRUCTIONS = {
  ancient: `
- When discussing any ancient event or figure, always begin with the source basis: "What sources do we have for this? How reliable are they?"
- Prompt the student to consider source limitations: "Herodotus tells us X — but what might he be omitting or exaggerating, and why?"
- Encourage awareness of the gap between evidence and interpretation: "We have limited evidence here — what are we confident about, and where are we speculating?"`,

  medieval: `
- When discussing any medieval topic, always situate it in its specific chronological and geographical context before generalising
- Prompt the student to engage with primary sources: "What type of source is this? Who produced it, and for what purpose?"
- Challenge assumptions about the medieval period: "Is 'feudalism' a useful concept here, or does it obscure more than it reveals?"
- Discuss the relationship between religious and secular power: "How does the Church's role shape our understanding of this event?"`,

  modern: `
- When discussing any modern event, always address multiple perspectives: "We've seen the government's position — but how did ordinary people experience this? What do the sources from the other side tell us?"
- Prompt sophisticated causal analysis: "That's the immediate trigger — but what were the underlying structural causes? And what medium-term developments made this moment explosive?"
- Encourage historiographical awareness: "Which school of historical interpretation does this argument belong to? What would a revisionist say?"
- Use primary source analysis as a teaching tool: "Let's read this document closely — what is it actually saying, and what assumptions underlie it?"`,

  regional: `
- When discussing any region, always begin with the region's own context and periodisation rather than imposing external frameworks
- Prompt the student to consider source production: "Whose voice are we hearing in this source? Whose voice is absent?"
- Challenge Eurocentric framing: "Can we analyse this development without reference to Europe? What would that analysis look like?"
- Encourage comparative thinking: "How does this compare to similar processes in other regions? What explains the similarities and differences?"`,
};

// ─── Builder Functions ──────────────────────────────────────────

/**
 * Build history-specific depth instructions for module generation.
 *
 * This replaces the generic "200-400 words" content instruction with a rigorous
 * framework demanding primary source analysis, chronological precision,
 * cause-and-effect reasoning, and historiographical awareness — everything a
 * history student needs for exam prep and deep understanding.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['ancient', 'modern']
 * @returns {string} Prompt section to inject into module generation templates
 */
function buildHistoryDepthSection(subdisciplines = []) {
  // ── Base depth instructions (always included for any history content) ──
  let section = `
HISTORY MODULE DEPTH — CRITICAL INSTRUCTIONS (OVERRIDES DEFAULT WORD COUNT):

TARGET LENGTH: Each module MUST contain 600-1200 words of substantive historical content. The generic "200-400 words" instruction does NOT apply to history modules. History students need thorough, evidence-based, analytically rigorous material — not surface-level summaries.

MANDATORY ELEMENTS FOR EVERY MODULE:
1. PRIMARY SOURCE ANALYSIS: Every historical claim must be grounded in evidence. For each key event or development:
   - Identify the primary sources that inform our knowledge (texts, documents, archaeological remains, visual sources, oral traditions)
   - Name specific sources where possible: author, title, date, and type of source (e.g., "Thucydides, History of the Peloponnesian War, c. 400 BCE — a contemporary account by an Athenian general")
   - Discuss the reliability and limitations of these sources: authorial bias, intended audience, survival bias, and gaps in the evidentiary record
   - Distinguish between what the sources tell us directly and what historians infer from them

2. CAUSE-AND-EFFECT CHAINS: Historical events do not occur in isolation. For every significant event or development:
   - Identify long-term structural causes (economic, social, institutional, ideological)
   - Identify medium-term developments that created the conditions for the event
   - Identify immediate triggers or catalysts
   - Trace the consequences: short-term aftermath, medium-term effects, and long-term significance
   - Avoid monocausal explanations — history is almost always multicausal

3. CHRONOLOGICAL PRECISION: Dates matter in history. Always provide:
   - Specific dates (day/month/year) for key events where known
   - Approximate dates with appropriate hedging where precision is impossible (e.g., "c. 3100 BCE", "the mid-14th century")
   - Chronological context: what came before and after, and why the sequence matters
   - Duration of processes: how long did this development take to unfold?

4. HISTORIOGRAPHICAL DEBATE: History is an interpretive discipline — historians disagree. For every major topic:
   - Present at least two different historians' interpretations of the same events or processes
   - Name the historians and their key works (e.g., "E.P. Thompson's The Making of the English Working Class (1963) argued... while revisionist historians such as...")
   - Explain the evidence and reasoning behind each interpretation
   - Identify what is at stake in the debate: what difference does it make which interpretation we accept?
   - Where a consensus exists, state it; where the debate is unresolved, say so

5. MULTIPLE PERSPECTIVES: History looks different depending on who is telling it. For every event or period:
   - Present perspectives from different social groups, classes, genders, ethnicities, and nationalities
   - Avoid privileging the perspective of the powerful: include voices "from below" where sources permit
   - Avoid presentism: do not judge historical actors solely by modern moral standards, while also not excusing actions that were contested in their own time
   - Acknowledge silences in the historical record: whose perspectives are missing, and why?

6. STRUCTURE: Organise each module following Context -> Primary Evidence -> Narrative -> Analysis -> Significance -> Historiographical Debate. Use markdown headings (##, ###) to separate these sections clearly.

7. CONTEXT BEFORE ANALYSIS: Always establish the historical context before diving into analysis. The student must understand the world in which events occurred before they can understand why they occurred.

8. ACCURACY: NEVER fabricate dates, source attributions, or historian names. If uncertain about exact dates, use "c." (circa) or a date range. If uncertain about a historian's exact argument, paraphrase cautiously rather than misrepresenting. A wrong date or misattributed argument is worse than an acknowledged uncertainty.`;

  // ── Subdiscipline-specific instructions ──
  const activeSubdisciplines = subdisciplines.filter(
    (sub) => SUBDISCIPLINE_MODULE_INSTRUCTIONS[sub]
  );

  if (activeSubdisciplines.length > 0) {
    section += '\n\nSUBDISCIPLINE-SPECIFIC REQUIREMENTS:';
    for (const sub of activeSubdisciplines) {
      section += SUBDISCIPLINE_MODULE_INSTRUCTIONS[sub];
    }
  }

  return section;
}

/**
 * Build history-specific depth instructions for quiz and question generation.
 *
 * Ensures quizzes test source analysis, chronological understanding, causation
 * reasoning, and historiographical awareness — not mere recall — with questions
 * that mirror history assessments at the university level.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['ancient', 'modern']
 * @returns {string} Prompt section to inject into quiz generation templates
 */
function buildHistoryQuizDepthSection(subdisciplines = []) {
  let section = `
HISTORY QUIZ DEPTH — CRITICAL INSTRUCTIONS:

QUESTION DESIGN PRINCIPLES:
1. SOURCE ANALYSIS OVER RECALL: At least 50% of questions must test the student's ability to analyse evidence, not just recall facts. Present a source excerpt (or describe a source) and require the student to evaluate its reliability, identify its biases, and explain what it reveals about the period.

2. SOURCE ANALYSIS QUESTIONS: Include questions that present a primary source excerpt or description and require:
   - Identification of the type of source (chronicle, letter, government report, archaeological find, etc.)
   - Assessment of the source's reliability and limitations
   - Explanation of what the source reveals and what it does not
   - Contextualisation: when and why was this source produced?

3. CHRONOLOGICAL ORDERING: Include questions that test the student's understanding of sequence and periodisation:
   - Present a list of events and require correct chronological ordering
   - Ask which event came first/last in a given set
   - Test understanding of why the sequence matters: "Why is it significant that X occurred before Y?"

4. CAUSATION QUESTIONS: Include questions that test sophisticated causal reasoning:
   - Present an event and require identification of long-term, medium-term, and immediate causes
   - Distinguish between necessary and sufficient causes
   - Test the student's ability to weigh the relative importance of different causal factors
   - Include questions that present a monocausal explanation and require the student to critique it

5. COUNTERFACTUAL REASONING: Include questions that develop historical thinking:
   - "If [factor X] had been absent, would [event Y] still have occurred? Justify your answer with evidence"
   - These questions test whether the student understands causal mechanisms, not just sequences
   - Require the student to reason about what was contingent and what was structurally determined

6. HISTORIOGRAPHICAL DEBATE QUESTIONS: Include questions that test awareness of how history is interpreted:
   - "Historian A argues X, while Historian B argues Y — which interpretation is better supported by the evidence, and why?"
   - Present a historical interpretation and require identification of the school of thought it belongs to
   - Ask the student to identify what evidence would support or undermine a given interpretation

7. MCQ DISTRACTOR QUALITY: For multiple-choice questions, distractors (wrong answers) MUST be:
   - Plausible historical claims that are subtly wrong (wrong date, wrong causal relationship, right event but wrong significance)
   - Common misconceptions or oversimplifications that students who studied superficially might select
   - Anachronistic interpretations that test whether the student can think historically
   - Never include joke answers or obviously ahistorical options

8. EXPLANATION DEPTH: Every question's explanation must:
   - State the correct answer with supporting evidence (specific sources, dates, or historians)
   - Explain why each distractor is wrong, identifying the specific historical error it contains
   - Where relevant, note how the question connects to broader historiographical debates`;

  // ── Subdiscipline-specific quiz instructions ──
  const activeSubdisciplines = subdisciplines.filter(
    (sub) => SUBDISCIPLINE_QUIZ_INSTRUCTIONS[sub]
  );

  if (activeSubdisciplines.length > 0) {
    section += '\n\nSUBDISCIPLINE-SPECIFIC QUIZ REQUIREMENTS:';
    for (const sub of activeSubdisciplines) {
      section += SUBDISCIPLINE_QUIZ_INSTRUCTIONS[sub];
    }
  }

  return section;
}

/**
 * Build history-specific depth instructions for tutor chat interactions.
 *
 * Ensures the AI tutor always situates events in context before analysis,
 * discusses the evidence basis for claims, compares historians' views, and
 * develops the student's capacity for historical thinking — not just their
 * knowledge of historical facts.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['ancient', 'modern']
 * @returns {string} Prompt section to inject into tutor chat templates
 */
function buildHistoryTutorDepthSection(subdisciplines = []) {
  let section = `
HISTORY TUTOR DEPTH — CRITICAL INSTRUCTIONS:

You are tutoring a history student. History tutoring demands evidence-based reasoning, chronological precision, multi-perspective analysis, and historiographical awareness that generic tutoring does not. Follow these rules:

1. ALWAYS SITUATE IN CONTEXT BEFORE ANALYSIS: Before analysing any event, development, or source, establish the historical context:
   - "Before we analyse this event, let's understand the world in which it occurred..."
   - Provide the political, social, economic, and cultural background
   - Identify what had changed recently and what remained stable
   - Only after context is established, proceed to analysis
   - Never jump straight to "why did X happen?" without first establishing "what was the world like when X happened?"

2. DISCUSS THE EVIDENCE BASIS FOR CLAIMS: Every historical claim rests on evidence. When explaining anything:
   - Identify the sources that inform our knowledge: "We know this because..."
   - Discuss the quality and limitations of the evidence: "However, we should note that this source was written by..."
   - Distinguish between well-evidenced claims and more speculative interpretations: "The evidence strongly supports... but we are less certain about..."
   - Prompt the student: "What kind of source would help us answer this question? Do we have such sources?"

3. COMPARE HISTORIANS' VIEWS: History is an interpretive discipline. When explaining any significant topic:
   - Present at least two historians' interpretations: "Historian A argues... while Historian B contends..."
   - Explain the evidence and reasoning behind each interpretation
   - Encourage the student to evaluate the interpretations: "Which interpretation do you find more convincing, and why?"
   - Discuss what is at stake in historiographical debates: "The way we interpret this event matters because..."

4. DEVELOP CAUSAL REASONING: Help the student think causally about history:
   - Distinguish between long-term structural causes, medium-term developments, and immediate triggers
   - Challenge monocausal explanations: "That's one factor — but is it sufficient on its own? What else was going on?"
   - Encourage counterfactual thinking: "If this factor had been absent, would the event still have occurred?"
   - Discuss the relationship between structure and agency: "How much did individual decisions matter versus broader forces?"

5. ENCOURAGE MULTI-PERSPECTIVE ANALYSIS: Help the student see events from multiple viewpoints:
   - "We've discussed how the rulers experienced this — but what about ordinary people?"
   - "How did women's experience of this period differ from men's?"
   - "How do colonised peoples' accounts of this event differ from the colonisers'?"
   - Challenge the student to consider whose voices are present and absent in the historical record

6. CHRONOLOGICAL DISCIPLINE: Ensure the student maintains chronological precision:
   - Always use specific dates when discussing events
   - Correct vague chronological language: "Can you be more precise about when this happened?"
   - Emphasise sequence: "It matters that X happened before Y — here's why..."
   - Discuss the pace of change: "This transformation took decades/centuries — it wasn't sudden"

7. AVOID PRESENTISM: Help the student think historically rather than anachronistically:
   - "We need to understand this in the context of the values and beliefs of the time, not ours"
   - Distinguish between understanding historical actors' motivations and endorsing their actions
   - When drawing parallels to the present, explicitly acknowledge the differences as well as similarities
   - Prompt: "Is it fair to judge this historical figure by our standards? What standards were available in their own time?"

8. EXAM PREPARATION GUIDANCE: As a history tutor, help the student prepare for assessments:
   - Encourage structured essay writing: "A strong history essay presents evidence, analyses it, and engages with historiographical debate"
   - Remind them to always ground claims in evidence: "An assertion without evidence is not a historical argument"
   - Point out common errors: "Students often oversimplify causation here — make sure you discuss multiple factors"
   - Encourage source criticism: "In a source analysis question, always discuss the source's limitations as well as what it reveals"`;

  // ── Subdiscipline-specific tutor instructions ──
  const activeSubdisciplines = subdisciplines.filter(
    (sub) => SUBDISCIPLINE_TUTOR_INSTRUCTIONS[sub]
  );

  if (activeSubdisciplines.length > 0) {
    section += '\n\nSUBDISCIPLINE-SPECIFIC TUTOR GUIDANCE:';
    for (const sub of activeSubdisciplines) {
      section += SUBDISCIPLINE_TUTOR_INSTRUCTIONS[sub];
    }
  }

  return section;
}

// ─── Exports ────────────────────────────────────────────────────

module.exports = {
  buildHistoryDepthSection,
  buildHistoryQuizDepthSection,
  buildHistoryTutorDepthSection,
};
