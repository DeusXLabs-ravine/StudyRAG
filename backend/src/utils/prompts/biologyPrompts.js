/**
 * Biology & Biological Sciences — Depth Prompt Builder
 *
 * Provides discipline-specific depth instructions that get injected into
 * StudyRAG's module generation, quiz generation, flashcard generation,
 * and tutor chat prompts.
 *
 * Supported subdisciplines (detected by subjectDetector.js):
 *   cell_biology, genetics, ecology, molecular_biology, evolution
 *
 * Each builder function receives the array of detected subdisciplines and
 * returns a single string block that is concatenated into the relevant
 * base prompt, replacing or augmenting the generic depth instructions.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Subdiscipline-specific module generation blocks
// ─────────────────────────────────────────────────────────────────────────────

const CELL_BIOLOGY_MODULE_BLOCK = `
CELL BIOLOGY-SPECIFIC DEPTH REQUIREMENTS:
- Organelle structure-function relationships:
  a) For each organelle: ultrastructure (membrane composition, internal architecture), molecular components, and specific functions
  b) Membrane systems: lipid bilayer composition (phospholipids, cholesterol, glycolipids), integral vs peripheral proteins, lipid rafts, membrane asymmetry
  c) Endomembrane system: ER (rough vs smooth), Golgi apparatus (cis, medial, trans cisternae), vesicular transport (COPI, COPII, clathrin-coated vesicles), lysosomes, peroxisomes — trace the secretory and endocytic pathways
  d) Mitochondria and chloroplasts: double-membrane structure, cristae/thylakoid organization, genome and semi-autonomous replication, endosymbiotic origin evidence
- Membrane transport mechanisms:
  a) Passive transport: simple diffusion (Fick's law), facilitated diffusion (channel proteins — gated vs ungated, carrier proteins — GLUT transporters, aquaporins)
  b) Active transport: primary (Na+/K+-ATPase — 3Na+ out, 2K+ in per ATP, Ca2+-ATPase, H+/K+-ATPase) and secondary (symport — SGLT1, antiport — Na+/H+ exchanger)
  c) Bulk transport: endocytosis (phagocytosis, pinocytosis, receptor-mediated — clathrin pathway), exocytosis (constitutive vs regulated)
  d) Electrochemical gradients: Nernst equation, Goldman equation, resting membrane potential generation
- Signaling pathways:
  a) Signal transduction components: ligand, receptor (GPCR, RTK, ion channel, nuclear receptor), transducer, effector, second messengers (cAMP, IP3/DAG, Ca2+, cGMP)
  b) GPCR signaling: G-protein cycle (GDP/GTP exchange), adenylyl cyclase/cAMP/PKA pathway, phospholipase C/IP3/DAG/PKC pathway
  c) Receptor tyrosine kinase signaling: dimerization, autophosphorylation, Ras-MAPK cascade, PI3K-Akt pathway
  d) Signal amplification, integration, and termination mechanisms (phosphatases, GTPase activity, receptor internalization)
- Cell cycle regulation with checkpoints:
  a) Cell cycle phases: G1, S, G2, M — molecular events in each phase
  b) Cyclin-CDK complexes: cyclin D/CDK4,6 (G1), cyclin E/CDK2 (G1/S), cyclin A/CDK2 (S), cyclin B/CDK1 (M) — activation and inactivation mechanisms
  c) Checkpoints: G1/S (restriction point — Rb/E2F pathway, p53/p21 response to DNA damage), intra-S (ATR-Chk1), G2/M (ATM-Chk2, CDC25 phosphatase), spindle assembly checkpoint (Mad2, BubR1, APC/C activation)
  d) Apoptosis: intrinsic (mitochondrial — Bcl-2 family, cytochrome c, caspase-9) vs extrinsic (death receptor — Fas/FasL, TNF, caspase-8) pathways, execution caspases (caspase-3, -6, -7)`;

const GENETICS_MODULE_BLOCK = `
GENETICS-SPECIFIC DEPTH REQUIREMENTS:
- Mendelian genetics with quantitative analysis:
  a) Monohybrid and dihybrid crosses: construct Punnett squares, calculate expected phenotypic and genotypic ratios (3:1, 9:3:3:1, 1:2:1, etc.)
  b) Extensions of Mendelian genetics: incomplete dominance (1:2:1 phenotypic ratio), codominance (e.g., ABO blood groups — IA, IB, i alleles), multiple alleles, pleiotropy, epistasis (types: recessive 9:3:4, dominant 12:3:1, duplicate 15:1, complementary 9:7)
  c) Chi-square (X2) analysis: observed vs expected ratios, degrees of freedom calculation (n-1), p-value interpretation (reject null if p < 0.05), worked examples with complete calculation steps
  d) Pedigree analysis: autosomal dominant, autosomal recessive, X-linked dominant, X-linked recessive, mitochondrial — characteristic patterns and probability calculations
- Population genetics:
  a) Hardy-Weinberg equilibrium: p2 + 2pq + q2 = 1 and p + q = 1, assumptions (large population, random mating, no mutation, no migration, no selection)
  b) Calculations: given disease frequency (q2), calculate allele frequencies (p, q) and carrier frequency (2pq)
  c) Evolutionary forces that disrupt HW equilibrium: genetic drift, gene flow, mutation, non-random mating, natural selection — quantitative effect of each
- Epigenetic mechanisms:
  a) DNA methylation: CpG islands, DNMT enzymes, effect on gene expression (silencing), genomic imprinting (Prader-Willi vs Angelman syndrome), X-inactivation
  b) Histone modifications: acetylation (HATs — activation), deacetylation (HDACs — repression), methylation (context-dependent: H3K4me3 activation vs H3K27me3 repression), phosphorylation, ubiquitination
  c) Non-coding RNAs: miRNA (translational repression, mRNA degradation), siRNA (RNAi pathway), lncRNA (chromatin remodeling, transcriptional regulation)
  d) Transgenerational epigenetic inheritance: evidence and mechanisms
- Gene mapping:
  a) Linkage analysis: recombination frequency, centiMorgan (cM) distance, two-point and three-point crosses, coefficient of coincidence and interference
  b) LOD score analysis: logarithm of odds for human linkage studies, threshold of 3.0 for significance
  c) Physical mapping: FISH, restriction mapping, sequence-tagged sites (STS), genome sequencing approaches`;

const ECOLOGY_MODULE_BLOCK = `
ECOLOGY-SPECIFIC DEPTH REQUIREMENTS:
- Population ecology with mathematical models:
  a) Exponential growth: dN/dt = rN, where r = intrinsic rate of increase (r = b - d), doubling time = ln(2)/r, conditions favoring exponential growth (unlimited resources, no predation)
  b) Logistic growth: dN/dt = rN((K-N)/K), carrying capacity (K), inflection point at K/2 (maximum growth rate), density-dependent vs density-independent factors
  c) Life tables and survivorship curves: Type I (late loss — humans, large mammals), Type II (constant loss — some birds, rodents), Type III (early loss — marine invertebrates, plants), age-specific mortality (qx), life expectancy (ex)
  d) Metapopulation dynamics: source-sink populations, island biogeography theory (MacArthur-Wilson), extinction-colonization balance
- Energy flow and ecosystem energetics:
  a) Trophic levels: producers, primary consumers, secondary consumers, tertiary consumers, decomposers
  b) Energy transfer efficiency: 10% rule (Lindeman's efficiency), gross primary productivity (GPP) vs net primary productivity (NPP = GPP - respiration), assimilation efficiency, production efficiency, trophic efficiency
  c) Ecological pyramids: numbers, biomass, energy — explain inverted pyramids (aquatic ecosystems — biomass; parasitic food chains — numbers)
  d) Biogeochemical cycles: carbon cycle (photosynthesis, respiration, decomposition, fossil fuel combustion, ocean absorption), nitrogen cycle (fixation, nitrification, denitrification, ammonification, assimilation — key bacterial genera at each step), phosphorus cycle (weathering, sedimentation, no atmospheric phase)
- Species interactions:
  a) Competition: interspecific (+/-) — Lotka-Volterra competition equations, competitive exclusion principle (Gause), niche partitioning, character displacement
  b) Predation (+/-): Lotka-Volterra predator-prey model (oscillating populations), functional responses (Type I linear, Type II saturating, Type III sigmoidal), predator-prey coevolution (arms race)
  c) Mutualism (+/+): obligate vs facultative, examples (mycorrhizae, nitrogen-fixing bacteria, pollination), cheater problem
  d) Parasitism (+/-): ectoparasites vs endoparasites, parasite life cycles, host-parasite coevolution, parasitoid ecology
  e) Commensalism (+/0) and amensalism (-/0): examples and ecological significance
- Ecological succession:
  a) Primary succession: bare substrate (volcanic rock, glacial retreat) -> pioneer species (lichens, mosses) -> herbaceous plants -> shrubs -> trees -> climax community
  b) Secondary succession: disturbed site with existing soil -> faster progression, seed bank, remnant organisms
  c) Mechanisms: facilitation model, tolerance model, inhibition model
  d) Climax community concept: monoclimax vs polyclimax, disturbance ecology, intermediate disturbance hypothesis`;

const MOLECULAR_BIOLOGY_MODULE_BLOCK = `
MOLECULAR BIOLOGY-SPECIFIC DEPTH REQUIREMENTS:
- Central dogma — detailed molecular steps:
  a) DNA replication:
     - Origins of replication (oriC in E. coli, multiple origins in eukaryotes), replication fork formation
     - Enzymes: helicase (unwinds), topoisomerase (relieves tension), SSB proteins (stabilize), primase (RNA primer), DNA polymerase III (main synthesis, 5'->3', proofreading 3'->5' exonuclease), DNA polymerase I (primer removal, nick translation), ligase (seals nicks)
     - Leading strand (continuous) vs lagging strand (Okazaki fragments), semi-conservative replication (Meselson-Stahl experiment)
     - Eukaryotic differences: multiple DNA polymerases (alpha, delta, epsilon), telomere replication (telomerase — TERT + TERC), chromatin assembly
  b) Transcription:
     - Prokaryotic: sigma factor recognition of -10 (Pribnow box, TATAAT) and -35 promoter elements, RNA polymerase holoenzyme, elongation (no proofreading), termination (rho-dependent vs rho-independent/intrinsic)
     - Eukaryotic: RNA Pol I (rRNA), RNA Pol II (mRNA — TATA box, TFIID/TBP, general transcription factors, Mediator complex), RNA Pol III (tRNA, 5S rRNA)
     - Post-transcriptional processing: 5' capping (7-methylguanosine), 3' polyadenylation (AAUAAA signal, poly-A polymerase), splicing (spliceosome — U1, U2, U4, U5, U6 snRNPs, branch point, lariat intermediate), alternative splicing
  c) Translation:
     - Initiation: Shine-Dalgarno sequence (prokaryotes), Kozak sequence (eukaryotes), initiation factors (IF1, IF2, IF3 / eIF2, eIF4), Met-tRNAi, small subunit recruitment, AUG start codon recognition
     - Elongation: aminoacyl-tRNA binding (EF-Tu/GTP), peptide bond formation (peptidyl transferase — ribosomal RNA catalysis), translocation (EF-G/GTP), codon-anticodon wobble pairing
     - Termination: stop codons (UAA, UAG, UGA), release factors (RF1, RF2, RF3), ribosome recycling
     - Post-translational modifications: folding (chaperones — Hsp70, Hsp60/GroEL), glycosylation, phosphorylation, ubiquitination, signal peptide cleavage
- Gene regulation mechanisms:
  a) Prokaryotic: operon model — lac operon (negative inducible: repressor/inducer, positive regulation by CAP-cAMP), trp operon (negative repressible: repressor/corepressor, attenuation mechanism)
  b) Eukaryotic: chromatin remodeling (SWI/SNF complex), transcription factors (activators, repressors, enhancers, silencers, insulators), post-transcriptional regulation (mRNA stability, miRNA), epigenetic regulation
- Experimental techniques:
  a) PCR (polymerase chain reaction): components (template, primers, dNTPs, Taq polymerase), thermal cycling (denaturation 95C, annealing 50-65C, extension 72C), applications (amplification, cloning, diagnostics), variants (RT-PCR, qPCR/real-time PCR, nested PCR)
  b) Gel electrophoresis: agarose (DNA — size separation, ethidium bromide/SYBR staining, DNA ladder) vs SDS-PAGE (protein — denaturation, size-based migration, Coomassie/silver staining, Western blot transfer)
  c) CRISPR-Cas9: mechanism (guide RNA + Cas9 endonuclease, PAM sequence recognition, double-strand break, NHEJ vs HDR repair), applications (gene knockout, knock-in, gene editing, base editing, prime editing, CRISPRi/CRISPRa)
  d) Blotting: Southern (DNA), Northern (RNA), Western (protein) — probe types, hybridization principles
  e) Cloning: restriction enzymes, vectors (plasmid, phage, BAC, YAC), ligation, transformation, blue-white screening`;

const EVOLUTION_MODULE_BLOCK = `
EVOLUTION-SPECIFIC DEPTH REQUIREMENTS:
- Evidence for evolution — multiple lines:
  a) Fossil record: transitional forms (Tiktaalik — fish to tetrapod, Archaeopteryx — dinosaur to bird), stratigraphic correlation, radiometric dating methods (carbon-14, potassium-argon, uranium-lead), biostratigraphy
  b) Comparative anatomy: homologous structures (same origin, different function — vertebrate forelimb), analogous structures (different origin, same function — bat wing vs insect wing), vestigial structures (human appendix, whale pelvic bones), atavisms
  c) Molecular evidence: DNA/protein sequence similarity (cytochrome c, hemoglobin), universal genetic code, shared pseudogenes, endogenous retroviruses (ERVs), synteny (conserved gene order)
  d) Biogeography: continental distribution patterns, island biogeography (Darwin's finches, Hawaiian honeycreepers), Wallace's line
  e) Embryology: pharyngeal arches, post-anal tail, von Baer's laws, conserved developmental gene pathways (Hox genes)
  f) Direct observation: antibiotic resistance, peppered moth (Biston betularia), Darwin's finches beak size variation, experimental evolution (Lenski's E. coli long-term evolution experiment)
- Selection and fitness calculations:
  a) Fitness (w): relative reproductive success, w = 1 for most fit genotype, selection coefficient s = 1 - w
  b) Types of selection: directional (shifts mean), stabilizing (reduces variance), disruptive (increases variance, bimodal distribution), frequency-dependent (negative — rare advantage, positive — common advantage)
  c) Hardy-Weinberg with selection: delta-q calculations, rate of allele frequency change under selection against recessive homozygotes (slow) vs dominant phenotypes (faster)
  d) Sexual selection: intrasexual (male-male competition) vs intersexual (female choice), Fisherian runaway selection, handicap principle (Zahavi), sexual dimorphism
  e) Kin selection: Hamilton's rule (rB > C, where r = coefficient of relatedness, B = benefit to recipient, C = cost to altruist), inclusive fitness, eusociality explanation
- Phylogenetic tree construction:
  a) Methods: maximum parsimony (fewest evolutionary changes), maximum likelihood (statistical model of evolution), Bayesian inference, neighbor-joining (distance-based)
  b) Terminology: monophyletic (clade), paraphyletic, polyphyletic groups; synapomorphy (shared derived character), symplesiomorphy (shared ancestral), homoplasy (convergence/reversal)
  c) Tree reading: sister taxa, outgroup, root, branch length interpretation (substitutions per site or time), bootstrap values (>70% = strong support)
  d) Molecular phylogenetics: sequence alignment, substitution models (Jukes-Cantor, Kimura 2-parameter), gene trees vs species trees, incomplete lineage sorting, horizontal gene transfer complications
- Molecular clock:
  a) Principle: neutral mutations accumulate at a roughly constant rate over time, calibrated using fossil record or biogeographic events
  b) Calculation: divergence time = genetic distance / (2 x substitution rate), using synonymous substitutions (Ks) for closely related species
  c) Limitations: rate variation among lineages (generation time effect, metabolic rate effect), saturation at deep divergences, selection on "neutral" sites, relaxed molecular clock models
- Speciation:
  a) Allopatric: geographic isolation, genetic divergence, reproductive isolation — most common mode
  b) Sympatric: ecological or behavioral isolation without geographic barrier (cichlid fish in African lakes, apple maggot fly host race formation)
  c) Parapatric: partial geographic separation, hybrid zone dynamics (tension zone, reinforcement)
  d) Reproductive isolation mechanisms: prezygotic (temporal, habitat, behavioral, mechanical, gametic) vs postzygotic (hybrid inviability, hybrid sterility — Haldane's rule, hybrid breakdown)`;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Module Generation Depth Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the depth instructions injected into the module generation prompt
 * when biology/biological sciences content is detected.
 *
 * Replaces the generic "200-400 words" instruction with 600-1200 word
 * comprehensive scientific-depth content requirements.
 *
 * @param {string[]} subdisciplines - e.g. ['cell_biology', 'genetics', 'ecology']
 * @returns {string} Prompt section to inject
 */
function buildBiologyDepthSection(subdisciplines = []) {
  const subdisciplineBlocks = buildSubdisciplineModuleBlocks(subdisciplines);

  return `
BIOLOGY / BIOLOGICAL SCIENCES — ENHANCED DEPTH INSTRUCTIONS:
Override the default content length. Each module MUST contain 600-1200 words of substantive content. Surface-level summaries are unacceptable for biology education.

MANDATORY COVERAGE FOR EVERY BIOLOGICAL CONCEPT:
For each structure, process, mechanism, organism, or ecological concept covered in a module, you MUST address ALL of the following (where applicable to the topic):

a) STRUCTURE / MECHANISM:
   - Precise scientific definition with proper terminology
   - Structural components: molecular composition, physical arrangement, dimensional scale
   - For cellular structures: ultrastructure details visible at EM level, molecular constituents, membrane associations
   - For organisms: taxonomic classification, morphological features, habitat and niche
   - For ecological systems: components, boundaries, energy inputs and outputs

b) PROCESS STEPS:
   - Step-by-step mechanistic description from initiation to completion
   - Key molecules/enzymes/factors involved at each step with their specific roles
   - Energy requirements or yields at each step (ATP, NADH, FADH2 where relevant)
   - Temporal sequence: what happens first, what triggers the next step, and what terminates the process
   - Distinguish between prokaryotic and eukaryotic variations where applicable

c) REGULATION:
   - Positive and negative regulatory mechanisms at each control point
   - Feedback loops: identify negative feedback (homeostatic) and positive feedback (amplification) systems
   - Hormonal, allosteric, covalent modification, and transcriptional regulation where relevant
   - Environmental factors that modulate the process (temperature, pH, substrate concentration, light)

d) EXPERIMENTAL EVIDENCE:
   - Key experiments that established current understanding (name the experiment, researchers, year, and finding)
   - Experimental techniques used to study the process (microscopy type, assay, genetic approach)
   - Model organisms used and why (E. coli, yeast, Drosophila, C. elegans, Arabidopsis, mouse)
   - How disruption/mutation studies revealed function (knockout, knockdown, inhibitor studies)

e) APPLICATIONS:
   - Biotechnology applications: genetic engineering, pharmaceuticals, agriculture, bioremediation
   - Medical relevance: disease mechanisms, drug targets, diagnostic tools
   - Environmental applications: conservation, ecosystem management, climate science
   - Industrial applications where relevant (fermentation, biofuels, enzyme technology)

f) CONNECTIONS:
   - Molecular to cellular to organismal to ecosystem level connections
   - Cross-disciplinary links: how this concept connects to other subdisciplines of biology
   - Evolutionary significance: how this structure/process evolved and its adaptive value
   - Comparative biology: how this differs across taxa (bacteria vs plants vs animals)

STRUCTURAL TEMPLATE — present content in this order:
Structure/Mechanism -> Process Steps -> Regulation -> Experimental Evidence -> Applications -> Connections
${subdisciplineBlocks}
IMPORTANT: Every module must be anchored in the student's study material. Use these depth guidelines to ENHANCE the source content, not replace it. If the source material covers a topic briefly, expand it using these requirements. If the source material goes deeper in a specific area, preserve that depth.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Quiz / Question Generation Depth Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the depth instructions injected into quiz and question generation
 * prompts when biology content is detected.
 *
 * @param {string[]} subdisciplines - detected subdisciplines
 * @returns {string} Prompt section to inject
 */
function buildBiologyQuizDepthSection(subdisciplines = []) {
  const subdisciplineBlocks = buildSubdisciplineQuizBlocks(subdisciplines);

  return `
BIOLOGY / BIOLOGICAL SCIENCES — QUIZ DEPTH INSTRUCTIONS:
Questions MUST test scientific reasoning, experimental thinking, and application — NOT simple recall of isolated facts.

MANDATORY QUESTION FORMATS:
1. EXPERIMENTAL DESIGN QUESTIONS (at least 30% of questions):
   - Present an experimental scenario and ask about controls, variables, expected results, or interpretation
   - Format: "A researcher wants to test whether [hypothesis]. They set up an experiment where [setup]. What is the appropriate control for this experiment?" OR "What result would support the hypothesis?"
   - Include questions about independent variables, dependent variables, controlled variables, positive and negative controls
   - Ask students to design experiments: "Design an experiment to test whether [factor] affects [process]. Include your hypothesis, independent and dependent variables, controls, and expected results."

2. GENETICS PROBLEMS WITH CALCULATIONS:
   - Mendelian crosses requiring Punnett square construction and ratio prediction:
     "In a cross between a heterozygous tall pea plant (Tt) and a homozygous short plant (tt), what fraction of the offspring are expected to be tall?"
   - Chi-square analysis: provide observed data and expected ratios, ask students to calculate X2 and determine if the deviation is significant
   - Hardy-Weinberg problems: "In a population where 16% of individuals show the recessive phenotype, what is the frequency of heterozygous carriers?"
   - Pedigree analysis: present a pedigree and ask for inheritance pattern identification and probability calculations
   - Gene mapping: provide recombination frequencies and ask for gene order and map distances

3. DIAGRAM INTERPRETATION QUESTIONS:
   - Describe or reference a biological diagram and ask for interpretation:
     "A diagram shows a cell with a large central vacuole, chloroplasts, and a cell wall. Which organelle is responsible for [process]?"
   - Process diagrams: "In a diagram of the electron transport chain, which complex pumps the most H+ ions across the inner mitochondrial membrane?"
   - Phylogenetic tree reading: "Based on the phylogenetic tree shown, which two species share the most recent common ancestor?"
   - Graph interpretation: population growth curves, enzyme kinetics plots (Michaelis-Menten, Lineweaver-Burk), survivorship curves

4. PROCESS ORDERING QUESTIONS:
   - Present steps of a biological process in scrambled order and ask for correct sequence:
     "Arrange the following steps of DNA replication in the correct order: (A) Okazaki fragment synthesis, (B) Helicase unwinds DNA, (C) Primase synthesizes RNA primer, (D) Ligase seals nicks, (E) DNA Pol III extends"
   - Ask what happens if a specific step is blocked or an enzyme is inhibited:
     "If a mutation inactivates the enzyme primase, which step of DNA replication would be directly affected, and what would be the consequence?"

5. HYPOTHESIS TESTING AND DATA ANALYSIS:
   - Present experimental data (tables, described graphs) and ask students to draw conclusions
   - Ask students to evaluate whether data supports or refutes a given hypothesis
   - Include questions about statistical significance, sample size, and experimental validity
   - "A student measures the rate of photosynthesis at five different light intensities. The results show increasing O2 production from 0 to 500 lux, then a plateau from 500 to 1000 lux. What factor is most likely limiting photosynthesis above 500 lux?"

MCQ DISTRACTOR QUALITY:
- Every distractor must be a plausible biological concept, a common misconception, or a closely related but incorrect answer
- Avoid obviously absurd options
- Include at least one "close distractor" that tests nuanced understanding (e.g., confusing transcription with translation, or mitosis with meiosis)
- Explanations must explain why EACH incorrect option is wrong, not just why the correct answer is right
- For calculation questions, include common arithmetic errors as distractors
${subdisciplineBlocks}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tutor Chat Depth Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the depth instructions injected into the tutor chat prompt
 * when biology content is detected.
 *
 * @param {string[]} subdisciplines - detected subdisciplines
 * @returns {string} Prompt section to inject
 */
function buildBiologyTutorDepthSection(subdisciplines = []) {
  const subdisciplineBlocks = buildSubdisciplineTutorBlocks(subdisciplines);

  return `
BIOLOGY / BIOLOGICAL SCIENCES — TUTOR DEPTH INSTRUCTIONS:
You are tutoring a biology/biological sciences student. Apply these rules to ALL responses:

1. STRUCTURE-FUNCTION REASONING FIRST:
   When explaining any biological structure, molecule, or organelle, ALWAYS establish the structure-function relationship BEFORE discussing processes.
   - Start with "What is it made of?" then "How does its structure enable its function?"
   - Example: "The inner mitochondrial membrane is highly folded into cristae — this increases surface area for the electron transport chain proteins, maximizing ATP production. The membrane is rich in cardiolipin, which is impermeable to ions, maintaining the proton gradient essential for chemiosmosis."
   - Structure: Structure -> Function -> Process -> Regulation -> Connections

2. EXPERIMENTAL EVIDENCE BEFORE CONCLUSIONS:
   When presenting biological facts or accepted models, ALWAYS explain HOW we know this — cite the key experiment or evidence:
   - "We know DNA replication is semi-conservative because of the Meselson-Stahl experiment (1958): they grew E. coli in 15N-labeled medium, then shifted to 14N. After one generation, ALL DNA was intermediate density (ruling out conservative replication). After two generations, half was intermediate and half was light (ruling out dispersive)."
   - "The fluid mosaic model of membrane structure was supported by the Frye-Edidin experiment (1970): human and mouse cells were fused, and fluorescently-labeled membrane proteins intermixed within 40 minutes at 37C, demonstrating that membrane proteins are mobile."
   - Teach students to think like scientists: "What experiment would you design to test this?"

3. ALWAYS CONNECT MOLECULAR TO ORGANISMAL LEVEL:
   Never explain molecular biology in isolation — always connect upward to the whole organism and downward to the atomic/molecular details:
   - Use the chain: Molecular -> Cellular -> Tissue -> Organ -> Organismal -> Population -> Ecosystem
   - Example: "A single point mutation in the HBB gene (molecular) causes hemoglobin to polymerize under low O2 (protein), which deforms red blood cells into sickle shape (cellular), blocking capillaries (tissue), causing organ damage in spleen and kidneys (organ), producing pain crises and anemia in the patient (organismal), and — remarkably — providing malaria resistance to heterozygous carriers, maintaining the allele at high frequency in malaria-endemic regions (population)."
   - When discussing ecology, connect downward: "Eutrophication (ecosystem) occurs because excess phosphorus/nitrogen (molecular) stimulates algal growth (organismal), creating dense blooms that block light (community), causing submerged plant death, then bacterial decomposition depletes dissolved O2 (ecosystem), killing fish (population)."

4. QUANTITATIVE REASONING:
   - Whenever discussing biological processes, include relevant equations and calculations:
     * Population growth: dN/dt = rN (exponential), dN/dt = rN((K-N)/K) (logistic)
     * Genetics: Hardy-Weinberg (p2 + 2pq + q2 = 1), chi-square analysis
     * Energetics: ATP yield calculations, ecological efficiency (10% rule)
     * Evolution: fitness (w), selection coefficient (s = 1-w), Hamilton's rule (rB > C)
   - Walk through calculations step by step when relevant to the question

5. COMPARATIVE AND EVOLUTIONARY THINKING:
   - When explaining any structure or process, compare across taxa:
     "Both prokaryotes and eukaryotes transcribe DNA to RNA, but eukaryotes use three RNA polymerases (I, II, III) while prokaryotes use one. Eukaryotic mRNA undergoes processing (5' cap, 3' poly-A tail, splicing) — prokaryotic mRNA does not, and can be translated while still being transcribed (coupled transcription-translation)."
   - Always ask: "Why did this evolve?" and "What selective advantage does it confer?"
   - Use homology and analogy to deepen understanding

6. VISUAL AND DIAGRAMMATIC THINKING:
   - Encourage spatial reasoning about biological structures:
     "Imagine you are an mRNA molecule being translated — you enter the ribosome at the A site, the growing polypeptide is attached to the tRNA in the P site, and empty tRNAs exit from the E site."
   - Use comparison tables (in markdown) for related structures, processes, or organisms
   - Describe what students would see under different microscopy types (light, TEM, SEM, fluorescence)

7. COMMON MISCONCEPTIONS:
   - Actively address and correct common biology misconceptions:
     * "Evolution does NOT mean 'improvement' — it means change in allele frequencies over time. Organisms do not evolve toward a goal."
     * "Dominant alleles are NOT more common than recessive alleles — dominance describes the phenotype of heterozygotes, not allele frequency."
     * "Humans did NOT evolve FROM chimpanzees — humans and chimpanzees share a common ancestor that lived approximately 6-7 million years ago."
   - When a student's question implies a misconception, address it directly but kindly

8. PROCESS TRACING:
   When a student asks about any biological process, trace it COMPLETELY from start to finish:
   - Name every key enzyme, molecule, and intermediate
   - Specify where in the cell each step occurs
   - Note energy inputs and outputs at each step
   - Identify the rate-limiting step and its regulation
   - Example: Do not just say "glycolysis produces pyruvate" — trace all 10 steps, identifying the three irreversible regulatory steps (hexokinase, PFK-1, pyruvate kinase) and the net yield (2 ATP, 2 NADH, 2 pyruvate per glucose)
${subdisciplineBlocks}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — assemble subdiscipline-specific blocks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map of subdiscipline names to their module-generation depth blocks.
 */
const SUBDISCIPLINE_MODULE_BLOCKS = {
  cell_biology: CELL_BIOLOGY_MODULE_BLOCK,
  genetics: GENETICS_MODULE_BLOCK,
  ecology: ECOLOGY_MODULE_BLOCK,
  molecular_biology: MOLECULAR_BIOLOGY_MODULE_BLOCK,
  evolution: EVOLUTION_MODULE_BLOCK,
};

/**
 * Build concatenated subdiscipline blocks for module generation.
 * If no subdisciplines detected, include a general note.
 *
 * @param {string[]} subdisciplines
 * @returns {string}
 */
function buildSubdisciplineModuleBlocks(subdisciplines) {
  if (!subdisciplines || subdisciplines.length === 0) {
    return `
SUBDISCIPLINE NOTE: No specific biology subdiscipline was strongly detected. Apply the general biology depth requirements above. If the content touches on cell biology, genetics, ecology, molecular biology, or evolution, apply the appropriate level of detail for that area.`;
  }

  const blocks = subdisciplines
    .filter((s) => SUBDISCIPLINE_MODULE_BLOCKS[s])
    .map((s) => SUBDISCIPLINE_MODULE_BLOCKS[s]);

  if (blocks.length === 0) return '';

  return `\n${blocks.join('\n')}`;
}

/**
 * Build concatenated subdiscipline blocks for quiz generation.
 *
 * @param {string[]} subdisciplines
 * @returns {string}
 */
function buildSubdisciplineQuizBlocks(subdisciplines) {
  const blocks = [];

  if (!subdisciplines || subdisciplines.length === 0) return '';

  if (subdisciplines.includes('cell_biology')) {
    blocks.push(`
CELL BIOLOGY QUIZ-SPECIFIC:
- Include questions requiring identification of organelles from described ultrastructure:
  "An electron micrograph shows a double-membraned organelle with inner membrane folds (cristae) and its own circular DNA. What is this organelle, and what is its primary function?"
- Include questions on transport mechanisms with quantitative reasoning:
  "The Na+/K+-ATPase pumps 3 Na+ out and 2 K+ in per ATP hydrolyzed. If a cell hydrolyzes 100 ATP molecules via this pump, what is the net change in intracellular charge?"
- Include signaling pathway questions testing cause-and-effect reasoning:
  "A mutation causes a G-protein to be unable to hydrolyze GTP. What is the effect on the downstream signaling pathway?"
- Include cell cycle questions testing checkpoint logic:
  "A cell has DNA damage detected in G1. Trace the molecular pathway from damage detection to cell cycle arrest, naming the key proteins involved."
- Test structure-function relationships: given a structure modification, predict the functional consequence`);
  }

  if (subdisciplines.includes('genetics')) {
    blocks.push(`
GENETICS QUIZ-SPECIFIC:
- Include Mendelian genetics problems requiring Punnett square construction:
  "In Drosophila, vestigial wings (vg) are recessive to normal wings (vg+). A cross between two heterozygous flies produces 120 offspring. How many are expected to have vestigial wings, and what is the chi-square value if 35 vestigial-winged flies are actually observed?"
- Include Hardy-Weinberg calculations:
  "Cystic fibrosis affects 1 in 2500 individuals in a population. Assuming Hardy-Weinberg equilibrium, calculate the carrier frequency. Show all steps."
- Include pedigree analysis with probability calculations:
  "A pedigree shows two unaffected parents with an affected son. The condition is autosomal recessive. If the couple has another child, what is the probability that the child will be a carrier?"
- Include epistasis and gene interaction problems:
  "In a dihybrid cross, the F2 ratio is 9:3:4 instead of 9:3:3:1. What type of gene interaction explains this ratio?"
- Include gene mapping questions:
  "Three-point cross data shows the following recombination frequencies: A-B = 12%, B-C = 7%, A-C = 5%. What is the gene order, and what is the coefficient of coincidence if 3 double crossovers were observed out of 1000 offspring?"
- Include epigenetics questions linking mechanism to phenotype`);
  }

  if (subdisciplines.includes('ecology')) {
    blocks.push(`
ECOLOGY QUIZ-SPECIFIC:
- Include population growth calculations:
  "A population of rabbits has an initial size of 100, a birth rate of 0.5 per capita per year, and a death rate of 0.1 per capita per year. What is the intrinsic rate of increase (r)? Assuming exponential growth, what is the population size after 3 years?"
- Include energy flow and efficiency calculations:
  "A grassland ecosystem receives 10,000 kcal/m2/yr of solar energy. If gross primary productivity is 1,000 kcal/m2/yr and plant respiration consumes 600 kcal/m2/yr, what is the net primary productivity? How much energy is available to secondary consumers?"
- Include species interaction interpretation:
  "Two species of barnacles occupy the intertidal zone. Species A is found only in the upper zone. When Species B is experimentally removed, Species A expands into the lower zone. What type of interaction is occurring, and what concept does this illustrate?"
- Include graph/data interpretation of population dynamics:
  "A graph shows two oscillating population curves offset by a quarter-cycle, with the prey peak preceding the predator peak. Explain this pattern using the Lotka-Volterra model."
- Include biogeochemical cycle questions:
  "In the nitrogen cycle, which bacterial genus converts ammonia (NH3) to nitrite (NO2-)? What is this process called?"
- Test application of ecological principles to conservation scenarios`);
  }

  if (subdisciplines.includes('molecular_biology')) {
    blocks.push(`
MOLECULAR BIOLOGY QUIZ-SPECIFIC:
- Include questions on central dogma processes requiring step-by-step reasoning:
  "A eukaryotic gene has 5 exons and 4 introns. The pre-mRNA is 8,000 nucleotides long. After splicing, the mature mRNA is 3,200 nucleotides (including 5' and 3' UTRs). The coding sequence is 2,400 nucleotides. How many amino acids are in the protein product (excluding the initial methionine that is cleaved)?"
- Include experimental technique questions:
  "A researcher performs gel electrophoresis on PCR products from three patients. Patient 1 shows a single band at 500 bp. Patient 2 shows two bands at 500 bp and 300 bp. Patient 3 shows a single band at 300 bp. If the 500 bp band represents the normal allele and a restriction enzyme cuts the mutant allele, what are the genotypes of each patient?"
- Include gene regulation questions requiring cause-and-effect reasoning:
  "In E. coli, a mutation in the lacI gene produces a repressor that cannot bind allolactose (the inducer). What is the effect on lac operon expression in the presence and absence of lactose?"
- Include CRISPR and gene editing scenario questions:
  "A researcher uses CRISPR-Cas9 to knock out a gene. The guide RNA is designed to target exon 3. After editing, some cells show a 2-bp deletion at the target site. Explain why this deletion likely results in a non-functional protein."
- Include questions comparing prokaryotic and eukaryotic molecular processes
- Test understanding of experimental controls and interpretation of blotting results`);
  }

  if (subdisciplines.includes('evolution')) {
    blocks.push(`
EVOLUTION QUIZ-SPECIFIC:
- Include fitness and selection coefficient calculations:
  "In a population, genotype AA has fitness w = 1.0, Aa has w = 0.9, and aa has w = 0.7. What is the selection coefficient against the aa genotype? If the current frequency of allele a is 0.3, what is the expected frequency after one generation of selection?"
- Include phylogenetic tree reading and interpretation:
  "A phylogenetic tree shows: ((Human, Chimpanzee), Gorilla), Orangutan). Based on this tree, which species is the outgroup? Which two species are sister taxa? Does this tree indicate that gorillas evolved from chimpanzees?"
- Include evidence-based reasoning questions:
  "Two species of butterfly have similar wing coloration patterns. Species A is toxic and Species B is palatable. What type of mimicry is this? What selective pressure maintains the resemblance?"
- Include molecular clock calculations:
  "Two species diverged 10 million years ago. Their cytochrome c proteins differ by 20 amino acid substitutions. A third species diverged from their common ancestor 25 million years ago. How many amino acid differences would you predict between species 1 and species 3?"
- Include speciation mechanism identification:
  "Two populations of a fish species are separated by a waterfall. After 10,000 years, they can no longer interbreed when brought together in the lab. What type of speciation is this? What type of reproductive isolation is demonstrated?"
- Include Hamilton's rule and kin selection calculations:
  "A ground squirrel gives an alarm call when a predator approaches. The caller has a 10% chance of being killed (cost C = 0.1). The alarm saves, on average, 3 siblings (r = 0.5 each) from a 20% chance of death (B = 0.2 each). Does Hamilton's rule predict this behavior should evolve? Show your calculation."`);
  }

  return blocks.length > 0 ? `\n${blocks.join('\n')}` : '';
}

/**
 * Build concatenated subdiscipline blocks for tutor chat.
 *
 * @param {string[]} subdisciplines
 * @returns {string}
 */
function buildSubdisciplineTutorBlocks(subdisciplines) {
  const blocks = [];

  if (!subdisciplines || subdisciplines.length === 0) return '';

  if (subdisciplines.includes('cell_biology')) {
    blocks.push(`
CELL BIOLOGY TUTORING APPROACH:
- When explaining organelles, ALWAYS use the structure-function framework:
  Structure (molecular composition, ultrastructure) -> Function (what it does) -> Mechanism (how it does it) -> Regulation (what controls it)
- For membrane transport: always specify the type (passive/active), the direction relative to the concentration gradient, the energy source, and the specific transporter protein
  Example: "Glucose enters intestinal epithelial cells via SGLT1 — a sodium-glucose symporter on the apical membrane. This is SECONDARY active transport: the Na+ gradient (maintained by the basolateral Na+/K+-ATPase) drives glucose uptake against its concentration gradient. Glucose then exits the cell via GLUT2 on the basolateral membrane by facilitated diffusion."
- For signaling pathways: trace the COMPLETE pathway from ligand binding to cellular response, naming every intermediate
  Example: "EGF binds the EGFR (receptor tyrosine kinase) -> receptor dimerization -> autophosphorylation -> GRB2 adaptor protein binds via SH2 domain -> SOS (GEF) activates Ras by exchanging GDP for GTP -> Ras activates Raf (MAPKKK) -> Raf phosphorylates MEK (MAPKK) -> MEK phosphorylates ERK (MAPK) -> ERK enters nucleus -> activates transcription factors (Fos, Jun) -> cell proliferation"
- For cell cycle: always connect molecular regulators to clinical relevance — "Loss of p53 function removes the G1/S checkpoint, allowing cells with DNA damage to replicate — this is why TP53 is mutated in >50% of human cancers"
- Use the experimental evidence approach: cite key experiments (e.g., cell fractionation, fluorescence microscopy, electron microscopy, patch clamp) that revealed our understanding`);
  }

  if (subdisciplines.includes('genetics')) {
    blocks.push(`
GENETICS TUTORING APPROACH:
- ALWAYS work through genetics problems step-by-step with the student:
  1) Identify the alleles and dominance relationship
  2) Determine parental genotypes
  3) Construct the Punnett square or branch diagram
  4) Calculate expected ratios
  5) Apply chi-square if observed data is provided
- For Hardy-Weinberg problems, walk through the algebra explicitly:
  "If 16% are affected (q2 = 0.16), then q = 0.4, p = 0.6, carrier frequency 2pq = 2(0.6)(0.4) = 0.48 = 48%"
- When explaining epigenetics, ALWAYS distinguish from genetic changes:
  "Epigenetic changes alter gene EXPRESSION without changing the DNA SEQUENCE. A methylated CpG island silences a gene, but the underlying nucleotide sequence is unchanged — this is reversible, unlike a mutation."
- For pedigree analysis, teach the systematic approach:
  1) Check for affected females (if none, consider X-linked)
  2) Check if affected individuals have unaffected parents (if yes, recessive)
  3) Check for father-to-son transmission (if yes, autosomal, not X-linked)
  4) Calculate probabilities for specific individuals
- Use comparative genetics: "Mendel worked with pea plants, but these same principles apply to human genetic diseases — cystic fibrosis follows autosomal recessive inheritance, just like Mendel's wrinkled peas (rr)"`);
  }

  if (subdisciplines.includes('ecology')) {
    blocks.push(`
ECOLOGY TUTORING APPROACH:
- When explaining population dynamics, ALWAYS include the mathematical model:
  "Exponential growth occurs when resources are unlimited: dN/dt = rN. This gives a J-shaped curve. But in nature, resources are limited, so populations follow logistic growth: dN/dt = rN((K-N)/K). As N approaches K (carrying capacity), the growth rate approaches zero — the curve is S-shaped (sigmoidal)."
- For energy flow, trace the path quantitatively:
  "Sun (1,000,000 kcal) -> producers capture 1% (10,000 kcal GPP) -> minus respiration (6,000 kcal) = 4,000 kcal NPP -> primary consumers assimilate ~10% (400 kcal) -> secondary consumers get ~10% (40 kcal) -> tertiary consumers get ~10% (4 kcal)"
- For species interactions, always provide concrete examples AND the underlying mechanism:
  "Mycorrhizal fungi form mutualistic associations with ~90% of plant species. The fungal hyphae extend the root's absorptive surface area by 10-1000x, improving phosphorus uptake. In return, the plant provides the fungus with glucose from photosynthesis. This is obligate mutualism for many plant species — seedlings without mycorrhizae often fail to establish."
- Connect ecology to evolution: "Competitive exclusion drives niche partitioning — and niche partitioning drives adaptive radiation. Darwin's finches are a perfect example: competition for seeds drove divergence in beak size and shape."
- Address scale: help students distinguish between population, community, ecosystem, and biome-level processes
- Use real-world conservation examples to make ecological principles concrete`);
  }

  if (subdisciplines.includes('molecular_biology')) {
    blocks.push(`
MOLECULAR BIOLOGY TUTORING APPROACH:
- For the central dogma, ALWAYS trace the complete molecular pathway:
  DNA -> (replication) -> DNA
  DNA -> (transcription) -> RNA -> (translation) -> Protein
  RNA -> (reverse transcription) -> DNA (retroviruses)
  Emphasize: information flows from nucleic acid to protein, NEVER from protein to nucleic acid
- When explaining any molecular process, specify:
  a) WHERE in the cell it occurs (nucleus, cytoplasm, ER, mitochondria)
  b) WHAT enzymes/factors are required
  c) WHAT energy is consumed or produced
  d) HOW it is regulated
  e) WHAT happens if it goes wrong (disease connection)
- For experimental techniques, explain the PRINCIPLE before the procedure:
  "PCR works because DNA polymerase extends from a primer. By using two primers flanking your target sequence and cycling through denaturation (95C — strands separate), annealing (50-65C — primers bind), and extension (72C — polymerase extends), you double the number of target copies each cycle. After 30 cycles: 2^30 = ~1 billion copies from a single template."
- Compare prokaryotic and eukaryotic processes side by side:
  "Prokaryotic transcription and translation are COUPLED — the ribosome begins translating the mRNA while it is still being transcribed. In eukaryotes, transcription occurs in the nucleus and translation in the cytoplasm, separated by the nuclear envelope — this allows for mRNA processing (capping, splicing, polyadenylation) before translation."
- For CRISPR, connect the natural defense system to the biotechnology tool:
  "CRISPR evolved in bacteria as an adaptive immune system against phages. Scientists repurposed it: the guide RNA directs Cas9 to any complementary DNA sequence, where Cas9 cuts both strands. The cell's repair machinery then either disrupts the gene (NHEJ) or inserts a new sequence (HDR with a template)."`);
  }

  if (subdisciplines.includes('evolution')) {
    blocks.push(`
EVOLUTION TUTORING APPROACH:
- ALWAYS present multiple lines of evidence when discussing evolutionary claims:
  "We know birds evolved from theropod dinosaurs based on: (1) fossil evidence (Archaeopteryx with feathers AND teeth, clawed wings, bony tail), (2) comparative anatomy (hollow bones, furcula/wishbone), (3) molecular phylogenetics (birds nest within Dinosauria), (4) developmental biology (chicken embryos develop teeth-like structures when certain genes are activated)"
- For natural selection, use the four conditions framework:
  1) Variation exists in the population
  2) The variation is heritable
  3) There is differential reproduction (some variants produce more offspring)
  4) The variation is related to fitness (it affects survival/reproduction)
  "If ALL four conditions are met, allele frequencies WILL change — that IS evolution by natural selection."
- For fitness calculations, walk through the math explicitly:
  "If AA has 100 offspring (w = 1.0), Aa has 90 offspring (w = 0.9), and aa has 70 offspring (w = 0.7), the selection coefficient against aa is s = 1 - 0.7 = 0.3. This means aa individuals have a 30% fitness disadvantage."
- When discussing phylogenetics, teach tree-reading skills:
  "A common misconception is reading trees left-to-right as a progression. The key is the branching pattern — sister taxa share the most recent common ancestor. Trees can be rotated at any node without changing the relationships."
- Address teleological thinking directly:
  "Giraffes did not evolve long necks 'in order to' reach high leaves. Rather, individuals with slightly longer necks had better access to food, survived and reproduced more, and passed on the alleles for longer necks. The outcome looks purposeful, but the mechanism is blind variation + differential reproduction."
- Connect microevolution (population genetics) to macroevolution (speciation, adaptive radiation, mass extinction):
  "The same processes — mutation, selection, drift, gene flow — that change allele frequencies within populations (microevolution) can, given enough time and geographic isolation, lead to speciation (macroevolution)."`);
  }

  return blocks.length > 0 ? `\n${blocks.join('\n')}` : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  buildBiologyDepthSection,
  buildBiologyQuizDepthSection,
  buildBiologyTutorDepthSection,
};
