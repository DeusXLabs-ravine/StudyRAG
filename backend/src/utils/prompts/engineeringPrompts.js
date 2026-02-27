/**
 * Engineering-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce rich, discipline-aware prompt sections that get
 * injected into module generation, quiz generation, flashcard generation,
 * and tutor chat prompts.  The goal is to produce THOROUGH, RIGOROUS
 * engineering content — full derivations, numerical examples, unit analysis,
 * safety considerations, and references to industry standards — rather than
 * the surface-level summaries that generic prompts produce.
 *
 * Consumed by:  backend/src/utils/prompts/depthRouter.js
 * Subdisciplines detected by:  backend/src/utils/subjectDetector.js
 *   Possible values: mechanical, civil, electrical, electronics, chemical
 */

// ─── Subdiscipline-specific blocks for module content ────────────────────────

/**
 * Returns additional depth instructions specific to detected subdisciplines.
 * Each block describes the content expectations unique to that branch of
 * engineering so the LLM produces domain-appropriate derivations, diagrams,
 * and design criteria.
 */
function _subdisciplineModuleBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('mechanical')) {
    blocks.push(`
MECHANICAL ENGINEERING — additional depth requirements:
- Stress analysis: always include free body diagrams (described textually), equilibrium equations,
  and Mohr's circle construction where shear/normal stress states arise.
- Energy methods: present the work-energy theorem, Castigliano's theorem, or virtual work where
  applicable; show the integral setup and evaluation.
- Thermodynamic cycles: describe P-V and T-S diagram shapes for each process step, state isentropic
  vs. isothermal vs. polytropic assumptions, and compute thermal efficiency with all intermediate
  steps.  Reference ideal-gas relations and tabulated steam properties where relevant.
- Materials: quote yield/ultimate strengths with units (MPa), discuss ductile vs. brittle failure,
  and mention relevant ASTM material designations (e.g., ASTM A36 for structural steel).
- Machine design: include factor-of-safety calculations, fatigue life estimation (S-N curves), and
  reference ASME standards (e.g., ASME B31.1 for pressure piping) where applicable.`);
  }

  if (subdisciplines.includes('civil')) {
    blocks.push(`
CIVIL ENGINEERING — additional depth requirements:
- Structural analysis: present methods of joints / sections for trusses, moment distribution or
  slope-deflection for indeterminate beams, and influence lines for moving loads.
- Load combinations: reference appropriate load factors (e.g., 1.2D + 1.6L per ACI 318, or
  BS EN 1990 Eurocode combinations).  Clearly distinguish between ULS and SLS.
- Reinforced concrete design: show the rectangular stress block, compute required steel area
  (As = Mu / (phi * fy * (d - a/2))), check minimum/maximum reinforcement ratios.
- Geotechnical: discuss bearing capacity equations (Terzaghi, Meyerhof), effective stress
  principle, consolidation settlement calculations with Cc and Cv values.
- Hydraulics: Manning's equation for open channel flow, Hazen-Williams or Darcy-Weisbach for
  pipe flow — include friction factor charts or Moody diagram references.
- Reference standards: BS EN (Eurocodes), ACI, ASCE 7, AISC, IS codes as appropriate.`);
  }

  if (subdisciplines.includes('electrical')) {
    blocks.push(`
ELECTRICAL ENGINEERING — additional depth requirements:
- Circuit analysis: apply Kirchhoff's voltage and current laws systematically; show mesh / nodal
  analysis with full matrix setup.  For AC circuits, use phasor notation and impedance (Z = R + jX).
- Transfer functions: derive H(s) from circuit or system equations, identify poles and zeros,
  discuss stability (Routh-Hurwitz criterion, root locus).
- Frequency response: construct Bode magnitude and phase plots step-by-step — identify corner
  frequencies, asymptotic slopes (dB/decade), and phase margin / gain margin.
- Control systems: present block diagram reduction, Mason's gain formula for signal flow graphs,
  Nyquist stability criterion, and PID tuning considerations.
- Power systems: per-unit calculations, transformer equivalent circuits, three-phase analysis
  (Y-Delta transformations), and fault current calculations.
- Reference standards: IEEE (e.g., IEEE 519 for harmonics, IEEE C57 for transformers), IEC, NEC.`);
  }

  if (subdisciplines.includes('electronics')) {
    blocks.push(`
ELECTRONICS ENGINEERING — additional depth requirements:
- Semiconductor devices: present I-V characteristics for diodes (Shockley equation with
  ideality factor), BJTs (Ebers-Moll or hybrid-pi model), and MOSFETs (square-law model
  with channel-length modulation).
- Biasing: show DC operating point analysis with full KVL/KCL, compute Q-point (ICQ, VCEQ),
  and discuss bias stability against beta variation.
- Amplifier design: derive voltage gain (Av), input/output impedance, bandwidth, and CMRR
  for common-emitter, common-source, differential pair, and op-amp configurations.
- Digital logic: present truth tables, Karnaugh maps for minimisation, timing diagrams with
  propagation delay (tpd), setup/hold times, and discuss logic families (CMOS, TTL) with
  voltage levels and noise margins.
- Timing analysis: show critical path delay calculations, clock skew, and metastability
  considerations for sequential circuits.
- Reference standards: IEEE 1149.1 (JTAG), IPC standards for PCB design, JEDEC for memory.`);
  }

  if (subdisciplines.includes('chemical')) {
    blocks.push(`
CHEMICAL ENGINEERING — additional depth requirements:
- Material and energy balances: set up the general balance equation
  (Accumulation = In - Out + Generation - Consumption), show degree-of-freedom analysis,
  and solve with clearly labelled stream tables.
- Reaction engineering: derive rate laws from mechanism, present design equations for batch,
  CSTR, and PFR reactors (V = F_A0 * integral(dX / (-r_A))), compute conversion and
  selectivity.
- Transport phenomena: present momentum, heat, and mass transfer analogies; use
  dimensionless numbers (Re, Pr, Nu, Sc, Sh) and correlations for convective coefficients.
- Thermodynamics: phase equilibria (Raoult's law, activity coefficients), fugacity, and
  equation-of-state calculations (ideal gas, van der Waals, Peng-Robinson).
- Process design: discuss PFDs and P&IDs, control loop selection, HAZOP considerations, and
  reference standards such as ASME Section VIII (pressure vessels) and API standards.`);
  }

  return blocks.join('\n');
}

// ─── Subdiscipline-specific blocks for quiz content ──────────────────────────

function _subdisciplineQuizBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('mechanical')) {
    blocks.push(`
- Mechanical engineering questions: include problems on stress/strain calculations, FBD
  analysis, thermodynamic cycle efficiency, and fatigue-life estimation.  Distractors should
  reflect common errors such as using diameter instead of radius, forgetting to convert to
  consistent units (mm vs. m, kPa vs. MPa), or misapplying the sign convention.`);
  }

  if (subdisciplines.includes('civil')) {
    blocks.push(`
- Civil engineering questions: include structural analysis problems (reactions, shear/moment
  diagrams), reinforced concrete design checks, and geotechnical bearing capacity calculations.
  Distractors should capture mistakes like omitting load factors, confusing gross vs. net bearing
  capacity, or using the wrong moment arm.`);
  }

  if (subdisciplines.includes('electrical')) {
    blocks.push(`
- Electrical engineering questions: include circuit analysis (find current/voltage), transfer
  function derivation, Bode plot interpretation, and stability determination.  Distractors should
  reflect sign errors in KVL loops, incorrect impedance combination (series vs. parallel), or
  wrong unit prefixes (mA vs. A, kOhm vs. Ohm).`);
  }

  if (subdisciplines.includes('electronics')) {
    blocks.push(`
- Electronics questions: include DC bias point calculations, amplifier gain derivations, logic
  minimisation, and timing diagram interpretation.  Distractors should include common errors like
  confusing NPN/PNP biasing, forgetting the Early effect, or misreading active-low signals.`);
  }

  if (subdisciplines.includes('chemical')) {
    blocks.push(`
- Chemical engineering questions: include material/energy balance problems, reactor sizing
  calculations, and dimensionless-number correlations for heat/mass transfer.  Distractors should
  reflect errors like incorrect basis selection, wrong reaction stoichiometry, or confusing
  adiabatic with isothermal assumptions.`);
  }

  return blocks.join('\n');
}

// ─── Subdiscipline-specific blocks for tutor chat ────────────────────────────

function _subdisciplineTutorBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('mechanical')) {
    blocks.push(`
- For mechanical engineering topics: draw clear parallels between the mathematical model and the
  physical system (e.g., "the integral of the shear diagram gives the moment diagram because
  dM/dx = V").  Relate thermodynamic efficiencies to real-world engine/turbine performance.
  When the student's answer has a unit error, explicitly show the dimensional check that
  reveals the mistake.`);
  }

  if (subdisciplines.includes('civil')) {
    blocks.push(`
- For civil engineering topics: emphasise load paths ("where does the load go?") and equilibrium
  as the starting point for every analysis.  When discussing design, always mention code
  requirements (Eurocode, ACI, ASCE) and the safety philosophy behind load factors and capacity
  reduction factors.  Help the student develop intuition for reasonable deflections, steel ratios,
  and settlement values.`);
  }

  if (subdisciplines.includes('electrical')) {
    blocks.push(`
- For electrical engineering topics: use phasor diagrams and s-domain representations to build
  intuition.  When explaining stability, relate pole locations to time-domain behaviour
  ("a pole in the right-half plane means the response grows exponentially").  Encourage the
  student to verify circuit solutions with energy conservation or power balance checks.`);
  }

  if (subdisciplines.includes('electronics')) {
    blocks.push(`
- For electronics topics: connect device physics to circuit behaviour ("the transistor saturates
  because V_CE dropped below V_CE(sat) — what does that mean for the collector current?").
  Use small-signal models only after establishing the DC operating point.  Help the student
  build intuition for order-of-magnitude component values (resistors in kOhm range for
  BJT biasing, capacitors in pF-nF for high-frequency decoupling).`);
  }

  if (subdisciplines.includes('chemical')) {
    blocks.push(`
- For chemical engineering topics: always start from the general balance equation and simplify
  with stated assumptions.  Relate dimensionless numbers to the physics they represent ("Re
  compares inertial forces to viscous forces — high Re means turbulence dominates").  When the
  student confuses conversion with yield or selectivity, use a concrete numerical example to
  clarify the definitions.`);
  }

  return blocks.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build depth instructions for engineering module generation.
 *
 * This replaces the generic "200-400 words per module" instruction with a far
 * more demanding specification: 600-1200 words, full derivations, numerical
 * examples, standard references, and failure-mode discussions.
 *
 * @param {string[]} subdisciplines - e.g. ['mechanical', 'civil']
 * @returns {string} Prompt section to inject into the module generation prompt.
 */
function buildEngineeringDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineModuleBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general engineering';

  return `
═══════════════════════════════════════════════════════════════════════
ENGINEERING DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
These instructions OVERRIDE the default content-length and depth guidelines.
═══════════════════════════════════════════════════════════════════════

CONTENT LENGTH & RIGOUR:
- Each module MUST contain 600-1200 words of substantive technical content.
- Do NOT produce surface-level summaries.  Engineering students need derivations, equations, and
  worked examples they can study from — not bullet-point overviews.

MANDATORY ELEMENTS FOR EVERY ENGINEERING CONCEPT COVERED:

a) STATE THE UNDERLYING PHYSICAL PRINCIPLE
   Begin with the fundamental physics: conservation law, constitutive relation, or empirical
   observation that underpins the engineering model.

b) PRESENT THE GOVERNING EQUATION(S) WITH DERIVATION
   Show the derivation step-by-step, or at minimum the key intermediate steps that connect
   the physical principle to the final working equation.  Use LaTeX-style notation where
   appropriate (e.g., \\( \\sigma = F/A \\)).

c) DEFINE EVERY VARIABLE WITH SI UNITS
   After each equation, provide a variable list:
   - \\( \\sigma \\) = normal stress (Pa or N/m^2)
   - \\( F \\) = applied force (N)
   - \\( A \\) = cross-sectional area (m^2)
   Include common alternative units in parentheses where engineers typically use them
   (e.g., MPa, kN, mm^2).

d) WORK THROUGH AT LEAST ONE NUMERICAL EXAMPLE
   Provide a fully worked numerical example with:
   - Given data with units
   - Step-by-step substitution and calculation
   - Final answer with correct units and appropriate significant figures
   - Sanity check: "Is this answer physically reasonable?"

e) DISCUSS ASSUMPTIONS AND LIMITATIONS
   Every engineering equation has a domain of validity.  State the key assumptions
   (e.g., small deformations, incompressible flow, linear material behaviour) and
   explain what happens when they are violated.

f) REFERENCE RELEVANT ENGINEERING STANDARDS
   Where applicable, cite the governing standard:
   - ASME (mechanical design, pressure vessels, piping)
   - ASTM (material testing, specifications)
   - IEEE (electrical/electronics standards)
   - BS EN / Eurocodes (structural, civil)
   - API (petroleum, chemical process)
   - IS codes, DIN, JIS as appropriate to the context
   Mention clause numbers if they are well-known (e.g., "ACI 318-19, Section 22.2").

g) INCLUDE PRACTICAL DESIGN CONSIDERATIONS
   Discuss how the concept is applied in real engineering practice:
   - Material selection trade-offs
   - Manufacturing or construction constraints
   - Cost and efficiency considerations
   - Typical values engineers encounter in practice

h) COVER FAILURE MODES AND SAFETY FACTORS
   Where relevant, discuss:
   - How the component or system can fail (yield, fracture, buckling, instability, fatigue,
     corrosion, thermal runaway, dielectric breakdown, etc.)
   - Factor of safety: definition, typical values for the application, and how it is applied
     (FOS = S_yield / sigma_actual, or load-factor / capacity-reduction-factor approach)
   - Consequences of failure and why conservative design matters

STRUCTURE FOR EACH MODULE:
Follow this pedagogical sequence:
  Principle --> Derivation --> Equation --> Example --> Limitations --> Applications

This mirrors how engineering is taught in university courses and makes the material
suitable for exam revision and professional reference.
${subBlocks}

MATHEMATICAL NOTATION:
- Use inline LaTeX: \\( expression \\) for inline, \\[ expression \\] for display.
- Show intermediate algebraic steps — do not skip from problem statement to final answer.
- Include dimensional analysis where it aids understanding.

UNITS AND DIMENSIONAL ANALYSIS:
- Always express results in SI units.
- Show unit cancellation explicitly in at least one example per module to reinforce dimensional
  analysis skills.
- Where engineers commonly use non-SI units (psi, BTU, hp, cfm), note the conversion factor.
`;
}

/**
 * Build depth instructions for engineering quiz / question generation.
 *
 * Ensures questions test genuine problem-solving, calculation accuracy, and
 * engineering judgment — not surface-level recall.
 *
 * @param {string[]} subdisciplines - e.g. ['electrical', 'electronics']
 * @returns {string} Prompt section to inject into quiz generation prompts.
 */
function buildEngineeringQuizDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineQuizBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general engineering';

  return `
═══════════════════════════════════════════════════════════════════════
ENGINEERING QUIZ DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
═══════════════════════════════════════════════════════════════════════

QUESTION PHILOSOPHY:
Engineering exams test whether a student can SOLVE PROBLEMS, not just recall definitions.
The questions you generate must reflect this reality.

MANDATORY QUESTION TYPES — include a mix of all of the following:

1. NUMERICAL CALCULATION PROBLEMS (at least 40% of questions)
   - Provide given data with units and require the student to compute a specific quantity.
   - Multi-step: the answer to one sub-calculation feeds into the next (e.g., find stress,
     then check against yield strength, then compute factor of safety).
   - Always state units in the question and expect units in the answer.

2. ASSUMPTION & LIMITATION QUESTIONS (at least 15% of questions)
   - "Under what conditions does [equation/model] become invalid?"
   - "Which assumption must hold for this analysis to be valid?"
   - "What would happen to the result if [assumption] were removed?"

3. DESIGN SCENARIO QUESTIONS (at least 15% of questions)
   - "Given the following requirements [load, temperature, flow rate, bandwidth...],
     select / size / design a suitable [beam, pipe, circuit, reactor...]."
   - These should require the student to choose a method, apply it, and justify the choice.

4. DIAGRAM INTERPRETATION QUESTIONS (at least 10% of questions)
   - Describe a diagram in text (stress-strain curve, Bode plot, PFD, circuit schematic,
     shear-moment diagram) and ask the student to extract information or identify features.
   - Example: "A Bode magnitude plot shows a -20 dB/decade slope from 100 rad/s and
     -40 dB/decade from 10,000 rad/s.  What is the transfer function order and the
     corner frequencies?"

5. DIMENSIONAL ANALYSIS & ORDER-OF-MAGNITUDE QUESTIONS (at least 10% of questions)
   - "Which of the following has dimensions of [energy / pressure / force]?"
   - "Estimate the order of magnitude of [stress in a bicycle spoke / current in a household
     circuit / Reynolds number for water in a garden hose]."
   - These build engineering intuition and are common in professional engineering exams (FE/PE).

MCQ DISTRACTOR DESIGN:
- Distractors MUST represent common calculation errors, not random numbers:
  a) Wrong unit conversion (e.g., forgot mm-to-m, used diameter instead of radius)
  b) Missing factor (e.g., forgot factor of 2 in bending stress, or 1/2 in kinetic energy)
  c) Wrong formula applied (e.g., used series impedance formula instead of parallel)
  d) Sign error (e.g., compressive vs. tensile, leading vs. lagging)
  e) Off-by-one-order (e.g., kPa vs. MPa, mA vs. A)
- The correct answer and every distractor must include units.

EXPLANATION QUALITY:
- Every answer explanation must show the full solution working — not just "A is correct."
- Identify the specific error that would lead to each wrong answer choice where feasible.
- Include a dimensional check or sanity check in the explanation.
${subBlocks}
`;
}

/**
 * Build depth instructions for the engineering tutor chat persona.
 *
 * Guides the tutor to explain with mathematical rigour, physical intuition,
 * dimensional verification, and connections to real-world engineering practice.
 *
 * @param {string[]} subdisciplines - e.g. ['chemical']
 * @returns {string} Prompt section to inject into tutor chat prompts.
 */
function buildEngineeringTutorDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineTutorBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general engineering';

  return `
═══════════════════════════════════════════════════════════════════════
ENGINEERING TUTOR DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
═══════════════════════════════════════════════════════════════════════

You are tutoring an engineering student.  Engineering demands both mathematical precision
and physical intuition.  Your explanations must satisfy both requirements.

WHEN EXPLAINING A CONCEPT:
1. Always present the MATHEMATICAL FRAMEWORK first.
   - State the governing equation(s) clearly.
   - Define every variable with SI units.
   - Show how the equation connects to the underlying physics.

2. Show derivations STEP-BY-STEP, explaining the physics behind each step.
   - Do not jump from the starting point to the final result.
   - At each step, explain WHY the mathematical operation is valid physically.
   - Example: "We integrate the distributed load over the beam length because the total
     force is the sum of all infinitesimal load contributions — this is the superposition
     principle applied to a continuous distribution."

3. Use DIMENSIONAL ANALYSIS to verify results.
   - After deriving or computing a result, show explicitly that the units work out.
   - If a student's answer has wrong units, point this out immediately as the first
     diagnostic step.
   - Encourage the student to always check: "Do the units of my answer make sense?"

4. Discuss PRACTICAL IMPLICATIONS — "What would happen in a real system?"
   - Connect theory to practice: "In a real heat exchanger, the fouling factor would
     reduce the overall heat transfer coefficient by 10-30%, so we oversize by that margin."
   - Mention typical values engineers encounter so the student develops calibrated intuition.
   - Reference industry standards and codes where they apply.

WHEN A STUDENT GETS A WRONG ANSWER:
- IDENTIFY THE SPECIFIC ERROR.  Do not simply say "that's wrong, the answer is X."
- Common engineering errors to diagnose:
  a) Unit conversion mistake (mm vs. m, degrees vs. radians, gauge vs. absolute pressure)
  b) Sign error (tension vs. compression, voltage polarity, direction convention)
  c) Wrong formula selection (e.g., thin-wall vs. thick-wall pressure vessel formula)
  d) Algebraic manipulation error (show where the algebra diverged)
  e) Incorrect assumption (e.g., assuming steady-state when the problem is transient)
  f) Numerical arithmetic error (identify the exact step)
- After identifying the error, guide the student to correct it themselves rather than
  simply providing the right answer.  Ask leading questions: "Check your units at step 3 —
  what are the units of each term?"

ENGINEERING JUDGMENT & SANITY CHECKS:
- Encourage the student to sanity-check every answer:
  "Does 500 MPa of stress in a steel bolt seem reasonable?  (Yes — typical bolt steel
  has yield around 600-900 MPa, so we are below yield.)"
- Develop order-of-magnitude estimation skills:
  "Before computing, estimate: should the answer be in the range of Newtons, kilonewtons,
  or meganewtons?"
- Discuss what would happen if the answer were wrong in practice — consequences in real
  engineering (structural failure, equipment damage, safety hazards).

CONNECTING THEORY TO INDUSTRY:
- When discussing design, mention relevant standards (ASME, ASTM, IEEE, BS EN, API, IEC).
- Discuss professional engineering practice: how would a practising engineer approach this
  problem?  What software tools are commonly used?  What simplifications are acceptable
  in industry vs. in an exam?
- Reference the engineering design cycle: requirements -> analysis -> design -> verify -> iterate.
${subBlocks}

MATHEMATICAL NOTATION:
- Use LaTeX notation: \\( ... \\) for inline, \\[ ... \\] for display equations.
- Present equations clearly and define notation before using it.
- Show intermediate steps — engineering students learn by following the algebra.
`;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  buildEngineeringDepthSection,
  buildEngineeringQuizDepthSection,
  buildEngineeringTutorDepthSection,
};
