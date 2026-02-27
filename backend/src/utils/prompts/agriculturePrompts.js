/**
 * Agriculture-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce rich, discipline-aware prompt sections that get
 * injected into module generation, quiz generation, flashcard generation,
 * and tutor chat prompts.  The goal is to produce THOROUGH, RIGOROUS
 * agricultural science content — practical field recommendations, quantitative
 * calculations, economic analysis, and management protocols — rather than the
 * surface-level summaries that generic prompts produce.
 *
 * Consumed by:  backend/src/utils/prompts/depthRouter.js
 * Subdisciplines detected by:  backend/src/utils/subjectDetector.js
 *   Possible values: crop_science, soil_science, animal_science, agricultural_economics
 */

// ─── Subdiscipline-specific blocks for module content ────────────────────────

/**
 * Returns additional depth instructions specific to detected subdisciplines.
 * Each block describes the content expectations unique to that branch of
 * agriculture so the LLM produces domain-appropriate recommendations,
 * calculations, and management strategies.
 */
function _subdisciplineModuleBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('crop_science')) {
    blocks.push(`
CROP SCIENCE — additional depth requirements:
- Growth stages with management practices: describe each phenological stage (germination,
  vegetative, reproductive, maturity, senescence) and the critical management actions at each
  stage — planting density, irrigation scheduling, fertiliser timing, pest scouting, and
  harvest indicators.  Reference crop-specific growth stage scales (e.g., Zadoks scale for
  cereals, BBCH for general crops).
- Nutrient requirements with specific rates: state macronutrient (N, P, K) and micronutrient
  (Zn, B, Fe, Mn) requirements in kg/ha for target yields.  Example: "Maize targeting 10 t/ha
  grain yield requires approximately 200 kg N/ha, 40 kg P2O5/ha, and 80 kg K2O/ha."  Discuss
  split application timing and methods (broadcast, banding, fertigation, foliar).
- Pest and disease identification and IPM strategies: describe symptoms, causal organisms,
  economic threshold levels, and integrated pest management (IPM) strategies in order of
  preference — cultural control, biological control (natural enemies, biopesticides), and
  chemical control (active ingredients, modes of action, resistance management via IRAC/FRAC
  group rotation).
- Yield calculation methods: present yield components (plants/m^2 * heads/plant * grains/head
  * grain weight) and harvest index (HI = economic yield / biological yield).  Show full
  worked examples for estimating yield from field measurements.`);
  }

  if (subdisciplines.includes('soil_science')) {
    blocks.push(`
SOIL SCIENCE — additional depth requirements:
- Soil profile description with horizon characteristics: describe the O, A, E, B, C, and R
  horizons with typical depth ranges, colour (Munsell notation), texture (sand/silt/clay
  percentages and textural class via USDA triangle), structure (granular, blocky, prismatic,
  platy), and consistence.  Relate profile characteristics to soil taxonomy classification.
- Nutrient availability by pH: present the pH-nutrient availability relationship — N, P, K
  most available at pH 6.0-7.0; micronutrients (Fe, Mn, Zn, Cu) become less available above
  pH 7.5; Mo availability increases with pH.  Discuss liming calculations
  (lime requirement = buffer pH method or SMP method) with worked examples.
- Soil testing interpretation with recommendations: given a soil test report (pH, organic
  matter %, available P ppm, exchangeable K meq/100g, CEC), show step-by-step interpretation
  and fertiliser recommendations.  Reference soil test rating categories (low, medium, high,
  very high) and critical levels for major nutrients.
- Water holding capacity calculations: field capacity (FC), permanent wilting point (PWP),
  plant-available water (PAW = FC - PWP), and total available water in the root zone
  (TAW = PAW * root depth).  Present typical values by texture class (sandy loam: PAW ~
  120 mm/m, clay loam: PAW ~ 180 mm/m) and irrigation scheduling calculations using soil
  water balance (ET - rainfall - irrigation = change in soil water storage).`);
  }

  if (subdisciplines.includes('animal_science')) {
    blocks.push(`
ANIMAL SCIENCE — additional depth requirements:
- Nutrition requirements by production stage: present nutrient requirements (crude protein %,
  metabolisable energy MJ/kg, Ca, P, vitamins) for each production stage — maintenance, growth,
  gestation, lactation, and finishing.  Example: "A 600 kg dairy cow producing 30 L/day requires
  approximately 18% CP, 12.5 MJ ME/kg DM, 0.7% Ca, 0.4% P."  Show ration formulation using
  Pearson square or linear programming approach.
- Breeding value calculations: explain Estimated Breeding Value (EBV), heritability (h^2),
  selection differential (S), and genetic gain per generation (Delta G = h^2 * S / L, where
  L = generation interval).  Show worked examples: "If heritability of milk yield is 0.25 and
  we select cows averaging 2000 kg above the herd mean, expected genetic gain =
  0.25 * 2000 = 500 kg per generation."  Discuss selection indices and genomic selection.
- Health management protocols: vaccination schedules by species and production system,
  parasite management programmes (strategic drenching, faecal egg count monitoring, FAMACHA
  scoring for small ruminants), biosecurity protocols, and disease notification requirements.
  Present withdrawal periods for common therapeutics.
- Production efficiency metrics: feed conversion ratio (FCR = kg feed / kg gain), feed
  efficiency (FE = kg product / kg feed), daily weight gain (ADG), milk yield per lactation,
  eggs per hen housed, and reproductive metrics (conception rate, calving interval, farrowing
  rate, lambing percentage).  Include benchmark values for common production systems.`);
  }

  if (subdisciplines.includes('agricultural_economics')) {
    blocks.push(`
AGRICULTURAL ECONOMICS — additional depth requirements:
- Farm budgeting with enterprise analysis: present gross margin analysis
  (GM = gross income - variable costs), whole-farm budget structure (total gross margin -
  overhead costs = net farm income), and enterprise comparison using GM per hectare or per
  DSE (dry sheep equivalent).  Show full worked examples with realistic input prices and
  yields for at least one enterprise.
- Market price analysis: supply and demand fundamentals, price elasticity of demand for
  agricultural commodities (typically inelastic: -0.1 to -0.5), seasonal price patterns,
  basis and futures market relationships, and price risk management tools (forward contracts,
  futures, options, insurance).
- Cost of production calculations: identify and categorise all costs — variable (seed,
  fertiliser, chemicals, fuel, casual labour), fixed (depreciation, insurance, interest,
  permanent labour), and opportunity costs (owner-operator labour, land).  Calculate breakeven
  price (total cost / expected yield) and breakeven yield (total cost / expected price).
  Show full worked examples.
- Policy impact assessment: analyse the effects of agricultural subsidies, tariffs, price
  floors/ceilings, environmental regulations, and trade agreements on farm profitability
  and market structure.  Use supply-demand diagrams (described textually) to show welfare
  effects (producer surplus, consumer surplus, deadweight loss).  Reference real policy
  examples (EU CAP, US Farm Bill, WTO Agreement on Agriculture).`);
  }

  return blocks.join('\n');
}

// ─── Subdiscipline-specific blocks for quiz content ──────────────────────────

function _subdisciplineQuizBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('crop_science')) {
    blocks.push(`
- Crop science questions: include fertiliser rate calculations (e.g., "How many kg of urea
  per hectare to supply 150 kg N/ha?"), yield estimation from field component data, pest
  identification from symptom descriptions, and growth stage-based management decisions.
  Distractors should reflect common errors such as confusing elemental N with fertiliser
  product weight, miscounting yield components, or recommending the wrong timing for a
  management practice.`);
  }

  if (subdisciplines.includes('soil_science')) {
    blocks.push(`
- Soil science questions: include soil texture determination from particle size data, lime
  requirement calculations, soil water balance problems, and fertiliser recommendation from
  soil test data.  Distractors should capture mistakes like misreading the textural triangle,
  confusing CEC with base saturation, using wrong conversion factors for nutrient forms
  (P vs. P2O5, K vs. K2O), or misinterpreting soil test ratings.`);
  }

  if (subdisciplines.includes('animal_science')) {
    blocks.push(`
- Animal science questions: include feed ration balancing problems (Pearson square or
  proportion method), genetic gain calculations, production efficiency metric computation,
  and health management protocol selection.  Distractors should reflect errors like confusing
  dry matter intake with as-fed intake, using wrong heritability values, miscalculating feed
  conversion ratio, or recommending inappropriate withdrawal period timing.`);
  }

  if (subdisciplines.includes('agricultural_economics')) {
    blocks.push(`
- Agricultural economics questions: include gross margin calculations, breakeven analysis,
  enterprise comparison problems, and policy impact scenarios.  Distractors should reflect
  errors like including fixed costs in gross margin, confusing breakeven price with breakeven
  yield, ignoring opportunity costs, or miscalculating price elasticity effects on revenue.`);
  }

  return blocks.join('\n');
}

// ─── Subdiscipline-specific blocks for tutor chat ────────────────────────────

function _subdisciplineTutorBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('crop_science')) {
    blocks.push(`
- For crop science topics: always connect theory to field practice — "the logistic growth
  curve explains why early weed competition in the first 4-6 weeks has the greatest yield
  impact: both the crop and weeds are in exponential growth phase competing for the same
  resources."  Emphasise seasonal timing and critical windows for management actions.  When
  discussing nutrient management, always consider the 4R framework (Right source, Right rate,
  Right time, Right place) and discuss economic return on fertiliser investment.`);
  }

  if (subdisciplines.includes('soil_science')) {
    blocks.push(`
- For soil science topics: start from soil formation factors (climate, organisms, relief,
  parent material, time — CLORPT) and build up to practical implications.  Help the student
  develop intuition for how soil properties affect management decisions — "a high CEC clay
  soil buffers nutrient additions well, so you can apply the full season's K in one application;
  a sandy soil with low CEC needs split applications to avoid leaching losses."  Always relate
  laboratory measurements to field behaviour.`);
  }

  if (subdisciplines.includes('animal_science')) {
    blocks.push(`
- For animal science topics: always connect nutritional biochemistry to practical feeding
  recommendations — "rumen microbes need a minimum of 7% CP in the diet to maintain their
  population; below this threshold, fibre digestion rate drops dramatically, reducing voluntary
  feed intake."  When discussing genetics, relate heritability and selection to practical
  breeding programme design.  Emphasise animal welfare considerations alongside productivity
  metrics.`);
  }

  if (subdisciplines.includes('agricultural_economics')) {
    blocks.push(`
- For agricultural economics topics: always include economic feasibility analysis alongside
  technical recommendations — "while precision agriculture technology can increase yields by
  5-10%, the capital cost of $20,000-50,000 means the breakeven farm size for adoption is
  approximately 500 ha at current commodity prices."  Help the student understand risk
  management strategies and the role of time value of money in farm investment decisions.
  Use partial budget analysis for evaluating changes in practice.`);
  }

  return blocks.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build depth instructions for agriculture module generation.
 *
 * This replaces the generic "200-400 words per module" instruction with a far
 * more demanding specification: 600-1200 words, practical field application,
 * quantitative calculations, management recommendations, and economic analysis.
 *
 * @param {string[]} subdisciplines - e.g. ['crop_science', 'soil_science']
 * @returns {string} Prompt section to inject into the module generation prompt.
 */
function buildAgricultureDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineModuleBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general agriculture';

  return `
═══════════════════════════════════════════════════════════════════════
AGRICULTURE DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
These instructions OVERRIDE the default content-length and depth guidelines.
═══════════════════════════════════════════════════════════════════════

CONTENT LENGTH & RIGOUR:
- Each module MUST contain 600-1200 words of substantive agricultural science content.
- Do NOT produce surface-level summaries.  Agriculture students need practical recommendations
  backed by scientific principles, quantitative calculations, and economic analysis — not
  bullet-point overviews.

MANDATORY ELEMENTS FOR EVERY AGRICULTURAL CONCEPT COVERED:

a) STATE THE UNDERLYING PRINCIPLE
   Begin with the scientific principle: the biological, chemical, physical, or economic
   foundation that underpins the agricultural practice.  Connect theory to the practical
   "why" — farmers need to understand not just what to do, but why it works.

b) PROVIDE THE SCIENTIFIC BASIS
   Present the relevant science — plant physiology, soil chemistry, animal nutrition,
   or economic theory — that supports the recommended practice.  Reference peer-reviewed
   research and extension publications where applicable.

c) PRACTICAL APPLICATION WITH SPECIFIC RATES AND TIMING
   Agricultural science is meaningless without actionable recommendations:
   - State specific application rates with units (kg/ha, L/ha, mg/kg, head/ha)
   - Specify timing relative to crop stage, season, or production cycle
   - Describe the method of application or implementation
   - Note regional or climate-specific adjustments where relevant

d) WORK THROUGH AT LEAST ONE CALCULATION
   Provide a fully worked quantitative example with:
   - Given data with units (preferably from realistic field scenarios)
   - Step-by-step calculation
   - Final answer with correct units and appropriate precision
   - Practical interpretation: "What does this mean for the farmer's decision?"

e) MANAGEMENT RECOMMENDATIONS
   Provide clear, prioritised management recommendations:
   - Best management practices with justification
   - Decision criteria and thresholds (economic thresholds for pests, critical soil
     test levels, target body condition scores)
   - Monitoring methods and frequency
   - Contingency plans for adverse conditions (drought, pest outbreak, price crash)

f) ECONOMIC CONSIDERATIONS
   Every agricultural decision has an economic dimension:
   - Input costs and expected returns
   - Breakeven analysis where applicable
   - Risk factors and their financial implications
   - Comparison of alternatives on a cost-effectiveness basis

STRUCTURE FOR EACH MODULE:
Follow this pedagogical sequence:
  Principle --> Scientific Basis --> Practical Application --> Calculations --> Management Recommendations --> Economic Considerations

This mirrors how agriculture is taught at university level and ensures graduates can
bridge the gap between science and field practice.
${subBlocks}

MATHEMATICAL NOTATION:
- Use inline LaTeX: \\( expression \\) for inline, \\[ expression \\] for display.
- Show intermediate calculation steps — do not skip from problem statement to final answer.
- Include unit conversions explicitly (e.g., converting P to P2O5: multiply by 2.29).

UNITS AND PRACTICAL MEASURES:
- Express rates in field-applicable units (kg/ha, L/ha, t/ha, head/ha).
- Where industry uses non-SI units, note conversions (bushels/acre to t/ha, lb/acre to kg/ha).
- Always relate laboratory units to field-scale quantities.
`;
}

/**
 * Build depth instructions for agriculture quiz / question generation.
 *
 * Ensures questions test genuine field-scenario diagnosis, calculation accuracy,
 * and management decision-making — not surface-level recall.
 *
 * @param {string[]} subdisciplines - e.g. ['crop_science', 'animal_science']
 * @returns {string} Prompt section to inject into quiz generation prompts.
 */
function buildAgricultureQuizDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineQuizBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general agriculture';

  return `
═══════════════════════════════════════════════════════════════════════
AGRICULTURE QUIZ DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
═══════════════════════════════════════════════════════════════════════

QUESTION PHILOSOPHY:
Agriculture assessments test whether a student can DIAGNOSE FIELD PROBLEMS, CALCULATE INPUTS,
and MAKE MANAGEMENT DECISIONS — not just recall definitions.  The questions you generate must
reflect this reality.

MANDATORY QUESTION TYPES — include a mix of all of the following:

1. FIELD SCENARIO DIAGNOSIS (at least 30% of questions)
   - Present a field situation with observable symptoms, environmental conditions, and
     management history, then ask the student to identify the problem and recommend action.
   - "A wheat crop at Zadoks stage 31 shows yellowing of lower leaves, with the yellowing
     progressing from leaf tip to base along the midrib.  Soil pH is 5.2 and last season's
     soil test showed K at 120 ppm.  What is the most likely cause, and what is the
     recommended corrective action?"
   - These questions test diagnostic reasoning and integration of multiple data sources.

2. CALCULATION PROBLEMS (at least 30% of questions)
   - Fertiliser rate calculations: "How many kg of MAP (11-22-0) per hectare to supply
     40 kg P2O5/ha?"
   - Feed ration balancing: "Formulate a ration using maize (9% CP) and soybean meal
     (44% CP) to achieve 16% CP — what is the mixing ratio?"
   - Yield estimation: "Given 65,000 plants/ha, 1.1 ears/plant, 520 kernels/ear, and
     a 1000-kernel weight of 320 g, calculate expected grain yield in t/ha."
   - Economic analysis: "Calculate the gross margin for irrigated cotton given the
     following input costs and expected price."
   - Always state units in the question and expect units in the answer.

3. MANAGEMENT DECISION SCENARIOS (at least 20% of questions)
   - "Given the following weather forecast, soil moisture status, and crop stage, should
     the farmer irrigate now, wait 3 days, or skip this irrigation cycle?  Justify with
     calculations."
   - These should require the student to integrate multiple factors and justify the
     recommendation with quantitative reasoning.

4. IDENTIFICATION AND CLASSIFICATION QUESTIONS (at least 10% of questions)
   - Pest/disease identification from symptom descriptions
   - Soil classification from profile descriptions
   - Weed identification and management group classification
   - Growth stage identification and associated management recommendations

5. ECONOMIC TRADE-OFF QUESTIONS (at least 10% of questions)
   - "Compare two enterprise options using partial budget analysis."
   - "At what yield level does precision variable-rate fertilisation become more profitable
     than blanket application?"
   - Test the student's ability to integrate agronomic and economic reasoning.

MCQ DISTRACTOR DESIGN:
- Distractors MUST represent common agricultural errors, not random values:
  a) Confusing nutrient element with oxide form (P vs. P2O5, K vs. K2O)
  b) Wrong timing recommendation for the crop stage
  c) Confusing dry matter and as-fed basis for feed calculations
  d) Including fixed costs in gross margin calculations
  e) Misidentifying a nutrient deficiency vs. toxicity (similar symptoms, opposite causes)
- The correct answer and every distractor must include units where applicable.

EXPLANATION QUALITY:
- Every answer explanation must show the full solution working — not just "A is correct."
- Identify the specific error that would lead to each wrong answer choice where feasible.
- Include a practical reasonableness check: "Is this fertiliser rate within the normal range
  for this crop?" or "Is this feed ratio achievable with available ingredients?"
${subBlocks}
`;
}

/**
 * Build depth instructions for the agriculture tutor chat persona.
 *
 * Guides the tutor to explain with practical field relevance, seasonal timing
 * awareness, economic feasibility, and connections between theory and practice.
 *
 * @param {string[]} subdisciplines - e.g. ['soil_science']
 * @returns {string} Prompt section to inject into tutor chat prompts.
 */
function buildAgricultureTutorDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineTutorBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general agriculture';

  return `
═══════════════════════════════════════════════════════════════════════
AGRICULTURE TUTOR DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
═══════════════════════════════════════════════════════════════════════

You are tutoring an agriculture student.  Agriculture demands the integration of biological
science, practical field skills, and economic analysis.  Your explanations must bridge all
three domains.

WHEN EXPLAINING A CONCEPT:
1. Always CONNECT THEORY TO FIELD PRACTICE.
   - Never explain a principle in isolation.  Always follow with: "In the field, this means..."
   - Use concrete examples from real farming systems: "In a wheat-canola rotation in a
     Mediterranean climate, the residual nitrogen credit from the previous canola crop
     reduces the nitrogen fertiliser requirement by approximately 30-40 kg N/ha."
   - Reference common farming practices and equipment to make the science tangible.

2. Consider SEASONAL TIMING in every recommendation.
   - Agriculture is inherently seasonal.  Always specify WHEN an action should be taken
     relative to the crop calendar, livestock production cycle, or seasonal conditions.
   - Discuss critical windows: "The herbicide must be applied before the weeds reach the
     3-leaf stage for effective control — this typically occurs 2-3 weeks after crop emergence."
   - Explain the consequences of wrong timing: "Applying nitrogen after anthesis in wheat
     increases grain protein but does not increase yield — the yield potential was determined
     at tillering."

3. Include ECONOMIC FEASIBILITY ANALYSIS alongside technical recommendations.
   - Every management recommendation has a cost.  Always discuss whether the practice
     is economically justified.
   - Use simple calculations: "At a nitrogen price of $1.50/kg N and a wheat price of
     $300/t, each additional kg of N must produce at least 5 kg of grain to break even."
   - Discuss marginal returns: "The first 50 kg N/ha typically gives the highest yield
     response; the last 50 kg (from 150 to 200 kg N/ha) may only add 200-400 kg grain/ha."

4. Relate LABORATORY DATA to field-scale management.
   - When discussing soil tests, translate the numbers into actionable recommendations.
   - When discussing feed analysis, show how the laboratory values determine the ration
     formulation for a specific production target.

WHEN A STUDENT GETS A WRONG ANSWER:
- IDENTIFY THE SPECIFIC ERROR.  Do not simply say "that's wrong, the answer is X."
- Common agriculture errors to diagnose:
  a) Nutrient form confusion (N vs. urea, P vs. P2O5 vs. MAP — the conversion factors
     are a perennial source of errors)
  b) Dry matter vs. as-fed basis confusion in animal nutrition
  c) Wrong timing recommendation for the growth stage or season
  d) Confusing symptoms of deficiency and toxicity (e.g., Mn deficiency and Mn toxicity
     can both cause leaf discolouration)
  e) Including fixed costs in variable cost calculations or vice versa
  f) Misinterpreting soil test categories or using recommendations from the wrong region
- After identifying the error, guide the student to correct it themselves rather than
  simply providing the right answer.  Ask leading questions: "Check your conversion —
  what is the N content of urea as a percentage?"

PRACTICAL ORIENTATION:
- Encourage the student to think like a farm manager: "What would you actually recommend
  to a farmer in this situation, and what is the economic justification?"
- Discuss risk management: weather variability, price uncertainty, biological variability.
- Reference extension publications and industry guidelines as authoritative sources.
- When relevant, discuss sustainable agriculture practices, environmental stewardship,
  and regulatory compliance.
${subBlocks}

MATHEMATICAL NOTATION:
- Use LaTeX notation: \\( ... \\) for inline, \\[ ... \\] for display equations.
- Present equations clearly and define notation before using it.
- Show intermediate steps — agriculture students learn by following the calculation logic,
  especially for input rate and economic calculations.
`;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  buildAgricultureDepthSection,
  buildAgricultureQuizDepthSection,
  buildAgricultureTutorDepthSection,
};
