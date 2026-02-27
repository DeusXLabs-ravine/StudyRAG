const PHYSICS_KEYWORDS = [
  'force', 'velocity', 'momentum', 'energy', 'circuit', 'wave', 'pendulum',
  'projectile', 'gravity', 'electric', 'magnetic', 'torque', 'acceleration',
  'friction', 'thermodynamic', 'entropy', 'capacitor', 'resistor', 'inductor',
  'voltage', 'ampere', 'ohm', 'coulomb', 'newton', 'joule', 'watt',
  'frequency', 'wavelength', 'refraction', 'diffraction', 'interference',
  'kinetic', 'potential energy', 'angular', 'rotational', 'centripetal',
  'gravitational', 'electromagnetic', 'optics', 'lens', 'mirror',
];

const MATH_KEYWORDS = [
  'integral', 'derivative', 'equation', 'solve', 'prove', 'theorem',
  'matrix', 'eigenvalue', 'differential', 'limit', 'series', 'convergence',
  'divergence', 'polynomial', 'logarithm', 'exponential', 'trigonometric',
  'calculus', 'algebra', 'geometry', 'vector', 'determinant', 'laplace',
  'fourier', 'taylor', 'maclaurin', 'binomial', 'permutation', 'combination',
  'probability', 'factorial', 'summation', 'integration', 'differentiation',
  'asymptote', 'inflection', 'maxima', 'minima', 'gradient', 'hessian',
];

const CHEMISTRY_KEYWORDS = [
  'reaction', 'equilibrium', 'mole', 'oxidation', 'titration', 'molarity',
  'stoichiometry', 'electron', 'orbital', 'bond', 'valence', 'isotope',
  'catalyst', 'enthalpy', 'entropy', 'gibbs', 'ph', 'acid', 'base',
  'redox', 'electrochemistry', 'organic chemistry', 'polymer', 'ion',
];

const ENGINEERING_KEYWORDS = [
  'stress', 'strain', 'beam', 'fluid', 'thermodynamic cycle', 'heat transfer',
  'convection', 'conduction', 'radiation', 'reynolds', 'bernoulli', 'navier',
  'shear', 'tensile', 'compressive', 'buckling', 'fatigue', 'yield strength',
];

const LATEX_PATTERNS = [
  /\$[^$]+\$/,             // inline LaTeX $...$
  /\$\$[^$]+\$\$/,         // display LaTeX $$...$$
  /\\frac\b/,
  /\\int\b/,
  /\\sum\b/,
  /\\lim\b/,
  /\\sqrt\b/,
  /\\partial\b/,
  /\\nabla\b/,
  /\\vec\b/,
  /\\hat\b/,
  /\\dot\b/,
];

const EQUATION_PATTERNS = [
  /\d+\s*[\+\-\*\/\^]\s*\d+\s*=/, // numeric equations: 2 + 3 =
  /[a-z]\s*=\s*[a-z\d]/i,          // variable assignments: F = ma
  /\d+\s*[xX]\s*[\+\-]/,           // algebraic: 3x +
];

function isSTEMQuery(text) {
  if (!text) return { isSTEM: false, subjects: [] };
  const lower = text.toLowerCase();
  const subjects = [];

  const physicsHits = PHYSICS_KEYWORDS.filter(kw => lower.includes(kw));
  if (physicsHits.length > 0) subjects.push('physics');

  const mathHits = MATH_KEYWORDS.filter(kw => lower.includes(kw));
  if (mathHits.length > 0) subjects.push('math');

  const chemHits = CHEMISTRY_KEYWORDS.filter(kw => lower.includes(kw));
  if (chemHits.length > 0) subjects.push('chemistry');

  const engHits = ENGINEERING_KEYWORDS.filter(kw => lower.includes(kw));
  if (engHits.length > 0) subjects.push('engineering');

  const hasLatex = LATEX_PATTERNS.some(p => p.test(text));
  if (hasLatex && subjects.length === 0) subjects.push('math');

  const hasEquation = EQUATION_PATTERNS.some(p => p.test(text));
  if (hasEquation && subjects.length === 0) subjects.push('math');

  return { isSTEM: subjects.length > 0, subjects };
}

module.exports = { isSTEMQuery };
