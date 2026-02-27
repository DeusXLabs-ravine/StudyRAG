/**
 * Chemistry-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce rich, discipline-aware prompt sections that get
 * injected into module generation, quiz generation, flashcard generation,
 * and tutor chat prompts.  The goal is to produce THOROUGH, RIGOROUS
 * chemistry content — full reaction mechanisms, electronic explanations,
 * worked calculations, spectral interpretations, and safety considerations
 * — rather than the surface-level summaries that generic prompts produce.
 *
 * Consumed by:  backend/src/utils/prompts/depthRouter.js
 * Subdisciplines detected by:  backend/src/utils/subjectDetector.js
 *   Possible values: organic, inorganic, physical, analytical
 */

// ─── Subdiscipline-specific blocks for module content ────────────────────────

/**
 * Returns additional depth instructions specific to detected subdisciplines.
 * Each block describes the content expectations unique to that branch of
 * chemistry so the LLM produces domain-appropriate mechanisms, calculations,
 * and analyses.
 */
function _subdisciplineModuleBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('organic')) {
    blocks.push(`
ORGANIC CHEMISTRY — additional depth requirements:
- Reaction mechanisms: describe every mechanistic step with electron-pushing arrows in textual form
  (e.g., "The lone pair on nitrogen attacks the electrophilic carbonyl carbon, forming a
  tetrahedral intermediate.  The pi electrons of C=O shift onto oxygen as a negative charge.").
  Identify each step as nucleophilic addition, elimination, substitution, rearrangement, etc.
- Stereochemistry: analyse stereochemical outcomes — specify R/S configuration, E/Z geometry,
  syn/anti addition, retention/inversion at stereocentres.  Discuss racemisation, enantiomeric
  excess, and diastereoselectivity where relevant.
- Retrosynthetic analysis: work backwards from the target molecule — identify strategic bond
  disconnections, show synthons and their synthetic equivalents, and propose a forward synthesis
  with reagents and conditions for each step.
- Functional group transformations: for every transformation, state the reagent(s), solvent,
  temperature, and any catalysts required.  Discuss selectivity (chemo-, regio-, stereo-) and
  explain the electronic or steric basis for observed selectivity.
- Protecting groups: discuss when and why protecting groups are needed, show the
  protection/deprotection steps, and justify the choice of protecting group.
- Named reactions: when a named reaction is relevant (e.g., Grignard, Wittig, Diels-Alder,
  aldol, Suzuki coupling), state the reaction name, general scheme, mechanism class, and scope
  and limitations.`);
  }

  if (subdisciplines.includes('inorganic')) {
    blocks.push(`
INORGANIC CHEMISTRY — additional depth requirements:
- Crystal field theory (CFT): calculate crystal field splitting energy (\\( \\Delta_o \\) or
  \\( \\Delta_t \\)) for octahedral and tetrahedral complexes, determine d-electron configurations
  (high-spin vs. low-spin), and predict magnetic properties (number of unpaired electrons,
  magnetic moment \\( \\mu = \\sqrt{n(n+2)} \\) BM).
- Coordination geometry: describe common geometries (octahedral, tetrahedral, square planar,
  trigonal bipyramidal) with coordination numbers, bond angles, and examples.  Discuss factors
  that determine geometry (d-electron count, ligand field strength, steric effects).
- Periodic trends: explain trends in ionisation energy, electron affinity, electronegativity,
  atomic/ionic radii, and oxidation states with electronic structure reasoning.  Include
  anomalies (e.g., the d-block contraction, lanthanide contraction, relativistic effects for
  heavy elements) and explain their causes.
- Transition metal chemistry: discuss oxidation states with stability reasoning, colour and
  electronic transitions (d-d transitions, charge transfer bands), spectrochemical series
  ordering, and Jahn-Teller distortions where applicable.
- Symmetry and group theory: where relevant, identify the point group of a molecule, discuss
  IR/Raman activity based on symmetry selection rules, and use character tables for
  determining allowed transitions.
- Solid-state chemistry: discuss unit cells, lattice types, Madelung constants, Born-Haber
  cycles for ionic compounds, and band theory for conductors/semiconductors/insulators.`);
  }

  if (subdisciplines.includes('physical')) {
    blocks.push(`
PHYSICAL CHEMISTRY — additional depth requirements:
- Thermodynamic derivations: derive relationships from the fundamental laws — show how Maxwell
  relations arise from exact differentials, derive the Clausius-Clapeyron equation from
  chemical potential equality, and connect \\( \\Delta G = \\Delta H - T\\Delta S \\) to
  spontaneity and equilibrium.  Include Hess's law calculations with clear enthalpy diagrams.
- Equilibrium calculations: set up ICE tables (Initial, Change, Equilibrium) for all equilibrium
  problems.  Solve the equilibrium expression algebraically, state any simplifying assumptions
  (e.g., x << initial concentration), and verify the assumption.  Calculate K from
  \\( \\Delta G^\\circ = -RT\\ln K \\) and show Le Chatelier's principle applications.
- Chemical kinetics: determine rate laws from experimental data (method of initial rates, integrated
  rate laws, half-life relationships).  Derive the Arrhenius equation, calculate activation energy
  from temperature-dependent rate data, show reaction coordinate diagrams with \\( E_a \\) for
  forward and reverse reactions, and discuss catalysis (homogeneous, heterogeneous, enzymatic).
- Electrochemistry: construct electrochemical cell notation, calculate standard cell potential
  \\( E^\\circ_{cell} = E^\\circ_{cathode} - E^\\circ_{anode} \\), apply the Nernst equation
  \\( E = E^\\circ - \\frac{RT}{nF}\\ln Q \\), and connect to \\( \\Delta G = -nFE \\).
  Discuss Faraday's laws for electrolysis calculations (mass deposited, time, current).
- Quantum chemistry: where relevant, discuss particle-in-a-box, hydrogen atom orbitals,
  molecular orbital theory (bonding/antibonding, bond order), and spectroscopic transitions
  (selection rules, Beer-Lambert law).
- Phase diagrams: interpret one-component and two-component phase diagrams, apply the phase rule
  (F = C - P + 2), identify eutectic points, azeotropes, and miscibility gaps.`);
  }

  if (subdisciplines.includes('analytical')) {
    blocks.push(`
ANALYTICAL CHEMISTRY — additional depth requirements:
- Method selection rationale: for every analytical problem, justify why a particular technique is
  chosen over alternatives — consider sensitivity, selectivity, speed, cost, sample type
  (solid/liquid/gas), concentration range, and matrix effects.
- Calibration procedures: describe external standard, internal standard, and standard addition
  methods.  Show how to construct a calibration curve, determine the linear range, and calculate
  unknowns from the regression equation \\( y = mx + b \\).
- Detection and quantitation limits: calculate LOD (\\( = 3s/m \\)) and LOQ (\\( = 10s/m \\))
  where s is the standard deviation of the blank and m is the calibration sensitivity (slope).
  Discuss their significance in method validation.
- Error analysis: distinguish systematic (bias) from random (precision) errors, calculate
  standard deviation, relative standard deviation (%RSD), confidence intervals, and propagation
  of uncertainty through calculations.  Discuss accuracy vs. precision with concrete examples.
- Spectral interpretation: for UV-Vis, IR, NMR, and mass spectrometry, describe how to extract
  structural information.  For IR: identify functional group absorptions (O-H, C=O, N-H, C-H
  stretches) with wavenumber ranges.  For NMR: discuss chemical shift, multiplicity (n+1 rule),
  coupling constants, and integration ratios.  For MS: identify molecular ion, base peak,
  fragmentation patterns, and isotope patterns.
- Chromatographic methods: discuss HPLC and GC — column selection, mobile phase optimisation,
  resolution equation \\( R_s = \\frac{\\sqrt{N}}{4} \\cdot \\frac{\\alpha - 1}{\\alpha} \\cdot
  \\frac{k'}{1 + k'} \\), and Van Deemter equation for plate height optimisation.
- Quality assurance: discuss blank corrections, spike recovery, certified reference materials,
  control charts, and method validation parameters (linearity, range, precision, accuracy,
  robustness).`);
  }

  return blocks.join('\n');
}

// ─── Subdiscipline-specific blocks for quiz content ──────────────────────────

function _subdisciplineQuizBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('organic')) {
    blocks.push(`
- Organic chemistry questions: include mechanism prediction problems (given reactants and
  conditions, predict the product and draw/describe the mechanism), reaction product prediction
  with stereochemical outcomes, retrosynthetic disconnection exercises, and reagent selection
  problems.  Distractors should reflect common errors such as wrong regiochemistry
  (Markovnikov vs. anti-Markovnikov), incorrect stereochemistry (syn vs. anti addition,
  retention vs. inversion), confusing SN1/SN2/E1/E2 pathways, or misidentifying the
  nucleophile/electrophile.`);
  }

  if (subdisciplines.includes('inorganic')) {
    blocks.push(`
- Inorganic chemistry questions: include crystal field splitting calculations, magnetic moment
  predictions, coordination compound naming and isomer identification, periodic trend analysis,
  and oxidation state determination problems.  Distractors should reflect common errors such as
  confusing high-spin and low-spin configurations, miscounting d-electrons (forgetting to
  account for oxidation state), wrong geometry predictions, or incorrect application of the
  spectrochemical series.`);
  }

  if (subdisciplines.includes('physical')) {
    blocks.push(`
- Physical chemistry questions: include stoichiometry calculations (mole ratios, limiting reagent,
  percent yield), equilibrium constant calculations with ICE tables, kinetics problems (rate law
  determination from data, half-life calculations, Arrhenius equation), and electrochemistry
  cell potential and Nernst equation problems.  Distractors should reflect common errors such as
  incorrect stoichiometric coefficients, failing to account for reaction quotient vs. equilibrium
  constant, confusing zero/first/second order integrated rate laws, sign errors in cell potential
  calculations (anode vs. cathode), or incorrect use of the gas constant R units.`);
  }

  if (subdisciplines.includes('analytical')) {
    blocks.push(`
- Analytical chemistry questions: include spectral interpretation problems (given an IR, NMR, or
  mass spectrum described textually, identify the compound or functional groups), calibration
  curve calculations, detection limit determinations, and error analysis / statistical problems.
  Distractors should reflect common errors such as misassigning IR absorption bands, incorrect
  NMR splitting pattern interpretation (confusing n+1 rule application), wrong significant
  figures in calculations, confusing LOD with LOQ, or misidentifying molecular ion peaks in
  mass spectra.`);
  }

  return blocks.join('\n');
}

// ─── Subdiscipline-specific blocks for tutor chat ────────────────────────────

function _subdisciplineTutorBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('organic')) {
    blocks.push(`
- For organic chemistry topics: always explain reactivity in terms of electronic effects —
  inductive effects (+I/-I), mesomeric/resonance effects (+M/-M), hyperconjugation, and steric
  effects.  When a student asks "why does this reaction happen?", trace the answer to electron
  density: "The carbonyl carbon is electrophilic because the electronegative oxygen withdraws
  electron density through the pi bond, creating a partial positive charge (delta+)."  Teach
  mechanism analysis systematically: (1) identify nucleophile and electrophile, (2) determine
  the reaction type (addition, substitution, elimination), (3) consider stereochemical and
  regiochemical outcomes, (4) evaluate leaving group ability and solvent effects.`);
  }

  if (subdisciplines.includes('inorganic')) {
    blocks.push(`
- For inorganic chemistry topics: connect observable properties (colour, magnetism, reactivity)
  to electronic structure.  When discussing transition metal complexes, always relate back to
  d-electron configuration and crystal field theory: "This complex is paramagnetic because in
  an octahedral weak-field environment, the d-electrons occupy eg* orbitals before pairing,
  leaving unpaired electrons."  Help students build intuition for periodic trends by relating
  them to effective nuclear charge and orbital shielding.  Use Born-Haber cycle calculations
  to explain lattice energies and solubility patterns.`);
  }

  if (subdisciplines.includes('physical')) {
    blocks.push(`
- For physical chemistry topics: always connect mathematical expressions to physical meaning.
  When presenting \\( \\Delta G = \\Delta H - T\\Delta S \\), explain: "A reaction can be
  spontaneous (negative delta G) either by releasing heat (negative delta H, exothermic) or by
  increasing disorder (positive delta S), or both."  Guide students through equilibrium problems
  by insisting on systematic ICE table setup before any algebra.  For kinetics, help students
  distinguish between rate law (experimental) and mechanism (theoretical), and show how to test
  proposed mechanisms against observed rate laws.  Always balance equations step by step: (1)
  balance atoms other than H and O, (2) balance O with water, (3) balance H with H+, (4)
  balance charge with electrons, (5) verify atom and charge balance.`);
  }

  if (subdisciplines.includes('analytical')) {
    blocks.push(`
- For analytical chemistry topics: emphasise the decision-making process behind method selection —
  "We choose HPLC over GC here because the analyte is thermally labile and would decompose in
  the GC injector."  When teaching spectral interpretation, guide the student through a
  systematic approach: (1) determine molecular formula from MS, (2) calculate degrees of
  unsaturation, (3) identify functional groups from IR, (4) determine connectivity from NMR.
  For error analysis, help students understand the physical meaning of statistical measures:
  "A 95% confidence interval means that if we repeated this experiment many times, 95% of
  those intervals would contain the true value."  Always insist on proper significant figures
  and uncertainty propagation.`);
  }

  return blocks.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build depth instructions for chemistry module generation.
 *
 * This replaces the generic "200-400 words per module" instruction with a far
 * more demanding specification: 600-1200 words, full mechanisms, electronic
 * explanations, worked calculations, and safety considerations.
 *
 * @param {string[]} subdisciplines - e.g. ['organic', 'physical']
 * @returns {string} Prompt section to inject into the module generation prompt.
 */
function buildChemistryDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineModuleBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general chemistry';

  return `
═══════════════════════════════════════════════════════════════════════
CHEMISTRY DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
These instructions OVERRIDE the default content-length and depth guidelines.
═══════════════════════════════════════════════════════════════════════

CONTENT LENGTH & RIGOUR:
- Each module MUST contain 600-1200 words of substantive technical content.
- Do NOT produce surface-level summaries.  Chemistry students need mechanisms, electronic
  explanations, worked calculations, and spectral analyses they can study from — not
  bullet-point overviews.

MANDATORY ELEMENTS FOR EVERY CHEMISTRY CONCEPT COVERED:

a) EXPLAIN THE CONCEPT AT THE ELECTRONIC/MOLECULAR LEVEL
   Begin with the fundamental electronic or molecular basis: orbital interactions, electron
   density distributions, intermolecular forces, or thermodynamic driving forces that underpin
   the phenomenon.

b) PRESENT THE REACTION OR RELATIONSHIP WITH MECHANISM/DERIVATION
   Show the mechanistic steps for reactions (described textually with electron flow), or derive
   the mathematical relationship step-by-step.  Use Lewis structures, resonance contributors,
   and molecular orbital descriptions where appropriate.

c) DEFINE EVERY VARIABLE AND TERM WITH UNITS
   After each equation or expression, provide a variable list:
   - \\( K_{eq} \\) = equilibrium constant (dimensionless for activities, or with units derived
     from the expression)
   - \\( \\Delta G^\\circ \\) = standard Gibbs free energy change (kJ/mol)
   - \\( E_a \\) = activation energy (kJ/mol)
   Include common alternative representations where chemists typically use them (e.g., kcal/mol,
   eV, cm^{-1} for spectroscopy).

d) WORK THROUGH AT LEAST ONE DETAILED EXAMPLE
   Provide a fully worked example with:
   - Given data with units (concentrations, temperatures, spectral data, etc.)
   - Step-by-step solution showing all intermediate steps
   - Final answer with correct units and appropriate significant figures
   - Verification: "Does this answer make chemical sense?" (e.g., is pH reasonable, is the
     yield physically possible, does the product structure satisfy valence rules?)

e) DISCUSS ASSUMPTIONS AND LIMITATIONS
   Every chemical model has a domain of validity.  State the key assumptions (e.g., ideal
   solution behaviour, dilute conditions, constant temperature, no side reactions) and explain
   what happens when they are violated.

f) INCLUDE APPLICATIONS AND REAL-WORLD CONNECTIONS
   Where applicable, connect the concept to:
   - Industrial chemistry (Haber process, petroleum refining, polymer synthesis)
   - Pharmaceutical and medicinal chemistry (drug design, pharmacokinetics)
   - Environmental chemistry (atmospheric reactions, water treatment)
   - Biochemistry (enzyme catalysis, metabolic pathways)
   - Materials science (catalysts, battery chemistry, nanomaterials)

g) COVER SAFETY AND PRACTICAL CONSIDERATIONS
   Where relevant, discuss:
   - Hazardous reagents and proper handling (e.g., concentrated acids, oxidising agents,
     pyrophoric materials, carcinogens)
   - Waste disposal and green chemistry alternatives
   - Common laboratory safety protocols (fume hood use, PPE requirements)
   - Exothermic reaction hazards and temperature control
   - Scale-up considerations (what works in a flask may not work in a reactor)

STRUCTURE FOR EACH MODULE:
Follow this pedagogical sequence:
  Concept --> Electronic/Molecular Basis --> Reaction/Calculation --> Worked Example -->
  Applications --> Safety/Practical

This mirrors how chemistry is taught in university courses and makes the material
suitable for exam revision and laboratory preparation.
${subBlocks}

MATHEMATICAL AND CHEMICAL NOTATION:
- Use inline LaTeX: \\( expression \\) for inline, \\[ expression \\] for display.
- Show intermediate algebraic and arithmetic steps — do not skip from problem statement to
  final answer.
- Write chemical equations with states: \\( \\text{2H}_2\\text{(g) + O}_2\\text{(g)} \\rightarrow
  \\text{2H}_2\\text{O(l)} \\).
- Use proper chemical nomenclature (IUPAC) alongside common names where they aid recognition.

UNITS AND DIMENSIONAL ANALYSIS:
- Always express results in SI-compatible units (mol, L, J, K, Pa).
- Show unit cancellation explicitly in at least one example per module to reinforce dimensional
  analysis skills.
- Where chemists commonly use non-SI units (atm, mmHg, calories, Angstroms), note the
  conversion factor.
`;
}

/**
 * Build depth instructions for chemistry quiz / question generation.
 *
 * Ensures questions test genuine problem-solving, mechanistic understanding,
 * calculation accuracy, and spectral interpretation — not surface-level recall.
 *
 * @param {string[]} subdisciplines - e.g. ['organic', 'analytical']
 * @returns {string} Prompt section to inject into quiz generation prompts.
 */
function buildChemistryQuizDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineQuizBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general chemistry';

  return `
═══════════════════════════════════════════════════════════════════════
CHEMISTRY QUIZ DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
═══════════════════════════════════════════════════════════════════════

QUESTION PHILOSOPHY:
Chemistry exams test whether a student can PREDICT REACTIONS, SOLVE CALCULATIONS, and
INTERPRET DATA — not just recall definitions.  The questions you generate must reflect
this reality.

MANDATORY QUESTION TYPES — include a mix of all of the following:

1. MECHANISM PREDICTION PROBLEMS (at least 25% of questions)
   - Given reactants and conditions, predict the product(s) and describe the mechanism.
   - Ask students to identify intermediates, rate-determining steps, or the role of a catalyst.
   - Include stereochemical outcomes where applicable.

2. CALCULATION PROBLEMS (at least 35% of questions)
   - Stoichiometry: limiting reagent, theoretical yield, percent yield calculations.
   - Equilibrium: set up ICE tables, solve for concentrations, calculate K or Q.
   - Kinetics: determine rate laws from data, calculate rate constants, find half-lives,
     use Arrhenius equation for activation energy.
   - Electrochemistry: calculate cell potentials, use Nernst equation, determine mass
     deposited via Faraday's laws.
   - Always state units in the question and expect units in the answer.

3. SPECTRAL INTERPRETATION QUESTIONS (at least 15% of questions)
   - Describe spectral data textually (IR absorptions, NMR chemical shifts and splitting
     patterns, mass spectrum fragmentation) and ask students to identify the compound or
     functional groups.
   - Example: "A compound with molecular formula C4H8O2 shows an IR absorption at
     1740 cm^{-1} and a singlet in the 1H NMR at 2.1 ppm (3H) and a singlet at 3.7 ppm
     (3H).  Identify the compound."

4. REACTION PRODUCT PREDICTION (at least 15% of questions)
   - Provide starting materials and reagents; ask for the major product.
   - Test understanding of selectivity: regio-, chemo-, and stereoselectivity.
   - Include multi-step synthesis problems where products from one step feed into the next.

5. CONCEPTUAL AND APPLICATION QUESTIONS (at least 10% of questions)
   - "Explain why [observation] occurs in terms of electronic structure."
   - "Which of the following species is the strongest acid/base and why?"
   - "Predict the effect of increasing temperature on this equilibrium."
   - These test deep understanding of principles rather than rote memorisation.

MCQ DISTRACTOR DESIGN:
- Distractors MUST represent common chemical reasoning errors, not random choices:
  a) Wrong regiochemistry (e.g., Markovnikov vs. anti-Markovnikov product)
  b) Wrong stereochemistry (e.g., cis vs. trans, R vs. S, syn vs. anti addition)
  c) Incorrect reaction pathway (e.g., substitution product when elimination is favoured)
  d) Stoichiometric errors (e.g., wrong mole ratio, forgetting to balance)
  e) Sign or direction errors (e.g., confusing oxidation with reduction, exo- with endothermic)
  f) Unit errors (e.g., kJ vs. J, mol/L vs. mol, forgetting to convert temperature to Kelvin)
- The correct answer and every distractor must include units where applicable.

EXPLANATION QUALITY:
- Every answer explanation must show the full solution working — not just "A is correct."
- For mechanism questions, describe the electron flow step by step.
- For calculation questions, show every arithmetic step with units.
- Identify the specific error that would lead to each wrong answer choice where feasible.
- Include a reasonableness check in the explanation.
${subBlocks}
`;
}

/**
 * Build depth instructions for the chemistry tutor chat persona.
 *
 * Guides the tutor to explain with mechanistic reasoning, electronic
 * justification, systematic problem-solving, and connections to real-world
 * chemistry.
 *
 * @param {string[]} subdisciplines - e.g. ['physical']
 * @returns {string} Prompt section to inject into tutor chat prompts.
 */
function buildChemistryTutorDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineTutorBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general chemistry';

  return `
═══════════════════════════════════════════════════════════════════════
CHEMISTRY TUTOR DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
═══════════════════════════════════════════════════════════════════════

You are tutoring a chemistry student.  Chemistry demands both conceptual understanding of
electronic/molecular behaviour and quantitative rigour in calculations.  Your explanations
must satisfy both requirements.

WHEN EXPLAINING A CONCEPT:
1. Always explain the "WHY" behind reactions and phenomena in terms of ELECTRONIC EFFECTS.
   - Every reaction happens because electrons move.  Trace the driving force to electron
     density, orbital interactions, electronegativity differences, or thermodynamic stability.
   - Example: "HBr adds to propene with Markovnikov selectivity because the secondary
     carbocation intermediate is more stable than the primary one — hyperconjugation from
     adjacent C-H bonds stabilises the positive charge."
   - Never simply state "this reaction gives this product" without explaining the electronic
     reason.

2. Teach MECHANISM ANALYSIS systematically.
   - For every reaction mechanism, follow this approach:
     (1) Identify the nucleophile (electron-rich species) and electrophile (electron-poor species).
     (2) Determine the reaction type (addition, elimination, substitution, rearrangement,
         oxidation/reduction, pericyclic).
     (3) Describe each mechanistic step with electron flow (which atoms gain/lose electron
         density and why).
     (4) Identify the rate-determining step and explain what makes it slow (bond breaking,
         steric hindrance, unfavourable entropy).
     (5) Predict stereochemical and regiochemical outcomes based on the mechanism.

3. BALANCE EQUATIONS step by step — never present an unbalanced equation.
   - For simple equations: balance by inspection, starting with the most complex molecule.
   - For redox equations: use the half-reaction method:
     (1) Write separate oxidation and reduction half-reactions.
     (2) Balance atoms other than H and O.
     (3) Balance O by adding H2O.
     (4) Balance H by adding H+.
     (5) Balance charge by adding electrons.
     (6) Multiply half-reactions to equalise electrons, then add.
     (7) Verify: check that atoms and charges balance on both sides.
   - In basic solution, convert by adding OH- to both sides to neutralise H+.

4. Connect theory to REAL-WORLD CHEMISTRY and applications.
   - Relate concepts to industrial processes, everyday phenomena, biological systems, and
     environmental chemistry.
   - Mention practical considerations: "In the lab, this reaction requires an inert atmosphere
     because the Grignard reagent reacts violently with water."
   - Discuss green chemistry principles where relevant.

WHEN A STUDENT GETS A WRONG ANSWER:
- IDENTIFY THE SPECIFIC ERROR.  Do not simply say "that's wrong, the answer is X."
- Common chemistry errors to diagnose:
  a) Stoichiometric mistake (wrong mole ratio, did not identify limiting reagent)
  b) Equilibrium error (confused K with Q, used wrong expression, forgot to account for
     stoichiometric coefficients in the exponent)
  c) Mechanism error (wrong nucleophile/electrophile identification, missed a rearrangement,
     incorrect arrow pushing)
  d) Unit or conversion error (forgot to convert Celsius to Kelvin, mixed up kJ and J,
     used wrong value of R)
  e) Significant figures or rounding error (premature rounding of intermediate results)
  f) Sign error (confused exothermic with endothermic, wrong electrode assignment)
  g) Nomenclature error (IUPAC naming mistakes, wrong stereodescriptor)
- After identifying the error, guide the student to correct it themselves rather than simply
  providing the right answer.  Ask leading questions: "Look at your ICE table — does the change
  row satisfy the stoichiometric ratio of the balanced equation?"

CHEMICAL INTUITION & REASONABLENESS CHECKS:
- Encourage the student to check every answer for chemical reasonableness:
  "Is a pH of 13 reasonable for a 0.1 M NaOH solution?  (Yes — NaOH is a strong base, so
  pOH = 1 and pH = 13.)"
- Develop estimation skills:
  "Before calculating, estimate: should the equilibrium lie to the left or right based on
  the magnitude of K?"
- Discuss what incorrect answers would imply physically:
  "If you got a negative concentration, that tells you something went wrong — concentrations
  cannot be negative."

CONNECTING THEORY TO LABORATORY PRACTICE:
- When discussing reactions, mention practical aspects: typical reaction times, temperatures,
  solvents, and purification methods (distillation, recrystallisation, chromatography).
- Discuss safety: hazardous reagents, proper handling, waste disposal.
- Relate to analytical techniques: "How would you confirm that your product is correct?
  You could check the melting point, run an IR spectrum looking for the carbonyl stretch,
  or take an NMR to verify the structure."
${subBlocks}

MATHEMATICAL AND CHEMICAL NOTATION:
- Use LaTeX notation: \\( ... \\) for inline, \\[ ... \\] for display equations.
- Present equations clearly and define notation before using it.
- Show intermediate steps — chemistry students learn by following the reasoning.
- Write balanced chemical equations with states of matter indicated.
`;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  buildChemistryDepthSection,
  buildChemistryQuizDepthSection,
  buildChemistryTutorDepthSection,
};
