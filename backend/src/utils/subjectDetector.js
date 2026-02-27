/**
 * Subject domain detector for depth-enhanced content generation.
 * Detects specialized academic domains from document text to trigger
 * thorough, in-depth module generation for those disciplines.
 *
 * Supported domains:
 *   law, engineering, medicine, computer_science, mathematics, physics,
 *   chemistry, biology, economics, accounting, psychology, nursing,
 *   pharmacy, business, political_science, history, sociology,
 *   philosophy, education, environmental_science, agriculture, architecture
 */

// ─── Law ────────────────────────────────────────────────────────
const LAW_KEYWORDS = [
  'constitution', 'statute', 'legislation', 'jurisdiction', 'tort',
  'contract law', 'criminal law', 'civil law', 'common law', 'precedent',
  'case law', 'plaintiff', 'defendant', 'judicial', 'tribunal',
  'arbitration', 'litigation', 'amendment', 'penal code', 'civil code',
  'habeas corpus', 'due process', 'mens rea', 'actus reus', 'stare decisis',
  'jurisprudence', 'barrister', 'solicitor', 'regulation', 'ordinance',
  'ratio decidendi', 'obiter dictum', 'ultra vires', 'injunction',
  'equity', 'fiduciary', 'negligence', 'vicarious liability',
  'strict liability', 'defamation', 'nuisance', 'trespass',
  'indictment', 'arraignment', 'bail', 'plea', 'conviction',
  'acquittal', 'sentencing', 'appeal', 'judicial review',
  'constitutional law', 'administrative law', 'commercial law',
  'company law', 'labour law', 'employment law', 'family law',
  'property law', 'land law', 'trust law', 'intellectual property',
  'international law', 'human rights law', 'environmental law',
  'criminal procedure', 'civil procedure', 'evidence law',
  'legal maxim', 'locus standi', 'res judicata', 'sub judice',
  'prima facie', 'burden of proof', 'standard of proof',
  'beyond reasonable doubt', 'balance of probabilities',
  'cross-examination', 'examination-in-chief', 'affidavit',
  'writ', 'summons', 'subpoena', 'decree', 'judgment',
];

const LAW_SUBDISCIPLINES = {
  criminal: [
    'criminal law', 'penal code', 'mens rea', 'actus reus',
    'indictment', 'arraignment', 'bail', 'plea', 'conviction',
    'acquittal', 'sentencing', 'criminal procedure', 'homicide',
    'theft', 'robbery', 'assault', 'conspiracy',
  ],
  constitutional: [
    'constitutional law', 'constitution', 'amendment', 'fundamental rights',
    'judicial review', 'separation of powers', 'federalism',
    'bill of rights', 'due process', 'equal protection',
  ],
  contract: [
    'contract law', 'offer', 'acceptance', 'consideration',
    'breach of contract', 'damages', 'specific performance',
    'undue influence', 'misrepresentation', 'frustration',
  ],
  tort: [
    'tort', 'negligence', 'duty of care', 'vicarious liability',
    'strict liability', 'defamation', 'nuisance', 'trespass',
    'occupier liability', 'product liability', 'causation',
  ],
  commercial: [
    'commercial law', 'company law', 'partnership', 'agency',
    'sale of goods', 'insurance law', 'banking law',
    'negotiable instrument', 'intellectual property', 'competition law',
  ],
};

// ─── Engineering ────────────────────────────────────────────────
const ENGINEERING_KEYWORDS = [
  'stress', 'strain', 'beam', 'truss', 'shear force', 'bending moment',
  'tensile strength', 'yield strength', 'compressive', 'buckling',
  'fatigue', 'creep', 'mohr circle', 'poisson ratio', 'young modulus',
  'moment of inertia', 'deflection', 'free body diagram',
  'fluid mechanics', 'reynolds number', 'bernoulli', 'navier-stokes',
  'laminar flow', 'turbulent flow', 'viscosity', 'hydraulic',
  'pipe flow', 'boundary layer', 'drag coefficient',
  'thermodynamic cycle', 'heat transfer', 'convection', 'conduction',
  'carnot', 'rankine cycle', 'otto cycle', 'diesel cycle',
  'entropy', 'enthalpy', 'specific heat', 'thermal conductivity',
  'heat exchanger', 'boiler', 'turbine', 'compressor',
  'circuit analysis', 'kirchhoff', 'thevenin', 'norton',
  'impedance', 'reactance', 'transfer function', 'bode plot',
  'feedback control', 'pid controller', 'signal processing',
  'amplifier', 'transistor', 'diode', 'operational amplifier',
  'digital logic', 'microcontroller', 'embedded system',
  'material science', 'metallurgy', 'crystallography', 'phase diagram',
  'alloy', 'composite material', 'polymer engineering',
  'engineering design', 'factor of safety', 'tolerance', 'cad',
  'finite element', 'load analysis', 'structural analysis',
  'manufacturing process', 'quality control', 'reliability',
  'engineering standard', 'iso standard', 'astm', 'asme',
];

const ENGINEERING_SUBDISCIPLINES = {
  mechanical: [
    'stress', 'strain', 'beam', 'truss', 'shear force', 'bending moment',
    'fatigue', 'creep', 'mohr circle', 'thermodynamic cycle',
    'heat transfer', 'turbine', 'compressor', 'manufacturing',
  ],
  civil: [
    'structural analysis', 'beam', 'truss', 'foundation',
    'concrete', 'reinforced', 'soil mechanics', 'geotechnical',
    'hydraulic', 'environmental engineering', 'surveying',
  ],
  electrical: [
    'circuit analysis', 'kirchhoff', 'thevenin', 'norton',
    'impedance', 'transfer function', 'bode plot', 'feedback control',
    'signal processing', 'power system', 'transformer',
  ],
  electronics: [
    'transistor', 'diode', 'operational amplifier', 'digital logic',
    'microcontroller', 'embedded system', 'vlsi', 'pcb',
    'semiconductor', 'integrated circuit',
  ],
  chemical: [
    'reactor design', 'mass transfer', 'heat exchanger',
    'distillation', 'process control', 'chemical engineering',
    'unit operation', 'fluid flow', 'separation process',
  ],
};

// ─── Medicine & Medical Sciences ────────────────────────────────
const MEDICINE_KEYWORDS = [
  'pathophysiology', 'pathology', 'diagnosis', 'prognosis',
  'differential diagnosis', 'clinical presentation', 'etiology',
  'epidemiology', 'symptom', 'syndrome', 'complication',
  'treatment', 'therapy', 'management', 'prophylaxis',
  'anatomy', 'physiology', 'histology', 'embryology',
  'organ system', 'cardiovascular', 'respiratory', 'gastrointestinal',
  'musculoskeletal', 'nervous system', 'endocrine', 'renal',
  'hepatic', 'splenic', 'lymphatic', 'integumentary',
  'pharmacology', 'pharmacokinetics', 'pharmacodynamics',
  'mechanism of action', 'drug interaction', 'adverse effect',
  'contraindication', 'dosage', 'bioavailability', 'half-life',
  'therapeutic index', 'receptor', 'agonist', 'antagonist',
  'microbiology', 'bacteriology', 'virology', 'mycology',
  'parasitology', 'gram positive', 'gram negative',
  'culture and sensitivity', 'antibiotic', 'antimicrobial',
  'pathogen', 'virulence', 'infection', 'colonization',
  'biofilm', 'spore', 'endotoxin', 'exotoxin',
  'polymerase chain reaction', 'pcr', 'elisa', 'serology',
  'hematology', 'haematology', 'clinical chemistry', 'immunology',
  'blood bank', 'transfusion', 'coagulation', 'hemostasis',
  'blood group', 'cross-match', 'complete blood count', 'cbc',
  'erythrocyte', 'leukocyte', 'platelet', 'hemoglobin',
  'hematocrit', 'reticulocyte', 'bone marrow', 'smear',
  'electrophoresis', 'spectrophotometry', 'centrifuge',
  'quality assurance', 'reference range', 'normal range',
  'sensitivity and specificity', 'positive predictive value',
  'urinalysis', 'cerebrospinal fluid', 'synovial fluid',
  'semen analysis', 'stool analysis', 'specimen collection',
  'biochemistry', 'enzyme', 'metabolic pathway', 'krebs cycle',
  'glycolysis', 'gluconeogenesis', 'lipid metabolism',
  'protein synthesis', 'amino acid', 'nucleotide',
  'oxidative phosphorylation', 'electron transport chain',
  'clinical correlation', 'case study', 'patient', 'presenting complaint',
  'history taking', 'physical examination', 'investigation',
  'lab value', 'laboratory finding', 'imaging', 'biopsy',
  'surgical', 'post-operative', 'pre-operative',
  'public health', 'incidence', 'prevalence', 'mortality',
  'morbidity', 'screening', 'vaccination', 'immunization',
  'outbreak', 'endemic', 'epidemic', 'pandemic',
];

const MEDICINE_SUBDISCIPLINES = {
  microbiology: [
    'microbiology', 'bacteriology', 'virology', 'mycology', 'parasitology',
    'gram positive', 'gram negative', 'culture and sensitivity', 'antibiotic',
    'antimicrobial', 'pathogen', 'virulence', 'biofilm', 'spore',
    'endotoxin', 'exotoxin', 'pcr', 'elisa', 'serology',
    'koch postulate', 'normal flora', 'opportunistic infection',
  ],
  mls: [
    'medical laboratory', 'hematology', 'haematology', 'clinical chemistry',
    'blood bank', 'transfusion', 'coagulation', 'hemostasis',
    'complete blood count', 'cbc', 'urinalysis', 'specimen',
    'quality assurance', 'reference range', 'electrophoresis',
    'spectrophotometry', 'centrifuge', 'cross-match',
    'sensitivity and specificity', 'positive predictive value',
  ],
  pharmacology: [
    'pharmacology', 'pharmacokinetics', 'pharmacodynamics',
    'mechanism of action', 'drug interaction', 'adverse effect',
    'contraindication', 'dosage', 'bioavailability', 'half-life',
    'therapeutic index', 'receptor', 'agonist', 'antagonist',
    'first pass metabolism', 'volume of distribution', 'clearance',
  ],
  anatomy: [
    'anatomy', 'histology', 'embryology', 'dissection',
    'organ system', 'musculoskeletal', 'nervous system',
    'arterial supply', 'venous drainage', 'nerve supply',
    'lymphatic drainage', 'surface anatomy', 'cross-section',
  ],
  pathology: [
    'pathology', 'histopathology', 'cytopathology', 'biopsy',
    'neoplasm', 'malignant', 'benign', 'metastasis',
    'inflammation', 'necrosis', 'apoptosis', 'fibrosis',
    'granuloma', 'hyperplasia', 'dysplasia', 'carcinoma',
  ],
  biochemistry: [
    'biochemistry', 'enzyme', 'metabolic pathway', 'krebs cycle',
    'glycolysis', 'gluconeogenesis', 'lipid metabolism',
    'protein synthesis', 'oxidative phosphorylation',
    'electron transport chain', 'amino acid', 'nucleotide',
  ],
};

// ─── Computer Science ───────────────────────────────────────────
const COMPUTER_SCIENCE_KEYWORDS = [
  'algorithm', 'data structure', 'time complexity', 'space complexity',
  'big o notation', 'recursion', 'dynamic programming', 'graph algorithm',
  'sorting algorithm', 'binary search', 'hash table', 'linked list',
  'binary tree', 'heap', 'stack', 'queue', 'array',
  'operating system', 'process', 'thread', 'concurrency', 'deadlock',
  'memory management', 'virtual memory', 'paging', 'scheduling',
  'compiler', 'lexical analysis', 'parsing', 'syntax tree',
  'database', 'sql', 'normalization', 'relational database', 'indexing',
  'transaction', 'acid properties', 'nosql', 'query optimization',
  'computer network', 'tcp', 'udp', 'http', 'dns', 'routing',
  'osi model', 'socket', 'firewall', 'encryption',
  'object oriented', 'inheritance', 'polymorphism', 'encapsulation',
  'design pattern', 'singleton', 'factory pattern', 'observer pattern',
  'software engineering', 'agile', 'version control', 'unit test',
  'machine learning', 'neural network', 'deep learning', 'classification',
  'regression', 'clustering', 'supervised learning', 'unsupervised learning',
  'artificial intelligence', 'search algorithm', 'heuristic',
  'automata theory', 'turing machine', 'finite automaton', 'context-free grammar',
  'computability', 'np-complete', 'np-hard', 'halting problem',
  'assembly language', 'instruction set', 'cpu architecture', 'pipeline',
  'cache memory', 'bus architecture', 'interrupt', 'register',
];

const COMPUTER_SCIENCE_SUBDISCIPLINES = {
  algorithms: [
    'algorithm', 'data structure', 'time complexity', 'big o notation',
    'dynamic programming', 'graph algorithm', 'sorting algorithm',
    'binary search', 'greedy algorithm', 'divide and conquer',
  ],
  operating_systems: [
    'operating system', 'process', 'thread', 'deadlock',
    'memory management', 'virtual memory', 'paging', 'scheduling',
    'file system', 'kernel', 'system call',
  ],
  databases: [
    'database', 'sql', 'normalization', 'relational database',
    'transaction', 'acid properties', 'nosql', 'query optimization',
    'indexing', 'join', 'stored procedure',
  ],
  networking: [
    'computer network', 'tcp', 'udp', 'http', 'dns', 'routing',
    'osi model', 'socket', 'firewall', 'subnet', 'protocol',
  ],
  ai_ml: [
    'machine learning', 'neural network', 'deep learning',
    'classification', 'regression', 'clustering',
    'artificial intelligence', 'reinforcement learning',
    'natural language processing', 'computer vision',
  ],
  software_engineering: [
    'software engineering', 'design pattern', 'agile', 'scrum',
    'version control', 'unit test', 'integration test',
    'continuous integration', 'refactoring', 'code review',
  ],
};

// ─── Mathematics ────────────────────────────────────────────────
const MATHEMATICS_KEYWORDS = [
  'theorem', 'proof', 'lemma', 'corollary', 'axiom', 'conjecture',
  'integral', 'derivative', 'differential equation', 'partial derivative',
  'limit', 'continuity', 'convergence', 'divergence', 'series',
  'calculus', 'real analysis', 'complex analysis', 'functional analysis',
  'linear algebra', 'matrix', 'eigenvalue', 'eigenvector', 'determinant',
  'vector space', 'linear transformation', 'basis', 'dimension',
  'abstract algebra', 'group theory', 'ring theory', 'field theory',
  'homomorphism', 'isomorphism', 'subgroup', 'quotient group',
  'topology', 'open set', 'closed set', 'compact', 'connected',
  'metric space', 'topological space', 'hausdorff', 'homeomorphism',
  'number theory', 'prime number', 'modular arithmetic', 'congruence',
  'diophantine equation', 'euler totient', 'fermat',
  'probability theory', 'random variable', 'expected value', 'variance',
  'probability distribution', 'central limit theorem', 'bayes theorem',
  'stochastic process', 'markov chain',
  'discrete mathematics', 'combinatorics', 'graph theory', 'recurrence relation',
  'set theory', 'boolean algebra', 'lattice', 'partial order',
  'numerical analysis', 'numerical method', 'interpolation', 'approximation',
  'fourier', 'laplace transform', 'taylor series', 'maclaurin series',
  'optimization', 'linear programming', 'convex optimization',
];

const MATHEMATICS_SUBDISCIPLINES = {
  calculus: [
    'integral', 'derivative', 'differential equation', 'partial derivative',
    'limit', 'continuity', 'series', 'taylor series', 'maclaurin series',
    'fundamental theorem of calculus', 'chain rule', 'integration by parts',
  ],
  linear_algebra: [
    'matrix', 'eigenvalue', 'eigenvector', 'determinant', 'vector space',
    'linear transformation', 'basis', 'dimension', 'orthogonal',
    'rank', 'null space', 'inner product',
  ],
  abstract_algebra: [
    'group theory', 'ring theory', 'field theory', 'homomorphism',
    'isomorphism', 'subgroup', 'quotient group', 'permutation group',
    'cyclic group', 'abelian', 'normal subgroup',
  ],
  statistics: [
    'probability', 'random variable', 'expected value', 'variance',
    'probability distribution', 'central limit theorem', 'hypothesis testing',
    'confidence interval', 'regression analysis', 'correlation',
  ],
  discrete_math: [
    'combinatorics', 'graph theory', 'recurrence relation', 'set theory',
    'boolean algebra', 'induction', 'pigeonhole principle',
    'counting', 'permutation', 'combination',
  ],
  topology: [
    'topology', 'open set', 'closed set', 'compact', 'connected',
    'metric space', 'hausdorff', 'homeomorphism', 'homotopy',
  ],
};

// ─── Physics ────────────────────────────────────────────────────
const PHYSICS_KEYWORDS = [
  'newton', 'force', 'acceleration', 'velocity', 'momentum',
  'kinetic energy', 'potential energy', 'conservation of energy',
  'work done', 'power', 'torque', 'angular momentum',
  'projectile', 'circular motion', 'centripetal', 'gravitational',
  'simple harmonic motion', 'pendulum', 'oscillation', 'resonance',
  'wave', 'wavelength', 'frequency', 'amplitude', 'interference',
  'diffraction', 'refraction', 'reflection', 'polarization',
  'electromagnetic', 'electric field', 'magnetic field', 'maxwell',
  'coulomb', 'gauss law', 'faraday', 'ampere', 'inductance',
  'capacitance', 'resistance', 'ohm', 'kirchhoff',
  'thermodynamics', 'entropy', 'enthalpy', 'heat capacity',
  'carnot', 'boltzmann', 'ideal gas law', 'adiabatic',
  'quantum mechanics', 'wave function', 'schrodinger', 'heisenberg',
  'uncertainty principle', 'quantum state', 'superposition', 'entanglement',
  'photon', 'electron', 'proton', 'neutron', 'quark',
  'special relativity', 'general relativity', 'lorentz transformation',
  'time dilation', 'length contraction', 'mass-energy equivalence',
  'nuclear physics', 'radioactivity', 'fission', 'fusion', 'half-life',
  'optics', 'lens', 'mirror', 'focal length', 'magnification',
  'snell law', 'total internal reflection', 'optical fiber',
  'fluid dynamics', 'bernoulli', 'viscosity', 'pressure', 'buoyancy',
];

const PHYSICS_SUBDISCIPLINES = {
  mechanics: [
    'newton', 'force', 'acceleration', 'velocity', 'momentum',
    'kinetic energy', 'potential energy', 'torque', 'angular momentum',
    'projectile', 'circular motion', 'simple harmonic motion',
  ],
  electromagnetism: [
    'electric field', 'magnetic field', 'maxwell', 'coulomb',
    'gauss law', 'faraday', 'ampere', 'inductance',
    'capacitance', 'electromagnetic wave', 'lorentz force',
  ],
  thermodynamics: [
    'thermodynamics', 'entropy', 'enthalpy', 'heat capacity',
    'carnot', 'boltzmann', 'ideal gas law', 'adiabatic',
    'isothermal', 'heat engine', 'refrigeration cycle',
  ],
  quantum: [
    'quantum mechanics', 'wave function', 'schrodinger', 'heisenberg',
    'uncertainty principle', 'quantum state', 'superposition',
    'entanglement', 'photon', 'spin', 'orbital',
  ],
  optics: [
    'optics', 'lens', 'mirror', 'focal length', 'magnification',
    'snell law', 'total internal reflection', 'diffraction',
    'interference', 'polarization', 'laser',
  ],
  waves: [
    'wave', 'wavelength', 'frequency', 'amplitude',
    'interference', 'diffraction', 'standing wave',
    'doppler effect', 'resonance', 'superposition',
  ],
};

// ─── Chemistry ──────────────────────────────────────────────────
const CHEMISTRY_KEYWORDS = [
  'atom', 'molecule', 'element', 'compound', 'chemical bond',
  'ionic bond', 'covalent bond', 'metallic bond', 'hydrogen bond',
  'periodic table', 'atomic number', 'atomic mass', 'isotope',
  'electron configuration', 'orbital', 'quantum number',
  'chemical reaction', 'stoichiometry', 'mole', 'avogadro',
  'balancing equation', 'limiting reagent', 'yield',
  'acid', 'base', 'ph', 'buffer', 'titration', 'indicator',
  'oxidation', 'reduction', 'redox', 'electrochemistry',
  'galvanic cell', 'electrolytic cell', 'electrode potential',
  'equilibrium', 'le chatelier', 'equilibrium constant',
  'reaction rate', 'rate law', 'activation energy', 'catalyst',
  'enthalpy', 'entropy', 'gibbs free energy', 'spontaneity',
  'organic chemistry', 'functional group', 'hydrocarbon',
  'alkane', 'alkene', 'alkyne', 'alcohol', 'aldehyde', 'ketone',
  'carboxylic acid', 'ester', 'amine', 'amide', 'aromatic',
  'stereochemistry', 'chirality', 'enantiomer', 'diastereomer',
  'nucleophilic substitution', 'elimination', 'addition reaction',
  'inorganic chemistry', 'coordination compound', 'ligand',
  'crystal field theory', 'transition metal', 'complex ion',
  'analytical chemistry', 'spectroscopy', 'chromatography',
  'mass spectrometry', 'nmr', 'infrared spectroscopy',
  'solution', 'molarity', 'molality', 'dilution', 'solubility',
  'colligative property', 'osmotic pressure', 'boiling point elevation',
];

const CHEMISTRY_SUBDISCIPLINES = {
  organic: [
    'organic chemistry', 'functional group', 'hydrocarbon', 'alkane',
    'alkene', 'alcohol', 'aldehyde', 'ketone', 'carboxylic acid',
    'stereochemistry', 'nucleophilic substitution', 'elimination',
  ],
  inorganic: [
    'inorganic chemistry', 'coordination compound', 'ligand',
    'crystal field theory', 'transition metal', 'complex ion',
    'periodic table', 'electron configuration',
  ],
  physical: [
    'thermodynamics', 'equilibrium', 'reaction rate', 'rate law',
    'activation energy', 'gibbs free energy', 'enthalpy', 'entropy',
    'electrochemistry', 'galvanic cell', 'electrode potential',
  ],
  analytical: [
    'analytical chemistry', 'spectroscopy', 'chromatography',
    'mass spectrometry', 'nmr', 'titration', 'indicator',
    'calibration', 'qualitative analysis', 'quantitative analysis',
  ],
};

// ─── Biology ────────────────────────────────────────────────────
const BIOLOGY_KEYWORDS = [
  'cell', 'organelle', 'mitochondria', 'ribosome', 'nucleus',
  'cell membrane', 'cytoplasm', 'endoplasmic reticulum', 'golgi',
  'mitosis', 'meiosis', 'cell cycle', 'chromosome', 'dna', 'rna',
  'gene', 'allele', 'genotype', 'phenotype', 'dominant', 'recessive',
  'mendelian genetics', 'punnett square', 'crossing over', 'mutation',
  'natural selection', 'evolution', 'adaptation', 'speciation',
  'phylogenetic', 'taxonomy', 'kingdom', 'phylum', 'genus', 'species',
  'ecology', 'ecosystem', 'food chain', 'food web', 'trophic level',
  'population', 'community', 'biodiversity', 'symbiosis', 'parasitism',
  'photosynthesis', 'cellular respiration', 'atp', 'chloroplast',
  'fermentation', 'aerobic', 'anaerobic',
  'molecular biology', 'transcription', 'translation', 'replication',
  'genetic engineering', 'crispr', 'pcr', 'gel electrophoresis', 'cloning',
  'biotechnology', 'recombinant dna', 'plasmid', 'restriction enzyme',
  'nervous system', 'neuron', 'synapse', 'neurotransmitter',
  'hormone', 'endocrine', 'homeostasis', 'feedback loop',
  'immune system', 'antibody', 'antigen', 'lymphocyte', 'phagocyte',
  'plant biology', 'xylem', 'phloem', 'transpiration', 'germination',
];

const BIOLOGY_SUBDISCIPLINES = {
  cell_biology: [
    'cell', 'organelle', 'mitochondria', 'ribosome', 'nucleus',
    'cell membrane', 'cytoplasm', 'endoplasmic reticulum',
    'mitosis', 'meiosis', 'cell cycle',
  ],
  genetics: [
    'gene', 'allele', 'genotype', 'phenotype', 'dominant', 'recessive',
    'mendelian genetics', 'punnett square', 'mutation', 'chromosome',
    'dna', 'rna', 'genetic engineering', 'crispr',
  ],
  ecology: [
    'ecology', 'ecosystem', 'food chain', 'food web', 'trophic level',
    'population', 'community', 'biodiversity', 'symbiosis',
    'habitat', 'niche', 'succession',
  ],
  molecular_biology: [
    'molecular biology', 'transcription', 'translation', 'replication',
    'pcr', 'gel electrophoresis', 'recombinant dna', 'plasmid',
    'restriction enzyme', 'gene expression',
  ],
  evolution: [
    'evolution', 'natural selection', 'adaptation', 'speciation',
    'phylogenetic', 'taxonomy', 'homologous', 'analogous',
    'darwin', 'genetic drift', 'gene flow',
  ],
};

// ─── Economics ───────────────────────────────────────────────────
const ECONOMICS_KEYWORDS = [
  'supply and demand', 'equilibrium price', 'market structure',
  'perfect competition', 'monopoly', 'oligopoly', 'monopolistic competition',
  'price elasticity', 'income elasticity', 'cross elasticity',
  'consumer surplus', 'producer surplus', 'deadweight loss',
  'marginal cost', 'marginal revenue', 'marginal utility',
  'opportunity cost', 'comparative advantage', 'absolute advantage',
  'gdp', 'gnp', 'inflation', 'deflation', 'unemployment',
  'fiscal policy', 'monetary policy', 'central bank', 'interest rate',
  'aggregate demand', 'aggregate supply', 'business cycle',
  'balance of payments', 'exchange rate', 'trade deficit', 'tariff',
  'economic growth', 'development economics', 'poverty',
  'public goods', 'externality', 'market failure', 'government intervention',
  'game theory', 'nash equilibrium', 'prisoner dilemma',
  'utility maximization', 'indifference curve', 'budget constraint',
  'production function', 'returns to scale', 'isoquant', 'isocost',
  'keynesian', 'classical economics', 'monetarism',
  'macroeconomics', 'microeconomics', 'econometrics',
  'cost-benefit analysis', 'pareto efficiency', 'welfare economics',
];

const ECONOMICS_SUBDISCIPLINES = {
  microeconomics: [
    'supply and demand', 'equilibrium price', 'price elasticity',
    'consumer surplus', 'marginal cost', 'marginal utility',
    'market structure', 'perfect competition', 'monopoly',
    'utility maximization', 'indifference curve',
  ],
  macroeconomics: [
    'gdp', 'inflation', 'unemployment', 'fiscal policy',
    'monetary policy', 'aggregate demand', 'aggregate supply',
    'business cycle', 'keynesian', 'central bank',
  ],
  international: [
    'balance of payments', 'exchange rate', 'trade deficit',
    'tariff', 'comparative advantage', 'free trade',
    'protectionism', 'trade agreement',
  ],
  development: [
    'development economics', 'poverty', 'economic growth',
    'human development index', 'inequality', 'aid',
    'industrialization', 'structural adjustment',
  ],
};

// ─── Accounting & Finance ───────────────────────────────────────
const ACCOUNTING_KEYWORDS = [
  'balance sheet', 'income statement', 'cash flow statement',
  'assets', 'liabilities', 'equity', 'revenue', 'expenses',
  'debit', 'credit', 'journal entry', 'ledger', 'trial balance',
  'depreciation', 'amortization', 'accrual', 'prepaid',
  'accounts receivable', 'accounts payable', 'inventory',
  'gaap', 'ifrs', 'accounting standard', 'financial reporting',
  'cost accounting', 'management accounting', 'variance analysis',
  'budget', 'standard costing', 'activity-based costing',
  'auditing', 'internal control', 'audit opinion', 'material misstatement',
  'taxation', 'tax liability', 'deferred tax', 'tax planning',
  'corporate finance', 'capital structure', 'wacc', 'npv', 'irr',
  'dividend policy', 'capital budgeting', 'working capital',
  'financial analysis', 'ratio analysis', 'liquidity ratio',
  'profitability ratio', 'leverage ratio', 'return on equity',
  'time value of money', 'present value', 'future value',
  'bond valuation', 'stock valuation', 'portfolio theory',
  'risk management', 'hedging', 'derivative', 'option', 'futures',
  'bank reconciliation', 'double entry', 'bookkeeping',
];

const ACCOUNTING_SUBDISCIPLINES = {
  financial_accounting: [
    'balance sheet', 'income statement', 'cash flow statement',
    'gaap', 'ifrs', 'journal entry', 'ledger', 'trial balance',
    'depreciation', 'accrual', 'financial reporting',
  ],
  management_accounting: [
    'cost accounting', 'management accounting', 'variance analysis',
    'budget', 'standard costing', 'activity-based costing',
    'break-even analysis', 'relevant cost',
  ],
  auditing: [
    'auditing', 'internal control', 'audit opinion', 'audit risk',
    'material misstatement', 'substantive procedure', 'audit evidence',
  ],
  taxation: [
    'taxation', 'tax liability', 'deferred tax', 'tax planning',
    'income tax', 'capital gains', 'tax deduction', 'tax credit',
  ],
  corporate_finance: [
    'corporate finance', 'capital structure', 'wacc', 'npv', 'irr',
    'dividend policy', 'capital budgeting', 'working capital',
    'merger', 'acquisition', 'leveraged buyout',
  ],
};

// ─── Psychology ──────────────────────────────────────────────────
const PSYCHOLOGY_KEYWORDS = [
  'behavior', 'cognition', 'perception', 'memory', 'attention',
  'learning theory', 'conditioning', 'reinforcement', 'punishment',
  'classical conditioning', 'operant conditioning', 'pavlov', 'skinner',
  'cognitive psychology', 'schema', 'heuristic', 'cognitive bias',
  'developmental psychology', 'piaget', 'erikson', 'vygotsky',
  'attachment theory', 'cognitive development', 'moral development',
  'social psychology', 'conformity', 'obedience', 'group dynamics',
  'attribution theory', 'attitude', 'stereotype', 'prejudice',
  'personality', 'trait theory', 'big five', 'psychodynamic',
  'freud', 'jung', 'maslow', 'rogers', 'humanistic psychology',
  'abnormal psychology', 'psychopathology', 'dsm', 'anxiety disorder',
  'depression', 'schizophrenia', 'bipolar disorder', 'ptsd',
  'clinical psychology', 'psychotherapy', 'cbt', 'counseling',
  'neuropsychology', 'brain', 'neurotransmitter', 'synapse',
  'cerebral cortex', 'hippocampus', 'amygdala', 'prefrontal cortex',
  'research methods', 'experimental design', 'hypothesis', 'variable',
  'correlation', 'statistical significance', 'reliability', 'validity',
  'sensation', 'perception', 'visual processing', 'auditory processing',
  'motivation', 'emotion', 'stress', 'coping mechanism',
  'intelligence', 'iq', 'emotional intelligence', 'creativity',
];

const PSYCHOLOGY_SUBDISCIPLINES = {
  clinical: [
    'abnormal psychology', 'psychopathology', 'dsm', 'anxiety disorder',
    'depression', 'schizophrenia', 'psychotherapy', 'cbt',
    'counseling', 'diagnosis', 'treatment',
  ],
  developmental: [
    'developmental psychology', 'piaget', 'erikson', 'vygotsky',
    'attachment theory', 'cognitive development', 'moral development',
    'adolescence', 'lifespan development',
  ],
  cognitive: [
    'cognitive psychology', 'memory', 'attention', 'perception',
    'schema', 'heuristic', 'cognitive bias', 'problem solving',
    'language acquisition', 'decision making',
  ],
  social: [
    'social psychology', 'conformity', 'obedience', 'group dynamics',
    'attribution theory', 'attitude', 'stereotype', 'prejudice',
    'social influence', 'bystander effect',
  ],
  neuro: [
    'neuropsychology', 'brain', 'neurotransmitter', 'synapse',
    'cerebral cortex', 'hippocampus', 'amygdala',
    'brain imaging', 'neuroplasticity',
  ],
};

// ─── Nursing ────────────────────────────────────────────────────
const NURSING_KEYWORDS = [
  'nursing process', 'nursing diagnosis', 'care plan', 'patient assessment',
  'vital signs', 'blood pressure', 'pulse', 'temperature', 'respiratory rate',
  'patient safety', 'infection control', 'hand hygiene', 'sterile technique',
  'medication administration', 'drug calculation', 'iv therapy', 'injection',
  'wound care', 'dressing change', 'wound assessment', 'healing process',
  'health promotion', 'disease prevention', 'patient education',
  'community health', 'public health nursing', 'home care',
  'pediatric nursing', 'geriatric nursing', 'maternal nursing',
  'surgical nursing', 'medical-surgical', 'perioperative',
  'critical care', 'intensive care', 'ventilator', 'hemodynamic monitoring',
  'nursing ethics', 'patient advocacy', 'informed consent',
  'delegation', 'scope of practice', 'nursing standard',
  'fluid and electrolyte', 'acid-base balance', 'dehydration',
  'pain management', 'pain assessment', 'analgesic',
  'mental health nursing', 'psychiatric nursing', 'therapeutic communication',
  'nutrition', 'diet therapy', 'enteral feeding', 'parenteral nutrition',
  'documentation', 'charting', 'nursing notes', 'sbar',
  'triage', 'emergency nursing', 'first aid', 'cpr', 'resuscitation',
];

const NURSING_SUBDISCIPLINES = {
  fundamentals: [
    'nursing process', 'nursing diagnosis', 'care plan', 'patient assessment',
    'vital signs', 'patient safety', 'infection control',
    'documentation', 'charting', 'sbar',
  ],
  medical_surgical: [
    'medical-surgical', 'perioperative', 'wound care',
    'fluid and electrolyte', 'pain management',
    'medication administration', 'iv therapy',
  ],
  critical_care: [
    'critical care', 'intensive care', 'ventilator',
    'hemodynamic monitoring', 'resuscitation', 'cpr',
    'emergency nursing', 'triage',
  ],
  community: [
    'community health', 'public health nursing', 'home care',
    'health promotion', 'disease prevention', 'patient education',
    'epidemiology', 'screening',
  ],
  mental_health: [
    'mental health nursing', 'psychiatric nursing',
    'therapeutic communication', 'crisis intervention',
    'substance abuse', 'behavioral health',
  ],
};

// ─── Pharmacy ───────────────────────────────────────────────────
const PHARMACY_KEYWORDS = [
  'pharmaceutical', 'dispensing', 'prescription', 'compounding',
  'drug formulation', 'dosage form', 'tablet', 'capsule', 'injection',
  'suspension', 'emulsion', 'ointment', 'cream', 'suppository',
  'pharmacokinetics', 'pharmacodynamics', 'adme', 'absorption',
  'distribution', 'metabolism', 'excretion', 'bioavailability',
  'drug interaction', 'adverse drug reaction', 'contraindication',
  'therapeutic drug monitoring', 'drug level', 'trough level',
  'pharmaceutical chemistry', 'medicinal chemistry', 'sar',
  'drug design', 'molecular target', 'receptor binding',
  'pharmacognosy', 'herbal medicine', 'phytochemistry', 'alkaloid',
  'pharmaceutical analysis', 'quality control', 'dissolution testing',
  'stability testing', 'shelf life', 'expiration date',
  'clinical pharmacy', 'pharmaceutical care', 'medication review',
  'drug information', 'evidence-based pharmacy', 'formulary',
  'pharmacy practice', 'community pharmacy', 'hospital pharmacy',
  'drug classification', 'schedule', 'controlled substance',
  'biopharmaceutics', 'drug delivery', 'sustained release',
  'parenteral', 'ophthalmic', 'topical', 'transdermal',
  'pharmacy law', 'pharmacy regulation', 'pharmacy ethics',
];

const PHARMACY_SUBDISCIPLINES = {
  pharmaceutics: [
    'drug formulation', 'dosage form', 'tablet', 'capsule',
    'suspension', 'emulsion', 'compounding', 'biopharmaceutics',
    'drug delivery', 'sustained release',
  ],
  pharmaceutical_chemistry: [
    'pharmaceutical chemistry', 'medicinal chemistry', 'sar',
    'drug design', 'molecular target', 'receptor binding',
    'functional group', 'stereochemistry',
  ],
  pharmacognosy: [
    'pharmacognosy', 'herbal medicine', 'phytochemistry',
    'alkaloid', 'terpene', 'flavonoid', 'natural product',
    'extraction', 'isolation',
  ],
  clinical_pharmacy: [
    'clinical pharmacy', 'pharmaceutical care', 'medication review',
    'drug information', 'therapeutic drug monitoring',
    'adverse drug reaction', 'drug interaction',
  ],
  pharmacy_practice: [
    'pharmacy practice', 'dispensing', 'prescription',
    'community pharmacy', 'hospital pharmacy', 'drug classification',
    'controlled substance', 'pharmacy law',
  ],
};

// ─── Business & Management ──────────────────────────────────────
const BUSINESS_KEYWORDS = [
  'management', 'leadership', 'organizational behavior',
  'strategic management', 'competitive advantage', 'swot analysis',
  'porter five forces', 'value chain', 'core competency',
  'marketing', 'market segmentation', 'targeting', 'positioning',
  'marketing mix', 'product lifecycle', 'brand management',
  'consumer behavior', 'market research', 'advertising',
  'human resource management', 'recruitment', 'selection', 'training',
  'performance appraisal', 'compensation', 'employee relations',
  'operations management', 'supply chain', 'inventory management',
  'lean manufacturing', 'six sigma', 'total quality management',
  'project management', 'gantt chart', 'critical path',
  'entrepreneurship', 'business plan', 'startup', 'venture capital',
  'business ethics', 'corporate governance', 'stakeholder',
  'organizational structure', 'organizational culture', 'change management',
  'business strategy', 'merger', 'acquisition', 'joint venture',
  'international business', 'globalization', 'market entry strategy',
  'innovation management', 'disruption', 'business model',
];

const BUSINESS_SUBDISCIPLINES = {
  strategic: [
    'strategic management', 'competitive advantage', 'swot analysis',
    'porter five forces', 'value chain', 'business strategy',
    'merger', 'acquisition', 'diversification',
  ],
  marketing: [
    'marketing', 'market segmentation', 'targeting', 'positioning',
    'marketing mix', 'brand management', 'consumer behavior',
    'advertising', 'digital marketing',
  ],
  hrm: [
    'human resource management', 'recruitment', 'selection', 'training',
    'performance appraisal', 'compensation', 'employee relations',
    'organizational behavior', 'motivation',
  ],
  operations: [
    'operations management', 'supply chain', 'inventory management',
    'lean manufacturing', 'six sigma', 'quality management',
    'production planning', 'logistics',
  ],
};

// ─── Political Science ──────────────────────────────────────────
const POLITICAL_SCIENCE_KEYWORDS = [
  'political system', 'democracy', 'autocracy', 'authoritarianism',
  'totalitarianism', 'republic', 'monarchy', 'federalism',
  'separation of powers', 'legislature', 'executive', 'judiciary',
  'political party', 'election', 'voting', 'suffrage',
  'political ideology', 'liberalism', 'conservatism', 'socialism',
  'communism', 'fascism', 'nationalism', 'populism',
  'international relations', 'sovereignty', 'diplomacy', 'treaty',
  'united nations', 'nato', 'international law', 'foreign policy',
  'realism', 'liberalism', 'constructivism', 'marxism',
  'balance of power', 'deterrence', 'security dilemma',
  'public administration', 'bureaucracy', 'public policy',
  'policy analysis', 'governance', 'accountability', 'transparency',
  'civil society', 'interest group', 'lobbying', 'media',
  'political philosophy', 'social contract', 'rights', 'justice',
  'state', 'nation', 'power', 'authority', 'legitimacy',
  'constitution', 'constitutional design', 'regime',
  'comparative politics', 'political culture', 'political socialization',
  'conflict', 'war', 'peace', 'terrorism', 'revolution',
];

const POLITICAL_SCIENCE_SUBDISCIPLINES = {
  comparative: [
    'comparative politics', 'political system', 'democracy',
    'authoritarianism', 'regime', 'political culture',
    'electoral system', 'party system',
  ],
  international_relations: [
    'international relations', 'sovereignty', 'diplomacy',
    'realism', 'liberalism', 'constructivism',
    'balance of power', 'deterrence', 'foreign policy',
  ],
  political_theory: [
    'political philosophy', 'social contract', 'rights', 'justice',
    'liberalism', 'conservatism', 'socialism', 'marxism',
    'legitimacy', 'authority',
  ],
  public_admin: [
    'public administration', 'bureaucracy', 'public policy',
    'governance', 'accountability', 'policy analysis',
    'decentralization', 'regulation',
  ],
};

// ─── History ────────────────────────────────────────────────────
const HISTORY_KEYWORDS = [
  'civilization', 'empire', 'dynasty', 'colony', 'colonialism',
  'imperialism', 'independence', 'revolution', 'reformation',
  'renaissance', 'enlightenment', 'industrial revolution',
  'ancient', 'medieval', 'modern', 'contemporary',
  'world war', 'cold war', 'civil war', 'nationalism',
  'historiography', 'primary source', 'secondary source',
  'archaeological', 'artifact', 'excavation',
  'monarch', 'emperor', 'pharaoh', 'sultan', 'caliph',
  'feudalism', 'serfdom', 'aristocracy', 'bourgeoisie',
  'mercantilism', 'capitalism', 'socialism', 'communism',
  'treaty', 'alliance', 'diplomacy', 'peace treaty',
  'constitution', 'declaration', 'charter', 'abolition',
  'slave trade', 'decolonization', 'partition', 'unification',
  'genocide', 'holocaust', 'apartheid', 'civil rights',
  'migration', 'diaspora', 'cultural exchange',
  'bronze age', 'iron age', 'stone age', 'neolithic',
  'greek civilization', 'roman empire', 'ottoman empire',
  'ming dynasty', 'mughal empire', 'british empire',
  'french revolution', 'american revolution', 'russian revolution',
];

const HISTORY_SUBDISCIPLINES = {
  ancient: [
    'ancient', 'civilization', 'bronze age', 'iron age', 'stone age',
    'pharaoh', 'greek civilization', 'roman empire',
    'mesopotamia', 'archaeological',
  ],
  medieval: [
    'medieval', 'feudalism', 'serfdom', 'crusade', 'monastery',
    'knight', 'castle', 'dynasty', 'renaissance', 'reformation',
  ],
  modern: [
    'modern', 'industrial revolution', 'french revolution',
    'american revolution', 'colonialism', 'imperialism',
    'nationalism', 'world war', 'cold war',
  ],
  regional: [
    'african history', 'asian history', 'latin american',
    'middle eastern', 'european history', 'decolonization',
    'independence movement', 'partition',
  ],
};

// ─── Sociology ──────────────────────────────────────────────────
const SOCIOLOGY_KEYWORDS = [
  'social structure', 'social institution', 'social norm', 'social role',
  'socialization', 'social stratification', 'social class', 'caste',
  'social mobility', 'inequality', 'poverty', 'wealth distribution',
  'deviance', 'crime', 'labeling theory', 'strain theory',
  'functionalism', 'conflict theory', 'symbolic interactionism',
  'durkheim', 'weber', 'marx', 'bourdieu', 'foucault',
  'culture', 'subculture', 'counterculture', 'cultural relativism',
  'ethnocentrism', 'cultural capital', 'habitus',
  'gender', 'gender roles', 'feminism', 'patriarchy', 'intersectionality',
  'race', 'ethnicity', 'racism', 'discrimination', 'segregation',
  'religion', 'secularization', 'fundamentalism',
  'family', 'kinship', 'marriage', 'divorce', 'household',
  'education', 'hidden curriculum', 'cultural reproduction',
  'urbanization', 'globalization', 'migration', 'diaspora',
  'bureaucracy', 'organization', 'power', 'authority',
  'social movement', 'collective action', 'protest', 'activism',
  'quantitative research', 'qualitative research', 'survey',
  'ethnography', 'interview', 'participant observation',
];

const SOCIOLOGY_SUBDISCIPLINES = {
  theory: [
    'functionalism', 'conflict theory', 'symbolic interactionism',
    'durkheim', 'weber', 'marx', 'bourdieu', 'foucault',
    'social constructionism', 'postmodernism',
  ],
  stratification: [
    'social stratification', 'social class', 'inequality', 'poverty',
    'social mobility', 'wealth distribution', 'caste',
    'meritocracy', 'underclass',
  ],
  gender_race: [
    'gender', 'feminism', 'patriarchy', 'intersectionality',
    'race', 'ethnicity', 'racism', 'discrimination',
    'social construction of race',
  ],
  research_methods: [
    'quantitative research', 'qualitative research', 'survey',
    'ethnography', 'interview', 'participant observation',
    'sampling', 'reliability', 'validity',
  ],
};

// ─── Philosophy ─────────────────────────────────────────────────
const PHILOSOPHY_KEYWORDS = [
  'epistemology', 'ontology', 'metaphysics', 'ethics', 'aesthetics',
  'logic', 'deductive reasoning', 'inductive reasoning', 'fallacy',
  'syllogism', 'valid argument', 'sound argument', 'premise', 'conclusion',
  'empiricism', 'rationalism', 'idealism', 'materialism', 'dualism',
  'existentialism', 'phenomenology', 'hermeneutics', 'pragmatism',
  'utilitarianism', 'deontology', 'virtue ethics', 'consequentialism',
  'categorical imperative', 'moral relativism', 'moral realism',
  'philosophy of mind', 'consciousness', 'free will', 'determinism',
  'philosophy of science', 'falsifiability', 'paradigm shift',
  'political philosophy', 'social contract', 'justice', 'liberty',
  'plato', 'aristotle', 'descartes', 'kant', 'hegel', 'nietzsche',
  'hume', 'locke', 'hobbes', 'rousseau', 'mill', 'rawls',
  'wittgenstein', 'heidegger', 'sartre', 'foucault', 'derrida',
  'a priori', 'a posteriori', 'analytic', 'synthetic',
  'necessary', 'contingent', 'possible worlds', 'modal logic',
  'thought experiment', 'trolley problem', 'ship of theseus',
  'skepticism', 'solipsism', 'nihilism', 'absurdism',
];

const PHILOSOPHY_SUBDISCIPLINES = {
  ethics: [
    'ethics', 'utilitarianism', 'deontology', 'virtue ethics',
    'categorical imperative', 'moral relativism', 'consequentialism',
    'applied ethics', 'bioethics', 'business ethics',
  ],
  epistemology: [
    'epistemology', 'knowledge', 'justification', 'belief',
    'empiricism', 'rationalism', 'skepticism', 'a priori',
    'a posteriori', 'gettier problem',
  ],
  metaphysics: [
    'metaphysics', 'ontology', 'existence', 'being',
    'free will', 'determinism', 'dualism', 'materialism',
    'idealism', 'possible worlds', 'causation',
  ],
  logic: [
    'logic', 'deductive reasoning', 'inductive reasoning', 'fallacy',
    'syllogism', 'valid argument', 'sound argument',
    'modal logic', 'propositional logic', 'predicate logic',
  ],
  political_philosophy: [
    'political philosophy', 'social contract', 'justice', 'liberty',
    'hobbes', 'locke', 'rousseau', 'rawls', 'nozick',
    'rights', 'equality', 'authority',
  ],
};

// ─── Education ──────────────────────────────────────────────────
const EDUCATION_KEYWORDS = [
  'pedagogy', 'andragogy', 'curriculum', 'syllabus', 'lesson plan',
  'learning theory', 'behaviorism', 'constructivism', 'cognitivism',
  'bloom taxonomy', 'learning objectives', 'learning outcomes',
  'assessment', 'formative assessment', 'summative assessment',
  'rubric', 'grading', 'evaluation', 'standardized testing',
  'differentiated instruction', 'inclusive education', 'special education',
  'learning disability', 'gifted education', 'accommodations',
  'classroom management', 'student engagement', 'motivation',
  'educational technology', 'e-learning', 'blended learning',
  'instructional design', 'scaffolding', 'zone of proximal development',
  'educational psychology', 'cognitive development', 'metacognition',
  'literacy', 'numeracy', 'critical thinking', 'problem solving',
  'curriculum development', 'standards', 'competency', 'proficiency',
  'teacher education', 'professional development', 'mentoring',
  'educational research', 'action research', 'case study',
  'multicultural education', 'culturally responsive teaching',
  'early childhood education', 'higher education', 'adult education',
];

const EDUCATION_SUBDISCIPLINES = {
  curriculum: [
    'curriculum', 'curriculum development', 'standards', 'syllabus',
    'lesson plan', 'learning objectives', 'learning outcomes',
    'instructional design', 'scope and sequence',
  ],
  educational_psychology: [
    'educational psychology', 'learning theory', 'behaviorism',
    'constructivism', 'cognitivism', 'bloom taxonomy',
    'metacognition', 'motivation', 'self-regulated learning',
  ],
  assessment: [
    'assessment', 'formative assessment', 'summative assessment',
    'rubric', 'standardized testing', 'evaluation',
    'portfolio assessment', 'authentic assessment',
  ],
  special_education: [
    'special education', 'learning disability', 'inclusive education',
    'accommodations', 'individualized education program',
    'gifted education', 'differentiated instruction',
  ],
};

// ─── Environmental Science ──────────────────────────────────────
const ENVIRONMENTAL_SCIENCE_KEYWORDS = [
  'climate change', 'global warming', 'greenhouse gas', 'carbon dioxide',
  'ozone layer', 'acid rain', 'air pollution', 'water pollution',
  'soil contamination', 'deforestation', 'desertification',
  'biodiversity loss', 'extinction', 'habitat destruction',
  'conservation', 'sustainability', 'renewable energy',
  'solar energy', 'wind energy', 'hydroelectric', 'biomass',
  'fossil fuel', 'carbon footprint', 'carbon sequestration',
  'ecosystem services', 'ecological footprint', 'carrying capacity',
  'water cycle', 'nitrogen cycle', 'carbon cycle', 'phosphorus cycle',
  'waste management', 'recycling', 'landfill', 'composting',
  'environmental impact assessment', 'environmental policy',
  'environmental law', 'environmental regulation',
  'wildlife management', 'endangered species', 'protected area',
  'marine biology', 'oceanography', 'coral reef', 'marine pollution',
  'environmental toxicology', 'bioaccumulation', 'biomagnification',
  'ecological succession', 'biome', 'wetland', 'watershed',
];

const ENVIRONMENTAL_SCIENCE_SUBDISCIPLINES = {
  climate: [
    'climate change', 'global warming', 'greenhouse gas',
    'carbon cycle', 'carbon footprint', 'paris agreement',
    'climate modeling', 'sea level rise',
  ],
  ecology: [
    'ecosystem', 'biodiversity', 'conservation', 'habitat',
    'ecological succession', 'food web', 'carrying capacity',
    'endangered species', 'protected area',
  ],
  pollution: [
    'air pollution', 'water pollution', 'soil contamination',
    'waste management', 'recycling', 'environmental toxicology',
    'bioaccumulation', 'heavy metal', 'remediation',
  ],
  energy: [
    'renewable energy', 'solar energy', 'wind energy',
    'fossil fuel', 'sustainability', 'energy efficiency',
    'nuclear energy', 'biofuel',
  ],
};

// ─── Agriculture ────────────────────────────────────────────────
const AGRICULTURE_KEYWORDS = [
  'crop production', 'crop science', 'agronomy', 'horticulture',
  'soil science', 'soil fertility', 'soil erosion', 'irrigation',
  'fertilizer', 'pesticide', 'herbicide', 'insecticide',
  'integrated pest management', 'biological control', 'crop rotation',
  'plant pathology', 'plant disease', 'fungicide', 'nematode',
  'seed technology', 'germination', 'hybrid', 'cultivar', 'variety',
  'animal husbandry', 'livestock', 'poultry', 'aquaculture',
  'breeding', 'genetics', 'crossbreeding', 'artificial insemination',
  'animal nutrition', 'feed', 'forage', 'pasture', 'silage',
  'agricultural economics', 'farm management', 'market price',
  'food security', 'food safety', 'post-harvest', 'storage',
  'agricultural extension', 'rural development', 'cooperative',
  'precision agriculture', 'gps farming', 'drone', 'remote sensing',
  'organic farming', 'sustainable agriculture', 'agroecology',
  'agroforestry', 'silviculture', 'watershed management',
  'dairy science', 'milk production', 'pasteurization',
  'farm mechanization', 'tractor', 'harvester', 'tillage',
];

const AGRICULTURE_SUBDISCIPLINES = {
  crop_science: [
    'crop production', 'agronomy', 'crop rotation', 'seed technology',
    'germination', 'hybrid', 'cultivar', 'plant pathology',
    'irrigation', 'fertilizer',
  ],
  soil_science: [
    'soil science', 'soil fertility', 'soil erosion', 'soil ph',
    'soil texture', 'soil organic matter', 'composting',
    'nutrient management',
  ],
  animal_science: [
    'animal husbandry', 'livestock', 'poultry', 'aquaculture',
    'breeding', 'animal nutrition', 'feed', 'dairy science',
    'artificial insemination',
  ],
  agricultural_economics: [
    'agricultural economics', 'farm management', 'market price',
    'food security', 'supply chain', 'cooperative',
    'rural development', 'agricultural policy',
  ],
};

// ─── Architecture ───────────────────────────────────────────────
const ARCHITECTURE_KEYWORDS = [
  'architectural design', 'building design', 'floor plan', 'elevation',
  'section drawing', 'perspective drawing', 'blueprint',
  'building code', 'zoning', 'setback', 'floor area ratio',
  'structural system', 'load-bearing', 'column', 'beam', 'slab',
  'foundation', 'roof structure', 'curtain wall', 'facade',
  'building materials', 'concrete', 'steel', 'timber', 'masonry',
  'glass', 'brick', 'stone', 'composite',
  'sustainable design', 'green building', 'leed', 'passive design',
  'energy efficiency', 'daylighting', 'natural ventilation',
  'urban planning', 'urban design', 'zoning', 'land use',
  'public space', 'streetscape', 'placemaking', 'transit-oriented',
  'interior design', 'space planning', 'ergonomics', 'lighting design',
  'acoustics', 'thermal comfort', 'indoor air quality',
  'architectural history', 'gothic', 'renaissance', 'baroque',
  'modernism', 'postmodernism', 'deconstructivism', 'brutalism',
  'parametric design', 'computational design', 'bim', 'revit',
  'site analysis', 'topography', 'orientation', 'climate response',
  'building services', 'hvac', 'plumbing', 'electrical system',
];

const ARCHITECTURE_SUBDISCIPLINES = {
  design: [
    'architectural design', 'building design', 'floor plan',
    'elevation', 'section drawing', 'perspective', 'concept design',
    'schematic design', 'design development',
  ],
  technology: [
    'structural system', 'building materials', 'construction method',
    'foundation', 'roof structure', 'curtain wall',
    'building services', 'hvac', 'building code',
  ],
  sustainability: [
    'sustainable design', 'green building', 'leed', 'passive design',
    'energy efficiency', 'daylighting', 'natural ventilation',
    'solar design', 'rainwater harvesting',
  ],
  urban: [
    'urban planning', 'urban design', 'zoning', 'land use',
    'public space', 'streetscape', 'transit-oriented',
    'master plan', 'mixed-use development',
  ],
  history: [
    'architectural history', 'gothic', 'renaissance', 'baroque',
    'modernism', 'postmodernism', 'deconstructivism',
    'art deco', 'art nouveau', 'bauhaus',
  ],
};

// ═══════════════════════════════════════════════════════════════
//  Domain registry — all domains in one place for clean iteration
// ═══════════════════════════════════════════════════════════════

const DOMAINS = {
  law:                   { keywords: LAW_KEYWORDS,                   subdisciplines: LAW_SUBDISCIPLINES },
  engineering:           { keywords: ENGINEERING_KEYWORDS,           subdisciplines: ENGINEERING_SUBDISCIPLINES },
  medicine:              { keywords: MEDICINE_KEYWORDS,              subdisciplines: MEDICINE_SUBDISCIPLINES },
  computer_science:      { keywords: COMPUTER_SCIENCE_KEYWORDS,      subdisciplines: COMPUTER_SCIENCE_SUBDISCIPLINES },
  mathematics:           { keywords: MATHEMATICS_KEYWORDS,           subdisciplines: MATHEMATICS_SUBDISCIPLINES },
  physics:               { keywords: PHYSICS_KEYWORDS,               subdisciplines: PHYSICS_SUBDISCIPLINES },
  chemistry:             { keywords: CHEMISTRY_KEYWORDS,             subdisciplines: CHEMISTRY_SUBDISCIPLINES },
  biology:               { keywords: BIOLOGY_KEYWORDS,               subdisciplines: BIOLOGY_SUBDISCIPLINES },
  economics:             { keywords: ECONOMICS_KEYWORDS,             subdisciplines: ECONOMICS_SUBDISCIPLINES },
  accounting:            { keywords: ACCOUNTING_KEYWORDS,            subdisciplines: ACCOUNTING_SUBDISCIPLINES },
  psychology:            { keywords: PSYCHOLOGY_KEYWORDS,            subdisciplines: PSYCHOLOGY_SUBDISCIPLINES },
  nursing:               { keywords: NURSING_KEYWORDS,               subdisciplines: NURSING_SUBDISCIPLINES },
  pharmacy:              { keywords: PHARMACY_KEYWORDS,              subdisciplines: PHARMACY_SUBDISCIPLINES },
  business:              { keywords: BUSINESS_KEYWORDS,              subdisciplines: BUSINESS_SUBDISCIPLINES },
  political_science:     { keywords: POLITICAL_SCIENCE_KEYWORDS,     subdisciplines: POLITICAL_SCIENCE_SUBDISCIPLINES },
  history:               { keywords: HISTORY_KEYWORDS,               subdisciplines: HISTORY_SUBDISCIPLINES },
  sociology:             { keywords: SOCIOLOGY_KEYWORDS,             subdisciplines: SOCIOLOGY_SUBDISCIPLINES },
  philosophy:            { keywords: PHILOSOPHY_KEYWORDS,            subdisciplines: PHILOSOPHY_SUBDISCIPLINES },
  education:             { keywords: EDUCATION_KEYWORDS,             subdisciplines: EDUCATION_SUBDISCIPLINES },
  environmental_science: { keywords: ENVIRONMENTAL_SCIENCE_KEYWORDS, subdisciplines: ENVIRONMENTAL_SCIENCE_SUBDISCIPLINES },
  agriculture:           { keywords: AGRICULTURE_KEYWORDS,           subdisciplines: AGRICULTURE_SUBDISCIPLINES },
  architecture:          { keywords: ARCHITECTURE_KEYWORDS,          subdisciplines: ARCHITECTURE_SUBDISCIPLINES },
};

/**
 * Detect the subject domain of document text.
 * Returns { domain, subdisciplines, hitCount } or null if no specialized domain detected.
 *
 * @param {string} text - Document text (or first ~10K chars)
 * @returns {{ domain: string, subdisciplines: string[], hitCount: number } | null}
 */
function detectSubjectDomain(text) {
  if (!text) return null;

  const sample = text.slice(0, 10000).toLowerCase();
  const MIN_HITS = 3;
  const results = [];

  for (const [domain, { keywords, subdisciplines: subMap }] of Object.entries(DOMAINS)) {
    const hits = keywords.filter(kw => sample.includes(kw));
    if (hits.length >= MIN_HITS) {
      const subdisciplines = detectSubdisciplines(sample, subMap);
      results.push({ domain, subdisciplines, hitCount: hits.length });
    }
  }

  if (results.length === 0) return null;

  // Return the domain with the most keyword hits
  results.sort((a, b) => b.hitCount - a.hitCount);
  return results[0];
}

/**
 * Detect subdisciplines within a domain.
 */
function detectSubdisciplines(sample, subdisciplineMap) {
  const detected = [];
  for (const [name, keywords] of Object.entries(subdisciplineMap)) {
    const hits = keywords.filter(kw => sample.includes(kw));
    if (hits.length >= 2) {
      detected.push(name);
    }
  }
  return detected;
}

module.exports = { detectSubjectDomain, DOMAINS };
