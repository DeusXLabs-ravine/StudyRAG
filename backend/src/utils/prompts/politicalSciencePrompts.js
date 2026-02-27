/**
 * Political Science-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce prompt sections that get injected into module generation,
 * quiz generation, flashcard generation, and tutor chat prompts when the subject
 * detector identifies the uploaded material as political science content. The goal
 * is to replace generic "200-400 words" instructions with rigorous, theoretically
 * grounded, case-rich depth that political science students actually need.
 *
 * Each builder accepts a `subdisciplines` array (e.g. ['comparative', 'international_relations'])
 * produced by subjectDetector.js and returns a plain string ready for template
 * injection via `.replace('{political_science_depth_section}', ...)`.
 */

// ─── Subdiscipline-Specific Instruction Blocks ──────────────────

/**
 * Map of subdiscipline keys to their mandatory coverage requirements.
 * These get appended to the base depth section when the corresponding
 * subdiscipline is detected in the student's material.
 */
const SUBDISCIPLINE_MODULE_INSTRUCTIONS = {
  comparative: `
COMPARATIVE POLITICS — MANDATORY COVERAGE:
- For every regime or political system discussed, provide a rigorous regime type analysis:
  (a) Institutional design: presidentialism vs. parliamentarism, federal vs. unitary structures, bicameral vs. unicameral legislatures
  (b) Electoral system effects: apply Duverger's law (plurality systems tend toward two-party systems; proportional representation permits multiparty systems) and its critiques
  (c) Political culture measurement: reference Almond and Verba's civic culture typology, Inglehart's post-materialism thesis, or Putnam's social capital framework where relevant
- Analyse party systems using Sartori's typology (predominant, two-party, moderate pluralism, polarised pluralism) with concrete country examples
- When comparing regimes, always use structured comparison: identify the dimension of comparison, present each case's position on that dimension, and explain the causal mechanism driving the difference
- Reference Freedom House scores, Polity IV/V data, or V-Dem indicators when classifying regimes, stating the specific metrics used
- Discuss democratic backsliding, hybrid regimes, and competitive authoritarianism where the material involves regime transitions`,

  international_relations: `
INTERNATIONAL RELATIONS — MANDATORY COVERAGE:
- For every international event, conflict, treaty, or institution discussed, explicitly apply at least two theoretical lenses and compare their explanatory power:
  (a) Realism: structural realism (Waltz — anarchy and distribution of power), offensive realism (Mearsheimer — power maximisation), classical realism (Morgenthau — human nature and national interest)
  (b) Liberalism: commercial liberalism (trade interdependence reduces conflict), institutional liberalism (international organisations constrain state behaviour), democratic peace theory (Doyle, Russett)
  (c) Constructivism: Wendt's "anarchy is what states make of it," norm diffusion, identity formation, securitisation theory (Copenhagen School)
- For conflict/cooperation case studies: provide historical context, identify the key actors and their interests, apply game theory where appropriate (Prisoner's Dilemma, Stag Hunt, Chicken Game), and evaluate the outcome against theoretical predictions
- Reference specific treaties, UN resolutions, or international legal instruments by name, date, and key provisions
- For international institutions (UN, WTO, ICC, NATO, EU): discuss institutional design, decision-making procedures, enforcement mechanisms, and effectiveness debates
- Address levels-of-analysis problems: distinguish between systemic, state-level, and individual-level explanations`,

  political_theory: `
POLITICAL THEORY — MANDATORY COVERAGE:
- For every theorist or philosophical argument discussed:
  (a) Primary text analysis: quote or closely paraphrase the theorist's own words from the canonical text (e.g., Hobbes's Leviathan, Rawls's A Theory of Justice, Marx's Capital) and provide the specific chapter/section reference
  (b) Argument reconstruction: present the argument in its strongest form — identify premises, logical structure, and conclusion — before evaluating it
  (c) Contemporary application: show how the classical idea applies to or illuminates a contemporary political issue (e.g., Rawls's veil of ignorance applied to healthcare policy, Machiavelli on executive power in modern democracies)
- Distinguish between normative theory (what ought to be) and positive/empirical theory (what is), and be explicit about which register the discussion operates in
- Cover the major traditions and their internal debates: social contract theory (Hobbes, Locke, Rousseau, Rawls), utilitarianism (Bentham, Mill, Singer), Marxism (Marx, Gramsci, Frankfurt School), feminism (Wollstonecraft, de Beauvoir, Butler), postcolonialism (Fanon, Said, Spivak) as relevant to the material
- When presenting a normative argument, always present the strongest objection and the theorist's (or a defender's) response
- Use precise philosophical terminology: distinguish between liberty and freedom, equality and equity, justice and fairness, sovereignty and authority`,

  public_admin: `
PUBLIC ADMINISTRATION — MANDATORY COVERAGE:
- For every policy or governance topic discussed, apply the policy cycle framework:
  (a) Agenda setting: how did the issue reach the policy agenda? Apply Kingdon's multiple streams framework (problem stream, policy stream, politics stream, policy window) or Baumgartner and Jones's punctuated equilibrium model
  (b) Policy formulation: identify the actors involved (bureaucrats, legislators, interest groups, think tanks), the alternatives considered, and the rationale for the chosen design
  (c) Implementation: apply top-down (Pressman and Wildavsky, Sabatier and Mazmanian) vs. bottom-up (Lipsky's street-level bureaucracy, Hjern and Hull) implementation models; identify implementation gaps and their causes
  (d) Evaluation: specify the criteria used (effectiveness, efficiency, equity, legitimacy), the methodology of evaluation, and the counterfactual
- Cover governance indicators and measurement: World Bank Governance Indicators (voice and accountability, political stability, government effectiveness, regulatory quality, rule of law, control of corruption), OECD governance reviews
- Discuss principal-agent problems in bureaucracy, accountability mechanisms (legislative oversight, judicial review, ombudsman institutions, freedom of information), and the tension between bureaucratic discretion and democratic accountability
- Reference specific public management reforms: New Public Management (NPM), post-NPM, digital governance, evidence-based policymaking`,
};

const SUBDISCIPLINE_QUIZ_INSTRUCTIONS = {
  comparative: `
- Include scenario-based questions presenting a country's institutional features and requiring the student to classify its regime type with justification
- Test Duverger's law by presenting electoral system descriptions and asking students to predict party system outcomes
- Include questions requiring comparison of two or more countries on a specified dimension (e.g., "Compare the executive-legislative relationship in Country A and Country B")
- Present data excerpts from Freedom House, Polity, or V-Dem and require interpretation`,

  international_relations: `
- Include scenario-based questions presenting an international crisis and requiring analysis from at least two theoretical perspectives
- Test game theory application by presenting strategic interaction scenarios and asking students to identify the game structure and predicted outcome
- Include questions requiring identification of which IR theory best explains a described historical outcome and why
- Present treaty or institution design questions requiring analysis of enforcement mechanisms and effectiveness`,

  political_theory: `
- Include questions presenting a passage from a primary text and requiring identification of the theorist, the argument, and its implications
- Test argument reconstruction by presenting a normative claim and requiring identification of its premises and logical structure
- Include questions requiring application of a classical theory to a contemporary scenario with reasoned justification
- Present "strongest objection" questions: given a theoretical position, identify the most compelling criticism`,

  public_admin: `
- Include scenario-based questions presenting a policy failure and requiring identification of where in the policy cycle the breakdown occurred
- Test implementation analysis by presenting a programme description and asking students to identify principal-agent problems, street-level bureaucracy effects, or implementation gaps
- Include questions requiring application of Kingdon's multiple streams framework to explain how an issue reached the policy agenda
- Present governance indicator data and require interpretation of strengths and weaknesses in a country's governance profile`,
};

const SUBDISCIPLINE_TUTOR_INSTRUCTIONS = {
  comparative: `
- When discussing any political system, always begin with institutional context: "What type of executive does this country have? What electoral system? What is the party system structure?"
- Prompt the student to apply Duverger's law and its critiques: "Given this electoral system, what would Duverger predict? Does the evidence support that prediction?"
- Encourage structured comparison: "Let's compare these two countries on a specific dimension — what variable are we holding constant, and what varies?"`,

  international_relations: `
- When explaining any international event, always apply multiple theoretical lenses: "A realist would say... A liberal institutionalist would counter that... A constructivist would add..."
- Prompt the student to evaluate which theory has the most explanatory power for the specific case: "Which theoretical perspective best explains this outcome, and what evidence supports that?"
- Use current events as case studies: connect theoretical concepts to ongoing international issues to demonstrate relevance and test the student's ability to apply theory`,

  political_theory: `
- When discussing a theorist, always start with the primary text: "What does Rawls actually say in A Theory of Justice, Chapter 3?"
- Encourage the student to reconstruct arguments before evaluating them: "Before we critique this argument, let's make sure we understand it in its strongest form"
- Prompt critical engagement: "What is the strongest objection to this position? How might the theorist respond?"
- Connect classical ideas to contemporary debates: "How would Hobbes's argument about the state of nature apply to current debates about state failure?"`,

  public_admin: `
- When discussing any policy issue, always walk through the policy cycle: "Let's start with agenda setting — how did this issue get onto the government's radar?"
- Prompt the student to consider implementation challenges: "The policy looks good on paper — but what would Lipsky say about how street-level bureaucrats might actually implement it?"
- Encourage evidence-based analysis: "What governance indicators would you look at to evaluate this country's administrative capacity?"
- Discuss the gap between policy design and policy outcomes: "Why might a well-designed policy fail in implementation?"`,
};

// ─── Builder Functions ──────────────────────────────────────────

/**
 * Build political science-specific depth instructions for module generation.
 *
 * This replaces the generic "200-400 words" content instruction with a rigorous
 * framework demanding theoretical grounding, empirical evidence, case study
 * analysis, and structured comparative reasoning — everything a political
 * science student needs for exam prep and deep understanding.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['comparative', 'international_relations']
 * @returns {string} Prompt section to inject into module generation templates
 */
function buildPoliticalScienceDepthSection(subdisciplines = []) {
  // ── Base depth instructions (always included for any political science content) ──
  let section = `
POLITICAL SCIENCE MODULE DEPTH — CRITICAL INSTRUCTIONS (OVERRIDES DEFAULT WORD COUNT):

TARGET LENGTH: Each module MUST contain 600-1200 words of substantive political science content. The generic "200-400 words" instruction does NOT apply to political science modules. Students need thorough, analytically rigorous material — not surface-level summaries.

MANDATORY ELEMENTS FOR EVERY MODULE:
1. THEORETICAL GROUNDING: Every political phenomenon discussed must be analysed through at least one major theoretical framework. Name the theory, its originator(s), and its core claims before applying it. Where multiple theories compete, present them and evaluate their relative explanatory power.

2. EMPIRICAL EVIDENCE AND CASE STUDIES: Support every theoretical claim with concrete empirical evidence:
   - Reference specific countries, events, elections, treaties, or institutions by name and date
   - Cite relevant datasets and indices (Freedom House, Polity V, V-Dem, World Bank Governance Indicators, Correlates of War) with specific scores or findings where appropriate
   - Use case studies to illustrate causal mechanisms — not merely as anecdotal decoration
   - Distinguish between correlation and causation; identify confounding variables where relevant

3. COMPARATIVE ANALYSIS: Where the material involves more than one case (country, institution, policy, theorist):
   - Use structured comparison: explicitly identify the dimension(s) of comparison
   - Apply most-similar or most-different systems design logic where appropriate
   - Identify both similarities and differences, and explain the causal factors driving each

4. CONTEMPORARY APPLICATION: Connect historical and theoretical material to contemporary political developments:
   - Show how classical theories illuminate current events
   - Identify where contemporary developments challenge or modify established theories
   - Reference recent scholarship, reports, or data (within the last decade where possible)

5. DEBATE AND CRITICISM: For every major claim or theory presented:
   - State the strongest objection or competing perspective
   - Reference the scholars or traditions that advance the criticism
   - Evaluate the merit of the criticism — do not merely list "pros and cons" superficially
   - Where the debate is unresolved, state this honestly and identify the key points of disagreement

6. STRUCTURE: Organise each module following Theory -> Evidence/Cases -> Comparative Analysis -> Contemporary Application -> Debate/Criticism. Use markdown headings (##, ###) to separate these sections clearly.

7. KEY SCHOLARS AND WORKS: Reference foundational and contemporary scholars by name with their key works. Examples:
   - "Huntington's 'clash of civilisations' thesis (1993/1996)"
   - "Putnam's two-level game framework (1988)"
   - "Acemoglu and Robinson's institutional theory of development (Why Nations Fail, 2012)"
   Do NOT name-drop — only reference scholars whose ideas you substantively engage with.

8. ACCURACY: NEVER fabricate scholar names, publication dates, data points, or institutional details. If uncertain about exact figures, use approximate language rather than inventing statistics. A wrong citation is worse than no citation.`;

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
 * Build political science-specific depth instructions for quiz and question generation.
 *
 * Ensures quizzes test analytical reasoning and theory application — not mere
 * recall — with scenario-based policy analysis, theory identification from case
 * descriptions, and regime classification questions that mirror political science
 * assessments.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['comparative', 'international_relations']
 * @returns {string} Prompt section to inject into quiz generation templates
 */
function buildPoliticalScienceQuizDepthSection(subdisciplines = []) {
  let section = `
POLITICAL SCIENCE QUIZ DEPTH — CRITICAL INSTRUCTIONS:

QUESTION DESIGN PRINCIPLES:
1. ANALYTICAL REASONING OVER RECALL: At least 60% of questions must test application of theory to cases, not just definition recall. Present a political scenario and require the student to identify the relevant theory, apply it to the facts, and evaluate its explanatory power.

2. SCENARIO-BASED POLICY ANALYSIS: Include questions that present a realistic political scenario (4-8 sentences) and require:
   - Identification of the political phenomenon or process at work
   - Application of the relevant theoretical framework(s)
   - Analysis of causal mechanisms and likely outcomes
   - Evaluation of competing explanations

3. THEORY IDENTIFICATION FROM CASE DESCRIPTIONS: Present a description of a political event, institutional arrangement, or policy outcome and ask:
   - "Which theoretical perspective best explains this outcome?"
   - "What would a realist/liberal/constructivist predict in this scenario?"
   - "Which scholar's framework is most applicable here, and why?"
   Require the student to justify their answer with reference to the theory's core claims.

4. REGIME CLASSIFICATION QUESTIONS: Present a country's institutional features (executive type, electoral system, party system, civil liberties protections) and require:
   - Classification using established typologies (Linz, Sartori, Lijphart, Levitsky and Way)
   - Justification with reference to the specific criteria of the typology used
   - Identification of borderline or ambiguous cases and explanation of why classification is contested

5. COMPARATIVE QUESTIONS: Include questions requiring structured comparison:
   - "Compare the causes of democratic transition in Country A and Country B"
   - "What explains the divergent outcomes of similar institutional reforms in these two cases?"
   - Require identification of key variables and causal mechanisms, not just listing of similarities and differences

6. MCQ DISTRACTOR QUALITY: For multiple-choice questions, distractors (wrong answers) MUST be:
   - Plausible theoretical claims that are subtly wrong or misapplied
   - Common misconceptions from introductory political science courses
   - Near-misses that test precision (e.g., correct theory but wrong scholar, right causal mechanism but wrong case)
   - Never include joke answers or obviously non-political-science options

7. DATA INTERPRETATION: Where appropriate, include questions presenting excerpts from datasets, indices, or survey results and requiring:
   - Correct interpretation of what the data shows
   - Identification of limitations in the data or methodology
   - Application of the data to evaluate a theoretical claim

8. EXPLANATION DEPTH: Every question's explanation must:
   - State the correct theoretical framework with its key scholar(s)
   - Explain why each distractor is wrong, referencing the specific analytical error it contains
   - Where relevant, note how different theoretical perspectives would approach the same question`;

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
 * Build political science-specific depth instructions for tutor chat interactions.
 *
 * Ensures the AI tutor compares theoretical perspectives, uses current events as
 * examples, encourages primary source analysis, and walks through cases with the
 * depth a political science student expects from a seminar discussion — not a
 * chatbot summary.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['comparative', 'international_relations']
 * @returns {string} Prompt section to inject into tutor chat templates
 */
function buildPoliticalScienceTutorDepthSection(subdisciplines = []) {
  let section = `
POLITICAL SCIENCE TUTOR DEPTH — CRITICAL INSTRUCTIONS:

You are tutoring a political science student. Political science tutoring demands theoretical rigour, empirical grounding, and multi-perspective analysis that generic tutoring does not. Follow these rules:

1. ALWAYS COMPARE THEORETICAL PERSPECTIVES: Every political phenomenon can be analysed from multiple theoretical angles. When explaining any concept:
   - Present at least two competing theoretical perspectives
   - Identify what each theory predicts and why
   - Evaluate which theory has the most explanatory power for the specific case at hand
   - Encourage the student to weigh the evidence for each perspective rather than accepting one uncritically

2. USE CURRENT EVENTS AS EXAMPLES: Political science is a living discipline. When explaining theoretical concepts:
   - Connect them to recent or ongoing political events that the student is likely aware of
   - Show how the theory illuminates the event: "A realist would explain the current situation in [region] by pointing to..."
   - Use current events to test theories: "Does the democratic peace theory hold in this case? Why or why not?"
   - Update classical examples with contemporary parallels where relevant

3. PRIMARY SOURCE ANALYSIS: When discussing political theorists or foundational texts:
   - Reference specific passages, chapters, or sections of the primary text
   - Encourage the student to engage with the theorist's own words, not just secondary summaries
   - Ask: "What does [theorist] actually argue in [text]? How does this differ from how the argument is commonly characterised?"
   - Distinguish between what a theorist actually wrote and later interpretations or simplifications

4. STRUCTURED ANALYTICAL FRAMEWORK: When the student asks about a political phenomenon, guide them through:
   - **Context**: What is the historical, institutional, and social context?
   - **Theory**: What theoretical frameworks are relevant? What do they predict?
   - **Evidence**: What empirical evidence supports or challenges each theoretical prediction?
   - **Comparison**: How does this case compare to similar cases? What explains similarities and differences?
   - **Evaluation**: Which explanation is most convincing, and what are its limitations?

5. ENCOURAGE CRITICAL THINKING: Political science requires evaluating arguments, not just learning them. Regularly prompt the student:
   - "What evidence would you need to see to accept/reject this theory?"
   - "What are the assumptions underlying this argument? Are they justified?"
   - "How would a critic of this position respond?"
   - "Is this a normative claim or an empirical one? How would you test it?"

6. METHODOLOGICAL AWARENESS: Help the student think about how we know what we know in political science:
   - Discuss the evidence basis for claims: "What kind of study would you design to test this hypothesis?"
   - Distinguish between qualitative and quantitative evidence and their respective strengths
   - Identify potential selection bias, endogeneity, or confounding in causal claims
   - Encourage awareness of the limits of available data

7. EXAM PREPARATION GUIDANCE: As a political science tutor, help the student prepare for assessments:
   - When relevant, point out common analytical errors: "Students often conflate correlation with causation here"
   - Encourage structured essay writing: "A strong answer would present the theory, apply it to the case, and evaluate its limitations"
   - Remind them to always engage with competing perspectives: "An essay that only presents one theoretical view will not achieve top marks"
   - Flag high-yield topics: "This is a concept that examiners frequently test — make sure you can apply it to multiple cases"

8. KEY SCHOLARS AND WORKS: When discussing concepts, always ground them in the scholarly literature:
   - Name the scholar(s) who developed or advanced the idea
   - Reference their key work(s) by title and date
   - Distinguish between the original formulation and subsequent modifications or critiques
   - Do NOT name-drop — only reference scholars whose ideas you substantively engage with in the discussion`;

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
  buildPoliticalScienceDepthSection,
  buildPoliticalScienceQuizDepthSection,
  buildPoliticalScienceTutorDepthSection,
};
