/**
 * Environmental Science-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce rich, discipline-aware prompt sections that get
 * injected into module generation, quiz generation, flashcard generation,
 * and tutor chat prompts.  The goal is to produce THOROUGH, RIGOROUS
 * environmental science content — quantified impacts, scientific models,
 * monitoring data, policy analysis, and case studies — rather than the
 * surface-level summaries that generic prompts produce.
 *
 * Consumed by:  backend/src/utils/prompts/depthRouter.js
 * Subdisciplines detected by:  backend/src/utils/subjectDetector.js
 *   Possible values: climate, ecology, pollution, energy
 */

// ─── Subdiscipline-specific blocks for module content ────────────────────────

/**
 * Returns additional depth instructions specific to detected subdisciplines.
 * Each block describes the content expectations unique to that branch of
 * environmental science so the LLM produces domain-appropriate analyses,
 * calculations, and case studies.
 */
function _subdisciplineModuleBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('climate')) {
    blocks.push(`
CLIMATE SCIENCE — additional depth requirements:
- Greenhouse effect mechanism: explain shortwave vs. longwave radiation balance, absorption and
  re-emission by greenhouse gases (CO2, CH4, N2O, H2O, O3), and the role of atmospheric windows.
- Radiative forcing calculations: define radiative forcing (W/m^2), present the logarithmic
  relationship for CO2 (Delta F = 5.35 * ln(C/C0)), and compute forcing for given concentration
  changes with full worked examples.
- Climate models explanation: describe General Circulation Models (GCMs), their spatial/temporal
  resolution, parameterisation of sub-grid processes, and Representative Concentration Pathways
  (RCP 2.6, 4.5, 6.0, 8.5) / Shared Socioeconomic Pathways (SSP1-SSP5).
- Feedback loops: distinguish positive feedbacks (ice-albedo, water vapour, permafrost methane
  release) from negative feedbacks (blackbody radiation, CO2 fertilisation of plants).  Quantify
  feedback factors and climate sensitivity (transient and equilibrium, typically 1.5-4.5 deg C
  per doubling of CO2).
- Mitigation vs. adaptation strategies: present quantified impacts — e.g., "switching from coal
  to natural gas reduces CO2 emissions by approximately 50% per MWh," "urban tree canopy reduces
  local temperatures by 2-4 deg C."  Compare carbon capture and storage (CCS) costs, renewable
  energy deployment rates, and adaptation costs by sector.`);
  }

  if (subdisciplines.includes('ecology')) {
    blocks.push(`
ECOLOGY — additional depth requirements:
- Population dynamics equations: present exponential growth (dN/dt = rN), logistic growth
  (dN/dt = rN(1 - N/K)) with carrying capacity K, and Lotka-Volterra predator-prey equations
  (dN/dt = rN - aNP, dP/dt = baNP - mP).  Define all parameters with units and show phase-plane
  analysis or time-series solutions.
- Species interaction types: mutualism, commensalism, parasitism, competition (exploitative vs.
  interference), predation, and amensalism.  Provide at least one well-documented example for each
  with quantitative data where available (e.g., mycorrhizal networks increasing plant nutrient
  uptake by 20-80%).
- Ecosystem services valuation: distinguish provisioning, regulating, cultural, and supporting
  services.  Present valuation methods (contingent valuation, replacement cost, benefit transfer)
  with examples — e.g., global pollination services estimated at USD 235-577 billion/year (IPBES).
- Biodiversity indices: Shannon diversity index (H' = -sum(pi * ln(pi))), Simpson's index
  (D = sum(pi^2)), species richness, evenness (J = H'/ln(S)).  Show full calculation examples
  from sample community data and interpret the results ecologically.`);
  }

  if (subdisciplines.includes('pollution')) {
    blocks.push(`
POLLUTION SCIENCE — additional depth requirements:
- Pollutant fate and transport: describe advection, dispersion, diffusion, sorption, and
  degradation (biotic and abiotic).  Present the advection-dispersion equation
  (dC/dt = D*(d^2C/dx^2) - v*(dC/dx) - lambda*C) with parameter definitions and units.
- Concentration calculations: dilution equations (C1*V1 = C2*V2), mass loading calculations
  (load = concentration * flow rate), and exposure dose calculations
  (ADD = C * IR * EF * ED / (BW * AT)).  Include worked examples with realistic values.
- Regulatory standards: reference EPA National Ambient Air Quality Standards (NAAQS),
  WHO Air Quality Guidelines, Safe Drinking Water Act MCLs, Clean Water Act effluent limits,
  and EU Water Framework Directive standards.  State specific numerical limits
  (e.g., PM2.5: 12 ug/m^3 annual average per EPA, 5 ug/m^3 per WHO 2021 guidelines).
- Remediation technologies: pump-and-treat, bioremediation, phytoremediation, soil vapour
  extraction, permeable reactive barriers, and activated carbon adsorption.  Include efficiency
  data (e.g., bioremediation can degrade 90-99% of petroleum hydrocarbons in 6-24 months under
  optimal conditions) and cost ranges per cubic metre or per hectare.`);
  }

  if (subdisciplines.includes('energy')) {
    blocks.push(`
ENERGY SYSTEMS — additional depth requirements:
- Energy conversion efficiency calculations: Carnot efficiency (eta = 1 - T_cold/T_hot),
  actual thermal efficiencies for power plants (coal: 33-40%, gas combined cycle: 55-62%,
  nuclear: 33%), photovoltaic efficiencies (silicon: 20-26%, thin film: 12-18%).  Show full
  worked examples with realistic temperature/performance data.
- EROI analysis: Energy Return on Investment (EROI = Energy_output / Energy_input).
  Present EROI values for major sources (conventional oil: 15-30, coal: 20-80, wind: 18-25,
  solar PV: 10-20, nuclear: 10-75, tar sands: 3-5).  Discuss minimum EROI for societal
  viability (~5:1) and net energy cliff concept.
- Lifecycle assessment (LCA): cradle-to-grave analysis of energy technologies, including
  embodied energy, operational emissions, and decommissioning.  Present gCO2eq/kWh values
  (coal: 820, gas: 490, solar: 41, wind: 11, nuclear: 12 per IPCC AR5) and discuss boundary
  condition assumptions.
- Grid integration challenges: intermittency and capacity factor concepts (wind: 25-45%,
  solar: 15-25%), duck curve phenomenon, storage technologies (pumped hydro, lithium-ion,
  compressed air) with round-trip efficiencies (70-90%), and grid balancing mechanisms.
- Cost comparisons: present Levelized Cost of Energy (LCOE) with current data ranges
  (utility solar: USD 30-50/MWh, onshore wind: USD 25-50/MWh, offshore wind: USD 60-100/MWh,
  gas combined cycle: USD 45-75/MWh) and discuss learning curves and cost trends.`);
  }

  return blocks.join('\n');
}

// ─── Subdiscipline-specific blocks for quiz content ──────────────────────────

function _subdisciplineQuizBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('climate')) {
    blocks.push(`
- Climate science questions: include radiative forcing calculations (compute forcing from
  concentration changes), climate sensitivity estimation, feedback loop identification, and
  carbon budget arithmetic.  Distractors should reflect common errors such as confusing
  positive with negative feedbacks, using linear instead of logarithmic CO2-forcing
  relationship, or misinterpreting RCP/SSP scenarios.`);
  }

  if (subdisciplines.includes('ecology')) {
    blocks.push(`
- Ecology questions: include population growth calculations (logistic model, doubling time),
  Lotka-Volterra equilibrium computation, biodiversity index calculation from species count
  data, and ecosystem service valuation problems.  Distractors should capture mistakes like
  confusing intrinsic growth rate with doubling rate, using natural log vs. log base 10 in
  Shannon index, or misidentifying interaction types from field observation descriptions.`);
  }

  if (subdisciplines.includes('pollution')) {
    blocks.push(`
- Pollution science questions: include concentration dilution calculations, exposure dose
  estimation, pollutant transport problems, and regulatory compliance determination.
  Distractors should reflect errors like incorrect unit conversions (ug/m^3 to ppm),
  confusing acute vs. chronic exposure limits, wrong application of mass balance, or
  mismatching pollutant with the wrong regulatory standard.`);
  }

  if (subdisciplines.includes('energy')) {
    blocks.push(`
- Energy systems questions: include efficiency calculations (Carnot, actual thermal, PV),
  EROI comparisons, LCOE estimation, and grid balancing scenario problems.  Distractors
  should reflect errors like using Celsius instead of Kelvin in Carnot calculations,
  confusing capacity factor with efficiency, misapplying EROI boundary conditions, or
  using outdated cost data for rapidly changing technologies.`);
  }

  return blocks.join('\n');
}

// ─── Subdiscipline-specific blocks for tutor chat ────────────────────────────

function _subdisciplineTutorBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('climate')) {
    blocks.push(`
- For climate science topics: always quantify climate impacts with specific numbers and
  uncertainties (e.g., "global mean temperature has risen approximately 1.1 deg C since
  pre-industrial, with a likely range of 0.9-1.3 deg C").  Distinguish between weather and
  climate, natural variability and anthropogenic forcing.  When discussing projections, always
  state the scenario and time horizon.  Help the student understand confidence levels and
  likelihood terminology used in IPCC reports.`);
  }

  if (subdisciplines.includes('ecology')) {
    blocks.push(`
- For ecology topics: emphasise systems thinking — "changing one variable in an ecosystem
  cascades through the food web."  Always connect population models to real field data and
  discuss where models break down (Allee effects, stochastic events, environmental variability).
  When the student confuses correlation with causation in ecological data, explicitly walk
  through alternative hypotheses and confounding variables.  Use trophic cascades and
  keystone species as illustrative frameworks.`);
  }

  if (subdisciplines.includes('pollution')) {
    blocks.push(`
- For pollution science topics: always connect pollutant behaviour to its chemical properties
  (solubility, volatility, persistence, bioaccumulation potential — reference Kow, Koc, Henry's
  law constant).  When discussing standards, explain the health basis behind the numbers
  ("the PM2.5 standard of 12 ug/m^3 is set to protect against cardiovascular and respiratory
  effects observed in epidemiological studies").  Help students distinguish between risk
  assessment and risk management, and between hazard and exposure.`);
  }

  if (subdisciplines.includes('energy')) {
    blocks.push(`
- For energy systems topics: always frame energy discussions in terms of thermodynamic
  constraints ("no heat engine can exceed Carnot efficiency — the question is how close real
  systems get and why they fall short").  Distinguish between energy and power, stock and flow.
  When the student compares energy sources, ensure they consider the full lifecycle, capacity
  factor, dispatchability, and system-level effects.  Use Sankey diagrams conceptually to
  trace energy flows and losses through conversion chains.`);
  }

  return blocks.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build depth instructions for environmental science module generation.
 *
 * This replaces the generic "200-400 words per module" instruction with a far
 * more demanding specification: 600-1200 words, scientific rigour, quantified
 * impacts, monitoring methods, policy analysis, and case studies.
 *
 * @param {string[]} subdisciplines - e.g. ['climate', 'ecology']
 * @returns {string} Prompt section to inject into the module generation prompt.
 */
function buildEnvironmentalScienceDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineModuleBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general environmental science';

  return `
═══════════════════════════════════════════════════════════════════════
ENVIRONMENTAL SCIENCE DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
These instructions OVERRIDE the default content-length and depth guidelines.
═══════════════════════════════════════════════════════════════════════

CONTENT LENGTH & RIGOUR:
- Each module MUST contain 600-1200 words of substantive scientific content.
- Do NOT produce surface-level summaries.  Environmental science students need quantitative
  analysis, scientific models, real data, and case studies — not bullet-point overviews.

MANDATORY ELEMENTS FOR EVERY ENVIRONMENTAL SCIENCE CONCEPT COVERED:

a) SCIENTIFIC BASIS
   Begin with the underlying science: the physical, chemical, or biological principles
   that govern the environmental process.  Reference peer-reviewed research and IPCC/EPA/WHO
   reports where applicable.

b) QUANTITATIVE ANALYSIS
   Present the governing equations, models, or statistical relationships with full variable
   definitions and units.  Use LaTeX-style notation where appropriate
   (e.g., \\( \\Delta F = 5.35 \\cdot \\ln(C/C_0) \\) for CO2 radiative forcing).

c) DEFINE EVERY VARIABLE WITH UNITS
   After each equation, provide a variable list:
   - \\( \\Delta F \\) = change in radiative forcing (W/m^2)
   - \\( C \\) = current CO2 concentration (ppm)
   - \\( C_0 \\) = reference CO2 concentration (ppm)
   Include common alternative units in parentheses where scientists typically use them.

d) WORK THROUGH AT LEAST ONE NUMERICAL EXAMPLE
   Provide a fully worked numerical example with:
   - Given data with units (preferably from real-world monitoring data)
   - Step-by-step calculation
   - Final answer with correct units and appropriate significant figures
   - Interpretation: "What does this number mean for the environment?"

e) ENVIRONMENTAL IMPACT ASSESSMENT
   Quantify the environmental impact wherever possible:
   - Magnitude of effect (e.g., "a 1 deg C rise in ocean temperature causes 10-15% decline
     in coral cover")
   - Spatial and temporal scale of the impact
   - Affected populations, ecosystems, or resources
   - Reversibility and recovery timescales

f) MONITORING AND MEASUREMENT METHODS
   Describe how the environmental parameter is measured in practice:
   - Instruments and sensors used (e.g., LIDAR, spectrophotometry, gas chromatography)
   - Sampling protocols and quality assurance
   - Remote sensing vs. in-situ measurement trade-offs
   - Data interpretation and uncertainty quantification

g) POLICY AND MANAGEMENT FRAMEWORK
   Connect the science to governance:
   - Relevant regulations and standards (EPA, WHO, EU directives, UNFCCC, Montreal Protocol)
   - Policy instruments (cap-and-trade, carbon tax, command-and-control)
   - Cost-benefit analysis of management interventions
   - Stakeholder perspectives and trade-offs

h) CASE STUDY
   Include at least one real-world case study per major concept:
   - Location, time period, and context
   - Data and observations
   - Analysis and lessons learned
   - Relevance to current environmental challenges

STRUCTURE FOR EACH MODULE:
Follow this pedagogical sequence:
  Scientific Basis --> Quantitative Analysis --> Environmental Impact --> Monitoring Methods --> Policy/Management --> Case Study

This mirrors how environmental science is taught at university level and prepares
students for both research and professional practice.
${subBlocks}

MATHEMATICAL NOTATION:
- Use inline LaTeX: \\( expression \\) for inline, \\[ expression \\] for display.
- Show intermediate calculation steps — do not skip from problem statement to final answer.
- Include dimensional analysis where it aids understanding.

DATA AND SOURCES:
- Always cite specific data sources (IPCC AR6, EPA databases, WHO reports, peer-reviewed journals).
- Distinguish between measured data and model projections.
- State confidence intervals and uncertainty ranges where available.
- Use the most recent available data and note the data vintage.
`;
}

/**
 * Build depth instructions for environmental science quiz / question generation.
 *
 * Ensures questions test genuine quantitative problem-solving, data interpretation,
 * and environmental policy analysis — not surface-level recall.
 *
 * @param {string[]} subdisciplines - e.g. ['pollution', 'energy']
 * @returns {string} Prompt section to inject into quiz generation prompts.
 */
function buildEnvironmentalScienceQuizDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineQuizBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general environmental science';

  return `
═══════════════════════════════════════════════════════════════════════
ENVIRONMENTAL SCIENCE QUIZ DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
═══════════════════════════════════════════════════════════════════════

QUESTION PHILOSOPHY:
Environmental science assessments test whether a student can ANALYSE DATA, CALCULATE IMPACTS,
and EVALUATE POLICY OPTIONS — not just recall definitions.  The questions you generate must
reflect this reality.

MANDATORY QUESTION TYPES — include a mix of all of the following:

1. CALCULATION PROBLEMS (at least 35% of questions)
   - Carbon footprint calculations (emissions factors * activity data)
   - Population growth projections using logistic or exponential models
   - Pollutant concentration and dilution calculations
   - Energy efficiency and LCOE computations
   - Always state units in the question and expect units in the answer.

2. DATA INTERPRETATION QUESTIONS (at least 25% of questions)
   - Present environmental monitoring data (air quality readings, water chemistry results,
     species count data, temperature records) and ask the student to interpret trends,
     identify anomalies, or compute summary statistics.
   - "The following table shows monthly PM2.5 readings.  Calculate the annual average and
     determine whether the monitoring station exceeds the EPA NAAQS."
   - Graph description questions: "A time series shows atmospheric CO2 rising from 315 ppm
     in 1958 to 420 ppm in 2023 with seasonal oscillations of approximately 6 ppm.
     What causes the seasonal pattern, and what is the average annual increase?"

3. POLICY ANALYSIS SCENARIOS (at least 20% of questions)
   - "A city must reduce its carbon emissions by 40% by 2030.  Given the following sector
     breakdown, which combination of interventions would be most cost-effective?"
   - Require students to weigh trade-offs, consider co-benefits and unintended consequences,
     and justify their reasoning with quantitative evidence.

4. SYSTEMS THINKING QUESTIONS (at least 10% of questions)
   - "If deforestation in watershed X increases by 20%, describe the cascade of effects on
     water quality, flood risk, biodiversity, and downstream communities."
   - Test the student's ability to trace cause-effect chains through environmental systems.

5. SCIENTIFIC METHOD AND UNCERTAINTY QUESTIONS (at least 10% of questions)
   - "Which of the following study designs would best test the hypothesis that [X]?"
   - "What are the main sources of uncertainty in this environmental impact assessment?"
   - Distinguish correlation from causation in environmental datasets.

MCQ DISTRACTOR DESIGN:
- Distractors MUST represent common analytical errors, not random numbers:
  a) Unit conversion mistakes (ug/m^3 vs. mg/m^3, ppm vs. ppb, tonnes vs. kilograms)
  b) Confusing stock and flow quantities (total emissions vs. emission rate)
  c) Misapplying a model outside its valid range
  d) Confusing correlation with causation
  e) Using wrong baseline or reference period for comparison
- The correct answer and every distractor must include units where applicable.

EXPLANATION QUALITY:
- Every answer explanation must show the full solution working — not just "A is correct."
- Identify the specific error that would lead to each wrong answer choice where feasible.
- Include a sanity check: "Is this value consistent with known environmental benchmarks?"
${subBlocks}
`;
}

/**
 * Build depth instructions for the environmental science tutor chat persona.
 *
 * Guides the tutor to explain with quantified impacts, systems thinking,
 * data literacy, and connections between science and policy.
 *
 * @param {string[]} subdisciplines - e.g. ['climate']
 * @returns {string} Prompt section to inject into tutor chat prompts.
 */
function buildEnvironmentalScienceTutorDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineTutorBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general environmental science';

  return `
═══════════════════════════════════════════════════════════════════════
ENVIRONMENTAL SCIENCE TUTOR DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
═══════════════════════════════════════════════════════════════════════

You are tutoring an environmental science student.  Environmental science demands both
quantitative rigour and systems-level thinking.  Your explanations must satisfy both
requirements.

WHEN EXPLAINING A CONCEPT:
1. Always QUANTIFY ENVIRONMENTAL IMPACTS.
   - Never say "pollution is harmful" without specifying the magnitude, the affected
     receptor, and the dose-response relationship.
   - Use specific numbers with units and cite the data source:
     "Atmospheric CO2 has risen from 280 ppm (pre-industrial) to ~420 ppm (2023),
     an increase of 50%, causing approximately 2.7 W/m^2 of additional radiative forcing
     (IPCC AR6)."
   - State uncertainty ranges when available.

2. DISTINGUISH CORRELATION FROM CAUSATION in environmental data.
   - When presenting environmental relationships, explicitly discuss whether the evidence
     supports a causal link or merely an association.
   - Walk through the criteria for causal inference: temporal precedence, dose-response
     relationship, biological plausibility, consistency across studies, specificity.
   - Help the student identify confounding variables and alternative explanations.

3. Apply SYSTEMS THINKING at every opportunity.
   - Environmental problems are interconnected.  Always trace upstream causes and downstream
     consequences across environmental compartments (air, water, soil, biota).
   - Use feedback loop diagrams (described textually) to show how perturbations propagate
     through environmental systems.
   - Distinguish between linear cause-effect and nonlinear dynamics (thresholds, tipping
     points, regime shifts).

4. CONNECT SCIENCE TO POLICY AND MANAGEMENT.
   - After explaining the science, discuss the policy implications:
     "Understanding the dose-response curve for PM2.5 is why the WHO tightened their
     guideline from 10 to 5 ug/m^3 in 2021 — even low concentrations produce measurable
     health effects."
   - Discuss trade-offs, co-benefits, and the role of uncertainty in decision-making.

WHEN A STUDENT GETS A WRONG ANSWER:
- IDENTIFY THE SPECIFIC ERROR.  Do not simply say "that's wrong, the answer is X."
- Common environmental science errors to diagnose:
  a) Unit conversion mistake (ppm vs. ppb, ug/m^3 vs. mg/L, tonnes vs. gigatonnes)
  b) Confusing stock and flow (total carbon in atmosphere vs. annual emissions)
  c) Applying a model outside its valid range or assumptions
  d) Confusing correlation with causation in data interpretation
  e) Ignoring confounding variables or selection bias
  f) Using outdated data when current data differs significantly
- After identifying the error, guide the student to correct it themselves rather than
  simply providing the right answer.  Ask leading questions: "Check the units in your
  calculation — are you comparing concentrations in the same units?"

DATA LITERACY AND CRITICAL THINKING:
- Encourage the student to always ask: "Where does this data come from?  How was it
  collected?  What are the limitations?"
- Develop the habit of comparing results against known benchmarks:
  "Your calculated emission factor of 500 kg CO2/MWh for natural gas seems high — typical
  values are around 350-490 kg CO2/MWh.  Can you identify where the discrepancy arises?"
- Discuss how scientific uncertainty is communicated (confidence intervals, likelihood
  language, ensemble ranges) and why it matters for decision-making.

CONNECTING SCIENCE TO REAL-WORLD ACTION:
- When discussing environmental problems, always discuss solutions and their effectiveness.
- Reference real case studies: "The Montreal Protocol reduced CFC emissions by 99% and the
  ozone layer is recovering — this demonstrates that international environmental agreements
  can work when backed by science and compliance mechanisms."
- Discuss career applications: environmental consulting, regulatory agencies, conservation
  biology, climate policy, renewable energy development.
${subBlocks}

MATHEMATICAL NOTATION:
- Use LaTeX notation: \\( ... \\) for inline, \\[ ... \\] for display equations.
- Present equations clearly and define notation before using it.
- Show intermediate steps — environmental science students learn by following the quantitative
  reasoning.
`;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  buildEnvironmentalScienceDepthSection,
  buildEnvironmentalScienceQuizDepthSection,
  buildEnvironmentalScienceTutorDepthSection,
};
