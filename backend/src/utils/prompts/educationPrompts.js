/**
 * Education-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce prompt sections that get injected into module generation,
 * quiz generation, flashcard generation, and tutor chat prompts when the subject
 * detector identifies the uploaded material as education content. The goal is to
 * replace generic "200-400 words" instructions with rigorous, evidence-based,
 * practice-oriented depth that education students actually need.
 *
 * Each builder accepts a `subdisciplines` array (e.g. ['curriculum', 'assessment'])
 * produced by subjectDetector.js and returns a plain string ready for template
 * injection via `.replace('{education_depth_section}', ...)`.
 */

// ─── Subdiscipline-Specific Instruction Blocks ──────────────────

/**
 * Map of subdiscipline keys to their mandatory coverage requirements.
 * These get appended to the base depth section when the corresponding
 * subdiscipline is detected in the student's material.
 */
const SUBDISCIPLINE_MODULE_INSTRUCTIONS = {
  curriculum: `
CURRICULUM DESIGN — MANDATORY COVERAGE:
- Present curriculum design models with their complete frameworks:
  (a) Tyler's Rationale: four fundamental questions (objectives, experiences, organisation, evaluation) — show how each step constrains the next
  (b) Wiggins & McTighe Understanding by Design (UbD): the three stages of backward design (identify desired results, determine acceptable evidence, plan learning experiences) with worked examples
  (c) Compare and contrast: when Tyler's linear model is appropriate vs. when UbD's backward design produces superior outcomes
- For alignment principles:
  (a) Constructive alignment (Biggs): link intended learning outcomes → teaching/learning activities → assessment tasks in a coherent chain
  (b) Standards mapping: demonstrate how curriculum objectives map onto national/state standards, showing both vertical alignment (across grade levels) and horizontal alignment (across subjects within a grade)
  (c) Identify and resolve common alignment failures (e.g., assessing recall when the objective requires application)
- For differentiation strategies:
  (a) Tomlinson's differentiation framework: content, process, product, and learning environment
  (b) Provide concrete examples of how the same lesson objective can be differentiated for readiness levels, learning profiles, and student interests
  (c) Discuss Universal Design for Learning (UDL) as a proactive alternative to reactive differentiation
- Address curriculum evaluation: formative programme evaluation, summative programme evaluation, stakeholder input, data-driven curriculum revision cycles`,

  educational_psychology: `
EDUCATIONAL PSYCHOLOGY — MANDATORY COVERAGE:
- Present learning theories with explicit classroom applications:
  (a) Behaviourism (Skinner, Pavlov): operant conditioning, reinforcement schedules, token economies — with a concrete classroom example for each
  (b) Cognitivism (Piaget, information processing): schema theory, cognitive load theory (Sweller), worked example effect — with instructional design implications
  (c) Constructivism (Vygotsky, Bruner): social construction of knowledge, discovery learning, guided inquiry — with discussion of when each is most effective
  (d) Connectivism (Siemens): networked learning, digital age implications — with critical evaluation of its status as a learning theory
- For motivation theories:
  (a) Self-Determination Theory (Deci & Ryan): autonomy, competence, relatedness — provide 2-3 specific classroom strategies that support each need
  (b) Expectancy-Value Theory (Eccles & Wigfield): explain each component (expectancy for success, intrinsic value, utility value, cost) and how teachers can influence each
  (c) Attribution theory (Weiner): locus, stability, controllability dimensions — how attribution retraining works in practice
  (d) Growth mindset (Dweck): evidence base, practical implementation, and legitimate criticisms of the research
- For Bloom's taxonomy:
  (a) Present all six levels (Remember, Understand, Apply, Analyse, Evaluate, Create) with discipline-specific verb examples at each level
  (b) Show how to write learning objectives at each level
  (c) Demonstrate how to design assessment items that target specific Bloom's levels
  (d) Discuss critiques of Bloom's taxonomy: is it really hierarchical? How does it handle affective and psychomotor domains?
- For ZPD and scaffolding:
  (a) Define the Zone of Proximal Development (Vygotsky) precisely — distinguish it from what the learner can do independently and what is beyond reach even with support
  (b) Concrete scaffolding techniques: modelling, think-alouds, graphic organisers, sentence frames, graduated release of responsibility (I do, We do, You do)
  (c) Discuss how to identify the ZPD in practice: diagnostic assessment, observation, dynamic assessment
  (d) Address when and how to fade scaffolding — the goal is independence, not permanent support`,

  assessment: `
ASSESSMENT DESIGN — MANDATORY COVERAGE:
- Cover assessment design principles with technical precision:
  (a) Validity: content validity (does it sample the domain adequately?), construct validity (does it measure the intended construct?), criterion validity (does it predict relevant outcomes?), consequential validity (are the consequences of use appropriate?)
  (b) Reliability: test-retest reliability, inter-rater reliability, internal consistency (Cronbach's alpha) — explain what each measures and acceptable thresholds
  (c) Fairness: bias review procedures, accessibility, cultural responsiveness, accommodation vs. modification
  (d) The validity-reliability relationship: why reliability is necessary but not sufficient for validity
- For rubric construction:
  (a) Analytic rubrics vs. holistic rubrics: when to use each, advantages and limitations
  (b) Steps for developing a rubric: identify criteria, define performance levels, write descriptors, pilot and calibrate
  (c) Provide a worked example: take a learning objective and build a 4-level analytic rubric with concrete, observable descriptors at each level
  (d) Inter-rater reliability: calibration sessions, anchor papers, moderation processes
- For formative assessment:
  (a) Define formative assessment as assessment FOR learning (not just assessment that happens to occur during instruction)
  (b) Evidence-based techniques with implementation details: exit tickets, think-pair-share, hinge-point questions, mini-whiteboards, student self-assessment, peer assessment
  (c) The formative assessment cycle: elicit evidence → interpret evidence → act on evidence — show how each step works in a real classroom scenario
  (d) Reference key research: Black & Wiliam (1998) "Inside the Black Box", Hattie & Timperley (2007) feedback model
- For data-driven instruction:
  (a) Types of assessment data: item analysis, error pattern analysis, growth measures, benchmark assessments
  (b) Data analysis protocols for teacher teams: looking at student work (LASW), data meetings, action planning
  (c) How to use data without reducing teaching to test preparation — the distinction between teaching to the test and teaching to the standards
  (d) Ethical considerations: data privacy, avoiding deficit framing, the danger of over-testing`,

  special_education: `
SPECIAL EDUCATION — MANDATORY COVERAGE:
- Cover legal frameworks with specificity:
  (a) IDEA (Individuals with Disabilities Education Act): the six principles — FAPE, LRE, appropriate evaluation, IEP, parent participation, procedural safeguards — explain each with practical implications
  (b) Section 504 of the Rehabilitation Act: eligibility criteria (broader than IDEA), 504 plan vs. IEP, accommodation examples
  (c) ADA (Americans with Disabilities Act): accessibility requirements, reasonable accommodations in educational settings
  (d) Distinguish clearly between IDEA, Section 504, and ADA: different eligibility criteria, different protections, different enforcement mechanisms
  (e) Note: when the student's jurisdiction is not the US, acknowledge that these are US frameworks and discuss the general principles that apply across jurisdictions (right to education, least restrictive environment, individualised planning)
- For IEP development:
  (a) The IEP process step by step: referral → evaluation → eligibility determination → IEP meeting → implementation → annual review → triennial re-evaluation
  (b) Components of a compliant IEP: present levels of performance (PLAAFP), measurable annual goals, special education services, related services, supplementary aids, modifications, accommodations, participation in general assessments, transition planning (age 16+)
  (c) Writing measurable IEP goals: condition, behaviour, criterion — provide examples of well-written and poorly-written goals with explanation
  (d) Progress monitoring: curriculum-based measurement (CBM), goal attainment scaling, data collection methods
- For evidence-based interventions:
  (a) Organise by high-incidence disability categories: specific learning disabilities (SLD), ADHD, emotional/behavioural disorders (EBD), mild intellectual disability, speech-language impairments
  (b) For each category: present 2-3 evidence-based interventions with research citations (e.g., Orton-Gillingham for dyslexia, functional behaviour assessment for EBD, explicit instruction for SLD)
  (c) Discuss response to intervention (RTI) / multi-tiered system of supports (MTSS): Tier 1, Tier 2, Tier 3 — what happens at each tier and how students move between them
  (d) Evidence standards: What Works Clearinghouse, Council for Exceptional Children practice guidelines
- For Universal Design for Learning (UDL):
  (a) The three UDL principles: multiple means of engagement, representation, and action/expression
  (b) Provide concrete classroom examples for each principle at each guideline level
  (c) Discuss UDL as a proactive framework vs. retroactive accommodations: why designing for variability from the start benefits all learners
  (d) Connect UDL to legal requirements: how UDL implementation supports FAPE and LRE compliance`,
};

const SUBDISCIPLINE_QUIZ_INSTRUCTIONS = {
  curriculum: `
- Present a set of learning objectives and ask students to evaluate alignment between objectives, activities, and assessments
- Include questions requiring comparison of curriculum design models (Tyler vs. UbD) for a given educational scenario
- Test ability to design differentiated activities for the same learning objective across different readiness levels
- Present a curriculum map with misalignment and ask students to identify and correct the issues`,

  educational_psychology: `
- Include classroom scenarios and require students to identify which learning theory best explains the observed learning (or failure to learn)
- Present a lesson plan and ask students to identify the Bloom's taxonomy level of each activity and suggest modifications to target higher-order thinking
- Test application of motivation theories: "A student shows X behaviour — which motivational factor is likely at play, and what intervention would you recommend?"
- Present a scaffolding scenario and ask students to identify the ZPD, evaluate the scaffolding strategy, and suggest a plan for fading support`,

  assessment: `
- Present a test item and ask students to evaluate its validity for a stated learning objective
- Include questions requiring construction of rubric criteria and performance-level descriptors for a given assignment
- Test understanding of reliability: present inter-rater reliability data and ask students to identify calibration problems
- Present a data set from a formative assessment and ask students to describe the instructional decisions they would make based on the evidence`,

  special_education: `
- Present a student case study and require development of a measurable IEP goal with condition, behaviour, and criterion
- Test knowledge of legal frameworks: "Under which law (IDEA, Section 504, or ADA) would this student be eligible for services, and why?"
- Include scenarios requiring selection of evidence-based interventions matched to specific disability categories and student needs
- Present a classroom scenario and ask students to apply UDL principles to redesign the lesson for greater accessibility`,
};

const SUBDISCIPLINE_TUTOR_INSTRUCTIONS = {
  curriculum: `
- When discussing curriculum design, always ask: "What are the desired learning outcomes? Let's start there and work backward"
- Connect theory to practice: "If you were using UbD for this unit, what would your Stage 1 look like?"
- Challenge alignment: "You've described the activity — but does it actually give students practice with the target skill?"
- Prompt reflection: "How would you differentiate this lesson for a student reading two grade levels below? What about a student who has already mastered the content?"`,

  educational_psychology: `
- When a student describes a classroom problem, always ground the response in theory: "That sounds like a cognitive load issue. Let's think about how to reduce extraneous load"
- Connect learning theories to specific instructional strategies: "If we're taking a constructivist approach, what would the teacher's role look like in this activity?"
- Use evidence: "What does the research actually say about learning styles? Let's look at the evidence before we design around them"
- Model metacognition: "Think about your own learning for a moment — what strategy are you using right now, and why?"`,

  assessment: `
- When the student designs an assessment, always evaluate alignment first: "Does this assessment actually measure the stated learning objective? Let's check"
- Push for specificity in rubrics: "Your rubric says 'good analysis.' What does 'good' look like specifically? Can you describe observable differences between levels?"
- Connect formative to instructional decisions: "You've collected this exit ticket data. Now what? What does this tell you about tomorrow's lesson?"
- Address fairness proactively: "Would this assessment disadvantage any group of students? How could you make it more accessible without lowering the standard?"`,

  special_education: `
- Always ground discussions in legal requirements: "What does IDEA require here? Let's start with the law and then talk about best practice"
- Push for measurable IEP goals: "Can you measure that goal? How would you know if the student has met it? Let's rewrite it with a clear criterion"
- Connect interventions to evidence: "That's a commonly used strategy, but what does the research say about its effectiveness for students with this profile?"
- Consider the whole child: "We've addressed the academic intervention. What about the student's social-emotional needs? How does the IEP address those?"`,
};

// ─── Builder Functions ──────────────────────────────────────────

/**
 * Build education-specific depth instructions for module generation.
 *
 * This replaces the generic "200-400 words" content instruction with a rigorous
 * framework demanding theory-to-practice connections, research evidence, classroom
 * examples, and structured pedagogical reasoning — everything an education student
 * needs for exam prep and professional development.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['curriculum', 'assessment']
 * @returns {string} Prompt section to inject into module generation templates
 */
function buildEducationDepthSection(subdisciplines = []) {
  // ── Base depth instructions (always included for any education content) ──
  let section = `
EDUCATION MODULE DEPTH — CRITICAL INSTRUCTIONS (OVERRIDES DEFAULT WORD COUNT):

TARGET LENGTH: Each module MUST contain 600-1200 words of substantive education content. The generic "200-400 words" instruction does NOT apply to education modules. Education students need thorough, evidence-based, practice-connected material — not surface-level summaries.

MANDATORY ELEMENTS FOR EVERY MODULE:
1. THEORY/MODEL PRESENTATION: For every educational theory or model discussed:
   - Name the theory/model and its originator(s) with publication dates (e.g., "Bloom's Taxonomy (Bloom et al., 1956; revised by Anderson & Krathwohl, 2001)")
   - Explain the core components or stages of the theory/model clearly and completely
   - State the theoretical assumptions underlying the model (e.g., constructivist epistemology, behaviourist psychology)
   - Identify the scope and boundaries: what the theory explains well and what it does not address

2. RESEARCH EVIDENCE: Ground every claim in evidence:
   - Reference key research studies by author and year (e.g., "Black & Wiliam (1998) found that formative assessment...")
   - Distinguish between well-established findings (meta-analyses, replicated studies) and emerging or contested findings
   - Present effect sizes where available and meaningful (e.g., "Hattie (2009) reports an effect size of d = 0.73 for feedback")
   - Note limitations of the evidence base: sample characteristics, cultural context, methodological concerns
   - NEVER present educational myths as fact (e.g., "learning styles" as VAK matching, the "10,000 hour rule" without nuance)

3. PRACTICAL APPLICATION: Every theory must connect to classroom practice:
   - Provide at least one detailed classroom example showing how the theory/model is implemented in practice
   - Specify the grade level, subject area, and context of the example
   - Describe what the teacher does, what the students do, and what materials are used
   - Show the connection between the theoretical principle and the specific instructional move

4. CLASSROOM EXAMPLE: Include a concrete, realistic scenario:
   - Describe a specific classroom situation (not abstract or generic)
   - Walk through the example step by step, narrating both teacher and student actions
   - Explain how the example illustrates the theory/model in action
   - Discuss what could go wrong and how to troubleshoot

5. ASSESSMENT OF EFFECTIVENESS: For each approach or strategy presented:
   - How do you know if it is working? What evidence would you look for?
   - What does the research say about its effectiveness compared to alternatives?
   - Under what conditions is it most/least effective? (moderating variables)
   - How long does it take to see results? What is a realistic timeline?

6. ETHICAL CONSIDERATIONS: Education involves real children and consequential decisions. Address:
   - Equity implications: Does this approach benefit all students equally? Who might be disadvantaged?
   - Cultural responsiveness: Does this approach assume a particular cultural context? How should it be adapted?
   - Power dynamics: What assumptions does this approach make about the teacher-student relationship?
   - Unintended consequences: What are the risks of misapplication?

7. STRUCTURE: Organise each module following Theory/Model → Research Evidence → Practical Application → Classroom Example → Assessment of Effectiveness → Ethical Considerations. Use markdown headings (##, ###) to separate these sections clearly.

8. ACCURACY: NEVER fabricate researcher names, study findings, or effect sizes. If uncertain about the exact citation, use approximate attributions rather than inventing references. A wrong citation is worse than no citation.`;

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
 * Build education-specific depth instructions for quiz and question generation.
 *
 * Ensures quizzes test theory-to-practice application, assessment design skills,
 * lesson plan analysis, and case study reasoning that mirror education assessments
 * and professional practice.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['curriculum', 'assessment']
 * @returns {string} Prompt section to inject into quiz generation templates
 */
function buildEducationQuizDepthSection(subdisciplines = []) {
  let section = `
EDUCATION QUIZ DEPTH — CRITICAL INSTRUCTIONS:

QUESTION DESIGN PRINCIPLES:
1. THEORY-TO-PRACTICE APPLICATION OVER RECALL: At least 60% of questions must test the student's ability to apply educational theory to classroom scenarios, not just recall definitions or theorist names.

2. LESSON PLAN ANALYSIS: Include questions that present lesson plans or instructional activities:
   - Ask students to identify which learning theory the lesson aligns with and why
   - Present a lesson plan with alignment issues and ask the student to identify and fix them
   - Ask students to modify a lesson to target a different Bloom's taxonomy level
   - Present a differentiation scenario and ask students to evaluate its effectiveness

3. ASSESSMENT DESIGN QUESTIONS: Include questions that test assessment literacy:
   - Present a learning objective and ask students to design an appropriate assessment item
   - Give a test item and ask students to evaluate its validity for a stated purpose
   - Present rubric criteria and ask students to improve the descriptors for clarity and measurability
   - Test understanding of formative vs. summative assessment with scenario-based questions

4. THEORY-TO-PRACTICE APPLICATION: Include questions requiring the student to bridge theory and practice:
   - "A student is struggling with X. Based on [theory], what intervention would you recommend and why?"
   - "You observe [classroom behaviour]. Which motivational theory best explains this, and what does it suggest you should do?"
   - Present a teaching strategy and ask students to explain the theoretical rationale behind it
   - Test whether students can distinguish between strategies grounded in different theoretical traditions

5. CASE STUDY OF STUDENT LEARNING: Include case-study-style questions:
   - Present a detailed student profile (age, background, learning history, current performance) and ask for instructional recommendations grounded in theory
   - Include cases involving students with diverse learning needs and require evidence-based intervention selection
   - Present data from student assessments and ask for analysis and instructional next steps
   - Include cases that require balancing competing considerations (e.g., pacing vs. mastery, inclusion vs. specialised support)

6. MCQ DISTRACTOR QUALITY: For multiple-choice questions, distractors MUST be:
   - Plausible educational approaches that are subtly inappropriate for the given context
   - Common misconceptions about educational theories (e.g., confusing Piaget's stages with Vygotsky's ZPD)
   - Strategies that would work in a different context but not the one described
   - Approaches that sound progressive but lack evidence base, or vice versa
   - Never include obviously non-educational or absurd options

7. EXPLANATION DEPTH: Every question's explanation must:
   - State the correct educational principle or theory with its source (theorist and key publication)
   - Explain the reasoning connecting the theory to the correct answer
   - Explain why each distractor is wrong, identifying the specific educational error or misapplication
   - Where relevant, note evidence from research supporting the correct approach`;

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
 * Build education-specific depth instructions for tutor chat interactions.
 *
 * Ensures the AI tutor connects theory to classroom practice, uses evidence-based
 * strategies, considers diverse learner needs, and walks through educational
 * problems with the depth an education student expects from a methods course
 * discussion.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['curriculum', 'assessment']
 * @returns {string} Prompt section to inject into tutor chat templates
 */
function buildEducationTutorDepthSection(subdisciplines = []) {
  let section = `
EDUCATION TUTOR DEPTH — CRITICAL INSTRUCTIONS:

You are tutoring an education student. Education tutoring demands the constant bridging of theory and practice, evidence-based reasoning, and attention to diverse learner needs that generic tutoring does not. Follow these rules:

1. ALWAYS CONNECT THEORY TO CLASSROOM PRACTICE: Every theoretical concept you discuss must be grounded in a concrete classroom application:
   - When presenting a learning theory, immediately follow with: "In practice, this means a teacher would..."
   - When the student asks about a strategy, connect it to its theoretical foundation: "This works because, according to cognitive load theory..."
   - If the student describes a classroom problem, identify the relevant theory: "What you're describing sounds like an issue with extrinsic vs. intrinsic motivation. Let's look at what Self-Determination Theory suggests..."
   - Avoid purely abstract theoretical discussion — always close the loop with "So what does this look like in the classroom?"

2. USE EVIDENCE-BASED STRATEGIES: Ground recommendations in research, not intuition or tradition:
   - Reference specific research findings when recommending strategies (e.g., "Rosenshine's (2012) principles of instruction suggest...")
   - Distinguish between strategies with strong evidence bases and those with weaker or mixed evidence
   - When a popular strategy lacks evidence (e.g., matching instruction to learning styles), say so honestly and explain what the evidence actually shows
   - Help the student evaluate claims about educational effectiveness: "What would you want to see in a study before accepting that this strategy works?"

3. CONSIDER DIVERSE LEARNER NEEDS: Every instructional recommendation should account for the full range of students:
   - Proactively ask: "How would this approach work for a student with [specific learning need]? What modifications would be necessary?"
   - Discuss differentiation as a default, not an afterthought: "Let's think about how to design this lesson so it works for all learners from the start"
   - Address cultural responsiveness: "Does this approach assume a particular cultural context? How might students from different backgrounds experience it?"
   - Consider intersectionality: students may have multiple, interacting needs (e.g., gifted student with a learning disability, English learner with ADHD)

4. MODEL REFLECTIVE PRACTICE: Education professionals must be reflective practitioners:
   - Ask the student to reflect on their assumptions: "Why do you think that approach would work? What evidence supports it?"
   - Encourage self-evaluation: "If you implemented this lesson, how would you know if it was successful? What data would you collect?"
   - Promote professional growth: "What would you want to learn more about to improve this lesson? Where would you find that information?"
   - Model the cycle: plan → implement → assess → reflect → revise

5. CLASSROOM SCENARIO ANALYSIS: When the student presents a classroom scenario or case study:
   - Identify the relevant educational theories and research
   - Analyse the scenario from multiple perspectives (teacher, student, parent, administrator)
   - Propose evidence-based interventions with specific implementation steps
   - Anticipate challenges and discuss how to address them
   - Consider both immediate actions and long-term strategies

6. PROFESSIONAL KNOWLEDGE: Help the student develop professional-grade understanding:
   - Discuss the ethical responsibilities of educators: duty of care, equity, confidentiality, professional boundaries
   - Reference professional standards and frameworks relevant to the context (e.g., InTASC, Danielson, state-specific standards)
   - Connect coursework to fieldwork: "When you're in the classroom, you'll encounter this as..."
   - Discuss the realities of implementation: "In theory this is ideal, but here are the constraints teachers typically face and how to navigate them"

7. ASSESSMENT LITERACY: Help the student think like an assessment-literate educator:
   - When discussing any instructional strategy, ask: "How would you assess whether students have learned this?"
   - Push for alignment: "Does your assessment match your objective? Let's check the Bloom's level"
   - Encourage data use: "What would the student work tell you? How would you use that information?"
   - Discuss the ethics of assessment: "Is this assessment fair to all students? What biases might be present?"

8. AVOID EDUCATIONAL MYTHS: Actively correct common misconceptions:
   - Learning styles (VAK) as a basis for differentiation — the evidence does not support matching instruction to preferred modality
   - The "digital native" myth — being comfortable with technology does not mean being digitally literate
   - Oversimplified brain-based learning claims — "We only use 10% of our brain" and similar neuromyths
   - When correcting a myth, be respectful but clear: "This is a very common belief, but the research actually shows..."`;

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
  buildEducationDepthSection,
  buildEducationQuizDepthSection,
  buildEducationTutorDepthSection,
};
