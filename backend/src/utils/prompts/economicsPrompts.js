/**
 * Economics-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce prompt sections that get injected into module generation,
 * quiz generation, flashcard generation, and tutor chat prompts when the subject
 * detector identifies the uploaded material as economics content. The goal is to
 * replace generic "200-400 words" instructions with rigorous, model-driven,
 * analytically deep content that economics students actually need.
 *
 * Each builder accepts a `subdisciplines` array (e.g. ['microeconomics', 'macroeconomics'])
 * produced by subjectDetector.js and returns a plain string ready for template
 * injection via `.replace('{economics_depth_section}', ...)`.
 */

// ─── Subdiscipline-Specific Instruction Blocks ──────────────────

/**
 * Map of subdiscipline keys to their mandatory coverage requirements.
 * These get appended to the base depth section when the corresponding
 * subdiscipline is detected in the student's material.
 */
const SUBDISCIPLINE_MODULE_INSTRUCTIONS = {
  microeconomics: `
MICROECONOMICS — MANDATORY COVERAGE:
- For every market analysis, explicitly work through supply and demand:
  (a) Derive the demand function from utility maximisation (e.g., MRS = Px/Py from a Cobb-Douglas or CES utility function)
  (b) Derive the supply function from profit maximisation (MC = MR for the relevant market structure)
  (c) Solve for equilibrium price (P*) and quantity (Q*) algebraically, showing all steps
  (d) Perform comparative statics: show how a shift in a parameter (income, input cost, tax) changes equilibrium — use partial derivatives where appropriate
- ELASTICITY CALCULATIONS: For every demand/supply analysis include:
  (a) Price elasticity of demand: Ed = (%ΔQd / %ΔP) — compute point elasticity or arc elasticity as appropriate
  (b) Income elasticity: Ey = (%ΔQd / %ΔY) — classify goods as normal (Ey > 0), inferior (Ey < 0), luxury (Ey > 1), or necessity (0 < Ey < 1)
  (c) Cross-price elasticity: Exy = (%ΔQdx / %ΔPy) — classify as substitutes (Exy > 0) or complements (Exy < 0)
  (d) Elasticity along a linear demand curve: demonstrate that elasticity varies from elastic (top) to inelastic (bottom) and identify the unit-elastic midpoint
- WELFARE ANALYSIS: For every policy intervention (tax, subsidy, price ceiling, price floor):
  (a) Consumer surplus (CS): the area below demand and above price — compute geometrically (triangle/trapezoid areas)
  (b) Producer surplus (PS): the area above supply and below price — compute geometrically
  (c) Deadweight loss (DWL): the net loss in total surplus — identify the Harberger triangle and calculate its area (DWL = ½ × ΔP × ΔQ)
  (d) Government revenue or expenditure where applicable
  (e) Compare the pre-intervention and post-intervention welfare outcomes numerically
- MARKET STRUCTURE COMPARISONS: When discussing market structures, build a complete comparison:
  (a) Perfect competition: P = MC = MR, zero economic profit in long run, productive and allocative efficiency
  (b) Monopoly: MR = MC with MR < P (downward-sloping demand), derive profit π = (P - ATC) × Q, show DWL from monopoly pricing
  (c) Monopolistic competition: short-run monopoly-like profits, long-run zero economic profit with excess capacity (P > MC, P = ATC)
  (d) Oligopoly: Cournot model (simultaneous quantity), Bertrand model (simultaneous price), Stackelberg model (sequential) — derive reaction functions and Nash equilibrium for at least one model
  (e) For each structure: state the number of firms, product differentiation, barriers to entry, price-setting power, and long-run profit outcome`,

  macroeconomics: `
MACROECONOMICS — MANDATORY COVERAGE:
- IS-LM MODEL: For every monetary/fiscal policy discussion, derive and use the IS-LM framework:
  (a) IS curve derivation: Start from the goods market equilibrium Y = C(Y-T) + I(r) + G, solve for the relationship between Y and r, show that the slope depends on the marginal propensity to consume (MPC) and the interest sensitivity of investment
  (b) LM curve derivation: Start from money market equilibrium M/P = L(Y, r), where L is the liquidity preference function, show that the slope depends on income sensitivity and interest sensitivity of money demand
  (c) Simultaneous equilibrium: solve the IS and LM equations simultaneously for equilibrium Y* and r*
  (d) Policy analysis: show graphically and mathematically how fiscal expansion shifts IS right (ΔY = multiplier × ΔG, with crowding out reducing the full multiplier effect) and how monetary expansion shifts LM right (lower r, higher Y)
  (e) Special cases: liquidity trap (horizontal LM), classical case (vertical LM)
- AD-AS ANALYSIS: For every macroeconomic shock or policy analysis:
  (a) Derive AD from IS-LM: an increase in P shifts LM left (M/P falls), reducing Y — trace the P-Y combinations to get the downward-sloping AD curve
  (b) Short-run AS (SRAS): upward-sloping due to sticky wages/prices — use the sticky-wage model W = W̄ × (P/Pᵉ) or the misperceptions model
  (c) Long-run AS (LRAS): vertical at potential output Yₙ (natural rate of output), determined by factors of production and technology
  (d) Analyse demand shocks (shift AD) and supply shocks (shift SRAS) — show short-run and long-run adjustment with self-correcting mechanism
- MULTIPLIER CALCULATIONS: Always derive and compute the relevant multiplier:
  (a) Simple expenditure multiplier: k = 1 / (1 - MPC) — show the derivation from the geometric series of spending rounds
  (b) Tax multiplier: kT = -MPC / (1 - MPC) — explain why it is smaller than the spending multiplier
  (c) Balanced budget multiplier: kBB = 1 — prove that equal increases in G and T raise Y by the same amount
  (d) Open economy multiplier: k = 1 / (1 - MPC + MPM) where MPM is the marginal propensity to import
- PHILLIPS CURVE: When discussing inflation-unemployment tradeoffs:
  (a) Original Phillips curve: inverse relationship between unemployment (u) and wage/price inflation (π)
  (b) Expectations-augmented Phillips curve: π = πᵉ - β(u - uₙ) where uₙ is the natural rate — show that the long-run Phillips curve is vertical at uₙ
  (c) Distinguish between adaptive expectations and rational expectations approaches
  (d) Discuss the sacrifice ratio and the cost of disinflation
- SOLOW GROWTH MODEL: When discussing long-run growth:
  (a) Production function: Y = F(K, AL) with constant returns to scale — typically Y = Kᵅ(AL)¹⁻ᵅ
  (b) Per effective worker: y = kᵅ where k = K/AL, y = Y/AL
  (c) Capital accumulation: Δk = sf(k) - (δ + n + g)k — derive the steady state where Δk = 0, so sf(k*) = (δ + n + g)k*
  (d) Golden Rule: the steady-state k that maximises consumption per effective worker — set MPK = δ + n + g
  (e) Convergence: explain conditional vs. absolute convergence and the prediction that poorer countries grow faster (if they share the same steady state)`,

  international: `
INTERNATIONAL ECONOMICS — MANDATORY COVERAGE:
- COMPARATIVE ADVANTAGE: For every trade analysis, demonstrate with numerical examples:
  (a) Set up a two-country, two-good model with specific labour productivity numbers (e.g., Country A: 2 hrs/cloth, 6 hrs/wine; Country B: 4 hrs/cloth, 8 hrs/wine)
  (b) Compute opportunity costs for each country (e.g., opportunity cost of 1 cloth in A = 2/6 = 1/3 wine)
  (c) Identify which country has the comparative advantage in which good — the country with the LOWER opportunity cost
  (d) Determine the range of mutually beneficial terms of trade (between the two countries' opportunity cost ratios)
  (e) Show gains from trade numerically: compute consumption possibilities with and without trade
  (f) Extend to the Heckscher-Ohlin model: trade is driven by differences in factor endowments — the factor-abundant country exports the factor-intensive good (Heckscher-Ohlin theorem), and trade equalises factor prices (factor price equalisation theorem)
- EXCHANGE RATE DETERMINATION: Cover the major models:
  (a) Purchasing Power Parity (PPP): e = P/P* — explain why PPP holds in the long run but fails in the short run (Balassa-Samuelson effect, non-traded goods)
  (b) Interest rate parity: uncovered interest parity (UIP) condition: i - i* = (Eₜ₊₁ - eₜ)/eₜ — the expected depreciation equals the interest differential
  (c) Mundell-Fleming model: IS-LM for an open economy with perfect capital mobility — show that under fixed exchange rates fiscal policy is effective but monetary policy is not, and vice versa under flexible rates
  (d) Marshall-Lerner condition: a devaluation improves the trade balance only if the sum of export and import demand elasticities exceeds one (|ηx| + |ηm| > 1) — relate to the J-curve effect
- BALANCE OF PAYMENTS ANALYSIS:
  (a) Current account: trade balance (goods + services) + primary income (investment returns) + secondary income (transfers) — identify whether the country runs a deficit or surplus
  (b) Capital and financial account: FDI, portfolio investment, reserve asset changes — explain the double-entry accounting (CA + KA + FA = 0)
  (c) Twin deficits hypothesis: a fiscal deficit leads to a current account deficit through S - I = (T - G) + (X - M)
  (d) Adjustment mechanisms: under fixed rates (expenditure-switching and expenditure-reducing policies), under flexible rates (automatic exchange rate adjustment)`,

  development: `
DEVELOPMENT ECONOMICS — MANDATORY COVERAGE:
- GROWTH MODELS: Apply formal models to developing economy contexts:
  (a) Harrod-Domar model: g = s/v where g is growth rate, s is savings rate, v is the capital-output ratio — explain the "financing gap" and why aid was historically justified through this model, then discuss its limitations (assumes fixed coefficients, ignores diminishing returns)
  (b) Solow model applied to development: explain why the model predicts convergence but empirical convergence is conditional — role of institutions, human capital, technology transfer
  (c) Endogenous growth models: AK model (Y = AK) where constant returns to capital eliminate diminishing returns — role of human capital (Lucas), R&D (Romer), learning-by-doing (Arrow)
  (d) Dual-economy models: Lewis model of structural transformation — unlimited supply of labour from the traditional sector, modern sector capital accumulation drives growth until the "Lewis turning point"
- HDI CONSTRUCTION: When discussing development measurement:
  (a) Three dimensions: health (life expectancy at birth), education (mean years of schooling + expected years of schooling), standard of living (GNI per capita in PPP$)
  (b) Normalisation formula for each dimension index: Iᵢ = (actual - minimum) / (maximum - minimum) — state the goalposts (min/max values set by UNDP)
  (c) Aggregation: HDI = (I_health × I_education × I_income)^(1/3) — geometric mean, NOT arithmetic mean (this changed in 2010)
  (d) Limitations: HDI ignores inequality (addressed by IHDI), environmental sustainability, political freedom, gender disparities (addressed by GDI and GII)
- POVERTY MEASURES: Cover the standard measures with formulas:
  (a) Headcount ratio (H): H = q/n where q is the number below the poverty line — simple but ignores depth and severity
  (b) Poverty gap index (PG): PG = (1/n) × Σ[(z - yᵢ)/z] for all yᵢ < z — measures the average shortfall from the poverty line z
  (c) Squared poverty gap (SPG or P₂): PG₂ = (1/n) × Σ[(z - yᵢ)/z]² — gives greater weight to those furthest below the line
  (d) Foster-Greer-Thorbecke (FGT) class: Pα = (1/n) × Σ[(z - yᵢ)/z]ᵅ — α = 0 (headcount), α = 1 (poverty gap), α = 2 (severity)
  (e) Gini coefficient: G = A / (A + B) from the Lorenz curve — ranges from 0 (perfect equality) to 1 (perfect inequality)
- POLICY EVALUATION FRAMEWORKS: When discussing development interventions:
  (a) Randomised controlled trials (RCTs): treatment and control groups, average treatment effect (ATE), intent-to-treat (ITT) vs. treatment-on-the-treated (TOT) — reference Duflo, Banerjee, Kremer (Nobel 2019)
  (b) Difference-in-differences (DiD): compare changes over time between treatment and control groups, parallel trends assumption
  (c) Cost-benefit analysis: compute NPV = Σ[Bₜ - Cₜ] / (1 + r)ᵗ — discuss the choice of discount rate for development projects
  (d) Washington Consensus vs. institutional approaches: fiscal discipline, trade liberalisation, privatisation (Washington) vs. governance, property rights, rule of law (institutional) — discuss empirical evidence for each`,
};

const SUBDISCIPLINE_QUIZ_INSTRUCTIONS = {
  microeconomics: `
- Include graph interpretation questions: present a supply-demand diagram scenario (verbally described) and ask the student to identify the new equilibrium, the direction of price/quantity change, or the welfare effects
- Include calculation problems: provide demand and supply functions (e.g., Qd = 100 - 2P, Qs = 3P - 25) and require the student to solve for equilibrium P* and Q*, calculate elasticity at equilibrium, or compute CS/PS/DWL after a tax
- Present market structure comparison questions: "If this industry transitioned from perfect competition to monopoly, what would happen to price, quantity, consumer surplus, and deadweight loss?"
- Include profit maximisation problems: provide a cost function and demand function for a monopolist or oligopolist and require the student to find the profit-maximising output and price`,

  macroeconomics: `
- Include IS-LM problem questions: "If the government increases spending by ΔG with MPC = 0.8, what is the shift in the IS curve? What is the new equilibrium Y and r?"
- Include multiplier calculation questions: provide MPC, tax rate, and import propensity and require computation of the relevant multiplier and the change in GDP
- Present AD-AS scenarios: "An oil price shock shifts SRAS left — describe the short-run and long-run adjustment path for output, price level, and unemployment"
- Include Phillips curve questions: "If expected inflation is 3%, the natural rate of unemployment is 5%, and β = 0.5, what is the inflation rate when unemployment is 7%?"
- Test Solow model understanding: "If s = 0.3, δ = 0.05, n = 0.02, g = 0.03, and f(k) = k^0.5, what is the steady-state capital per effective worker?"`,

  international: `
- Include comparative advantage problems: provide a production table for two countries and two goods, require the student to identify comparative advantage, determine terms of trade range, and show gains from trade
- Include exchange rate questions: "If the domestic interest rate is 5%, the foreign rate is 3%, and the current spot rate is 1.20, what does uncovered interest parity predict for the expected future spot rate?"
- Present Mundell-Fleming scenarios: "Under a fixed exchange rate with perfect capital mobility, what happens when the government increases spending?"
- Include balance of payments accounting questions: classify transactions into current account, capital account, and financial account components
- Test the Marshall-Lerner condition: provide elasticity values and ask whether a devaluation will improve the trade balance`,

  development: `
- Include HDI calculation problems: provide life expectancy, mean years of schooling, expected years of schooling, and GNI per capita — require the student to compute each dimension index and the final HDI
- Include poverty measurement questions: provide an income distribution and poverty line, require computation of the headcount ratio, poverty gap, and squared poverty gap
- Present growth model problems: "If a country's savings rate is 20% and the capital-output ratio is 4, what growth rate does the Harrod-Domar model predict?"
- Include policy evaluation questions: "A government introduces a conditional cash transfer programme. Design an RCT to measure its impact on school enrolment — what is your treatment group, control group, and outcome variable?"
- Test understanding of competing development strategies: present a policy scenario and ask the student to evaluate it from both Washington Consensus and institutional perspectives`,
};

const SUBDISCIPLINE_TUTOR_INSTRUCTIONS = {
  microeconomics: `
- When analysing a market, always draw the graph (describe it in text): "Imagine a standard supply-demand diagram. The demand curve slopes downward from left to right. The supply curve slopes upward..."
- Walk through the algebra step by step: "Let's set Qd = Qs and solve for P*..." — never skip steps
- When a policy is introduced, always show the welfare effects: "Before the tax, CS was the triangle above P* and below the demand curve. After the tax, CS shrinks because the price consumers pay rises to Pc..."
- Connect to real-world examples: "This is exactly what happened when [country] imposed a tariff on steel imports — the domestic price rose, domestic producers gained, but the DWL represents resources wasted"`,

  macroeconomics: `
- When explaining fiscal or monetary policy, always draw the IS-LM diagram (describe it): "On the horizontal axis we have Y (output), on the vertical axis r (interest rate). The IS curve slopes downward because higher r reduces investment and thus Y..."
- Show the math behind every shift: "Government spending increases by ΔG = 100. With MPC = 0.8, the IS curve shifts right by ΔG × 1/(1-MPC) = 100 × 5 = 500. But in the IS-LM model, the actual increase in Y is less than 500 because of crowding out..."
- Connect theory to current policy debates: "This is the debate about whether the Fed should raise rates — in IS-LM terms, tightening monetary policy shifts LM left, raising r and reducing Y. The question is whether the economy is overheating (Y > Yₙ) or still below potential"
- When discussing growth, always ground it in the Solow diagram: "On the x-axis we have k (capital per effective worker), on the y-axis we have y, sf(k), and (δ+n+g)k. The steady state is where the savings curve sf(k) crosses the break-even line (δ+n+g)k..."`,

  international: `
- When explaining trade, always start with a numerical example: "Let's say the UK can produce 1 unit of cloth in 2 hours and 1 unit of wine in 6 hours, while France can produce 1 unit of cloth in 4 hours and 1 unit of wine in 8 hours. What is each country's opportunity cost?"
- Draw the exchange rate diagrams (describe them): "In the foreign exchange market, the horizontal axis shows the quantity of dollars, the vertical axis shows the price of a dollar in euros (the exchange rate e). Demand for dollars slopes downward..."
- When discussing trade policy, always quantify the effects: "A tariff of t per unit raises the domestic price from Pw to Pw + t. The tariff revenue is t × Qimports, but there are two DWL triangles — one from production inefficiency and one from consumption inefficiency"
- Connect to current events: "This is directly relevant to the ongoing debate about trade deficits — remember, a current account deficit is identically equal to a capital account surplus, which means foreign capital is flowing IN"`,

  development: `
- When discussing development indicators, always compute them step by step: "Let's calculate the HDI together. Life expectancy is 72 years. The minimum is 20 and the maximum is 85. So the health index is (72 - 20)/(85 - 20) = 52/65 = 0.800..."
- Draw the Lorenz curve (describe it): "The horizontal axis shows the cumulative share of population from poorest to richest. The vertical axis shows the cumulative share of income. The 45-degree line represents perfect equality. The further the Lorenz curve bows below this line, the greater the inequality..."
- Challenge students on policy trade-offs: "If you increase the minimum wage, what does the standard micro model predict? Now, what does the monopsony model predict? Which is more relevant for a developing country with large informal sectors?"
- Ground theoretical models in empirical evidence: "The Harrod-Domar model says growth = s/v, which led to the 'financing gap' approach to aid. But Easterly (2001) showed that countries receiving large aid inflows did NOT grow as predicted — why might that be?"`,
};

// ─── Builder Functions ──────────────────────────────────────────

/**
 * Build economics-specific depth instructions for module generation.
 *
 * This replaces the generic "200-400 words" content instruction with a rigorous
 * framework demanding mathematical models, graphical analysis, numerical examples,
 * and structured economic reasoning — everything an economics student needs for
 * exam prep and deep understanding.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['microeconomics', 'macroeconomics']
 * @returns {string} Prompt section to inject into module generation templates
 */
function buildEconomicsDepthSection(subdisciplines = []) {
  // ── Base depth instructions (always included for any economics content) ──
  let section = `
ECONOMICS MODULE DEPTH — CRITICAL INSTRUCTIONS (OVERRIDES DEFAULT WORD COUNT):

TARGET LENGTH: Each module MUST contain 600-1200 words of substantive economics content. The generic "200-400 words" instruction does NOT apply to economics modules. Economics students need thorough, analytically rigorous material — not surface-level summaries.

MANDATORY ELEMENTS FOR EVERY MODULE:
1. MATHEMATICAL MODELS WITH DERIVATIONS: Every economic concept must be grounded in a formal model:
   - State the model's assumptions explicitly (e.g., "Assume two goods, two countries, one factor of production, constant opportunity costs")
   - Present the key equations and derive them step by step — do NOT skip algebraic steps
   - Define every variable and parameter when first introduced (e.g., "Let P denote price, Q denote quantity, MPC the marginal propensity to consume")
   - Show how the result changes when assumptions are relaxed (sensitivity analysis / comparative statics)

2. GRAPHICAL ANALYSIS (DESCRIBED FOR TEXT): Economics is a visual discipline. For every major concept, describe the relevant graph in enough detail that a student could draw it:
   - Specify what is on each axis (e.g., "Price (P) on the vertical axis, Quantity (Q) on the horizontal axis")
   - Describe the shape and slope of each curve (e.g., "The demand curve slopes downward from left to right, reflecting the inverse relationship between price and quantity demanded")
   - Identify key points: equilibrium, intercepts, intersection points, areas representing surplus, deadweight loss, or government revenue
   - Describe shifts: "An increase in income shifts the demand curve rightward from D₁ to D₂, holding the supply curve constant. The new equilibrium moves from E₁ to E₂, with a higher price P₂ and higher quantity Q₂"

3. NUMERICAL EXAMPLES: Every model or concept must include at least one worked numerical example:
   - Use concrete numbers (e.g., "Suppose Qd = 100 - 2P and Qs = 3P - 25")
   - Solve step by step, showing all intermediate calculations
   - State the economic interpretation of the numerical result (e.g., "The equilibrium price is P* = 25, meaning the market clears at $25 per unit")
   - Where relevant, change one parameter and show how the result changes (comparative statics with numbers)

4. REAL-WORLD POLICY IMPLICATIONS: Connect every theoretical result to actual policy:
   - Reference real-world examples of the policy or phenomenon (e.g., "This is analogous to the 2008 US fiscal stimulus package")
   - Discuss who wins and who loses from a policy change (distributional analysis)
   - Identify potential unintended consequences or second-round effects
   - Reference empirical evidence where available (e.g., "Empirical estimates of the fiscal multiplier range from 0.5 to 2.0, depending on the state of the economy")

5. COMPETING THEORETICAL PERSPECTIVES: Economics is a discipline with active debates. For every major topic, present at least two perspectives:
   - Classical/neoclassical vs. Keynesian on macroeconomic policy
   - Free market vs. interventionist on microeconomic policy
   - Structuralist vs. neoliberal on development policy
   - State the assumptions that drive each perspective's conclusions
   - Identify what empirical evidence supports or undermines each view
   - Do NOT present one perspective as definitively "correct" — teach the student to evaluate arguments

6. STRUCTURE: Organise each module following this framework:
   (a) Theory: State the economic theory or principle clearly
   (b) Model/Equation: Present the formal mathematical model with derivation
   (c) Graphical Analysis: Describe the relevant diagram in detail
   (d) Numerical Example: Work through a concrete example with numbers
   (e) Policy Implications: Connect to real-world policy and empirical evidence
   (f) Criticisms: Present alternative perspectives and limitations of the model
   Use markdown headings (##, ###) to separate these sections clearly.

7. ACCURACY: NEVER fabricate data, empirical estimates, or attribute findings to economists without basis. If uncertain about a specific number or attribution, state the general finding rather than inventing a precise figure. A wrong statistic is worse than a general statement.`;

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
 * Build economics-specific depth instructions for quiz and question generation.
 *
 * Ensures quizzes test economic reasoning, model application, and quantitative
 * analysis — not mere definition recall — with graph interpretation, calculation
 * problems, policy analysis scenarios, and model comparisons that mirror
 * economics exam assessments.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['microeconomics', 'macroeconomics']
 * @returns {string} Prompt section to inject into quiz generation templates
 */
function buildEconomicsQuizDepthSection(subdisciplines = []) {
  let section = `
ECONOMICS QUIZ DEPTH — CRITICAL INSTRUCTIONS:

QUESTION DESIGN PRINCIPLES:
1. GRAPH INTERPRETATION: At least 25% of questions must involve interpreting or reasoning about economic diagrams:
   - Describe a graph scenario in text (e.g., "In a supply-demand diagram, the government imposes a price floor above the equilibrium price")
   - Ask the student to identify the resulting surplus/shortage, the new quantities demanded and supplied, or the welfare effects
   - Present a shift scenario and ask which curve shifts, in which direction, and what happens to equilibrium
   - Include questions where the student must identify which graph/model is appropriate for a given situation

2. CALCULATION PROBLEMS: At least 30% of questions must require quantitative computation:
   - ELASTICITY: Provide data and require computation of price elasticity, income elasticity, or cross-price elasticity — require correct formula selection and interpretation of the result
   - MULTIPLIER: Provide MPC (and other parameters) and require computation of the expenditure multiplier, tax multiplier, or balanced budget multiplier — require interpretation of the economic significance
   - EQUILIBRIUM: Provide demand and supply functions and require solving for equilibrium price and quantity — extend to computing surplus, tax incidence, or deadweight loss
   - GROWTH MODELS: Provide parameters (savings rate, depreciation, population growth) and require steady-state calculations
   - All calculation questions must require the student to show intermediate steps or select the correct intermediate value (not just the final answer)

3. POLICY ANALYSIS SCENARIOS: At least 20% of questions must present a policy scenario and test economic reasoning:
   - Present a government policy (tax increase, interest rate change, tariff, minimum wage) and ask the student to analyse its effects using the appropriate model
   - Require the student to identify winners and losers from the policy
   - Ask the student to evaluate the policy from multiple theoretical perspectives
   - Include questions where the "obvious" policy conclusion is wrong once general equilibrium effects or second-round effects are considered

4. MODEL COMPARISON: Include questions that test the student's ability to compare and evaluate competing models:
   - "How would a classical economist and a Keynesian economist differ in their analysis of a recession?"
   - "Compare the predictions of the Solow model and the AK model regarding the effect of an increase in the savings rate"
   - "Under what conditions does the Mundell-Fleming model predict that fiscal policy is ineffective?"
   - Present a scenario and ask which model is most appropriate and why

5. MCQ DISTRACTOR QUALITY: For multiple-choice questions, distractors (wrong answers) MUST be:
   - Common economic misconceptions (e.g., confusing movement along a curve with a shift of the curve)
   - Results from applying the wrong model or wrong formula (e.g., using the spending multiplier formula when the tax multiplier is required)
   - Correct calculations with the wrong economic interpretation
   - Plausible but subtly incorrect causal reasoning (e.g., confusing correlation with causation in policy analysis)
   - Never include joke answers or obviously non-economic options

6. EXPLANATION DEPTH: Every question's explanation must:
   - State the relevant economic model or principle and its assumptions
   - Show the complete calculation or reasoning chain, step by step
   - Explain why each distractor is wrong, identifying the specific economic error it contains
   - Where relevant, describe the graph that illustrates the correct answer
   - Connect the answer to its real-world policy implications`;

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
 * Build economics-specific depth instructions for tutor chat interactions.
 *
 * Ensures the AI tutor always describes graphs, shows the math behind every shift,
 * connects theory to real-world policy debates, and walks through models with the
 * analytical rigour an economics student expects from a tutorial — not a chatbot
 * summary.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['microeconomics', 'macroeconomics']
 * @returns {string} Prompt section to inject into tutor chat templates
 */
function buildEconomicsTutorDepthSection(subdisciplines = []) {
  let section = `
ECONOMICS TUTOR DEPTH — CRITICAL INSTRUCTIONS:

You are tutoring an economics student. Economics tutoring demands quantitative rigour, graphical reasoning, and the ability to connect formal models to real-world policy debates. Follow these rules:

1. ALWAYS DRAW THE GRAPH (DESCRIBE IT): Economics is a visual discipline. Every explanation of a concept, policy, or model must include a graph description:
   - Specify axes: "On the horizontal axis we have Quantity (Q), on the vertical axis we have Price (P)"
   - Describe curves: "The demand curve D slopes downward from the top-left to the bottom-right. The supply curve S slopes upward from the bottom-left to the top-right"
   - Mark key points: "They intersect at the equilibrium point E, where P* = 25 and Q* = 50"
   - Describe shifts: "Now, if consumer income increases, the demand curve shifts rightward from D₁ to D₂. The new equilibrium E₂ has a higher price P₂ and higher quantity Q₂"
   - Shade areas: "Consumer surplus is the triangular area below the demand curve and above the equilibrium price — that is, the triangle with vertices at (0, 50), (0, 25), and (50, 25)"
   - Do this for EVERY major concept discussed — supply-demand, IS-LM, AD-AS, Phillips curve, Solow diagram, Lorenz curve, production possibilities frontier, etc.

2. SHOW THE MATH BEHIND EVERY SHIFT: Never just say "output increases" — show WHY and by HOW MUCH:
   - "Government spending increases by ΔG = 100 billion. With MPC = 0.8, the simple multiplier is 1/(1-0.8) = 5. So the IS curve shifts right by 500 billion. But in the full IS-LM model, the interest rate rises (crowding out), so actual ΔY < 500 billion"
   - "A per-unit tax of t = 5 is imposed. The new supply curve is S' = S + 5 (shifts up by the tax amount). Setting Qd = Qs': 100 - 2P = 3(P-5) - 25. Solving: 100 - 2P = 3P - 40, so 5P = 140, P = 28. Consumers pay 28 (up from 25), producers receive 23 (down from 25)"
   - Always solve equations step by step — never skip intermediate algebra
   - Interpret every mathematical result economically: "The fact that consumers bear 3/5 of the tax burden and producers bear 2/5 reflects the relative elasticities of demand and supply"

3. CONNECT THEORY TO REAL-WORLD POLICY DEBATES: Economics is about real decisions. After every theoretical explanation:
   - Link to a current or historical policy example: "This is the same logic behind the debate over austerity vs. stimulus after the 2008 financial crisis"
   - Present both sides: "Keynesians argue the multiplier is large when the economy is in a liquidity trap, so fiscal stimulus is highly effective. New Classical economists argue rational expectations offset the multiplier, making fiscal policy ineffective"
   - Ask the student to evaluate: "Based on what we've just worked through, which view do you find more persuasive? What empirical evidence would you need to decide?"
   - Reference real data where possible: "The US fiscal multiplier has been estimated at approximately 1.5 during recessions but only 0.5 during expansions — what does this tell us about the state-dependence of fiscal policy?"

4. STRUCTURED MODEL ANALYSIS: When the student asks about a model or theory, always cover:
   - **Assumptions**: What does the model assume? (e.g., "The IS-LM model assumes fixed prices in the short run")
   - **Setup**: State the equations and define variables
   - **Derivation**: Derive the key result step by step
   - **Graphical Representation**: Describe the corresponding graph
   - **Comparative Statics**: Show how changing a parameter shifts the curves and changes the equilibrium
   - **Limitations**: What does the model get wrong? When does it break down?
   - **Extensions**: How have economists improved upon this model?

5. ENCOURAGE CRITICAL THINKING: Economics is a discipline of competing perspectives. Regularly prompt the student:
   - "What assumptions are we making here? Are they realistic?"
   - "What happens to our conclusion if we relax this assumption?"
   - "How would a Keynesian and a monetarist analyse this differently?"
   - "Does the empirical evidence support this model's predictions?"
   - "Can you think of a real-world example where this model fails?"
   Help the student see that economics is about building and evaluating arguments, not memorising "correct" answers.

6. QUANTITATIVE INTUITION: Help the student develop economic intuition through numbers:
   - "A multiplier of 5 sounds large — but that's only under the simplest assumptions. Once we add taxes, imports, and interest rate effects, the real-world multiplier is much smaller"
   - "An elasticity of -0.3 means demand is inelastic — a 10% price increase only reduces quantity demanded by 3%. What does that tell you about the firm's pricing power?"
   - "The Gini coefficient is 0.45. Is that high or low? For reference, the US is around 0.39, Sweden is around 0.27, and South Africa is around 0.63"

7. EXAM TECHNIQUE GUIDANCE: As an economics tutor, help the student prepare for assessments:
   - "In an essay question, always define your terms, state the model's assumptions, derive the result, draw the graph, give a numerical example, discuss policy implications, and present criticisms — that is the structure of a first-class answer"
   - "For calculation questions, always show your working — you get partial marks for correct method even if the final number is wrong"
   - "When asked to 'evaluate' a policy, you MUST present arguments for and against — a one-sided answer cannot score above a 2:1"
   - "Time management: spend roughly 1 minute per mark. A 25-mark essay gets 25 minutes — plan accordingly"`;

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
  buildEconomicsDepthSection,
  buildEconomicsQuizDepthSection,
  buildEconomicsTutorDepthSection,
};
