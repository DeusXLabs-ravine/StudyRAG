/**
 * Physics-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce rich, discipline-aware prompt sections that get
 * injected into module generation, quiz generation, flashcard generation,
 * and tutor chat prompts.  The goal is to produce THOROUGH, RIGOROUS
 * physics content — full derivations, governing equations, dimensional
 * analysis, worked numerical examples, limiting cases, and physical
 * intuition — rather than the surface-level summaries that generic
 * prompts produce.
 *
 * Consumed by:  backend/src/utils/prompts/depthRouter.js
 * Subdisciplines detected by:  backend/src/utils/subjectDetector.js
 *   Possible values: mechanics, electromagnetism, thermodynamics, quantum, optics, waves
 */

// ─── Subdiscipline-specific blocks for module content ────────────────────────

/**
 * Returns additional depth instructions specific to detected subdisciplines.
 * Each block describes the content expectations unique to that branch of
 * physics so the LLM produces domain-appropriate derivations, diagrams,
 * and physical reasoning.
 */
function _subdisciplineModuleBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('mechanics')) {
    blocks.push(`
MECHANICS — additional depth requirements:
- Free body diagrams: describe every force acting on the body textually (weight, normal, friction,
  tension, applied forces) with direction and point of application.  State Newton's second law in
  component form (sum F_x = ma_x, sum F_y = ma_y) and solve the resulting system.
- Newton's laws application: for each problem, explicitly identify the system, draw the FBD
  (described textually), write Newton's second law, and solve.  For non-inertial frames, include
  pseudo-forces and justify their use.
- Energy conservation: derive the work-energy theorem from Newton's second law
  (W_net = Delta K).  Present conservation of mechanical energy (K_i + U_i = K_f + U_f) and
  discuss when it applies (conservative forces only).  Show the energy method as an alternative
  to force methods and discuss when each approach is preferable.
- Momentum conservation: derive from Newton's third law for a system of particles.  Distinguish
  between elastic and inelastic collisions.  Show the vector nature of momentum — resolve into
  components for 2D collision problems.
- Rotational dynamics: present torque (tau = r x F), moment of inertia (I = sum m_i r_i^2 and
  integral form for continuous bodies), Newton's second law for rotation (tau_net = I * alpha),
  and rotational kinetic energy (K_rot = 1/2 I omega^2).  Derive parallel axis theorem and
  apply to compound objects.  Show rolling without slipping constraint (v = R * omega).
- Gravitation: derive orbital mechanics from Newton's law of gravitation, Kepler's laws from
  the inverse-square force, and escape velocity from energy conservation.`);
  }

  if (subdisciplines.includes('electromagnetism')) {
    blocks.push(`
ELECTROMAGNETISM — additional depth requirements:
- Electric fields and potentials: describe field lines for common charge configurations (point
  charge, dipole, infinite plane, infinite line).  Derive the field using Coulomb's law for
  discrete charges and integration for continuous distributions.
- Gauss's law application: identify the symmetry (spherical, cylindrical, planar), choose the
  appropriate Gaussian surface, evaluate the flux integral, and solve for the field.  Present
  at least one example for each symmetry type.
- Faraday's law: derive the EMF from changing magnetic flux (emf = -d(Phi_B)/dt).  Discuss
  Lenz's law as a consequence of energy conservation.  Apply to solenoids, moving conductors,
  and AC generators.  Show the connection to Maxwell's third equation.
- Ampere's law (with Maxwell's correction): apply to solenoids, toroids, and infinite wires.
  Discuss the displacement current term (epsilon_0 * d(Phi_E)/dt) and why it is needed for
  consistency.
- Circuit analysis with Kirchhoff's laws: set up KVL and KCL equations systematically for
  multi-loop circuits.  Solve RC, RL, and RLC circuits — derive the differential equations,
  find time constants, natural frequency, and damping ratio.  Present both transient and
  steady-state solutions.
- Maxwell's equations: present all four equations in integral and differential form.  Discuss
  the physical meaning of each equation and how together they predict electromagnetic waves.`);
  }

  if (subdisciplines.includes('thermodynamics')) {
    blocks.push(`
THERMODYNAMICS — additional depth requirements:
- State functions vs. path functions: clearly distinguish state functions (U, H, S, G, T, P, V)
  from path functions (Q, W).  Explain why this distinction matters for thermodynamic calculations.
- Process paths: for each thermodynamic process, state the defining constraint, derive the
  work and heat expressions, and describe the path on a PV diagram:
  * Isothermal (T = const): W = nRT ln(V_f/V_i) for ideal gas
  * Adiabatic (Q = 0): PV^gamma = const, derive T-V and T-P relations
  * Isobaric (P = const): W = P * Delta V, Q = n * C_p * Delta T
  * Isochoric (V = const): W = 0, Q = n * C_v * Delta T
- PV diagram analysis: show how to calculate work as the area under the process curve.  For
  cycles, show that net work equals the enclosed area.  Present Carnot, Otto, Diesel, and
  Rankine cycles with efficiency derivations.
- Entropy calculations: derive Delta S = integral(dQ_rev / T) for reversible processes.
  Calculate entropy changes for ideal gas processes, phase transitions, and mixing.  State
  and apply the Clausius inequality (Delta S_universe >= 0) to determine process spontaneity.
- Laws of thermodynamics: state each law precisely.  Derive consequences — zeroth law justifies
  temperature measurement, first law as energy conservation (dU = delta Q - delta W), second
  law as entropy increase, third law as the unattainability of absolute zero.
- Real gases: van der Waals equation, virial expansion, compressibility factor Z, and
  departure from ideal gas behaviour.  Critical point and corresponding states.`);
  }

  if (subdisciplines.includes('quantum')) {
    blocks.push(`
QUANTUM MECHANICS — additional depth requirements:
- Wave function interpretation: present the Born interpretation (|psi(x)|^2 as probability
  density), normalization condition (integral |psi|^2 dx = 1), and the superposition principle.
  Discuss the collapse postulate and measurement.
- Operator algebra: define position (x-hat), momentum (p-hat = -i*hbar*d/dx), and energy
  (Hamiltonian H-hat) operators.  Show that observables correspond to Hermitian operators with
  real eigenvalues.  Derive commutation relations ([x,p] = i*hbar) and discuss the uncertainty
  principle (Delta x * Delta p >= hbar/2) as a consequence.
- Measurement postulates: state the eigenvalue equation (A-hat |a> = a |a>), the probability
  of measuring eigenvalue a as |<a|psi>|^2, and the post-measurement state collapse.
  Demonstrate with spin-1/2 systems (Stern-Gerlach).
- Particle in a box: derive the energy eigenvalues (E_n = n^2 pi^2 hbar^2 / (2mL^2)) and
  wave functions (psi_n = sqrt(2/L) sin(n*pi*x/L)) from the time-independent Schrodinger
  equation with boundary conditions.  Discuss quantization as a consequence of confinement.
- Quantum harmonic oscillator: present the Hamiltonian, use ladder operators (a, a-dagger)
  to derive E_n = (n + 1/2) hbar*omega.  Show ground state wave function as a Gaussian.
  Discuss zero-point energy and its physical significance.
- Hydrogen atom: present the radial and angular solutions (spherical harmonics Y_l^m,
  radial functions R_nl), quantum numbers (n, l, m_l, m_s), and selection rules for
  transitions.  Derive the Bohr energy levels (E_n = -13.6 eV / n^2) from the full solution.`);
  }

  if (subdisciplines.includes('optics')) {
    blocks.push(`
OPTICS — additional depth requirements:
- Ray tracing: present the laws of reflection and refraction (Snell's law: n_1 sin(theta_1) =
  n_2 sin(theta_2)).  Trace rays through single and compound optical systems using the
  paraxial approximation.  Show graphical ray tracing for thin lenses (parallel ray, focal ray,
  central ray).
- Lens and mirror equations: derive the thin lens equation (1/f = 1/d_o + 1/d_i) from
  geometric optics.  Present the mirror equation with sign conventions (real-is-positive or
  Cartesian).  Calculate magnification (M = -d_i/d_o = h_i/h_o).  Show the lensmaker's
  equation (1/f = (n-1)(1/R_1 - 1/R_2)) and apply to common lens types.
- Interference: derive the conditions for constructive (Delta = m*lambda) and destructive
  (Delta = (m+1/2)*lambda) interference.  Present Young's double-slit experiment — derive
  fringe spacing (y_m = m*lambda*D/d).  Thin film interference with phase changes at
  boundaries.  Michelson interferometer and its applications.
- Diffraction: single-slit diffraction (a*sin(theta) = m*lambda for minima), derive the
  intensity pattern I(theta) = I_0 [sin(beta)/beta]^2.  Diffraction grating equation
  (d*sin(theta) = m*lambda) and resolving power (R = m*N).  Rayleigh criterion for
  resolution (theta_min = 1.22*lambda/D).
- Polarisation: Malus's law (I = I_0 cos^2(theta)), Brewster's angle (tan(theta_B) = n_2/n_1),
  birefringence, and quarter/half wave plates.`);
  }

  if (subdisciplines.includes('waves')) {
    blocks.push(`
WAVES — additional depth requirements:
- Wave equation: derive the one-dimensional wave equation (d^2y/dx^2 = (1/v^2) d^2y/dt^2)
  from Newton's second law applied to a string element.  Present the general solution
  y(x,t) = f(x - vt) + g(x + vt) and discuss travelling vs. standing waves.
- Superposition: show that the wave equation is linear, so solutions can be superposed.
  Derive beats from two waves of slightly different frequency (f_beat = |f_1 - f_2|).
  Constructive and destructive interference conditions.
- Standing waves: derive resonant frequencies for strings fixed at both ends
  (f_n = n*v/(2L)), open and closed pipes.  Show the relationship between boundary
  conditions and the mode shapes (nodes and antinodes).
- Sound waves: derive the speed of sound in a gas (v = sqrt(gamma*R*T/M)).  Present
  intensity (I = P/(4*pi*r^2)), decibel scale (beta = 10*log10(I/I_0)), and the
  Doppler effect for moving source and observer (f' = f * (v +/- v_o)/(v -/+ v_s)).
- Wave properties: reflection and transmission at boundaries — derive reflection and
  transmission coefficients for waves on strings with different linear densities.  Discuss
  impedance matching.  Dispersion: phase velocity vs. group velocity (v_g = d*omega/dk).
- Energy in waves: derive the energy density and power transmitted by a wave on a string
  (P = 1/2 mu omega^2 A^2 v).  Apply to electromagnetic waves (Poynting vector S = E x B / mu_0).`);
  }

  return blocks.join('\n');
}

// ─── Subdiscipline-specific blocks for quiz content ──────────────────────────

function _subdisciplineQuizBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('mechanics')) {
    blocks.push(`
- Mechanics questions: include problems on free body diagram analysis, projectile motion
  calculations, energy conservation (find final velocity, maximum height), momentum conservation
  in collisions, and rotational dynamics (torque, angular acceleration, moment of inertia).
  Distractors should reflect common errors such as forgetting to resolve forces into components,
  using wrong signs in the energy equation, confusing elastic with perfectly inelastic collisions,
  or using the wrong moment of inertia formula (e.g., solid vs. hollow cylinder).`);
  }

  if (subdisciplines.includes('electromagnetism')) {
    blocks.push(`
- Electromagnetism questions: include problems on electric field and potential calculations
  (point charges, continuous distributions), Gauss's law applications, Faraday's law (induced EMF),
  and circuit analysis (RC/RL/RLC transients, Kirchhoff's laws).  Distractors should reflect
  common errors such as forgetting the negative sign in Faraday's law, using the wrong Gaussian
  surface symmetry, confusing series and parallel combinations for capacitors vs. resistors,
  or dropping the displacement current term.`);
  }

  if (subdisciplines.includes('thermodynamics')) {
    blocks.push(`
- Thermodynamics questions: include problems on PV diagram work calculations, heat engine
  efficiency (Carnot and real cycles), entropy change calculations, and ideal gas process
  analysis.  Distractors should reflect common errors such as confusing C_p with C_v, using
  the wrong sign convention for work (physics vs. engineering convention), forgetting that
  adiabatic means Q = 0 not Delta T = 0, or incorrectly assuming all processes are reversible
  when calculating entropy.`);
  }

  if (subdisciplines.includes('quantum')) {
    blocks.push(`
- Quantum mechanics questions: include problems on normalizing wave functions, computing
  expectation values (<x>, <p>, <E>), applying the uncertainty principle, finding energy
  eigenvalues for simple systems (particle in box, harmonic oscillator), and transition
  probabilities.  Distractors should reflect common errors such as forgetting the complex
  conjugate in <psi|A|psi>, using wrong boundary conditions, confusing hbar with h,
  or misapplying the selection rules for quantum number changes.`);
  }

  if (subdisciplines.includes('optics')) {
    blocks.push(`
- Optics questions: include problems on Snell's law (refraction angles, total internal
  reflection), thin lens image location and magnification, double-slit interference fringe
  spacing, single-slit diffraction minima, and polarisation (Malus's law).  Distractors
  should reflect common errors such as using the wrong sign convention for image distance,
  confusing conditions for maxima vs. minima in interference, forgetting the extra phase
  shift at a denser medium boundary, or using the wrong formula (lens vs. mirror equation).`);
  }

  if (subdisciplines.includes('waves')) {
    blocks.push(`
- Waves questions: include problems on wave speed calculations, standing wave resonant
  frequencies, beat frequency determination, Doppler effect (moving source and/or observer),
  and wave energy/intensity calculations.  Distractors should reflect common errors such as
  confusing the open-pipe and closed-pipe resonance conditions, using the wrong Doppler
  formula sign convention, forgetting the inverse-square law for intensity, or confusing
  wavelength with period in speed calculations (v = f*lambda, not v = f*T).`);
  }

  return blocks.join('\n');
}

// ─── Subdiscipline-specific blocks for tutor chat ────────────────────────────

function _subdisciplineTutorBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('mechanics')) {
    blocks.push(`
- For mechanics topics: always start with a free body diagram (described textually) — identify
  every force, its direction, and its point of application before writing any equations.
  Emphasise that Newton's second law is the starting point for ALL mechanics problems.  When
  the student uses energy methods, ask: "Why is energy conservation valid here?  Are all forces
  conservative?"  For rotational problems, help the student choose the correct axis of rotation
  and compute the moment of inertia systematically.  Develop intuition: "If friction were absent,
  what would happen?  Does your answer reduce to this limiting case?"`);
  }

  if (subdisciplines.includes('electromagnetism')) {
    blocks.push(`
- For electromagnetism topics: build intuition through field line visualisation — "Which way do
  the field lines point?  Where are they densest?"  When applying Gauss's or Ampere's law, guide
  the student to identify the symmetry FIRST, then choose the integration surface/path.  For
  circuit problems, always start with labelling currents and applying Kirchhoff's laws
  systematically.  When discussing electromagnetic induction, connect Lenz's law to energy
  conservation: "The induced current must oppose the change — otherwise we'd get free energy."
  Help the student see Maxwell's equations as a unified framework, not four separate laws.`);
  }

  if (subdisciplines.includes('thermodynamics')) {
    blocks.push(`
- For thermodynamics topics: always begin by identifying the system, surroundings, and boundaries.
  Ask: "Is this process isothermal, adiabatic, isobaric, or isochoric?  What is held constant?"
  Before computing, have the student sketch the process on a PV diagram and predict qualitatively
  what happens to T, P, V, U, and S.  When the student confuses state functions with path
  functions, use a concrete example: "Internal energy change from A to B is the same regardless
  of path, but the heat and work depend on HOW you get there."  Emphasise that the second law
  is about the TOTAL entropy (system + surroundings), not just the system.`);
  }

  if (subdisciplines.includes('quantum')) {
    blocks.push(`
- For quantum mechanics topics: always connect the mathematics to the physics — "What does this
  wave function TELL us about where the particle is likely to be found?"  When introducing
  operators, start with classical analogues and show how the correspondence principle works.
  For measurement problems, walk through the postulates step by step: expand the state in the
  eigenbasis, compute probabilities, determine the post-measurement state.  When the student
  struggles with abstract formalism, use the particle-in-a-box or spin-1/2 as a concrete
  example first, then generalise.  Emphasise that quantum mechanics is a probabilistic framework
  — guide the student away from deterministic classical intuition where it fails.`);
  }

  if (subdisciplines.includes('optics')) {
    blocks.push(`
- For optics topics: always start with a clear diagram description — "Where is the object?
  Where is the lens?  Trace three principal rays."  When the student gets confused by sign
  conventions, be explicit about which convention is being used (real-is-positive vs. Cartesian)
  and apply it consistently.  For interference and diffraction, help the student set up the
  geometry and path difference BEFORE plugging into formulas.  Connect wave optics to ray optics:
  "In the limit where lambda -> 0, diffraction effects vanish and we recover geometric optics."
  Build intuition: "If you increase the slit width, what happens to the diffraction pattern?"`);
  }

  if (subdisciplines.includes('waves')) {
    blocks.push(`
- For waves topics: always ground the discussion in the wave equation and its solutions.  Help
  the student visualise: "At t = 0, what does the wave look like?  One period later?"  For
  standing waves, emphasise the role of boundary conditions in determining allowed frequencies.
  When discussing the Doppler effect, have the student draw the situation and identify who is
  moving and in which direction before selecting the formula.  Connect wave phenomena across
  domains: "The same superposition principle that explains beats in sound also explains
  interference fringes in light."  Build intuition for energy transport: "The wave carries
  energy, but the medium particles don't travel with the wave — they oscillate in place."`);
  }

  return blocks.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build depth instructions for physics module generation.
 *
 * This replaces the generic "200-400 words per module" instruction with a far
 * more demanding specification: 600-1200 words, full derivations, governing
 * equations, dimensional analysis, worked numerical examples, limiting cases,
 * and physical applications.
 *
 * @param {string[]} subdisciplines - e.g. ['mechanics', 'thermodynamics']
 * @returns {string} Prompt section to inject into the module generation prompt.
 */
function buildPhysicsDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineModuleBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general physics';

  return `
═══════════════════════════════════════════════════════════════════════
PHYSICS DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
These instructions OVERRIDE the default content-length and depth guidelines.
═══════════════════════════════════════════════════════════════════════

CONTENT LENGTH & RIGOUR:
- Each module MUST contain 600-1200 words of substantive technical content.
- Do NOT produce surface-level summaries.  Physics students need derivations, equations, and
  worked examples they can study from — not bullet-point overviews.

MANDATORY ELEMENTS FOR EVERY PHYSICS CONCEPT COVERED:

a) STATE THE PHYSICAL PRINCIPLE CLEARLY
   Begin with the fundamental law, symmetry, or conservation principle that underpins the topic.
   State it in words first, then in mathematical form.  Explain WHY the principle holds — connect
   it to deeper physical reasoning or experimental evidence.

b) PRESENT THE GOVERNING EQUATION(S) WITH FULL DERIVATION
   Show the derivation step-by-step from first principles.  Start from a fundamental law
   (Newton's laws, Maxwell's equations, Schrodinger equation, laws of thermodynamics) and
   derive the result.  Show ALL key intermediate steps — do not skip algebraic manipulations.
   Use LaTeX-style notation (e.g., \\( F = ma \\), \\[ \\oint \\vec{E} \\cdot d\\vec{A} = \\frac{Q_{enc}}{\\epsilon_0} \\]).

c) DEFINE EVERY VARIABLE WITH SI UNITS
   After each equation, provide a complete variable list:
   - \\( F \\) = force (N = kg m/s^2)
   - \\( m \\) = mass (kg)
   - \\( a \\) = acceleration (m/s^2)
   Include dimensional analysis showing how the units of each side of the equation match.

d) PERFORM DIMENSIONAL ANALYSIS
   For every major equation, verify dimensional consistency explicitly.  Show that the left-hand
   side and right-hand side have the same dimensions.  Use dimensional analysis as a tool to
   derive or check results — e.g., "By dimensional analysis, the period of a pendulum can only
   depend on L and g as T ~ sqrt(L/g)."

e) WORK THROUGH AT LEAST ONE NUMERICAL EXAMPLE
   Provide a fully worked numerical example with:
   - Given data with SI units
   - Step-by-step substitution and calculation
   - Unit cancellation shown explicitly
   - Final answer with correct units and appropriate significant figures
   - Sanity check: "Is this answer physically reasonable?"  Compare to known values or
     everyday experience.

f) DISCUSS LIMITING CASES AND APPROXIMATIONS
   Every physics equation has a domain of validity and interesting limiting behaviours.
   Explore them:
   - What happens as a parameter approaches 0 or infinity?
   - Does the equation reduce to a simpler, known result in a limiting case?
     (e.g., relativistic momentum reduces to p = mv for v << c)
   - What approximations were made in the derivation?  When do they break down?
   - What is the next-order correction if the approximation is relaxed?

g) CONNECT TO APPLICATIONS AND PHENOMENA
   Show how the physics manifests in real-world systems, experiments, or technology:
   - Laboratory demonstrations or classic experiments
   - Engineering applications and technological devices
   - Natural phenomena explained by the principle
   - Current research frontiers where the concept is active

STRUCTURE FOR EACH MODULE:
Follow this pedagogical sequence:
  Physical Principle --> Derivation --> Equation --> Numerical Example --> Limiting Cases --> Applications

This mirrors how physics is taught at the university level and builds deep understanding suitable
for exam preparation and further study.
${subBlocks}

MATHEMATICAL NOTATION:
- Use inline LaTeX: \\( expression \\) for inline, \\[ expression \\] for display.
- Show intermediate algebraic steps — do not skip from problem statement to final answer.
- Use vector notation where appropriate (\\( \\vec{F} \\), \\( \\nabla \\times \\vec{B} \\)).
- Include dimensional analysis where it aids understanding.

UNITS AND DIMENSIONAL ANALYSIS:
- Always express results in SI units.
- Show unit cancellation explicitly in at least one example per module to reinforce dimensional
  analysis skills.
- Use fundamental dimensions [M], [L], [T], [I], [Theta] when performing dimensional analysis.
- Where physicists commonly use non-SI units (eV, angstrom, light-year, atm), note the
  conversion factor to SI.
`;
}

/**
 * Build depth instructions for physics quiz / question generation.
 *
 * Ensures questions test genuine problem-solving, calculation accuracy,
 * dimensional reasoning, and physical intuition — not surface-level recall.
 *
 * @param {string[]} subdisciplines - e.g. ['mechanics', 'quantum']
 * @returns {string} Prompt section to inject into quiz generation prompts.
 */
function buildPhysicsQuizDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineQuizBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general physics';

  return `
═══════════════════════════════════════════════════════════════════════
PHYSICS QUIZ DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
═══════════════════════════════════════════════════════════════════════

QUESTION PHILOSOPHY:
Physics exams test whether a student can SOLVE PROBLEMS, REASON PHYSICALLY, and APPLY
PRINCIPLES to new situations — not just recall definitions.  The questions you generate
must reflect this reality.

MANDATORY QUESTION TYPES — include a mix of all of the following:

1. CALCULATION PROBLEMS (at least 50% of questions)
   - Provide given data with SI units and require the student to compute a specific quantity.
   - Multi-step: the answer to one sub-calculation feeds into the next (e.g., find the electric
     field, then compute the force, then determine the acceleration and trajectory).
   - Always state units in the question and expect units in the answer.
   - Include problems requiring equation derivation before numerical substitution.

2. DIMENSIONAL ANALYSIS QUESTIONS (at least 15% of questions)
   - "Which of the following expressions has the correct dimensions for [energy / force / etc.]?"
   - "Use dimensional analysis to determine how the period depends on [given variables]."
   - "Check whether the following equation is dimensionally consistent."
   - These build essential physics intuition and catch formula-recall errors.

3. CONCEPTUAL QUESTIONS REQUIRING PHYSICAL REASONING (at least 15% of questions)
   - "What happens to [observable] if [parameter] is doubled?  Explain your reasoning."
   - "Two systems differ in [specific way].  Which has the larger [quantity]?  Why?"
   - "Explain why [phenomenon] occurs using [specific principle]."
   - These test understanding, not memorisation — the student must reason from principles.

4. DIAGRAM INTERPRETATION QUESTIONS (at least 10% of questions)
   - Describe a diagram in text (PV diagram, potential energy curve, wave pattern, ray diagram,
     field line diagram, energy level diagram) and ask the student to extract information.
   - Example: "A PV diagram shows an ideal gas undergoing a cycle: isothermal expansion from
     (V_1, P_1) to (V_2, P_2), then isochoric cooling to (V_2, P_3), then isobaric compression
     back to (V_1, P_3), then isochoric heating to the initial state.  Which process does the
     most work on the gas?"
   - Example: "A potential energy curve U(x) has a minimum at x_0 and rises steeply for x < x_0
     but gradually for x > x_0.  Describe the motion of a particle with total energy E > U(x_0)."

5. LIMITING CASE & APPROXIMATION QUESTIONS (at least 10% of questions)
   - "In the limit where [parameter] -> 0 (or -> infinity), what does the expression reduce to?"
   - "Under what conditions is it valid to approximate [exact expression] as [simpler form]?"
   - "Estimate the order of magnitude of [physical quantity in a real scenario]."
   - These test whether the student truly understands the physics, not just the algebra.

MCQ DISTRACTOR DESIGN:
- Distractors MUST represent common physics errors, not random numbers:
  a) Dimensional error (e.g., using diameter instead of radius, forgetting a factor of 2*pi)
  b) Missing factor (e.g., forgot 1/2 in kinetic energy, or 4*pi*epsilon_0 in Coulomb's law)
  c) Wrong formula applied (e.g., used the lens equation with mirror sign convention)
  d) Sign error (e.g., wrong direction for induced EMF, wrong sign in potential energy)
  e) Wrong limiting case (e.g., used the non-relativistic formula when v ~ c)
  f) Off-by-one-order (e.g., confused MeV with eV, or mm with m)
- The correct answer and every distractor must include units.

EXPLANATION QUALITY:
- Every answer explanation must show the full solution working — not just "A is correct."
- Identify the specific error that would lead to each wrong answer choice where feasible.
- Include a dimensional check or sanity check in the explanation.
- Where applicable, discuss what physical insight helps verify the answer.
${subBlocks}
`;
}

/**
 * Build depth instructions for the physics tutor chat persona.
 *
 * Guides the tutor to explain with derivations from first principles,
 * dimensional analysis verification, order-of-magnitude estimation,
 * and physical intuition before mathematical formalism.
 *
 * @param {string[]} subdisciplines - e.g. ['optics', 'waves']
 * @returns {string} Prompt section to inject into tutor chat prompts.
 */
function buildPhysicsTutorDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineTutorBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general physics';

  return `
═══════════════════════════════════════════════════════════════════════
PHYSICS TUTOR DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
═══════════════════════════════════════════════════════════════════════

You are tutoring a physics student.  Physics demands both mathematical rigour and deep
physical intuition.  Your explanations must satisfy both requirements.

WHEN EXPLAINING A CONCEPT:
1. Start with PHYSICAL INTUITION before the mathematics.
   - Describe the physical situation qualitatively: "What is happening?  What do we expect?"
   - Use thought experiments and everyday analogies to build intuition.
   - Help the student develop a physical picture BEFORE introducing equations.
   - Example: "Before we derive the formula, think about what happens when you push a swing —
     you have to push at the right frequency to build up the amplitude.  That's resonance."

2. DERIVE FROM FIRST PRINCIPLES — always.
   - Start from a fundamental law (Newton's laws, Maxwell's equations, conservation laws,
     Schrodinger equation) and derive the result.
   - Show every key intermediate step and explain the physics behind each mathematical operation.
   - Do not present formulas as given — show where they come from.
   - Example: "We start from Newton's second law, F = ma.  The restoring force for a spring
     is F = -kx (Hooke's law).  Substituting: -kx = ma = m(d^2x/dt^2).  Rearranging gives
     d^2x/dt^2 + (k/m)x = 0, which is the SHM equation with omega^2 = k/m."

3. Use DIMENSIONAL ANALYSIS to verify and explore.
   - After deriving or computing a result, show explicitly that the units work out.
   - If a student's answer has wrong units, point this out immediately as the first diagnostic.
   - Use dimensional analysis to predict functional dependencies:
     "The speed of sound in a gas can only depend on the bulk modulus B (Pa = kg/(m s^2)) and
     density rho (kg/m^3).  By dimensional analysis, v ~ sqrt(B/rho)."
   - Encourage the student to always check: "Do the units of my answer make sense?"

4. Perform ORDER-OF-MAGNITUDE ESTIMATION before detailed calculation.
   - Before solving a problem rigorously, estimate the answer to the nearest power of 10.
   - This catches gross errors and builds physical calibration.
   - Example: "Before computing, let's estimate: the gravitational acceleration on Earth is
     ~10 m/s^2, the mass is ~1 kg, and the height is ~2 m, so the potential energy is
     ~20 J.  Our exact answer should be in this ballpark."
   - Teach Fermi estimation skills where appropriate.

5. Explore LIMITING CASES to test understanding.
   - After deriving a result, ask: "What happens when [parameter] -> 0 or -> infinity?"
   - Check that the formula reproduces known results in special cases.
   - Use limiting cases to catch errors: "Our answer says the force increases with distance —
     but we know gravity gets weaker with distance.  Something is wrong."

WHEN A STUDENT GETS A WRONG ANSWER:
- IDENTIFY THE SPECIFIC ERROR.  Do not simply say "that's wrong, the answer is X."
- Common physics errors to diagnose:
  a) Dimensional inconsistency (units don't match — often the fastest way to find the mistake)
  b) Sign error (direction convention, potential energy reference, Lenz's law)
  c) Wrong formula or principle applied (e.g., using conservation of energy when there is friction)
  d) Forgot a factor (2, pi, 4*pi*epsilon_0, hbar vs. h)
  e) Algebraic error in derivation (identify the exact step where it went wrong)
  f) Incorrect physical reasoning (e.g., confusing velocity with acceleration)
  g) Wrong limiting behaviour (answer doesn't reduce to known case)
- After identifying the error, guide the student to correct it themselves rather than simply
  providing the right answer.  Ask leading questions:
  "Check the dimensions of your answer — what units do you get?"
  "What should happen in the limit where m -> 0?  Does your formula give that?"
  "Draw the free body diagram again — are you missing any forces?"

PHYSICAL INTUITION & REASONING:
- Always connect math to physics: "This integral represents the total work done by the force
  as the particle moves from A to B."
- Use symmetry arguments: "By symmetry, the electric field must point radially outward."
- Invoke conservation laws as primary tools: "Before setting up complicated equations, ask:
  is energy conserved?  Is momentum conserved?  Is angular momentum conserved?"
- Develop estimation skills: help the student know typical values (speed of light, electron mass,
  Boltzmann constant, typical atomic sizes) and use them for quick sanity checks.
- Discuss the hierarchy of approximations: exact solution -> perturbation theory -> numerical
  methods, and when each is appropriate.

CONNECTING THEORY TO THE REAL WORLD:
- Relate physics to observable phenomena: "This is why the sky is blue (Rayleigh scattering),
  why bridges resonate (driven oscillations), why stars shine (nuclear fusion)."
- Mention classic experiments that established the principles being discussed.
- Where relevant, discuss modern applications and current research.
- Help the student see physics as a unified framework, not a collection of disconnected formulas.
${subBlocks}

MATHEMATICAL NOTATION:
- Use LaTeX notation: \\( ... \\) for inline, \\[ ... \\] for display equations.
- Present equations clearly and define notation before using it.
- Use vector notation where appropriate (\\( \\vec{F} \\), \\( \\nabla \\)).
- Show intermediate steps — physics students learn by following the derivation.
`;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  buildPhysicsDepthSection,
  buildPhysicsQuizDepthSection,
  buildPhysicsTutorDepthSection,
};
