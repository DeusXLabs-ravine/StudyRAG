/**
 * Law-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce prompt sections that get injected into module generation,
 * quiz generation, flashcard generation, and tutor chat prompts when the subject
 * detector identifies the uploaded material as legal content. The goal is to
 * replace generic "200-400 words" instructions with rigorous, citation-heavy,
 * exam-ready depth that law students actually need.
 *
 * Each builder accepts a `subdisciplines` array (e.g. ['criminal', 'constitutional'])
 * produced by subjectDetector.js and returns a plain string ready for template
 * injection via `.replace('{law_depth_section}', ...)`.
 */

// ─── Subdiscipline-Specific Instruction Blocks ──────────────────

/**
 * Map of subdiscipline keys to their mandatory coverage requirements.
 * These get appended to the base depth section when the corresponding
 * subdiscipline is detected in the student's material.
 */
const SUBDISCIPLINE_MODULE_INSTRUCTIONS = {
  criminal: `
CRIMINAL LAW — MANDATORY COVERAGE:
- For every offence discussed, explicitly decompose the elements:
  (a) Actus reus: the prohibited conduct, state of affairs, or omission
  (b) Mens rea: intention (direct/oblique), recklessness (subjective/objective), negligence, strict liability where applicable
  (c) Coincidence principle: actus reus and mens rea must coincide (cite Fagan v MPC [1969] or jurisdiction-equivalent)
- Cover all general defences potentially relevant to the offence (self-defence, duress, necessity, insanity, automatism, intoxication, consent, mistake)
- State the maximum sentence / sentencing guidelines and any aggravating/mitigating factors
- Distinguish between attempt, conspiracy, and complicity where the offence permits
- Reference the relevant criminal code provisions (section numbers) and any statutory amendments that modified common law positions`,

  constitutional: `
CONSTITUTIONAL LAW — MANDATORY COVERAGE:
- Reference specific constitutional provisions by Part, Chapter, Article, or Section number — never cite a constitutional right without its textual anchor
- Trace the judicial interpretation history of each provision: original understanding, landmark decisions expanding/narrowing scope, current position
- Discuss the interplay of fundamental rights with limitation/derogation clauses (e.g., "reasonable and justifiable in a democratic society" tests)
- Address separation of powers implications: legislative competence, executive authority, judicial review jurisdiction
- Cover amendment procedures and constitutional development where relevant
- Identify tensions between competing constitutional values (e.g., free speech vs. dignity, security vs. liberty)
- Reference constitutional court decisions with full citations and discuss whether they represent settled or evolving doctrine`,

  tort: `
TORT LAW — MANDATORY COVERAGE:
- For each tort, work through the COMPLETE analytical framework:
  (a) Duty of care: neighbourhood principle (Donoghue v Stevenson [1932] or jurisdiction-equivalent), incremental approach, established categories vs. novel situations
  (b) Breach: standard of the reasonable person, relevant factors (magnitude of risk, cost of precautions, social utility, vulnerability of claimant)
  (c) Causation: factual causation ("but for" test), legal causation, material contribution, loss of chance, multiple causes
  (d) Remoteness: reasonable foreseeability (The Wagon Mound [1961] or jurisdiction-equivalent), type vs. extent of harm, thin skull rule
  (e) Defences: contributory negligence, volenti non fit injuria, illegality/ex turpi causa
  (f) Remedies: compensatory damages (special + general), aggravated/exemplary damages, injunctions (mandatory/prohibitory), account of profits
- For strict liability torts (e.g., Rylands v Fletcher, product liability): state the rule, its elements, and statutory modifications
- Distinguish between intentional torts (trespass, assault, battery, false imprisonment) and negligence-based torts`,

  contract: `
CONTRACT LAW — MANDATORY COVERAGE:
- For each contract topic, cover the COMPLETE analytical framework:
  (a) Formation: offer (vs. invitation to treat), acceptance (mirror image rule, postal rule, battle of forms), consideration (adequacy vs. sufficiency, past consideration, promissory estoppel), intention to create legal relations (commercial vs. domestic presumptions), capacity
  (b) Terms: conditions, warranties, innominate terms (Hong Kong Fir [1962] or jurisdiction-equivalent), implied terms (by statute, custom, business efficacy), exclusion clauses (incorporation, construction, statutory controls)
  (c) Vitiating factors: misrepresentation (innocent/negligent/fraudulent), mistake (common/mutual/unilateral), duress (physical/economic), undue influence (actual/presumed), illegality, unconscionability
  (d) Discharge: performance (strict performance rule, substantial performance, tender), agreement (accord and satisfaction, novation, waiver), frustration (doctrine and statutory consequences), breach (actual/anticipatory, conditions for termination)
  (e) Remedies: damages (expectation/reliance/restitution interest, mitigation, remoteness — Hadley v Baxendale [1854] or jurisdiction-equivalent), specific performance, injunctions, rescission, rectification
- Always distinguish between common law positions and any statutory modifications (e.g., sale of goods legislation, consumer protection statutes)`,

  commercial: `
COMMERCIAL LAW — MANDATORY COVERAGE:
- Reference the specific commercial statutes governing the area (sale of goods acts, partnership acts, companies acts, bills of exchange legislation, insurance legislation, consumer protection statutes) with section numbers
- Cover the regulatory framework: identify which regulator(s) oversee the area, enforcement mechanisms, penalties for non-compliance
- For company law topics: distinguish between the position at common law and statutory modifications, cover director duties (fiduciary + statutory), shareholder rights, corporate governance codes (comply-or-explain)
- For sale of goods: implied terms as to title, description, quality, fitness for purpose; passing of property and risk; buyer's remedies; international sales (CISG, Incoterms where relevant)
- For negotiable instruments / banking: distinguish between the rights of parties (drawer, drawee, payee, holder, holder in due course)
- Identify any relevant international commercial law conventions or model laws (UNCITRAL, Hague Conventions) and their domestic implementation status`,
};

const SUBDISCIPLINE_QUIZ_INSTRUCTIONS = {
  criminal: `
- Include problem scenarios requiring identification of the specific offence, its elements (actus reus + mens rea), available defences, and likely outcome
- Test the distinction between murder and manslaughter, between theft-related offences, and between different modes of participation
- Require students to cite the relevant statutory provision or leading case in short-answer responses`,

  constitutional: `
- Include questions that present a government action and require analysis of its constitutional validity
- Test knowledge of specific constitutional provisions by section/article number
- Include questions requiring comparison of judicial approaches in different landmark decisions
- Present scenarios where two constitutional rights appear to conflict, requiring balancing analysis`,

  tort: `
- Include problem-style questions with multi-party negligence scenarios requiring full duty-breach-causation-remoteness analysis
- Test ability to distinguish between different torts arising from the same facts
- Include questions on the calculation or categorisation of damages
- Present scenarios requiring application of defences and their interaction`,

  contract: `
- Include problem scenarios testing formation issues (when is the contract formed? is there valid consideration?)
- Test ability to classify terms and determine remedies for their breach
- Include scenarios where multiple vitiating factors may overlap
- Present questions requiring analysis of remoteness of damage in contract`,

  commercial: `
- Include problem scenarios involving sale of goods disputes (fitness for purpose, passing of risk)
- Test knowledge of director duties by presenting boardroom decision scenarios
- Include questions on the rights and liabilities of parties to negotiable instruments
- Present regulatory compliance scenarios requiring identification of applicable statutory provisions`,
};

const SUBDISCIPLINE_TUTOR_INSTRUCTIONS = {
  criminal: `
- When discussing offences, always walk through actus reus and mens rea separately before combining
- Prompt the student: "What defence, if any, could the accused raise here?"
- Highlight where statute has modified common law positions and why the change was made`,

  constitutional: `
- When explaining a constitutional provision, present the text first, then the court's interpretation, then any academic criticism
- Ask: "Does this interpretation expand or restrict the original scope of the provision?"
- Discuss ongoing constitutional debates where the law remains unsettled`,

  tort: `
- When working through negligence problems, enforce the structured approach: "Let's start with duty — does a duty of care exist here?"
- Challenge the student on causation: "Can the claimant satisfy the 'but for' test? What about material contribution?"
- Compare and contrast remedies available for different bases of liability`,

  contract: `
- When analysing contract problems, start with formation: "First — do we even have a valid contract?"
- Encourage the student to consider multiple potential claims and defences arising from the same facts
- Distinguish between damages at common law and equitable remedies, and when each is appropriate`,

  commercial: `
- Always ground explanations in the specific statutory provision: "Section X of the [Act] says..."
- Encourage the student to consider both common law and statutory routes to the same remedy
- Discuss practical implications: "What would a solicitor actually advise a client to do here?"`,
};

// ─── Builder Functions ──────────────────────────────────────────

/**
 * Build law-specific depth instructions for module generation.
 *
 * This replaces the generic "200-400 words" content instruction with a rigorous
 * framework demanding statutory citations, case law analysis, Latin maxims,
 * and structured legal reasoning — everything a law student needs for exam prep
 * and deep understanding.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['criminal', 'tort']
 * @returns {string} Prompt section to inject into module generation templates
 */
function buildLawDepthSection(subdisciplines = []) {
  // ── Base depth instructions (always included for any law content) ──
  let section = `
LAW MODULE DEPTH — CRITICAL INSTRUCTIONS (OVERRIDES DEFAULT WORD COUNT):

TARGET LENGTH: Each module MUST contain 600-1200 words of substantive legal content. The generic "200-400 words" instruction does NOT apply to legal modules. Law students need thorough, exam-ready material — not surface-level summaries.

MANDATORY ELEMENTS FOR EVERY MODULE:
1. STATUTORY PROVISIONS: Cite exact section numbers of relevant legislation (e.g., "Section 12(1) of the Theft Act 1968" not just "the Theft Act"). Where multiple statutes are relevant, cite each with its specific provision.

2. CASE LAW ANALYSIS: Include proper case citations in the jurisdiction's accepted format. For each leading case referenced:
   - State the case name and citation (e.g., Carlill v Carbolic Smoke Ball Co [1893] 1 QB 256)
   - Briefly state the material facts (2-3 sentences)
   - Identify the legal issue before the court
   - State the ratio decidendi — the binding legal principle established
   - Distinguish ratio decidendi from obiter dictum where relevant

3. LEGAL PRINCIPLES WITH LATIN MAXIMS: Where a recognised Latin maxim encapsulates the rule, state it alongside the English translation and explanation. Examples:
   - "nemo dat quod non habet" (no one gives what they do not have)
   - "volenti non fit injuria" (no injury is done to a willing person)
   - "res ipsa loquitur" (the thing speaks for itself)
   Do NOT use Latin merely for decoration — only where it represents an established legal principle that a student would encounter in exams and practice.

4. STRUCTURED ANALYSIS: For each legal concept covered in the module, follow this framework:
   (a) STATE THE RULE: Clearly articulate the legal rule or principle in one to two sentences
   (b) CITE AUTHORITY: Provide the statutory provision (with section number) or the common law authority (leading case with citation)
   (c) EXPLAIN THE LEADING CASE: Reference at least one leading case — state its ratio decidendi and why it is the authoritative source for this principle
   (d) APPLICATION: Show how the principle applies through a brief hypothetical scenario (a realistic exam-style problem in 3-5 sentences)
   (e) EXCEPTIONS & LIMITATIONS: Note any established exceptions, statutory modifications, or jurisdictional variations
   (f) REFORM & CRITICISM: Where relevant, note any Law Commission recommendations, academic criticism, or pending legislative reform
   (g) EXAM PITFALLS: Identify common misconceptions and mistakes students make when applying this rule in exams (e.g., confusing recklessness with negligence, conflating offer with invitation to treat)

5. DISTINGUISHING CONCEPTS: Where two or more rules/doctrines are similar and commonly confused, explicitly distinguish them:
   - State what they have in common
   - State the precise difference
   - Provide a quick test or mnemonic for telling them apart in exam conditions

6. STRUCTURE: Organise each module following Rule -> Authority -> Application -> Exceptions -> Reform/Criticism. Use markdown headings (##, ###) to separate these sections clearly.

7. ACCURACY: NEVER fabricate case names, citations, or statutory provisions. If uncertain about the exact citation, use the case name with an approximate year rather than inventing a reporter reference. A wrong citation is worse than no citation.`;

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
 * Build law-specific depth instructions for quiz and question generation.
 *
 * Ensures quizzes test legal reasoning and application — not mere recall —
 * with problem-style scenarios, case identification, and statutory reference
 * questions that mirror law school assessments.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['criminal', 'tort']
 * @returns {string} Prompt section to inject into quiz generation templates
 */
function buildLawQuizDepthSection(subdisciplines = []) {
  let section = `
LAW QUIZ DEPTH — CRITICAL INSTRUCTIONS:

QUESTION DESIGN PRINCIPLES:
1. LEGAL REASONING OVER RECALL: At least 60% of questions must test application of law to facts, not just definition recall. Present a factual scenario and require the student to identify the legal issue, apply the relevant rule, and reach a conclusion.

2. PROBLEM-STYLE QUESTIONS: Include problem-style questions modelled on law school examination technique:
   - Present a realistic factual scenario (4-8 sentences) involving identifiable legal issues
   - Require the student to identify the relevant legal rule(s)
   - Require application of law to facts with reasoning
   - Test whether the student can distinguish between similar but different legal principles

3. CASE LAW QUESTIONS: Include questions that test knowledge of leading cases:
   - "Which case established the principle that...?"
   - "What was the ratio decidendi in [Case Name]?"
   - "How would the outcome differ if the facts were [variation]?"
   - Present facts similar (but not identical) to a leading case and ask the student to identify which case is most analogous and why

4. STATUTORY REFERENCE QUESTIONS: Include questions requiring knowledge of specific statutory provisions:
   - "Under which section of [Act] is [concept] defined?"
   - Present a scenario and ask which statutory provision applies
   - Test awareness of statutory modifications to common law rules

5. DISTINGUISHING QUESTIONS: Include questions that require students to distinguish between concepts that are commonly confused:
   - Present two similar doctrines and ask for the key difference
   - Present a borderline scenario where two possible rules could apply and ask which is correct and why
   - Test the boundary between related offences, torts, or contractual doctrines

6. MCQ DISTRACTOR QUALITY: For multiple-choice questions, distractors (wrong answers) MUST be:
   - Plausible legal principles that are subtly wrong (not obviously absurd)
   - Common misconceptions that a student who studied superficially might select
   - Near-misses that test precision (e.g., wrong section number, wrong case, right principle but wrong jurisdiction)
   - Never include joke answers or obviously non-legal options

7. SHORT-ANSWER INCLUSION: Where the question format allows, include questions that require:
   - Citing the relevant case or statutory authority by name
   - Stating the ratio decidendi of a specific case
   - Applying the IRAC method (Issue, Rule, Application, Conclusion) in a brief paragraph

8. EXPLANATION DEPTH: Every question's explanation must:
   - State the correct legal rule with its authority (case or statute)
   - Explain why each distractor is wrong, referencing the specific legal error it contains
   - Where relevant, note the case or statute that distinguishes the correct answer from the most tempting wrong answer`;

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
 * Build law-specific depth instructions for tutor chat interactions.
 *
 * Ensures the AI tutor uses IRAC methodology, always cites authority, encourages
 * critical analysis, and walks through cases with the depth a law student expects
 * from a tutorial discussion — not a chatbot summary.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['criminal', 'tort']
 * @returns {string} Prompt section to inject into tutor chat templates
 */
function buildLawTutorDepthSection(subdisciplines = []) {
  let section = `
LAW TUTOR DEPTH — CRITICAL INSTRUCTIONS:

You are tutoring a law student. Legal tutoring demands rigour, precision, and authority-grounded reasoning that generic tutoring does not. Follow these rules:

1. ALWAYS CITE AUTHORITY: Every legal proposition you state must be grounded in authority:
   - Statutory rules: cite the Act and section number (e.g., "Under s.2(1) of the Theft Act 1968...")
   - Common law rules: cite the leading case (e.g., "As established in Donoghue v Stevenson [1932]...")
   - If the student asks "why?" about a legal rule, the answer is always the authority — not just logic or policy
   - If you are uncertain of the exact citation, say so honestly rather than fabricating one

2. USE IRAC FOR PROBLEM QUESTIONS: When the student presents a problem question or asks "would X be liable?", structure your response using IRAC:
   - **Issue**: Identify the legal issue(s) arising from the facts ("The issue here is whether D owed C a duty of care...")
   - **Rule**: State the applicable legal rule with its authority ("The test for duty of care was established in Caparo v Dickman [1990]...")
   - **Application**: Apply the rule to the specific facts the student has provided ("On these facts, the harm was reasonably foreseeable because...")
   - **Conclusion**: Reach a reasoned conclusion, noting any uncertainty ("Therefore, it is likely/unlikely that liability would be established, although a court might also consider...")
   Walk the student through each IRAC step explicitly so they learn the method, not just the answer.

3. ENCOURAGE CRITICAL ANALYSIS: Law is not just about knowing the rule — it is about evaluating it. Regularly prompt the student:
   - "What are the arguments for and against this position?"
   - "Do you think this rule produces a just result on these facts?"
   - "How might a different jurisdiction approach this issue?"
   - "Has academic commentary criticised this decision? Why?"
   - Help the student see both sides of contested legal propositions — this is essential for essay-style exam answers.

4. CASE DISCUSSION FRAMEWORK: When the student asks about a specific case, always cover:
   - **Facts**: The material facts of the case (what happened)
   - **Issue**: The legal question the court had to decide
   - **Holding/Decision**: What the court decided (who won and why)
   - **Ratio decidendi**: The binding legal principle — the reason for the decision that binds future courts
   - **Obiter dicta**: Any significant non-binding observations made by the judges
   - **Significance**: Why this case matters — what it changed, established, or clarified in the law
   - **Subsequent treatment**: Has the case been followed, distinguished, overruled, or doubted by later courts?

5. COMPARE AND CONTRAST AUTHORITIES: When explaining a legal principle, proactively:
   - Identify cases that appear to conflict and explain how they are reconciled (or note that they are genuinely in tension)
   - Compare the statutory position with the common law position where they differ
   - Note any jurisdictional differences the student should be aware of
   - Reference Law Commission reports or reform proposals where the current law is unsatisfactory

6. IDENTIFY UNSETTLED LAW: When the area of law is evolving or contested:
   - Clearly state that the position is unsettled and explain why
   - Identify the competing approaches and the cases/authorities supporting each
   - Note any pending cases, bills, or reform proposals that may change the law
   - Advise the student on how to handle unsettled law in exams: "State both positions, cite the authority for each, and offer a reasoned preference"

7. EXAM TECHNIQUE GUIDANCE: As a law tutor, help the student prepare for assessments:
   - When relevant, point out common exam pitfalls: "Students often confuse X with Y here"
   - Remind them to always state the authority: "In an exam answer, never state a legal rule without citing its source"
   - Encourage structured answers: "A first-class answer would address duty, breach, causation, and remoteness in that order"
   - Flag time allocation: "This is a topic that examiners love — make sure you can cover it in 30-40 minutes"

8. LATIN MAXIMS: Use Latin maxims where they are the accepted legal shorthand, always with translation:
   - "This is an application of nemo dat quod non habet — no one can give what they do not have"
   - Do not overuse Latin — use it where a law student would be expected to know and use the term in practice or exams`;

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
  buildLawDepthSection,
  buildLawQuizDepthSection,
  buildLawTutorDepthSection,
};
