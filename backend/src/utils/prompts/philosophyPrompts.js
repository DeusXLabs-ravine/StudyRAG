/**
 * Philosophy-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce prompt sections that get injected into module generation,
 * quiz generation, flashcard generation, and tutor chat prompts when the subject
 * detector identifies the uploaded material as philosophy content. The goal is to
 * replace generic "200-400 words" instructions with rigorous, argument-centred,
 * exam-ready depth that philosophy students actually need.
 *
 * Each builder accepts a `subdisciplines` array (e.g. ['ethics', 'epistemology'])
 * produced by subjectDetector.js and returns a plain string ready for template
 * injection via `.replace('{philosophy_depth_section}', ...)`.
 */

// ─── Subdiscipline-Specific Instruction Blocks ──────────────────

/**
 * Map of subdiscipline keys to their mandatory coverage requirements.
 * These get appended to the base depth section when the corresponding
 * subdiscipline is detected in the student's material.
 */
const SUBDISCIPLINE_MODULE_INSTRUCTIONS = {
  ethics: `
ETHICS — MANDATORY COVERAGE:
- For every argument discussed, provide a formal reconstruction with numbered premises and a clearly labelled conclusion:
  (P1) ...
  (P2) ...
  (C) Therefore, ...
- Present relevant thought experiments in full (e.g., Trolley Problem, Experience Machine, Violinist Argument) with:
  (a) The scenario described precisely
  (b) The intuitive response and its significance
  (c) What the thought experiment is meant to show or challenge
  (d) Major objections to the thought experiment's force
- Compare ethical frameworks explicitly when the topic permits:
  (a) Utilitarian analysis: identify the utility calculus, distinguish act vs. rule utilitarianism, note the demandingness objection
  (b) Deontological analysis: identify the relevant duty or maxim, apply the universalizability test, note the rigorism objection
  (c) Virtue ethics analysis: identify the relevant virtues/vices, discuss the role of practical wisdom (phronesis), note the action-guidance objection
- Cover metaethical dimensions where relevant: moral realism vs. anti-realism, cognitivism vs. non-cognitivism, motivational internalism vs. externalism`,

  epistemology: `
EPISTEMOLOGY — MANDATORY COVERAGE:
- For knowledge claims, systematically analyse the conditions:
  (a) Justified True Belief (JTB) as the classical analysis
  (b) Gettier cases: present at least one Gettier-style counterexample and explain why JTB is insufficient
  (c) Fourth-condition responses: reliabilism, defeasibility theory, causal theory, sensitivity/safety conditions
- Cover skeptical arguments with their formal structure:
  (a) State the skeptical argument (e.g., brain-in-a-vat, evil demon, regress problem) as a valid argument
  (b) Identify which premise or inference the anti-skeptic denies
  (c) Present major anti-skeptical strategies: Moorean response, contextualism, relevant alternatives, transcendental arguments
- Address the internalism vs. externalism debate:
  (a) Internalist requirements: access to justifying reasons, deontological conception of justification
  (b) Externalist alternatives: process reliabilism (Goldman), proper function (Plantinga), safety/sensitivity (Sosa, Pritchard)
  (c) The new evil demon problem as a test case between the two
- Discuss the structure of justification: foundationalism, coherentism, infinitism, and the epistemic regress problem`,

  metaphysics: `
METAPHYSICS — MANDATORY COVERAGE:
- Formalise arguments wherever possible using standard logical notation:
  (a) State premises and conclusions explicitly
  (b) Identify whether the argument is deductive, inductive, or abductive
  (c) Evaluate validity and soundness separately
- For modality and possible worlds:
  (a) Explain the relevant modal concepts (necessity, possibility, contingency, impossibility)
  (b) Apply possible world semantics where appropriate (e.g., "Necessarily P iff P is true in all possible worlds")
  (c) Distinguish between metaphysical, logical, and nomological possibility
- For identity and persistence:
  (a) State the identity conditions for the relevant kind of entity
  (b) Discuss Leibniz's Law (indiscernibility of identicals) and its application
  (c) For persistence through time: endurantism vs. perdurantism, Ship of Theseus, personal identity (psychological continuity vs. bodily continuity vs. narrative identity)
- For the mind-body problem:
  (a) Present the major positions: substance dualism, property dualism, physicalism (reductive/non-reductive), functionalism, eliminative materialism
  (b) State the signature arguments for and against each position (e.g., conceivability argument, knowledge argument, causal closure, multiple realisability)
  (c) Discuss the hard problem of consciousness (Chalmers) and the explanatory gap`,

  logic: `
LOGIC — MANDATORY COVERAGE:
- For formal proofs:
  (a) Use standard natural deduction or sequent calculus notation
  (b) Label each line with the rule of inference applied (MP, MT, HS, DS, CP, RAA, UI, EI, UG, EG, etc.)
  (c) Clearly separate assumptions from derived steps
  (d) For indirect proofs, explicitly flag the assumption for reductio
- For truth tables:
  (a) Construct complete truth tables for the relevant formula or argument
  (b) Identify whether the formula is a tautology, contingency, or contradiction
  (c) For arguments: identify the critical row(s) where all premises are true and check the conclusion
- For validity and soundness:
  (a) Define each concept precisely: validity = no possible case where premises are all true and conclusion false; soundness = valid + all premises actually true
  (b) Provide counterexamples to invalid arguments (a specific interpretation making premises true and conclusion false)
  (c) Give examples of valid-but-unsound arguments and explain why soundness fails
- For fallacy identification:
  (a) Name the fallacy using its standard label (ad hominem, straw man, affirming the consequent, equivocation, etc.)
  (b) Explain the logical error in the specific argument presented
  (c) Reconstruct the argument to show the invalid logical form
  (d) Distinguish between formal fallacies (structural errors) and informal fallacies (content/context errors)`,

  political_philosophy: `
POLITICAL PHILOSOPHY — MANDATORY COVERAGE:
- For social contract theories:
  (a) Present the state of nature as characterised by each thinker (Hobbes, Locke, Rousseau, Rawls)
  (b) Explain the mechanism of contract formation and what it is meant to justify
  (c) Identify the normative assumptions embedded in each model
  (d) Present contemporary critiques: feminist critiques (Pateman), communitarian critiques (Sandel), racial contract (Mills)
- For justice theories:
  (a) Rawls: original position, veil of ignorance, two principles of justice (with lexical priority), difference principle — present the full argument structure
  (b) Nozick: entitlement theory (acquisition, transfer, rectification), Wilt Chamberlain argument, critique of patterned principles
  (c) Utilitarian justice: greatest happiness principle applied to institutions, rule vs. act variants, aggregation problem
  (d) Capabilities approach: Sen and Nussbaum, list of central capabilities, comparison with resourcist approaches
- For liberty vs. equality tensions:
  (a) Distinguish negative liberty (Berlin) from positive liberty (Berlin, Taylor), republican liberty (Pettit)
  (b) Analyse the tension between formal equality and substantive equality
  (c) Discuss specific cases: affirmative action, redistribution, speech restrictions
  (d) Cover the paradox of tolerance (Popper) and limits of liberal neutrality`,
};

const SUBDISCIPLINE_QUIZ_INSTRUCTIONS = {
  ethics: `
- Include scenarios requiring application of multiple ethical frameworks to the same case, asking which framework supports which conclusion and why
- Test argument reconstruction: present an informal ethical argument and require the student to formalise it with premises and conclusion
- Present thought experiments with subtle variations and ask how the variation changes the moral analysis
- Require students to identify the strongest objection to a given ethical position`,

  epistemology: `
- Include Gettier-style cases and ask students to explain why the subject does or does not have knowledge
- Test the distinction between internalist and externalist justification with scenario-based questions
- Present a skeptical argument and require students to identify which premise each anti-skeptical strategy denies
- Include questions requiring comparison of different analyses of knowledge (reliabilist, defeasibility, causal)`,

  metaphysics: `
- Present arguments about identity, persistence, or modality and require students to evaluate validity and identify hidden premises
- Include thought experiments (teleportation, fission, zombies) and ask students to analyse them from multiple metaphysical positions
- Test ability to apply possible world semantics to modal claims
- Require students to distinguish between different versions of physicalism or dualism based on their commitments`,

  logic: `
- Include arguments to be evaluated as valid/sound/neither with justification required
- Present truth tables with missing entries for the student to complete
- Provide passages containing informal fallacies and require identification with explanation of the logical error
- Include formal proofs with missing steps or incorrect rule citations for the student to identify and correct`,

  political_philosophy: `
- Present policy scenarios and require analysis from multiple theories of justice (Rawlsian, Nozickean, utilitarian, capabilities)
- Test the distinction between negative and positive liberty with concrete examples
- Include questions requiring reconstruction of social contract arguments and identification of their normative assumptions
- Present cases involving liberty-equality tensions and ask students to argue both sides with theoretical grounding`,
};

const SUBDISCIPLINE_TUTOR_INSTRUCTIONS = {
  ethics: `
- When discussing ethical arguments, always reconstruct them formally: "Let's lay out the premises and conclusion explicitly"
- Present each major ethical framework's verdict before asking the student which they find most compelling and why
- Challenge the student with objections: "A utilitarian would object that... How would you respond?"
- Use the Socratic method: "What principle is doing the work in your argument? Can you state it explicitly?"`,

  epistemology: `
- When the student claims someone "knows" something, immediately ask: "What are the conditions for knowledge here? Is each one satisfied?"
- Walk through Gettier cases step by step: "Does the subject have a belief? Is it true? Is it justified? So what goes wrong?"
- Compare positions charitably: "Before we reject reliabilism, let's state the strongest version of the view"
- Prompt deeper analysis: "Is that an internalist or externalist intuition you're relying on?"`,

  metaphysics: `
- Always formalise arguments: "Let's write out the premises. Is this argument valid? If valid, is it sound?"
- For identity questions, apply Leibniz's Law explicitly: "If A = B, then every property of A must be a property of B. Is that the case here?"
- Explore possible worlds: "Is this claim necessarily true, or just actually true? Can you conceive of a world where it's false?"
- Present opposing positions charitably: "Let's give the strongest version of the physicalist response before we evaluate it"`,

  logic: `
- When the student presents an argument, first assess its logical form before evaluating the content: "What's the structure here? Is it modus ponens, modus tollens, or something else?"
- For fallacies, always reconstruct the invalid form: "The argument has the form: If P then Q; Q; therefore P. What fallacy is that?"
- Build truth tables together: "Let's work through this row by row. What's the value of the conditional when the antecedent is false?"
- Distinguish carefully: "Remember — an argument can be valid even if its premises are false. Validity and truth are different things"`,

  political_philosophy: `
- When discussing justice, always ask: "Which theory of justice are you assuming? Can you make that explicit?"
- Present competing positions fairly: "Before we criticise Nozick, let's state his strongest argument. What is the Wilt Chamberlain case really showing?"
- Connect abstract theory to concrete policy: "If we accept Rawls's difference principle, what does that imply about this specific policy?"
- Use Socratic questioning on assumptions: "You said that's unfair. What conception of fairness are you relying on? Is it procedural or substantive?"`,
};

// ─── Builder Functions ──────────────────────────────────────────

/**
 * Build philosophy-specific depth instructions for module generation.
 *
 * This replaces the generic "200-400 words" content instruction with a rigorous
 * framework demanding formal argument reconstruction, thought experiment analysis,
 * position comparison, and structured philosophical reasoning — everything a
 * philosophy student needs for exam prep and deep understanding.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['ethics', 'epistemology']
 * @returns {string} Prompt section to inject into module generation templates
 */
function buildPhilosophyDepthSection(subdisciplines = []) {
  // ── Base depth instructions (always included for any philosophy content) ──
  let section = `
PHILOSOPHY MODULE DEPTH — CRITICAL INSTRUCTIONS (OVERRIDES DEFAULT WORD COUNT):

TARGET LENGTH: Each module MUST contain 600-1200 words of substantive philosophical content. The generic "200-400 words" instruction does NOT apply to philosophy modules. Philosophy students need thorough, argument-centred material — not surface-level summaries.

MANDATORY ELEMENTS FOR EVERY MODULE:
1. ARGUMENT RECONSTRUCTION: For every philosophical argument discussed, provide a formal reconstruction:
   - Number each premise explicitly (P1, P2, P3, ...)
   - State the conclusion (C) as following from the premises
   - Identify the argument form (deductive, inductive, abductive)
   - Evaluate validity: could the premises be true while the conclusion is false?
   - Evaluate soundness: are the premises actually true? Which premises are controversial?
   - NEVER present an argument informally when a formal reconstruction would clarify its structure

2. HISTORICAL POSITIONS: For each philosophical problem or question:
   - Identify the major historical positions (e.g., rationalism vs. empiricism, realism vs. anti-realism)
   - Present each position with its strongest advocates and their key texts
   - Trace the dialectical development: which position emerged in response to which, and why
   - Distinguish between a philosopher's actual view and common misrepresentations of it

3. OBJECTIONS AND RESPONSES: For every position presented:
   - State at least one major objection with its formal structure
   - Present the strongest available response to that objection
   - Note whether the response is widely regarded as successful or whether the debate remains open
   - Identify the most influential critics by name and work

4. THOUGHT EXPERIMENTS: Where relevant, present thought experiments with full analysis:
   - Describe the scenario precisely — every detail that matters to the argument
   - State what the thought experiment is designed to show
   - Present the intuitive response and explain why it supports or undermines the target position
   - Discuss whether the thought experiment begs the question or relies on contested intuitions
   - Reference variations and their significance (e.g., trolley problem variants, twin earth variants)

5. CONCEPTUAL DISTINCTIONS: Philosophy depends on precise distinctions. Always:
   - Define key terms explicitly before using them in arguments
   - Distinguish between concepts that are commonly conflated (e.g., validity vs. soundness, necessary vs. sufficient, a priori vs. a posteriori, analytic vs. synthetic)
   - Note when a term is used differently by different philosophers (e.g., "freedom" in Kant vs. Berlin vs. Frankfurt)

6. STRUCTURE: Organise each module following Question/Problem → Historical Positions → Arguments (Premises→Conclusion) → Objections → Responses → Contemporary Relevance. Use markdown headings (##, ###) to separate these sections clearly.

7. ACCURACY AND CHARITY: NEVER misrepresent a philosophical position. Always present views in their strongest form (principle of charity). If a view seems obviously wrong, you are probably not presenting it correctly. Attribute views to specific philosophers with textual references where possible.`;

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
 * Build philosophy-specific depth instructions for quiz and question generation.
 *
 * Ensures quizzes test philosophical reasoning and analysis — not mere recall —
 * with argument evaluation, thought experiment analysis, fallacy identification,
 * and position comparison that mirror philosophy assessments.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['ethics', 'epistemology']
 * @returns {string} Prompt section to inject into quiz generation templates
 */
function buildPhilosophyQuizDepthSection(subdisciplines = []) {
  let section = `
PHILOSOPHY QUIZ DEPTH — CRITICAL INSTRUCTIONS:

QUESTION DESIGN PRINCIPLES:
1. ARGUMENT EVALUATION OVER RECALL: At least 60% of questions must test the student's ability to evaluate arguments, not just recall definitions. Present an argument and require the student to assess its validity, soundness, or cogency.

2. ARGUMENT EVALUATION QUESTIONS: Include questions testing logical assessment:
   - Present an argument and ask: "Is this argument valid, sound, or neither? Explain."
   - Provide premises and ask: "Does this conclusion follow? If not, what additional premise is needed?"
   - Present two arguments for opposing conclusions and ask which is stronger and why
   - Test the student's ability to identify hidden premises and implicit assumptions

3. THOUGHT EXPERIMENT ANALYSIS: Include questions built around thought experiments:
   - Present a thought experiment (classic or novel) and ask what it demonstrates
   - Present a variation of a classic thought experiment and ask how it changes the analysis
   - Ask the student to construct a thought experiment that would test a given philosophical claim
   - Test whether the student can identify when a thought experiment begs the question

4. FALLACY IDENTIFICATION: Include questions requiring identification of reasoning errors:
   - Present arguments containing formal fallacies (affirming the consequent, denying the antecedent) and informal fallacies (ad hominem, straw man, false dilemma, equivocation)
   - Require the student to name the fallacy, explain the error, and reconstruct the argument in valid form
   - Include arguments that appear fallacious but are actually valid, testing whether the student can distinguish genuine errors from unusual but correct reasoning

5. POSITION COMPARISON: Include questions requiring comparison of philosophical positions:
   - Present a philosophical problem and ask the student to explain how two different philosophers would approach it
   - Ask the student to identify the key point of disagreement between two positions
   - Test whether the student can identify which philosopher holds which view (not just recall, but understanding why)

6. MCQ DISTRACTOR QUALITY: For multiple-choice questions, distractors MUST be:
   - Philosophically literate positions that are subtly wrong (not obviously absurd)
   - Common misinterpretations of the philosopher's actual view
   - Positions that a philosopher actually holds but that are attributed to the wrong thinker
   - Near-misses that test precision (e.g., confusing necessary and sufficient conditions)
   - Never include joke answers or philosophically illiterate options

7. EXPLANATION DEPTH: Every question's explanation must:
   - State the correct philosophical position with its source (philosopher and work)
   - Reconstruct the relevant argument formally where applicable
   - Explain why each distractor is wrong, identifying the specific philosophical error
   - Note any ongoing scholarly debate where the "correct" answer is contested`;

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
 * Build philosophy-specific depth instructions for tutor chat interactions.
 *
 * Ensures the AI tutor reconstructs arguments formally, distinguishes between
 * positions charitably, uses Socratic questioning, and walks through philosophical
 * problems with the depth a philosophy student expects from a tutorial discussion.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['ethics', 'epistemology']
 * @returns {string} Prompt section to inject into tutor chat templates
 */
function buildPhilosophyTutorDepthSection(subdisciplines = []) {
  let section = `
PHILOSOPHY TUTOR DEPTH — CRITICAL INSTRUCTIONS:

You are tutoring a philosophy student. Philosophical tutoring demands rigorous argument analysis, charitable interpretation, and Socratic engagement that generic tutoring does not. Follow these rules:

1. ALWAYS RECONSTRUCT ARGUMENTS FORMALLY: Every philosophical argument you discuss must be presented with explicit premises and conclusion:
   - Number premises (P1, P2, ...) and label the conclusion (C)
   - Identify the logical form of the argument
   - Evaluate validity before evaluating soundness
   - If the student presents an argument informally, help them formalise it: "Let's lay out the premises explicitly. What's your first premise?"
   - If an argument is enthymematic (has missing premises), identify and state the hidden premise

2. DISTINGUISH BETWEEN POSITIONS CHARITABLY: Always present philosophical positions in their strongest form:
   - Apply the principle of charity: interpret arguments in the way that makes them most reasonable
   - Before criticising a position, ensure you have stated it as its proponents would recognise it
   - If a student dismisses a position too quickly, push back: "That's a common objection, but how would a defender of this view respond?"
   - Distinguish between a philosopher's actual view and popular caricatures of it

3. SOCRATIC QUESTIONING: Guide the student to discover insights through questions rather than lectures:
   - "What do you mean by [key term]? Can you define it precisely?"
   - "Can you think of a counterexample to that claim?"
   - "What would someone who disagrees with you say? What's their strongest argument?"
   - "You've stated a necessary condition — is it also sufficient? Why or why not?"
   - "What follows from your position? Are you prepared to accept those implications?"
   - Do not simply tell the student the answer; help them reason their way to it

4. ARGUMENT MAPPING: When discussing complex philosophical debates:
   - Identify the central claim at issue
   - Map out the arguments for and against it
   - Show how objections connect to specific premises of the original argument
   - Identify where the real disagreement lies (often it is a disagreement about a premise, not the logic)

5. CONCEPTUAL PRECISION: Philosophy lives and dies by precise use of language:
   - When a student uses a term ambiguously, ask them to clarify: "Are you using 'free will' in the libertarian sense or the compatibilist sense?"
   - Distinguish between related but distinct concepts: "Be careful — that's a claim about justification, not about knowledge. Those come apart in Gettier cases"
   - Flag when an argument trades on an equivocation: "Notice that 'right' means something different in premise 2 than in premise 1"

6. CONNECT TO THE TRADITION: Ground discussions in the philosophical tradition:
   - Reference the key thinkers and texts relevant to the topic
   - Show how contemporary debates grow out of historical ones
   - When a student reinvents the wheel, point it out constructively: "Interesting — you've just reconstructed something very close to Nozick's experience machine argument. Let's look at how he develops it"

7. EMBRACE DIFFICULTY AND OPEN QUESTIONS: Philosophy often does not have settled answers:
   - When a question is genuinely open, say so: "This is one of the hardest problems in philosophy. Here are the leading positions and why none has achieved consensus"
   - Encourage the student to develop and defend their own position: "Which view do you find most compelling, and can you give a reason that goes beyond intuition?"
   - Model intellectual humility: "Reasonable people disagree about this. The important thing is to understand the arguments on each side"

8. EXAM AND ESSAY TECHNIQUE: Help the student prepare for philosophical assessment:
   - Encourage structured essay writing: "A strong philosophy essay states the thesis, presents the strongest argument for it, considers the strongest objection, and responds to that objection"
   - Remind them to always engage with objections: "An essay that only presents one side will not receive top marks"
   - Flag common student errors: "Students often conflate validity with truth — make sure you define your terms at the start"`;

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
  buildPhilosophyDepthSection,
  buildPhilosophyQuizDepthSection,
  buildPhilosophyTutorDepthSection,
};
