/**
 * Accounting-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce prompt sections that get injected into module generation,
 * quiz generation, flashcard generation, and tutor chat prompts when the subject
 * detector identifies the uploaded material as accounting content. The goal is to
 * replace generic "200-400 words" instructions with rigorous, calculation-heavy,
 * standards-referenced depth that accounting students actually need.
 *
 * Each builder accepts a `subdisciplines` array (e.g. ['financial_accounting', 'taxation'])
 * produced by subjectDetector.js and returns a plain string ready for template
 * injection via `.replace('{accounting_depth_section}', ...)`.
 */

// ─── Subdiscipline-Specific Instruction Blocks ──────────────────

/**
 * Map of subdiscipline keys to their mandatory coverage requirements.
 * These get appended to the base depth section when the corresponding
 * subdiscipline is detected in the student's material.
 */
const SUBDISCIPLINE_MODULE_INSTRUCTIONS = {
  financial_accounting: `
FINANCIAL ACCOUNTING — MANDATORY COVERAGE:
- For every transaction discussed, explicitly prepare the full journal entry with:
  (a) Debit entry: account name, amount, and classification (asset, liability, equity, revenue, expense)
  (b) Credit entry: account name, amount, and classification
  (c) Narration: brief explanation of the business event triggering the entry
  (d) Double-entry verification: confirm that total debits equal total credits
- Provide T-account illustrations for key ledger accounts showing opening balances, period transactions, and closing balances — students must see how individual entries aggregate into account totals
- Walk through financial statement preparation steps:
  (a) Trial balance extraction from ledger accounts
  (b) Adjusting entries (accruals, prepayments, depreciation, provisions, impairments)
  (c) Adjusted trial balance
  (d) Income statement / statement of profit or loss preparation
  (e) Statement of financial position (balance sheet) preparation
  (f) Statement of cash flows using both the direct and indirect methods where applicable
- Reference specific GAAP/IFRS standards with standard numbers (e.g., "IAS 16 Property, Plant and Equipment, para. 30" or "ASC 606 Revenue from Contracts with Customers") — never cite a standard without its numeric designation
- Explain the recognition criteria (when to record), measurement basis (at what amount), and disclosure requirements for each item
- Where GAAP and IFRS treatments differ, explicitly state both positions and identify the key divergence`,

  management_accounting: `
MANAGEMENT ACCOUNTING — MANDATORY COVERAGE:
- For cost allocation methods, provide fully worked examples with numerical data:
  (a) Direct allocation method: trace direct costs to cost objects with clear allocation bases
  (b) Step-down (sequential) allocation: show the order of allocation and the cascading effect with a complete numerical walkthrough
  (c) Reciprocal allocation: set up and solve the simultaneous equations
  (d) Activity-based costing (ABC): identify activities, cost drivers, cost pools, and compute activity rates with a worked example tracing costs to products/services
- Variance analysis must decompose every variance to its root components:
  (a) Material variances: price variance (AQ x (SP - AP)) and quantity/usage variance (SP x (SQ - AQ))
  (b) Labour variances: rate variance (AH x (SR - AR)) and efficiency variance (SR x (SH - AH))
  (c) Overhead variances: spending, efficiency, and volume variances (fixed and variable separated)
  (d) Sales variances: price variance and volume variance, with further decomposition into mix and quantity variances where multiple products exist
  (e) For every variance, state whether it is favourable (F) or adverse/unfavourable (U) and explain the managerial implications
- CVP (Cost-Volume-Profit) analysis must include:
  (a) Contribution margin per unit and contribution margin ratio calculations
  (b) Break-even point in units and in revenue
  (c) Target profit analysis: units and revenue required to achieve a specified profit
  (d) Margin of safety calculation (absolute and percentage)
  (e) Multi-product CVP analysis using weighted-average contribution margin
  (f) Sensitivity analysis: impact of changes in selling price, variable cost, or fixed cost on break-even
- Budgeting procedures must cover the master budget process: sales budget, production budget, direct materials budget, direct labour budget, manufacturing overhead budget, selling and administrative expense budget, cash budget, and budgeted financial statements`,

  auditing: `
AUDITING — MANDATORY COVERAGE:
- Map every audit procedure to the specific financial statement assertion it addresses:
  (a) Existence/Occurrence: the asset, liability, or transaction actually exists or occurred
  (b) Completeness: all transactions and accounts that should be recorded have been recorded
  (c) Valuation/Allocation: assets, liabilities, and equity are recorded at appropriate amounts
  (d) Rights and Obligations: the entity holds the rights to assets and has the obligations for liabilities
  (e) Presentation and Disclosure: items are properly classified, described, and disclosed
  (f) Accuracy: transactions are recorded at the correct amounts
  (g) Cut-off: transactions are recorded in the correct accounting period
- Risk assessment framework must follow the structured approach:
  (a) Inherent risk: susceptibility of an assertion to material misstatement before considering internal controls
  (b) Control risk: risk that internal controls will not prevent or detect a material misstatement
  (c) Detection risk: risk that audit procedures will not detect a material misstatement — relate this to the nature, timing, and extent of substantive procedures
  (d) Audit risk model: AR = IR x CR x DR, with a worked example showing how the auditor adjusts detection risk based on assessed inherent and control risks
- Internal control evaluation must reference the COSO framework components:
  (a) Control environment, (b) Risk assessment, (c) Control activities, (d) Information and communication, (e) Monitoring activities
  - For each control identified, state the type (preventive/detective/corrective), the assertion it addresses, and the test of controls the auditor would perform
- Sampling techniques must cover:
  (a) Statistical vs. non-statistical sampling and when each is appropriate
  (b) Attribute sampling for tests of controls: sample size determination, tolerable deviation rate, expected deviation rate
  (c) Variables sampling for substantive tests: monetary unit sampling (MUS), classical variables sampling
  (d) Evaluation of sample results: projecting misstatements to the population, considering sampling risk
- Reference applicable auditing standards (ISAs or PCAOB standards) with standard numbers (e.g., "ISA 315 Identifying and Assessing the Risks of Material Misstatement" or "AS 2201 An Audit of Internal Control Over Financial Reporting")`,

  taxation: `
TAXATION — MANDATORY COVERAGE:
- For every tax computation, provide step-by-step workings showing:
  (a) Gross income / total income identification: enumerate all income sources and their tax treatment (taxable, exempt, deferred)
  (b) Allowable deductions: list each deduction with the statutory authority permitting it (e.g., "Section 162 of the IRC" or the relevant local tax code provision), distinguish between above-the-line and below-the-line deductions where applicable
  (c) Taxable income computation: gross income less deductions, with adjustments for tax preferences and add-backs clearly shown
  (d) Tax liability calculation: apply the relevant tax rates (marginal rates for progressive systems), showing the computation at each bracket
  (e) Tax credits and offsets: distinguish between refundable and non-refundable credits, show the order of application
  (f) Net tax payable: tax liability less credits, plus any surcharges or levies
- For each deduction or exemption claimed, cite the specific statutory provision or tax ruling that authorises it — never state "this is deductible" without authority
- Tax planning strategies must include:
  (a) Timing strategies: deferral of income recognition, acceleration of deductions, with worked examples showing the present value benefit
  (b) Income splitting: shifting income to lower-bracket taxpayers where legally permitted, with anti-avoidance provisions noted
  (c) Entity structure choices: comparison of tax treatment across sole proprietorship, partnership, company/corporation, and trust structures with a numerical comparison
  (d) Capital vs. revenue distinction: criteria for classification and the tax consequences of each, with reference to leading cases or rulings
- Clearly distinguish between tax avoidance (legal) and tax evasion (illegal), and reference the general anti-avoidance rules (GAAR) or judicial doctrines (e.g., substance over form, step transaction doctrine, economic substance doctrine) applicable in the relevant jurisdiction`,

  corporate_finance: `
CORPORATE FINANCE — MANDATORY COVERAGE:
- NPV (Net Present Value) calculations must show:
  (a) Identification of all relevant incremental cash flows (initial investment, operating cash flows, terminal cash flows, working capital changes)
  (b) Tax effects on cash flows: depreciation tax shield, tax on operating income
  (c) Discounting each cash flow at the appropriate discount rate with the formula: PV = CF / (1 + r)^t
  (d) Summation of all present values to arrive at NPV
  (e) Decision rule: accept if NPV > 0, reject if NPV < 0, with interpretation of the NPV amount
- IRR (Internal Rate of Return) calculations must include:
  (a) The IRR equation: NPV = 0, solve for r
  (b) Interpolation method or iterative approach for manual calculation
  (c) Decision rule: accept if IRR > cost of capital
  (d) Limitations: multiple IRRs for non-conventional cash flows, reinvestment rate assumption, scale differences vs. NPV
- WACC (Weighted Average Cost of Capital) computation must show:
  (a) Cost of equity: using CAPM (Ke = Rf + Beta x (Rm - Rf)) with each component identified and sourced
  (b) Cost of debt: yield to maturity or coupon rate adjusted for tax shield (Kd x (1 - T))
  (c) Cost of preference shares where applicable
  (d) Market value weights (not book value) for each component of capital
  (e) WACC formula: WACC = (E/V x Ke) + (D/V x Kd x (1-T)), with a fully worked numerical example
- Capital structure analysis must cover:
  (a) Modigliani-Miller propositions (with and without taxes)
  (b) Trade-off theory: tax shield benefits vs. financial distress costs
  (c) Pecking order theory: internal financing > debt > equity
  (d) Impact of leverage on EPS and ROE with numerical examples
- Valuation methods must include worked examples for:
  (a) DCF valuation: project free cash flows, determine terminal value (Gordon growth model or exit multiple), discount to present value
  (b) Comparable company analysis: select peer group, identify relevant multiples (P/E, EV/EBITDA, P/B), apply to target
  (c) Precedent transaction analysis: identify comparable transactions, derive implied multiples, apply to target
  (d) Dividend discount model: single-stage and multi-stage (H-model, two-stage, three-stage)`,
};

const SUBDISCIPLINE_QUIZ_INSTRUCTIONS = {
  financial_accounting: `
- Include questions requiring students to prepare journal entries from narrative descriptions of business transactions, identifying the correct accounts, amounts, and debit/credit sides
- Test financial statement analysis: present a set of financial data and require computation of key ratios (current ratio, quick ratio, debt-to-equity, ROE, ROA, gross margin, net margin, inventory turnover, receivables turnover)
- Include questions where students must identify the correct GAAP/IFRS treatment and cite the relevant standard number
- Present scenarios with adjusting entries (accruals, prepayments, depreciation) and require the corrected financial statement figures
- Test the ability to prepare a statement of cash flows from comparative balance sheets and income statement data`,

  management_accounting: `
- Include questions requiring full variance analysis with numerical data: provide actual and standard figures, require computation and interpretation of each variance
- Test CVP analysis with multi-product scenarios: provide contribution margins and sales mix, require break-even and target profit calculations
- Present cost allocation scenarios requiring students to choose and apply the appropriate allocation method (direct, step-down, reciprocal, ABC)
- Include make-or-buy, special order, and product mix decisions requiring relevant cost analysis
- Test budgeting knowledge by providing partial budget data and requiring completion of the master budget chain`,

  auditing: `
- Include scenario-based questions where students must select the appropriate audit procedure for a given assertion and account balance
- Test risk assessment by presenting a client scenario and requiring identification of inherent risks, control risks, and appropriate audit responses
- Present internal control descriptions and require students to identify control weaknesses, the assertion affected, and the recommended improvement
- Include questions on sampling: provide population data and require determination of sample size, evaluation of results, and conclusions
- Test knowledge of auditing standards by presenting ethical dilemmas (independence, confidentiality, conflicts of interest) and requiring identification of the applicable standard and correct course of action`,

  taxation: `
- Include comprehensive tax computation questions: provide income data from multiple sources and require a complete tax liability calculation with step-by-step workings
- Present scenarios requiring determination of whether an item is deductible, and if so, under which statutory provision and in which tax period
- Test tax planning by presenting a taxpayer's situation and requiring comparison of alternative strategies with numerical analysis
- Include questions on the capital vs. revenue distinction: present an expenditure scenario and require classification with supporting authority
- Present scenarios involving multiple taxpayers or entities and require analysis of the overall tax position, including anti-avoidance considerations`,

  corporate_finance: `
- Include NPV and IRR calculation questions with realistic cash flow data: provide project details and require computation, interpretation, and investment decision
- Test WACC computation: provide capital structure data and require calculation of each component cost and the overall WACC
- Present capital structure scenarios requiring analysis of the impact of additional debt or equity on WACC, EPS, and firm value
- Include valuation questions: provide financial data for a target company and require valuation using at least two methods (DCF, comparables, DDM) with reconciliation of results
- Test understanding of financial theory by presenting scenarios that require application of Modigliani-Miller propositions, trade-off theory, or pecking order theory`,
};

const SUBDISCIPLINE_TUTOR_INSTRUCTIONS = {
  financial_accounting: `
- When discussing any transaction, always show the double-entry impact: "The debit to [Account] increases [Asset/Expense], and the credit to [Account] decreases [Asset] / increases [Liability/Equity/Revenue]"
- Prompt the student: "What is the impact of this entry on the balance sheet equation (A = L + E)?"
- Trace every transaction through to the financial statements: "This entry affects the income statement by... and the balance sheet by..."
- Reference specific standards: "Under IAS 16, para. 7, an item of PPE is recognised when..."`,

  management_accounting: `
- When working through variance analysis, always decompose systematically: "Let's start with the price variance, then the quantity variance, and then interpret what they tell us together"
- Prompt the student: "Is this variance favourable or adverse? What managerial action might have caused it?"
- For CVP analysis, always verify with the student: "What happens to the break-even point if fixed costs increase by 10%?"
- Encourage linking management accounting to decision-making: "How would this cost information change the manager's decision?"`,

  auditing: `
- When discussing audit procedures, always map to assertions: "This procedure addresses the existence assertion because..."
- Prompt the student: "What could go wrong with this account balance? What is the risk of material misstatement?"
- Walk through the audit risk model explicitly: "If inherent risk is high and control risk is high, what must we do with detection risk?"
- Encourage professional scepticism: "What evidence would you need to see before you are satisfied that this balance is fairly stated?"`,

  taxation: `
- When discussing any tax treatment, always cite the statutory authority: "This deduction is permitted under Section [X] of [the Act] because..."
- Prompt the student: "Is this item taxable or exempt? What is the statutory basis for your answer?"
- Always show the step-by-step tax computation: "Let's start with gross income, then work through the deductions one by one"
- Highlight the distinction between avoidance and evasion: "This planning strategy is legal because... but if taken further, it could cross the line because..."`,

  corporate_finance: `
- When discussing valuation or investment decisions, always show the calculations: "Let's compute the NPV step by step — what are the relevant cash flows?"
- Prompt the student: "Why do we use market value weights rather than book value weights for WACC?"
- Trace through the logic of financial theories: "Under Modigliani-Miller with taxes, what happens to firm value as we add more debt? Why?"
- Encourage critical evaluation: "The DCF gives us one value and comparables give us another — which do you trust more and why?"`,
};

// ─── Builder Functions ──────────────────────────────────────────

/**
 * Build accounting-specific depth instructions for module generation.
 *
 * This replaces the generic "200-400 words" content instruction with a rigorous
 * framework demanding standards references, journal entries, worked calculations,
 * and structured accounting analysis — everything an accounting student needs
 * for exam prep and professional competence.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['financial_accounting', 'taxation']
 * @returns {string} Prompt section to inject into module generation templates
 */
function buildAccountingDepthSection(subdisciplines = []) {
  // ── Base depth instructions (always included for any accounting content) ──
  let section = `
ACCOUNTING MODULE DEPTH — CRITICAL INSTRUCTIONS (OVERRIDES DEFAULT WORD COUNT):

TARGET LENGTH: Each module MUST contain 600-1200 words of substantive accounting content. The generic "200-400 words" instruction does NOT apply to accounting modules. Accounting students need thorough, calculation-rich, standards-referenced material — not surface-level summaries.

MANDATORY ELEMENTS FOR EVERY MODULE:
1. STANDARD/RULE IDENTIFICATION: Cite the specific accounting standard or regulatory rule governing the topic (e.g., "IFRS 15 Revenue from Contracts with Customers, para. 31" or "ASC 842 Leases"). Where both GAAP and IFRS are relevant, identify both and note the key differences. Never state an accounting rule without referencing the authoritative standard.

2. ACCOUNTING TREATMENT: For each topic, clearly explain:
   - Recognition criteria: when is the item recorded? What conditions must be met?
   - Measurement basis: at what amount? (historical cost, fair value, net realisable value, amortised cost, etc.)
   - Subsequent measurement: how is the item treated after initial recognition? (depreciation, amortisation, impairment, revaluation)
   - Derecognition: when and how is the item removed from the books?

3. JOURNAL ENTRIES: For every transaction or accounting event discussed, provide the complete journal entry:
   - Debit account(s) with amount and account classification (asset, liability, equity, revenue, expense)
   - Credit account(s) with amount and account classification
   - Narration explaining the entry
   - Verification that debits equal credits
   Do NOT describe a journal entry in words alone — always present it in structured debit/credit format.

4. FINANCIAL STATEMENT IMPACT: For every journal entry or accounting treatment, trace the impact through:
   - Statement of profit or loss (income statement): which line item is affected and by how much?
   - Statement of financial position (balance sheet): which asset, liability, or equity item changes?
   - Statement of cash flows: which section (operating, investing, financing) is affected and how?
   Students must see the full ripple effect of each transaction across the financial statements.

5. WORKED EXAMPLES: Every module must include at least one fully worked numerical example that:
   - Presents realistic data (amounts, dates, rates, terms)
   - Shows every step of the calculation with clear workings (not just the final answer)
   - Labels each step so the student can follow the logic
   - Arrives at a final answer with appropriate units and rounding
   - Includes a brief interpretation: "This means that..."

6. DISCLOSURE REQUIREMENTS: Where the standard requires specific disclosures in the notes to the financial statements, list the key disclosure requirements. Students must understand not just the numbers but what must be communicated to users of financial statements.

7. STRUCTURE: Organise each module following Standard/Rule -> Accounting Treatment -> Journal Entries -> Financial Statement Impact -> Worked Example -> Disclosure Requirements. Use markdown headings (##, ###) to separate these sections clearly.

8. ACCURACY: NEVER fabricate standard numbers, paragraph references, or regulatory provisions. If uncertain about the exact paragraph number, cite the standard name and topic rather than inventing a reference. A wrong citation is worse than no citation.`;

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
 * Build accounting-specific depth instructions for quiz and question generation.
 *
 * Ensures quizzes test accounting application and computation — not mere recall —
 * with journal entry preparation, financial statement analysis, ratio interpretation,
 * scenario-based tax calculations, and audit procedure selection that mirror
 * accounting examinations and professional assessments.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['financial_accounting', 'taxation']
 * @returns {string} Prompt section to inject into quiz generation templates
 */
function buildAccountingQuizDepthSection(subdisciplines = []) {
  let section = `
ACCOUNTING QUIZ DEPTH — CRITICAL INSTRUCTIONS:

QUESTION DESIGN PRINCIPLES:
1. COMPUTATION OVER RECALL: At least 60% of questions must test the ability to perform calculations and apply accounting standards to scenarios, not just recall definitions. Present financial data and require the student to compute, analyse, and interpret results.

2. JOURNAL ENTRY PREPARATION: Include questions that present a business transaction narrative and require the student to:
   - Identify the accounts affected
   - Determine the correct debit and credit entries
   - State the account classifications (asset, liability, equity, revenue, expense)
   - Explain why the entry is correct by referencing the underlying accounting principle or standard

3. FINANCIAL STATEMENT ANALYSIS: Include questions that present financial statement data and require:
   - Computation of key financial ratios (liquidity, solvency, profitability, efficiency, market ratios)
   - Interpretation of ratio results in context (comparison to industry benchmarks, prior year trends, peer companies)
   - Identification of financial strengths, weaknesses, and red flags from the data
   - Cross-statement analysis: connecting income statement performance to balance sheet changes

4. RATIO COMPUTATION AND INTERPRETATION: For ratio questions, always require both:
   - The numerical calculation (showing the formula and plugging in the numbers)
   - A meaningful interpretation: "This ratio of X means that..." — a number without context is not a complete answer

5. SCENARIO-BASED QUESTIONS: Present realistic business scenarios (4-8 sentences) and require:
   - Identification of the applicable accounting standard or tax provision
   - Determination of the correct accounting treatment or tax computation
   - Preparation of the required journal entries or tax workings
   - Analysis of the impact on financial statements or tax liability

6. MCQ DISTRACTOR QUALITY: For multiple-choice questions, distractors (wrong answers) MUST be:
   - Common computational errors (e.g., forgetting to adjust for tax, using book value instead of market value, applying the wrong depreciation method)
   - Plausible but incorrect accounting treatments (e.g., expensing what should be capitalised, recognising revenue prematurely)
   - Near-miss answers that test precision (e.g., correct formula but wrong input, correct standard but wrong paragraph)
   - Never include obviously absurd numerical answers or non-accounting options

7. STANDARDS KNOWLEDGE: Include questions that test:
   - Which standard governs a specific accounting issue (e.g., "Under which IFRS standard is lease accounting addressed?")
   - The specific recognition, measurement, or disclosure requirements of a standard
   - Differences between GAAP and IFRS treatment of the same transaction
   - Recent standard changes and their impact on accounting practice

8. EXPLANATION DEPTH: Every question's explanation must:
   - Show the complete calculation workings, not just the final answer
   - Reference the applicable standard or authority
   - Explain why each distractor is wrong, identifying the specific error it contains
   - Where relevant, trace the answer through to its financial statement impact`;

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
 * Build accounting-specific depth instructions for tutor chat interactions.
 *
 * Ensures the AI tutor always shows the double-entry impact, references specific
 * standards, traces through financial statements, and walks through calculations
 * with the depth an accounting student expects from a tutorial session — not a
 * chatbot summary.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['financial_accounting', 'taxation']
 * @returns {string} Prompt section to inject into tutor chat templates
 */
function buildAccountingTutorDepthSection(subdisciplines = []) {
  let section = `
ACCOUNTING TUTOR DEPTH — CRITICAL INSTRUCTIONS:

You are tutoring an accounting student. Accounting tutoring demands numerical precision, standards-grounded reasoning, and the ability to trace every transaction through the double-entry system and financial statements. Follow these rules:

1. ALWAYS SHOW THE DOUBLE-ENTRY IMPACT: Every accounting transaction you discuss must be accompanied by the journal entry:
   - State the debit account(s) and credit account(s) with amounts
   - Explain the account classifications: "We debit [Account] because it is an asset that is increasing..."
   - Verify the accounting equation: "After this entry, Assets increase by X, and Liabilities increase by X, so A = L + E still holds"
   - If the student asks "why do we debit this?", the answer must reference the double-entry framework and the nature of the account

2. ALWAYS REFERENCE SPECIFIC STANDARDS: Every accounting rule or principle you state must be grounded in authoritative guidance:
   - IFRS standards: cite the standard number and relevant paragraph (e.g., "Under IAS 2, para. 10, inventories shall be measured at the lower of cost and net realisable value")
   - GAAP standards: cite the ASC topic (e.g., "ASC 606-10-25-1 establishes the five-step revenue recognition model")
   - Auditing standards: cite the ISA or PCAOB standard (e.g., "ISA 500 requires that audit evidence be sufficient and appropriate")
   - Tax law: cite the specific section of the relevant tax code or act
   - If you are uncertain of the exact paragraph, cite the standard number and topic rather than fabricating a reference

3. ALWAYS TRACE THROUGH FINANCIAL STATEMENTS: When explaining any accounting treatment, show the student the full impact:
   - "This transaction affects the income statement as follows: [revenue/expense line item] increases/decreases by [amount]"
   - "On the balance sheet: [asset/liability/equity] changes by [amount]"
   - "In the cash flow statement: this appears under [operating/investing/financing] activities because..."
   - Help the student see the interconnection between the three financial statements — this is fundamental to accounting literacy

4. WALK THROUGH CALCULATIONS STEP BY STEP: When the student asks a computational question, never jump to the answer:
   - State the formula first: "The formula for [concept] is..."
   - Identify each input: "We need to find [variable]. From the data given, [variable] = [value] because..."
   - Show each calculation step on a separate line with clear labels
   - Arrive at the answer: "Therefore, [concept] = [final answer]"
   - Interpret the result: "This means that..."
   - Ask the student: "Does this result make intuitive sense? What would it mean if the answer were different?"

5. ENCOURAGE ANALYTICAL THINKING: Accounting is not just about recording numbers — it is about understanding what they mean. Regularly prompt the student:
   - "Why does the standard require this treatment rather than the alternative?"
   - "What information does this disclosure provide to users of financial statements?"
   - "If we used a different measurement basis, how would the financial statements change?"
   - "What are the limitations of this ratio/metric? What doesn't it tell us?"
   - "How would a different accounting policy choice affect the reported profit?"

6. CONNECT THEORY TO PRACTICE: Help the student understand real-world application:
   - "In practice, an auditor would verify this by..."
   - "A financial analyst looking at this would be concerned about..."
   - "The tax implication of this treatment is..."
   - "This is why companies often prefer [method X] over [method Y] — because..."
   - Reference real-world examples where accounting treatments have had significant business consequences

7. EXAM TECHNIQUE GUIDANCE: As an accounting tutor, help the student prepare for assessments:
   - When relevant, point out common exam pitfalls: "Students often forget to adjust for tax when computing the cost of debt"
   - Remind them to show workings: "In an exam, always show every calculation step — you earn marks for method even if the final answer is wrong"
   - Encourage structured answers: "Start with the standard, then the treatment, then the journal entry, then the financial statement impact"
   - Flag time management: "This type of question typically appears as a 20-mark problem — allocate your time accordingly"

8. PROFESSIONAL CONTEXT: Where relevant, connect academic accounting to professional practice:
   - Reference the conceptual framework (IASB or FASB) as the foundation for accounting standards
   - Discuss the role of professional judgement in areas where standards require estimation or policy choice
   - Mention ethical considerations: professional scepticism, independence, integrity, objectivity
   - Note where accounting practice is evolving: new standards, exposure drafts, convergence efforts`;

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
  buildAccountingDepthSection,
  buildAccountingQuizDepthSection,
  buildAccountingTutorDepthSection,
};
