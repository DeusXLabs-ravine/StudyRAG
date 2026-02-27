/**
 * Sociology-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce prompt sections that get injected into module generation,
 * quiz generation, flashcard generation, and tutor chat prompts when the subject
 * detector identifies the uploaded material as sociology content. The goal is to
 * replace generic "200-400 words" instructions with rigorous, theoretically
 * grounded, empirically informed depth that sociology students actually need.
 *
 * Each builder accepts a `subdisciplines` array (e.g. ['theory', 'stratification'])
 * produced by subjectDetector.js and returns a plain string ready for template
 * injection via `.replace('{sociology_depth_section}', ...)`.
 */

// ─── Subdiscipline-Specific Instruction Blocks ──────────────────

/**
 * Map of subdiscipline keys to their mandatory coverage requirements.
 * These get appended to the base depth section when the corresponding
 * subdiscipline is detected in the student's material.
 */
const SUBDISCIPLINE_MODULE_INSTRUCTIONS = {
  theory: `
SOCIOLOGICAL THEORY — MANDATORY COVERAGE:
- For every theorist discussed, present their key concepts using the theorist's original terminology:
  (a) Define each concept precisely as the theorist formulated it (e.g., Durkheim's "anomie," Weber's "Verstehen," Bourdieu's "habitus," "field," and "capital")
  (b) Explain the concept's role within the theorist's broader framework — how does it connect to their other concepts?
  (c) Provide the specific textual source: cite the work where the concept was introduced or most fully developed (e.g., "Durkheim, The Division of Labour in Society, 1893"; "Bourdieu, Distinction, 1984")
- Compare and contrast perspectives systematically:
  - Identify shared concerns across different theorists (e.g., both Marx and Weber address social stratification — but from fundamentally different premises)
  - Specify the precise points of agreement and disagreement
  - Explain the epistemological and ontological assumptions underlying each perspective (positivism vs. interpretivism vs. critical theory)
- Address contemporary relevance:
  - How have later sociologists developed, modified, or critiqued the original theory?
  - What contemporary social phenomena does the theory illuminate (or fail to explain)?
  - Reference neo-Marxist, neo-Weberian, or other contemporary extensions where relevant`,

  stratification: `
SOCIAL STRATIFICATION — MANDATORY COVERAGE:
- For every dimension of inequality discussed (class, income, wealth, education, health, housing, mobility):
  (a) Present statistical evidence with specific data: cite studies, datasets, or reports with dates and key findings (e.g., "According to the Gini coefficient data from the World Bank (2022), Country X has an income inequality score of...")
  (b) Identify trends over time: is this dimension of inequality increasing, decreasing, or stable? Over what period?
  (c) Make cross-national comparisons where relevant: how does inequality on this dimension vary across countries or welfare state regimes?
- Present both structural and individual-level explanations for inequality:
  - Structural explanations: labour market institutions, educational systems, tax policy, welfare state design, historical legacies (e.g., colonialism, slavery, industrialisation)
  - Individual-level explanations: human capital theory, cultural capital, rational choice — and the sociological critique of purely individualistic explanations
  - Always evaluate the relative weight of structural vs. individual factors with evidence
- Apply intersectional analysis:
  - How do class, race/ethnicity, gender, disability, and other axes of inequality interact?
  - Reference Crenshaw's intersectionality framework (1989) and subsequent developments
  - Show how outcomes for individuals at the intersection of multiple disadvantaged categories differ from what a single-axis analysis would predict
- Discuss social mobility: absolute vs. relative mobility, intergenerational vs. intragenerational mobility, and the evidence for mobility rates in the relevant context`,

  gender_race: `
GENDER, RACE, AND ETHNICITY — MANDATORY COVERAGE:
- Apply the social construction framework rigorously:
  (a) Distinguish between biological/physiological categories and socially constructed categories (sex vs. gender; phenotypic variation vs. racial categories)
  (b) Explain how social construction works: through institutions, socialisation, discourse, law, and everyday interaction
  (c) Reference key theorists: Beauvoir ("one is not born, but rather becomes, a woman"), Butler (gender performativity), Omi and Winant (racial formation theory), Hall (cultural representation)
  (d) Acknowledge that "socially constructed" does not mean "not real" — social constructions have material consequences
- Provide institutional analysis for every form of inequality discussed:
  - Identify the specific institutions that produce, reproduce, or challenge inequality (education, labour markets, criminal justice, healthcare, media, family)
  - Explain the mechanisms through which institutions generate unequal outcomes (formal rules, informal norms, implicit bias, structural barriers)
  - Discuss institutional change: what reforms have been attempted, and with what effects?
- Present empirical research findings with methodology:
  - Cite specific studies by author(s), date, and key findings
  - Describe the methodology: was this a survey, experiment, ethnography, content analysis, statistical analysis of administrative data?
  - Discuss the strengths and limitations of the methodology used
  - Distinguish between descriptive findings (what patterns exist) and causal claims (what produces those patterns)
- Address resistance, agency, and social movements: do not present marginalised groups solely as victims — discuss collective action, cultural production, and strategies of resistance`,

  research_methods: `
SOCIOLOGICAL RESEARCH METHODS — MANDATORY COVERAGE:
- For every research design discussed, provide a thorough justification:
  (a) Why is this method appropriate for the research question? What are the alternatives, and why were they not chosen?
  (b) What epistemological assumptions does this method rest on (positivism, interpretivism, critical realism)?
  (c) What type of knowledge does it produce (causal explanation, interpretive understanding, critical evaluation)?
- Cover sampling considerations in detail:
  - Identify the target population and the sampling frame
  - Discuss sampling methods: probability (random, stratified, cluster) vs. non-probability (purposive, snowball, convenience)
  - Address representativeness: can findings be generalised? To whom?
  - Discuss sample size considerations for both quantitative (statistical power) and qualitative (theoretical saturation) research
- Analyse validity and reliability:
  - Internal validity: does the research design support causal inference? Address threats (confounding, selection bias, reverse causation, omitted variable bias)
  - External validity: can findings be generalised beyond the study context?
  - Construct validity: are the measures actually measuring what they claim to measure?
  - Reliability: would the study produce the same results if repeated? (test-retest, inter-coder reliability)
- Address ethical considerations:
  - Informed consent, confidentiality, anonymity, right to withdraw
  - Power dynamics between researcher and participants (especially in ethnographic or interview-based research)
  - Institutional review board (IRB/ethics committee) requirements
  - Specific ethical challenges of the method: deception in experiments, covert observation, sensitive topics, vulnerable populations`,
};

const SUBDISCIPLINE_QUIZ_INSTRUCTIONS = {
  theory: `
- Include questions presenting a social phenomenon and requiring the student to analyse it from the perspective of a specific theorist (e.g., "How would Durkheim explain rising suicide rates in modern societies?")
- Test concept precision: present a definition and require identification of the theorist and the specific concept, or present two similar concepts and require the student to distinguish them
- Include questions requiring comparison of theoretical perspectives: "How do Marx and Weber differ in their analysis of social class?"
- Present a contemporary social issue and require application of a classical theoretical framework with justification`,

  stratification: `
- Include questions presenting statistical data on inequality (tables, charts, or textual descriptions of data) and requiring interpretation
- Test the student's ability to distinguish between structural and individual-level explanations for a given pattern of inequality
- Include questions requiring intersectional analysis: "How might the experience of poverty differ for a white woman vs. a Black woman in this context, and why?"
- Present a policy proposal and require analysis of its likely effects on different dimensions of inequality`,

  gender_race: `
- Include questions testing the student's understanding of social construction: "In what sense is [race/gender] socially constructed? Does this mean it is not real?"
- Present empirical research findings and require the student to evaluate the methodology and identify limitations
- Include questions requiring institutional analysis: "Identify three specific institutional mechanisms that contribute to [a described pattern of inequality]"
- Test the student's ability to connect micro-level interactions to macro-level patterns of inequality`,

  research_methods: `
- Include questions presenting a research scenario and requiring the student to identify the most appropriate method and justify the choice
- Test the student's ability to critique a described research design: identify threats to validity, sampling problems, or ethical concerns
- Present a set of findings and require the student to evaluate what conclusions can and cannot be drawn from the methodology used
- Include questions requiring the student to design a study: "How would you investigate [research question]? What method would you use, and why?"`,
};

const SUBDISCIPLINE_TUTOR_INSTRUCTIONS = {
  theory: `
- When discussing any theorist, always start with their key concepts in their original terminology: "Bourdieu uses the term 'habitus' to mean..."
- Prompt comparison: "We've discussed Durkheim's explanation — how would Weber approach the same question? What would he focus on differently?"
- Encourage the student to evaluate theories: "Does this theory still help us understand contemporary society? Where does it fall short?"
- Connect abstract theory to concrete examples: "Can you think of an everyday situation where Goffman's dramaturgical approach would apply?"`,

  stratification: `
- When discussing inequality, always ask for evidence: "What does the data actually show? How large is this gap, and how has it changed over time?"
- Prompt structural thinking: "You've identified an individual-level factor — but what structural conditions make that factor more or less consequential?"
- Encourage intersectional analysis: "We've discussed class — but how does gender or race interact with class position to shape this outcome?"
- Connect data to theory: "These patterns are consistent with which theoretical perspective? What would a Marxist/Weberian/Bourdieusian say about this data?"`,

  gender_race: `
- When discussing any form of inequality, always ground the discussion in empirical evidence: "What does the research show? Let's look at specific studies"
- Prompt institutional analysis: "We've identified the pattern — now, which institutions produce and reproduce it? Through what specific mechanisms?"
- Challenge essentialist thinking: "Is this a natural or inevitable difference, or is it produced by social processes? What evidence helps us decide?"
- Discuss agency alongside structure: "We've discussed the structural barriers — but how do people in this situation exercise agency and resist?"`,

  research_methods: `
- When discussing any study, always walk through the research design: "What was the research question? What method did they use? Why was that appropriate?"
- Prompt critical evaluation: "What are the threats to validity in this study? Could there be an alternative explanation for the findings?"
- Encourage methodological thinking: "If you wanted to study this question, how would you design the research? What trade-offs would you face?"
- Discuss ethics proactively: "What ethical issues arise in this type of research? How should the researcher address them?"`,
};

// ─── Builder Functions ──────────────────────────────────────────

/**
 * Build sociology-specific depth instructions for module generation.
 *
 * This replaces the generic "200-400 words" content instruction with a rigorous
 * framework demanding theoretical grounding, empirical evidence with methodology,
 * structural analysis, and critical evaluation — everything a sociology student
 * needs for exam prep and deep understanding.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['theory', 'stratification']
 * @returns {string} Prompt section to inject into module generation templates
 */
function buildSociologyDepthSection(subdisciplines = []) {
  // ── Base depth instructions (always included for any sociology content) ──
  let section = `
SOCIOLOGY MODULE DEPTH — CRITICAL INSTRUCTIONS (OVERRIDES DEFAULT WORD COUNT):

TARGET LENGTH: Each module MUST contain 600-1200 words of substantive sociological content. The generic "200-400 words" instruction does NOT apply to sociology modules. Sociology students need thorough, analytically rigorous, empirically informed material — not surface-level summaries.

MANDATORY ELEMENTS FOR EVERY MODULE:
1. CONCEPT DEFINITION WITH THEORETICAL FRAMEWORK: Every sociological concept must be defined precisely within its theoretical context:
   - Name the theorist(s) who developed or popularised the concept
   - Use the theorist's original terminology and define it clearly
   - Situate the concept within the broader theoretical tradition (functionalism, conflict theory, symbolic interactionism, feminism, poststructuralism, etc.)
   - Explain how the concept relates to other concepts in the same framework

2. THEORETICAL FRAMEWORK: Every social phenomenon discussed must be analysed through at least one major theoretical perspective. For each perspective applied:
   - State the theory's core claims and assumptions
   - Identify the key theorist(s) and their seminal works (with dates)
   - Explain what the theory predicts or explains about the phenomenon
   - Where multiple theories compete, present them and evaluate their relative explanatory power
   - Distinguish between micro-level (interaction, agency) and macro-level (structure, institution) explanations

3. EMPIRICAL EVIDENCE: Every theoretical claim must be supported by empirical evidence:
   - Cite specific studies: author(s), date, key findings (e.g., "Lareau's Unequal Childhoods (2003) found that middle-class parents engaged in 'concerted cultivation' while working-class parents practiced 'natural growth'")
   - Describe the methodology used in key studies: was it a survey, ethnography, experiment, content analysis, or statistical analysis?
   - Present statistical data where relevant: percentages, rates, Gini coefficients, odds ratios — with their sources and dates
   - Distinguish between descriptive findings and causal claims

4. METHODOLOGY: Help students understand how sociological knowledge is produced:
   - For each key finding cited, briefly note the method used and its strengths/limitations
   - Discuss how different methods might yield different insights into the same phenomenon
   - Address replicability and generalisability concerns where relevant

5. APPLICATION: Connect theoretical and empirical material to real-world phenomena:
   - Show how sociological concepts illuminate everyday experiences and current social issues
   - Demonstrate the "sociological imagination" (Mills, 1959): connecting personal troubles to public issues, biography to history
   - Use concrete, relatable examples to make abstract concepts tangible

6. CRITIQUE: For every major theory or finding presented:
   - State the strongest criticism or limitation
   - Identify who advances the critique and from what theoretical position
   - Evaluate whether the critique undermines the original claim or merely qualifies it
   - Discuss how the theory or finding has been revised in response to criticism

7. STRUCTURE: Organise each module following Concept -> Theoretical Framework -> Empirical Evidence -> Methodology -> Application -> Critique. Use markdown headings (##, ###) to separate these sections clearly.

8. CONNECT MICRO AND MACRO: Sociology operates at multiple levels of analysis. Always:
   - Show how individual experiences (micro) are shaped by institutional and structural forces (macro)
   - Show how macro-level patterns emerge from micro-level interactions and decisions
   - Discuss the role of meso-level institutions (family, school, workplace, media) in mediating between micro and macro

9. ACCURACY: NEVER fabricate study findings, researcher names, statistics, or publication dates. If uncertain about exact figures, use approximate language ("research suggests that approximately...") rather than inventing statistics. A fabricated citation undermines credibility entirely.`;

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
 * Build sociology-specific depth instructions for quiz and question generation.
 *
 * Ensures quizzes test theory application to scenarios, methodology critique,
 * data interpretation, and concept comparison — not mere recall — with questions
 * that mirror sociology assessments at the university level.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['theory', 'stratification']
 * @returns {string} Prompt section to inject into quiz generation templates
 */
function buildSociologyQuizDepthSection(subdisciplines = []) {
  let section = `
SOCIOLOGY QUIZ DEPTH — CRITICAL INSTRUCTIONS:

QUESTION DESIGN PRINCIPLES:
1. THEORY APPLICATION OVER RECALL: At least 60% of questions must test application of sociological theory to scenarios, not just definition recall. Present a social situation and require the student to identify the relevant concept, apply the appropriate theoretical framework, and evaluate its explanatory power.

2. THEORY APPLICATION TO SCENARIOS: Include questions that present a realistic social scenario (4-8 sentences) and require:
   - Identification of the sociological concept(s) at work
   - Application of a named theoretical perspective with justification
   - Explanation of the causal mechanism linking structure to outcome
   - Evaluation of what the theory explains well and what it misses

3. METHODOLOGY CRITIQUE: Include questions that present a described research study and require:
   - Identification of the research method used
   - Evaluation of the study's internal and external validity
   - Identification of potential threats to validity (confounding, selection bias, social desirability bias, Hawthorne effect)
   - Suggestion of how the study design could be improved
   - Assessment of what conclusions can and cannot be drawn from the findings

4. DATA INTERPRETATION: Include questions that present sociological data (described textually or in simple tabular form) and require:
   - Correct interpretation of what the data shows
   - Connection of the data to theoretical explanations
   - Identification of limitations in the data or methodology
   - Discussion of alternative explanations for the observed patterns

5. CONCEPT COMPARISON: Include questions that require the student to distinguish between similar or related concepts:
   - "What is the difference between [concept A] and [concept B]?"
   - "How do [theorist A] and [theorist B] define [concept] differently?"
   - Present a scenario and ask which of two similar concepts is more applicable, requiring justification
   - Test precision: distractors should include concepts that are closely related but subtly different

6. MCQ DISTRACTOR QUALITY: For multiple-choice questions, distractors (wrong answers) MUST be:
   - Plausible sociological claims that are subtly wrong or misapplied (e.g., correct theorist but wrong concept, correct concept but wrong theorist)
   - Common misconceptions from introductory sociology (e.g., confusing correlation with causation, conflating individual and structural explanations)
   - Near-misses that test precision (e.g., applying micro-level theory to a macro-level question)
   - Never include joke answers or obviously non-sociological options

7. MULTI-LEVEL ANALYSIS: Include questions that test the student's ability to connect micro and macro levels:
   - Present an individual experience and ask the student to identify the structural factors that shape it
   - Present a macro-level pattern and ask the student to explain the micro-level mechanisms that produce it
   - Test the "sociological imagination": connecting personal troubles to public issues

8. EXPLANATION DEPTH: Every question's explanation must:
   - State the correct theoretical framework with its key theorist(s) and concepts
   - Explain why each distractor is wrong, referencing the specific analytical error it contains
   - Where relevant, note how different theoretical perspectives would approach the same question
   - Cite specific studies or data that support the correct answer where applicable`;

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
 * Build sociology-specific depth instructions for tutor chat interactions.
 *
 * Ensures the AI tutor always connects micro and macro levels, cites empirical
 * studies, discusses power dynamics and structural factors, and develops the
 * student's sociological imagination — not just their knowledge of sociological
 * terminology.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['theory', 'stratification']
 * @returns {string} Prompt section to inject into tutor chat templates
 */
function buildSociologyTutorDepthSection(subdisciplines = []) {
  let section = `
SOCIOLOGY TUTOR DEPTH — CRITICAL INSTRUCTIONS:

You are tutoring a sociology student. Sociology tutoring demands theoretical rigour, empirical grounding, methodological awareness, and the development of the "sociological imagination" that generic tutoring does not. Follow these rules:

1. ALWAYS CONNECT MICRO AND MACRO LEVELS: Sociology operates at multiple levels of analysis. In every explanation:
   - Show how individual experiences are shaped by institutional and structural forces: "This personal experience is not just individual — it reflects broader patterns of..."
   - Show how macro-level patterns emerge from micro-level interactions: "This large-scale trend is produced by millions of individual decisions shaped by..."
   - Identify the meso-level institutions (family, school, workplace, media, state) that mediate between individual and structure
   - Prompt the student: "You've described an individual case — what structural factors might explain why this pattern is so common?"

2. CITE EMPIRICAL STUDIES: Every sociological claim should be grounded in research. When explaining any concept or phenomenon:
   - Reference specific studies by author(s), date, and key findings
   - Briefly note the methodology: "This was an ethnographic study of...", "This was a large-scale survey of..."
   - Discuss the strengths and limitations of the evidence
   - Prompt the student: "What evidence supports this claim? How was it produced?"
   - If the student makes an empirical claim, ask: "What research backs that up? How do we know?"

3. DISCUSS POWER DYNAMICS AND STRUCTURAL FACTORS: Sociology is centrally concerned with power, inequality, and social structure. In every relevant discussion:
   - Identify who benefits and who is disadvantaged by the arrangement under discussion
   - Analyse the role of institutions in producing, reproducing, or challenging inequality
   - Discuss how power operates: through coercion, authority, hegemony, discourse, or taken-for-granted norms
   - Prompt the student: "Who has power in this situation? How is that power exercised and maintained?"
   - Avoid purely individualistic explanations: always ask whether structural factors are at work

4. THEORETICAL PLURALISM: Sociology has multiple competing theoretical traditions. When explaining any phenomenon:
   - Present at least two theoretical perspectives and their different analyses
   - Identify what each theory highlights and what it neglects
   - Encourage the student to evaluate: "Which perspective do you find most illuminating here, and why?"
   - Do not present any single theoretical perspective as the "correct" one — sociology thrives on theoretical debate

5. DEVELOP THE SOCIOLOGICAL IMAGINATION: Help the student see the social in the personal:
   - Reference C. Wright Mills's concept (The Sociological Imagination, 1959): the ability to connect personal troubles to public issues, biography to history
   - Use everyday examples to illustrate sociological concepts: "Think about your own experience of [education/work/family] — how do sociological concepts illuminate what you've observed?"
   - Challenge common-sense or individualistic explanations: "Most people would explain this as a personal choice — but what does a sociological perspective reveal?"
   - Prompt: "How would you explain this phenomenon to someone who thinks it's purely a matter of individual effort?"

6. METHODOLOGICAL AWARENESS: Help the student think critically about evidence:
   - When citing a study, discuss its methodology and limitations
   - Prompt: "How would you study this question? What method would you choose, and what are the trade-offs?"
   - Distinguish between correlation and causation: "This study shows an association — but can we conclude causation? What would we need?"
   - Discuss ethical considerations in social research where relevant

7. EXAM PREPARATION GUIDANCE: As a sociology tutor, help the student prepare for assessments:
   - Encourage theory application: "A strong answer doesn't just describe the theory — it applies it to a specific case with evidence"
   - Remind them to engage with multiple perspectives: "An essay that only presents one theoretical view will not achieve top marks"
   - Point out common errors: "Students often confuse [concept A] with [concept B] — here's the key difference"
   - Encourage evidence-based writing: "Always cite specific studies to support your claims — vague references to 'research shows' are not sufficient"

8. CRITICAL EVALUATION: Encourage the student to evaluate, not just describe:
   - "What are the strengths and limitations of this theory/study/concept?"
   - "Does this theory still apply in contemporary society, or have conditions changed?"
   - "What would a feminist/Marxist/postcolonial critic say about this analysis?"
   - Help the student develop their own analytical voice: "What is your assessment, based on the evidence?"`;

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
  buildSociologyDepthSection,
  buildSociologyQuizDepthSection,
  buildSociologyTutorDepthSection,
};
