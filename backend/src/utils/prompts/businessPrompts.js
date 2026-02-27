/**
 * Business-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce prompt sections that get injected into module generation,
 * quiz generation, flashcard generation, and tutor chat prompts when the subject
 * detector identifies the uploaded material as business content. The goal is to
 * replace generic "200-400 words" instructions with framework-driven, analytically
 * rigorous, exam-ready depth that business students actually need.
 *
 * Each builder accepts a `subdisciplines` array (e.g. ['strategic', 'marketing'])
 * produced by subjectDetector.js and returns a plain string ready for template
 * injection via `.replace('{business_depth_section}', ...)`.
 */

// ─── Subdiscipline-Specific Instruction Blocks ──────────────────

/**
 * Map of subdiscipline keys to their mandatory coverage requirements.
 * These get appended to the base depth section when the corresponding
 * subdiscipline is detected in the student's material.
 */
const SUBDISCIPLINE_MODULE_INSTRUCTIONS = {
  strategic: `
STRATEGIC MANAGEMENT — MANDATORY COVERAGE:
- For every strategic concept discussed, apply at least one recognised framework with a worked case example:
  (a) Porter's Five Forces: systematically analyse each force (threat of new entrants, bargaining power of suppliers, bargaining power of buyers, threat of substitutes, competitive rivalry) with industry-specific evidence
  (b) SWOT Analysis: separate internal factors (strengths, weaknesses) from external factors (opportunities, threats) — never conflate them; link each element to a concrete strategic implication
  (c) PESTEL Analysis: cover Political, Economic, Social, Technological, Environmental, and Legal factors with real-world data points and explain how each factor creates opportunities or threats for the firm
  (d) BCG Matrix: classify business units or products into Stars, Cash Cows, Question Marks, and Dogs — justify the classification with market growth rate and relative market share data
  (e) Ansoff Matrix: map growth strategies (market penetration, market development, product development, diversification) to specific company examples with risk assessment for each quadrant
- Competitive strategy analysis: apply Porter's generic strategies (cost leadership, differentiation, focus) and explain the "stuck in the middle" risk with company examples that succeeded or failed
- Value chain decomposition: break down primary activities (inbound logistics, operations, outbound logistics, marketing & sales, service) and support activities (firm infrastructure, HR management, technology development, procurement) — identify where the firm creates competitive advantage
- For every framework application, explicitly state: (1) strategic insight derived, (2) recommended action, (3) limitations of the framework in that context`,

  marketing: `
MARKETING — MANDATORY COVERAGE:
- STP Process with real-world application:
  (a) Segmentation: demonstrate geographic, demographic, psychographic, and behavioural segmentation with specific market examples; explain the criteria for effective segments (measurable, accessible, substantial, differentiable, actionable)
  (b) Targeting: evaluate segment attractiveness using factors like segment size, growth potential, competitive intensity, and company fit; distinguish between undifferentiated, differentiated, concentrated, and micromarketing strategies
  (c) Positioning: construct a perceptual/positioning map with at least two dimensions relevant to the market; explain the chosen positioning statement and how it differentiates from competitors
- Marketing Mix — detailed analysis:
  (a) Product: cover the three levels (core benefit, actual product, augmented product), product life cycle stages with marketing implications for each, branding strategy (brand equity, brand architecture, brand extensions)
  (b) Price: analyse pricing strategies (cost-plus, value-based, competitive, penetration, skimming, dynamic) with conditions under which each is optimal; include price elasticity considerations
  (c) Place: map the distribution channel structure, evaluate direct vs. indirect channels, discuss channel conflict and omnichannel strategies
  (d) Promotion: cover the promotional mix (advertising, sales promotion, personal selling, public relations, direct marketing, digital marketing) with media selection criteria and IMC (Integrated Marketing Communications) principles
  (e) For services marketing: extend to 7Ps — include People, Process, and Physical Evidence with service-specific examples
- Consumer decision journey mapping: walk through the stages (need recognition, information search, evaluation of alternatives, purchase decision, post-purchase behaviour) with touchpoint identification at each stage
- Metrics and KPIs for each channel: specify the key performance indicators (CAC, CLV, ROAS, conversion rate, NPS, market share, brand awareness) relevant to the marketing strategies discussed`,

  hrm: `
HUMAN RESOURCE MANAGEMENT — MANDATORY COVERAGE:
- Recruitment process with selection criteria:
  (a) Job analysis methods (interviews, questionnaires, observation, work diaries) leading to job descriptions and person specifications
  (b) Recruitment channels: internal vs. external sourcing, employer branding, recruitment marketing, applicant tracking systems
  (c) Selection methods: structured interviews, assessment centres, psychometric testing, work sample tests — evaluate validity and reliability of each method
  (d) Legal compliance: equal opportunity requirements, anti-discrimination legislation, data protection in recruitment
- Compensation design frameworks:
  (a) Job evaluation methods (point-factor, ranking, classification, factor comparison) for establishing internal equity
  (b) Pay structures: base pay, variable pay (bonuses, commissions, profit-sharing), benefits, total rewards philosophy
  (c) External competitiveness: salary benchmarking, pay surveys, market positioning strategy (lead, match, lag)
  (d) Executive compensation: base salary, short-term incentives, long-term incentives (stock options, RSUs), agency theory considerations
- Performance management systems:
  (a) Goal-setting approaches: MBO (Management by Objectives), OKRs (Objectives and Key Results), SMART goals
  (b) Appraisal methods: 360-degree feedback, behaviourally anchored rating scales (BARS), forced ranking — critically evaluate biases in each (halo effect, recency bias, leniency/strictness)
  (c) Performance-reward linkage: pay-for-performance design, merit pay matrices, calibration processes
  (d) Managing underperformance: performance improvement plans (PIPs), progressive discipline, legal considerations in termination
- Employment law considerations: at-will vs. contract employment, wrongful dismissal, constructive dismissal, redundancy procedures, TUPE/transfer of undertakings, whistleblower protections
- Organizational behaviour theories applied:
  (a) Motivation: Maslow's hierarchy of needs, Herzberg's two-factor theory, Vroom's expectancy theory, Adams' equity theory, self-determination theory — apply each to workplace scenarios
  (b) Leadership: trait, behavioural (Blake-Mouton grid), contingency (Fiedler, Hersey-Blanchard), transformational vs. transactional (Burns, Bass), authentic leadership — evaluate with practical examples
  (c) Team dynamics: Tuckman's stages, Belbin's team roles, social loafing, groupthink — provide strategies for managing each challenge`,

  operations: `
OPERATIONS MANAGEMENT — MANDATORY COVERAGE:
- Process flow analysis:
  (a) Process mapping: flowcharts, value stream maps, swimlane diagrams — identify bottlenecks, waste, and value-adding vs. non-value-adding activities
  (b) Process types: project, jobbing, batch, mass, continuous — match each to appropriate product/service contexts with examples
  (c) Little's Law application: L = λW (average items in system = arrival rate × average time in system) — work through numerical examples
  (d) Theory of Constraints: identify the constraint, exploit it, subordinate everything else, elevate the constraint, repeat — apply to a manufacturing or service scenario
- Capacity planning calculations:
  (a) Design capacity vs. effective capacity vs. actual output — calculate capacity utilisation and efficiency ratios
  (b) Break-even analysis: fixed costs, variable costs, contribution margin, break-even point in units and revenue — include graphical representation description
  (c) Decision trees for capacity expansion: expected monetary value (EMV) calculations under uncertainty
  (d) Aggregate planning strategies: chase, level, and mixed strategies with cost comparisons
- Inventory models:
  (a) EOQ (Economic Order Quantity): derive and apply the formula Q* = √(2DS/H) where D = annual demand, S = ordering cost, H = holding cost per unit — work through numerical examples with sensitivity analysis
  (b) Safety stock calculation: safety stock = z × σ_dLT where z = service level z-score, σ_dLT = standard deviation of demand during lead time — explain service level trade-offs
  (c) Reorder point: ROP = d × LT + safety stock — calculate for given demand and lead time scenarios
  (d) ABC analysis: classify inventory by value (A items = 80% value/20% items, B items = 15% value/30% items, C items = 5% value/50% items) and explain differentiated management strategies
- Quality management tools:
  (a) Control charts: X-bar and R charts — explain upper and lower control limits, common cause vs. special cause variation, and when a process is "out of control"
  (b) Pareto analysis: apply the 80/20 rule to quality defects, construct a Pareto chart, and prioritise improvement efforts
  (c) Fishbone (Ishikawa) diagram: use the 6Ms (Man, Machine, Method, Material, Measurement, Mother Nature/Environment) to systematically identify root causes of quality problems
  (d) Statistical Process Control (SPC): process capability indices (Cp, Cpk) — interpret values and their implications for quality performance
- Lean and Six Sigma application:
  (a) Lean principles: identify and eliminate the 8 wastes (TIMWOODS: Transportation, Inventory, Motion, Waiting, Overproduction, Over-processing, Defects, Skills underutilisation)
  (b) Lean tools: 5S, kanban, poka-yoke (mistake-proofing), kaizen, value stream mapping, just-in-time (JIT) — explain each with implementation examples
  (c) Six Sigma DMAIC: Define, Measure, Analyse, Improve, Control — walk through each phase with a process improvement example
  (d) Integration: explain how Lean Six Sigma combines waste elimination with variation reduction for comprehensive process improvement`,
};

const SUBDISCIPLINE_QUIZ_INSTRUCTIONS = {
  strategic: `
- Include case study analysis questions presenting a real or realistic company scenario and requiring application of Porter's Five Forces, SWOT, PESTEL, or BCG Matrix to derive strategic recommendations
- Test the ability to distinguish between corporate-level and business-level strategy, and between deliberate and emergent strategy (Mintzberg vs. Ansoff)
- Present competitive scenarios requiring students to identify which generic strategy a firm is pursuing and evaluate its sustainability
- Include questions requiring value chain analysis to identify sources of competitive advantage or strategic weakness`,

  marketing: `
- Include scenario-based questions requiring students to design an STP strategy for a given product/market situation
- Test ability to recommend an appropriate marketing mix (4Ps/7Ps) for different market contexts, justifying each element
- Present consumer behaviour scenarios requiring identification of the decision stage and appropriate marketing intervention
- Include calculation problems: market share calculation, customer lifetime value (CLV), return on marketing investment, break-even for a product launch
- Present positioning dilemmas where students must evaluate trade-offs between different positioning strategies`,

  hrm: `
- Include scenario-based questions requiring students to design a recruitment and selection process for a specific role, justifying method choices
- Test ability to evaluate compensation packages using job evaluation frameworks and market data
- Present performance management scenarios requiring identification of appraisal biases and recommended corrective actions
- Include questions requiring application of motivation theories to workplace problems (e.g., "Using expectancy theory, explain why this incentive scheme is failing")
- Present employment law scenarios requiring identification of legal risks and compliant HR practices`,

  operations: `
- Include calculation problems requiring application of EOQ, break-even analysis, capacity utilisation, and safety stock formulas — students must show working
- Present process flow scenarios requiring identification of bottlenecks and calculation of throughput time using Little's Law
- Test ability to construct and interpret quality management tools: read a control chart and determine if the process is in control, construct a fishbone diagram for a given quality problem
- Include case studies requiring application of Lean/Six Sigma methodology: identify wastes, recommend tools, and estimate improvement impact
- Present capacity planning decision scenarios using expected monetary value (EMV) calculations under uncertainty`,
};

const SUBDISCIPLINE_TUTOR_INSTRUCTIONS = {
  strategic: `
- When discussing strategy, always apply at least one framework to a concrete company example: "Let's apply Porter's Five Forces to this industry — what does each force look like?"
- Compare competing strategic theories: "Mintzberg would argue strategy emerges, while Ansoff's matrix assumes deliberate planning — which fits this company's situation better?"
- Use real company examples where possible: "Consider how Netflix shifted from DVD rental to streaming — which Ansoff quadrant does that represent?"
- Quantify with data: "Amazon's market share in US e-commerce is approximately 38% — what does that tell us about competitive rivalry in this industry?"`,

  marketing: `
- When discussing marketing concepts, always ground them in a real product/brand example: "Let's work through STP for Tesla — how would you segment the electric vehicle market?"
- Compare competing theories: "The traditional marketing funnel assumes a linear path, but McKinsey's consumer decision journey suggests loyalty loops — which model better explains this market?"
- Use real company examples where possible: "Coca-Cola uses undifferentiated marketing while Procter & Gamble uses differentiated — why might each approach be optimal for their product portfolios?"
- Quantify with data: "If customer acquisition cost is $50 and CLV is $200, that's a 4:1 ratio — is that healthy? What benchmarks should we compare against?"`,

  hrm: `
- When discussing HR topics, always apply theories to concrete workplace scenarios: "Let's use Herzberg's two-factor theory — what are the hygiene factors and motivators in this job design?"
- Compare competing theories: "Maslow assumes a hierarchy of needs, but Alderfer's ERG theory allows for regression — which better explains why this high-salary employee is dissatisfied?"
- Use real company examples where possible: "Google's Project Oxygen identified 8 behaviours of great managers — how does that compare to traditional leadership theory?"
- Quantify with data: "If voluntary turnover is 25% and each replacement costs 1.5x annual salary, what's the annual cost of turnover for a 500-person department with an average salary of $60,000?"`,

  operations: `
- When discussing operations concepts, always work through calculations step by step: "Let's calculate EOQ together — annual demand is 10,000 units, ordering cost is $50 per order, and holding cost is $2 per unit per year. What's our Q*?"
- Compare competing approaches: "JIT minimises inventory holding costs but increases stockout risk — Toyota succeeded with JIT because of its supplier relationships. Could a startup replicate this?"
- Use real company examples where possible: "Zara's supply chain achieves a 15-day design-to-shelf cycle vs. the industry average of 6 months — what operations principles make this possible?"
- Quantify with data: "If our process has a Cpk of 0.8, that means we're producing defects outside specification — we need Cpk ≥ 1.33 for a capable process. What changes would improve this?"`,
};

// ─── Builder Functions ──────────────────────────────────────────

/**
 * Build business-specific depth instructions for module generation.
 *
 * This replaces the generic "200-400 words" content instruction with a rigorous
 * framework demanding framework application, worked case examples, quantitative
 * analysis, and structured business reasoning — everything a business student
 * needs for exam prep and deep understanding.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['strategic', 'marketing']
 * @returns {string} Prompt section to inject into module generation templates
 */
function buildBusinessDepthSection(subdisciplines = []) {
  // ── Base depth instructions (always included for any business content) ──
  let section = `
BUSINESS MODULE DEPTH — CRITICAL INSTRUCTIONS (OVERRIDES DEFAULT WORD COUNT):

TARGET LENGTH: Each module MUST contain 600-1200 words of substantive business content. The generic "200-400 words" instruction does NOT apply to business modules. Business students need thorough, exam-ready material with framework applications and quantitative rigour — not surface-level summaries.

MANDATORY ELEMENTS FOR EVERY MODULE:
1. THEORY/FRAMEWORK STATEMENT: For every concept discussed, explicitly identify and state the relevant academic framework or model. Reference the originating scholar(s) and publication where applicable (e.g., "Porter's Five Forces framework (Porter, 1979)", "Herzberg's two-factor theory (Herzberg, 1959)"). Never discuss a business concept without anchoring it to its theoretical foundation.

2. APPLICATION PROCESS: Show how the framework is applied step by step. Do not merely describe what a framework is — demonstrate HOW to use it:
   - State the inputs required (what data/information is needed)
   - Walk through each step of the analysis with specific guidance
   - Show the decision criteria or output interpretation
   - Explain how the results inform strategic or operational decisions

3. CASE EXAMPLES: Include at least one worked case example per major concept using a real or realistic company scenario:
   - Name the company and industry context
   - State the specific business situation or challenge
   - Apply the framework to that situation with concrete details
   - State the strategic insight or recommendation derived from the analysis
   - Where possible, reference the actual outcome or decision the company made

4. ANALYSIS TOOLS — QUANTITATIVE RIGOUR: Where the concept involves quantitative methods, include:
   - The formula or calculation method with all variables defined
   - A worked numerical example with realistic figures
   - Interpretation of the result and its managerial implications
   - Sensitivity analysis or "what-if" considerations where relevant
   Examples: break-even analysis, ROI calculations, market share computation, EOQ, capacity utilisation, NPV/IRR for investment decisions

5. STRATEGIC IMPLICATIONS: For every concept, explicitly connect the analysis to strategic decision-making:
   - "This analysis suggests that the firm should..."
   - "The implication for competitive strategy is..."
   - "Management should respond by..."
   - Link micro-level analysis to macro-level strategy wherever possible

6. LIMITATIONS AND CRITICAL EVALUATION: For every framework or model discussed, state its limitations:
   - What assumptions does the framework make? Are those assumptions realistic?
   - In what contexts does the framework fail or produce misleading results?
   - What criticisms have scholars raised? (e.g., Porter's Five Forces assumes static industry structure; SWOT lacks prioritisation)
   - What alternative or complementary frameworks address those limitations?

7. STRUCTURE: Organise each module following Theory/Framework -> Application Process -> Case Example -> Analysis Tools -> Strategic Implications -> Limitations. Use markdown headings (##, ###) to separate these sections clearly.

8. ACCURACY: NEVER fabricate company data, financial figures, or market statistics. If using illustrative numbers, clearly state they are hypothetical. When referencing real companies, ensure the strategic facts are accurate and current. A wrong company example is worse than a clearly hypothetical one.`;

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
 * Build business-specific depth instructions for quiz and question generation.
 *
 * Ensures quizzes test framework application and analytical reasoning — not mere
 * recall — with case study scenarios, calculation problems, and strategic
 * decision-making questions that mirror business school assessments.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['strategic', 'marketing']
 * @returns {string} Prompt section to inject into quiz generation templates
 */
function buildBusinessQuizDepthSection(subdisciplines = []) {
  let section = `
BUSINESS QUIZ DEPTH — CRITICAL INSTRUCTIONS:

QUESTION DESIGN PRINCIPLES:
1. CASE STUDY ANALYSIS QUESTIONS: At least 40% of questions must present a business scenario (4-8 sentences describing a company situation) and require the student to:
   - Identify the relevant framework(s) to apply
   - Analyse the situation using that framework
   - Recommend a course of action with justification
   - Evaluate potential risks or limitations of the recommendation

2. FRAMEWORK APPLICATION TO SCENARIOS: Include questions that test whether students can correctly apply business frameworks:
   - "Using Porter's Five Forces, which force represents the greatest threat in this industry? Justify your answer."
   - "Apply the BCG Matrix to this company's product portfolio. Which product is a Question Mark and why?"
   - "Based on Ansoff's Matrix, which growth strategy is this company pursuing? What are the associated risks?"
   - Present scenarios where multiple frameworks could apply and ask students to select and justify the most appropriate one

3. CALCULATION PROBLEMS: Include quantitative questions requiring students to show working:
   - Break-even analysis: "Given fixed costs of $500,000, variable cost per unit of $30, and selling price of $50, calculate the break-even point in units and revenue"
   - ROI calculations: "If a marketing campaign costs $200,000 and generates $800,000 in incremental revenue with a 25% profit margin, what is the ROI?"
   - Market share: "Company A has sales of $15M in a market worth $120M. Calculate market share and assess competitive position"
   - Operations: EOQ, capacity utilisation, process efficiency calculations with realistic data
   - Always require interpretation of the numerical result, not just the calculation

4. STRATEGIC DECISION-MAKING SCENARIOS: Present realistic business dilemmas requiring evaluation of trade-offs:
   - "The CEO must choose between investing in market penetration or product development. Given the following market data, which strategy would you recommend and why?"
   - "Two acquisition targets are available. Using the information provided, evaluate which better fits the company's strategic objectives"
   - Present scenarios with incomplete information, requiring students to identify what additional data they would need

5. COMPARE AND CONTRAST QUESTIONS: Test the ability to distinguish between related concepts:
   - "Explain the difference between a cost leadership strategy and a low-cost strategy"
   - "How does Maslow's hierarchy of needs differ from Herzberg's two-factor theory in its implications for employee motivation?"
   - "Distinguish between efficiency and effectiveness in operations management with an example of each"

6. MCQ DISTRACTOR QUALITY: For multiple-choice questions, distractors (wrong answers) MUST be:
   - Plausible business concepts that are subtly wrong or misapplied (not obviously absurd)
   - Common misconceptions: e.g., confusing market penetration with market development, confusing fixed and variable costs
   - Near-misses that test precision: e.g., correct framework but wrong application, right formula but wrong variable interpretation
   - Never include joke answers or obviously non-business options

7. EXPLANATION DEPTH: Every question's explanation must:
   - State the correct answer with the underlying framework or principle
   - Show the complete calculation working for quantitative questions
   - Explain why each distractor is wrong, referencing the specific conceptual error
   - Where relevant, note real-world examples that illustrate the correct answer
   - Connect the answer to broader strategic implications`;

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
 * Build business-specific depth instructions for tutor chat interactions.
 *
 * Ensures the AI tutor always applies frameworks to concrete examples, compares
 * competing theories, uses real company examples where possible, and quantifies
 * with data — delivering the analytical depth a business student expects from
 * a seminar discussion, not a chatbot summary.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['strategic', 'marketing']
 * @returns {string} Prompt section to inject into tutor chat templates
 */
function buildBusinessTutorDepthSection(subdisciplines = []) {
  let section = `
BUSINESS TUTOR DEPTH — CRITICAL INSTRUCTIONS:

You are tutoring a business student. Business tutoring demands framework-driven analysis, real-world application, quantitative rigour, and critical evaluation of competing theories. Follow these rules:

1. ALWAYS APPLY FRAMEWORKS TO CONCRETE EXAMPLES: Every business concept you explain must be grounded in a real or realistic company example:
   - Do not explain Porter's Five Forces in the abstract — apply it to a specific industry the student is studying
   - Do not define SWOT — walk through a SWOT analysis for a named company
   - If the student asks "what is market segmentation?", explain it by segmenting an actual market (e.g., "Let's segment the smartphone market by demographics, psychographics, and behaviour...")
   - The student should never hear a framework described without seeing it applied

2. COMPARE COMPETING THEORIES: Business studies involves multiple schools of thought — always present alternatives:
   - "Porter argues competitive advantage comes from industry positioning, but the Resource-Based View (Barney, 1991) argues it comes from unique internal resources — which perspective better explains this company's success?"
   - "Classical management theory emphasises hierarchy and control, while human relations theory emphasises employee satisfaction — how should this company balance both?"
   - Help the student understand that different frameworks can yield different recommendations from the same data, and that evaluating which framework is most appropriate is itself a critical business skill

3. USE REAL COMPANY EXAMPLES WHERE POSSIBLE: Ground every explanation in reality:
   - Name specific companies, industries, and market conditions
   - Reference real strategic decisions and their outcomes (e.g., "Kodak's failure to pivot to digital photography despite inventing the technology illustrates the innovator's dilemma...")
   - When using hypothetical examples, make them realistic with plausible numbers and industry context
   - Update examples to current market conditions where the student's material may be dated

4. QUANTIFY WITH DATA: Business is data-driven — always incorporate numbers:
   - When discussing market size, cite approximate figures: "The global EV market was worth approximately $500 billion in 2023, growing at 25% CAGR..."
   - When discussing financial performance, use ratios and metrics: "Apple's gross margin of ~45% compared to Samsung's ~40% suggests..."
   - When working through frameworks, use quantitative inputs where possible: "If we estimate the switching cost for customers as low (say 2 out of 10), the bargaining power of buyers is..."
   - Walk through calculations step by step: "Let's calculate the break-even point together..."

5. STRUCTURED ANALYSIS COACHING: Teach the student how to structure business analysis for exams and assignments:
   - For case studies: "Start by identifying the key issue, then select the most relevant framework, apply it systematically, and conclude with a justified recommendation"
   - For essays: "A strong business essay states the argument, supports it with theory and evidence, considers counter-arguments, and reaches a balanced conclusion"
   - For calculations: "Always state the formula, define your variables, show your working, and interpret the result in business terms"

6. CRITICAL EVALUATION: Business frameworks are tools, not truths — encourage the student to evaluate them:
   - "What assumptions does this model make? Are they realistic in this context?"
   - "This framework was developed in the 1980s — does it still apply in the digital economy?"
   - "If you were advising this CEO, would you rely solely on this analysis? What else would you want to know?"
   - Help the student move beyond framework application to framework evaluation — this is the difference between a passing grade and a distinction

7. EXAM TECHNIQUE GUIDANCE: As a business tutor, help the student prepare for assessments:
   - When relevant, point out common exam pitfalls: "Students often describe a framework without applying it to the case — that will lose marks"
   - Encourage use of evidence: "In an exam answer, always support your recommendation with data or a real company example"
   - Flag depth expectations: "A first-class answer would not just identify a cost leadership strategy — it would evaluate whether it is sustainable given the competitive dynamics"
   - Advise on time allocation for case study exams: "Spend the first 10 minutes reading and annotating the case, identifying 3-4 key issues, before you start writing"

8. INTEGRATION ACROSS DISCIPLINES: Business problems rarely sit in one functional area — encourage cross-functional thinking:
   - "This looks like a marketing problem, but the pricing decision also affects the operations team's capacity planning and the finance team's margin targets"
   - "HR strategy cannot be designed in isolation from business strategy — how does this company's growth plan affect its talent requirements?"
   - Help the student see the connections between strategy, marketing, operations, finance, and HRM`;

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
  buildBusinessDepthSection,
  buildBusinessQuizDepthSection,
  buildBusinessTutorDepthSection,
};
