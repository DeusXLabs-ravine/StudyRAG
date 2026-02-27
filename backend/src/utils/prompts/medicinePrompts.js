/**
 * Medicine & Medical Sciences — Depth Prompt Builder
 *
 * Provides discipline-specific depth instructions that get injected into
 * StudyRAG's module generation, quiz generation, flashcard generation,
 * and tutor chat prompts.
 *
 * Supported subdisciplines (detected by subjectDetector.js):
 *   microbiology, mls, pharmacology, anatomy, pathology, biochemistry
 *
 * Each builder function receives the array of detected subdisciplines and
 * returns a single string block that is concatenated into the relevant
 * base prompt, replacing or augmenting the generic depth instructions.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Subdiscipline-specific module generation blocks
// ─────────────────────────────────────────────────────────────────────────────

const MICROBIOLOGY_MODULE_BLOCK = `
MICROBIOLOGY-SPECIFIC DEPTH REQUIREMENTS:
- Organism classification: morphology (shape, arrangement), Gram stain reaction, acid-fast status, motility, spore formation, and culture characteristics (colony morphology, hemolysis pattern, growth requirements, selective/differential media)
- Virulence factors: adhesins, invasins, toxins (endotoxin vs exotoxin — type, mechanism, clinical effect), immune evasion strategies (capsule, antigenic variation, intracellular survival), biofilm formation
- Pathogenic mechanisms: step-by-step from portal of entry → adherence → colonization → invasion → tissue damage → systemic spread (where applicable)
- Laboratory diagnosis:
  a) Specimen collection and transport requirements (timing, container, temperature)
  b) Direct examination: Gram stain, wet mount, India ink, KOH prep, acid-fast stain
  c) Culture: appropriate media (blood agar, MacConkey, chocolate agar, Sabouraud, Lowenstein-Jensen, etc.), incubation conditions (temperature, atmosphere, duration)
  d) Biochemical identification: catalase, coagulase, oxidase, urease, TSI, IMViC, etc.
  e) Serological and molecular methods: latex agglutination, ELISA, PCR, 16S rRNA sequencing
  f) Antimicrobial susceptibility: disk diffusion (Kirby-Bauer), MIC/MBC, E-test, automated systems
- Antimicrobial resistance: mechanisms (enzymatic inactivation, target modification, efflux pumps, permeability changes), genetic basis (plasmid-mediated, chromosomal, transposon), clinically important resistance patterns (MRSA, VRE, ESBL, CRE, MDR-TB)
- Prevention and control: vaccination (type of vaccine, schedule, efficacy), infection control measures (standard precautions, transmission-based precautions), chemoprophylaxis where applicable
- Include normal flora vs pathogen distinctions and opportunistic infection contexts`;

const MLS_MODULE_BLOCK = `
MEDICAL LABORATORY SCIENCE (MLS)-SPECIFIC DEPTH REQUIREMENTS:
- Analytical principles: explain the underlying principle behind each test method (e.g., spectrophotometry — Beer-Lambert law; immunoassay — antigen-antibody binding; electrophoresis — charge-based separation; flow cytometry — light scatter and fluorescence)
- Pre-analytical variables:
  a) Patient preparation (fasting, posture, time of collection, medication effects)
  b) Specimen collection: proper tube/container selection, order of draw, anticoagulant choice (EDTA, citrate, heparin, fluoride) and rationale
  c) Specimen transport: temperature, timing, light sensitivity
  d) Specimen processing: centrifugation parameters, aliquoting, storage conditions
- Analytical variables:
  a) Method calibration and standardization
  b) Precision (within-run, between-run) and accuracy (trueness)
  c) Linearity, analytical measurement range (AMR), and clinical reportable range (CRR)
  d) Interfering substances: hemolysis, lipemia, icterus, common drug interferences
  e) Sources of error: systematic vs random, proportional vs constant
- Post-analytical variables:
  a) Result validation: delta checks, critical value verification, correlation with clinical context
  b) Reference ranges: age-, sex-, and method-specific considerations
  c) Clinical significance: what abnormal high and abnormal low values indicate for each analyte
  d) Reflex testing protocols (when one result triggers additional testing)
- Quality control and quality assurance:
  a) Internal QC: Levey-Jennings charts, Westgard rules (1-2s, 1-3s, 2-2s, R-4s, 4-1s, 10x), QC material selection
  b) External QA: proficiency testing (PT), inter-laboratory comparison, accreditation standards (CAP, CLIA, ISO 15189)
  c) Method validation: precision, accuracy, linearity, sensitivity, specificity, reference range verification, comparison studies
- Correlation of results: connect related test results into diagnostic patterns (e.g., iron panel interpretation, liver function test patterns, coagulation cascade correlation, CBC + peripheral smear integration)`;

const PHARMACOLOGY_MODULE_BLOCK = `
PHARMACOLOGY-SPECIFIC DEPTH REQUIREMENTS:
- Drug classification: chemical class, pharmacological class, and therapeutic class; position within the drug family (prototype drug vs derivatives)
- Mechanism of action at the receptor/molecular level:
  a) Target identification: receptor type (GPCR, ion channel, enzyme, nuclear receptor, transporter)
  b) Binding characteristics: agonist, partial agonist, antagonist (competitive vs non-competitive), inverse agonist, allosteric modulator
  c) Signal transduction: second messenger systems (cAMP, IP3/DAG, Ca2+, cGMP), downstream effects
  d) Molecular targets for non-receptor drugs (enzyme inhibition, ion channel blockade, carrier molecule interference)
- Pharmacokinetics (ADME):
  a) Absorption: bioavailability (F), route-dependent factors, first-pass metabolism, factors affecting absorption (pH, lipophilicity, P-glycoprotein)
  b) Distribution: volume of distribution (Vd), plasma protein binding, tissue distribution, blood-brain barrier penetration, placental transfer
  c) Metabolism: Phase I (CYP450 enzymes — specify isoforms: CYP3A4, CYP2D6, CYP2C19, etc.) and Phase II (conjugation) reactions, prodrug activation, enzyme induction/inhibition
  d) Excretion: renal clearance, hepatic clearance, half-life (t1/2), steady-state calculations, dose adjustment in renal/hepatic impairment
- Dose-response relationships: potency (EC50), efficacy (Emax), therapeutic index (TI = TD50/ED50), graded vs quantal dose-response curves
- Adverse effects: classify by type (Type A — augmented/dose-dependent, Type B — bizarre/idiosyncratic, Type C — chronic, Type D — delayed), frequency, severity, and management
- Drug interactions:
  a) Pharmacokinetic interactions: absorption (chelation, pH alteration), distribution (protein binding displacement), metabolism (CYP450 induction/inhibition), excretion (renal tubular competition)
  b) Pharmacodynamic interactions: synergism, antagonism, additive effects
- Contraindications and precautions: absolute vs relative contraindications, pregnancy category, special populations (pediatric, geriatric, renal/hepatic impairment)
- Clinical indications: evidence-based indications with guideline references, off-label uses where well-established`;

const ANATOMY_MODULE_BLOCK = `
ANATOMY-SPECIFIC DEPTH REQUIREMENTS:
- Detailed structural relationships for each anatomical structure:
  a) For muscles: origin, insertion, action, innervation (nerve root level), and blood supply
  b) For nerves: root value, course, branches, motor and sensory distribution, clinical testing
  c) For vessels: origin, course, major branches, anastomoses, drainage territory
  d) For organs: location, relations (anterior, posterior, superior, inferior, medial, lateral), peritoneal/fascial coverings, blood supply (arterial and venous), lymphatic drainage, innervation (sympathetic and parasympathetic)
- Spatial relationships and clinical landmarks:
  a) Surface anatomy: palpable landmarks, surface markings of deep structures, clinical reference lines
  b) Topographic anatomy: layers from superficial to deep, compartmental organization
  c) Cross-sectional/imaging correlations: CT, MRI, and ultrasound appearance of key structures
- Developmental anatomy (embryology):
  a) Embryological origin (germ layer derivation, pharyngeal apparatus, somites, etc.)
  b) Key developmental stages and timing
  c) Congenital anomalies: mechanism of malformation, incidence, clinical presentation, associated anomalies
- Clinical anatomy:
  a) Surgical approaches: incision sites, layers encountered, structures at risk
  b) Common injury and disease patterns: fracture patterns and associated neurovascular injuries, herniation sites, compression/entrapment neuropathies
  c) Anatomical basis of clinical procedures: lumbar puncture, thoracentesis, central line placement, nerve blocks
  d) Anatomical basis of referred pain patterns
- Variation: clinically significant anatomical variations and their prevalence`;

const PATHOLOGY_MODULE_BLOCK = `
PATHOLOGY-SPECIFIC DEPTH REQUIREMENTS:
- Gross and microscopic features:
  a) Gross pathology: size, shape, color, consistency, cut surface appearance, relationship to surrounding tissue
  b) Histopathology: architectural pattern (glandular, solid, papillary, etc.), cellular features (nuclear size, shape, chromatin pattern, nucleoli, mitotic figures), stromal changes, special features (necrosis type, calcification, hyalinization)
  c) Special stains: PAS, Masson trichrome, Congo red, reticulin, Ziehl-Neelsen, GMS — when and why each is used
- Molecular pathogenesis:
  a) Genetic basis: oncogenes, tumor suppressors, DNA repair genes involved
  b) Epigenetic changes: methylation, histone modification
  c) Signaling pathway alterations: specify which pathways are activated/suppressed
  d) Chromosomal abnormalities: translocations, deletions, amplifications (with specific cytogenetic notation)
- Classification systems:
  a) WHO classification and grading (specify edition/year where relevant)
  b) TNM staging: T (tumor size/extent), N (nodal involvement), M (metastasis), with stage grouping
  c) Other system-specific grading: Gleason (prostate), Fuhrman/ISUP (renal), Bloom-Richardson (breast), etc.
- Immunohistochemistry (IHC) markers:
  a) Diagnostic markers: which markers confirm or exclude a diagnosis
  b) Panel approach: typical IHC panel for differential diagnosis workup
  c) Prognostic/predictive markers: ER/PR, HER2, Ki-67, PD-L1, mismatch repair proteins, etc.
- Prognostic factors: histological grade, stage, margin status, lymphovascular invasion, perineural invasion, molecular markers, patient factors (age, performance status)
- General pathological processes: cover the mechanisms of cell injury, inflammation (acute vs chronic), repair (regeneration vs fibrosis), hemodynamic disorders (edema, thrombosis, embolism, infarction), and neoplasia (benign vs malignant characteristics, metastatic pathways)`;

const BIOCHEMISTRY_MODULE_BLOCK = `
BIOCHEMISTRY-SPECIFIC DEPTH REQUIREMENTS:
- Detailed metabolic pathways:
  a) Every enzyme in the pathway with its full name and EC number where high-yield
  b) Substrates, products, and cofactors/coenzymes for each reaction (NAD+, FAD, CoA, TPP, PLP, biotin, tetrahydrofolate, etc.)
  c) Reaction type classification: oxidation-reduction, group transfer, hydrolysis, ligation, isomerization
  d) Energy yield: ATP produced or consumed at each step, net pathway yield
- Regulation:
  a) Rate-limiting step: identify the committed step and its regulatory enzyme
  b) Allosteric regulation: activators and inhibitors with rationale
  c) Covalent modification: phosphorylation/dephosphorylation, acetylation
  d) Hormonal regulation: insulin, glucagon, epinephrine, cortisol — specify which enzymes they regulate and by what mechanism (transcriptional, post-translational)
  e) Substrate availability and product inhibition
- Clinical significance:
  a) Inborn errors of metabolism: specific enzyme deficiency, inheritance pattern, accumulated substrate or deficient product, clinical features, diagnosis (enzyme assay, metabolite levels, genetic testing), management
  b) Acquired metabolic disorders: diabetes, metabolic syndrome, fatty liver — relate back to specific pathway defects
  c) Nutritional deficiencies: vitamin/cofactor deficiency → impaired enzyme function → clinical disease (e.g., thiamine deficiency → impaired pyruvate dehydrogenase → Wernicke encephalopathy)
- Integration of metabolic pathways:
  a) Fed state vs fasting state vs starvation: which pathways are active/suppressed and why
  b) Tissue-specific metabolism: liver, muscle, brain, adipose, RBCs — each has a distinct metabolic profile
  c) Interconnections: how glycolysis feeds into the TCA cycle, how amino acid catabolism feeds into gluconeogenesis, how fatty acid oxidation connects to ketogenesis
- Laboratory biomarkers:
  a) Enzyme markers: AST, ALT, GGT, ALP, CK, LDH — tissue source, clinical significance of elevation, isoenzyme differentiation
  b) Metabolite markers: glucose, HbA1c, lactate, ammonia, bilirubin (direct/indirect), uric acid — with reference ranges
  c) Lipid panel interpretation: total cholesterol, LDL, HDL, triglycerides, Lp(a) — clinical significance and risk stratification`;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Module Generation Depth Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the depth instructions injected into the module generation prompt
 * when medical/medical-sciences content is detected.
 *
 * Replaces the generic "200-400 words" instruction with 600-1200 word
 * comprehensive clinical-depth content requirements.
 *
 * @param {string[]} subdisciplines - e.g. ['microbiology', 'mls', 'pharmacology']
 * @returns {string} Prompt section to inject
 */
function buildMedicineDepthSection(subdisciplines = []) {
  const subdisciplineBlocks = buildSubdisciplineModuleBlocks(subdisciplines);

  return `
MEDICINE / MEDICAL SCIENCES — ENHANCED DEPTH INSTRUCTIONS:
Override the default content length. Each module MUST contain 600-1200 words of substantive content. Surface-level summaries are unacceptable for medical education.

MANDATORY COVERAGE FOR EVERY MEDICAL/CLINICAL CONCEPT:
For each disease, condition, organism, test, or clinical concept covered in a module, you MUST address ALL of the following (where applicable to the topic):

a) DEFINITION & CLASSIFICATION:
   - Precise clinical/scientific definition
   - Position within the classification system (e.g., ICD, WHO, taxonomy)

b) PATHOPHYSIOLOGY / MECHANISM (molecular -> cellular -> tissue -> organ -> systemic):
   - Start at the molecular/cellular level and build upward
   - Explain the chain of causation: trigger -> molecular event -> cellular response -> tissue damage -> organ dysfunction -> systemic manifestation
   - Include relevant biochemical and immunological mechanisms
   - For infectious diseases: organism characteristics, virulence factors, host-pathogen interaction

c) EPIDEMIOLOGY:
   - Incidence and prevalence (with approximate figures where well-established)
   - Demographics: age, sex, ethnicity, geographic distribution
   - Risk factors: modifiable and non-modifiable
   - Protective factors where applicable

d) CLINICAL FEATURES / PRESENTATION:
   - Symptoms: categorized as early/late, common/rare, typical/atypical
   - Signs: organized by examination system (inspection, palpation, percussion, auscultation)
   - Complications: immediate, short-term, long-term
   - Associated conditions and co-morbidities

e) DIAGNOSTIC APPROACH:
   - History: key questions to ask, important negatives
   - Physical examination: specific maneuvers and their significance
   - Investigations (ordered from basic to specialized):
     * Bedside: vitals, point-of-care tests
     * Laboratory: CBC, BMP/CMP, specific markers — include REFERENCE RANGES with units
     * Imaging: appropriate modality selection and expected findings
     * Confirmatory: gold standard tests, biopsy, genetic testing
   - Diagnostic criteria: use established criteria sets where they exist (e.g., Jones criteria, SLICC criteria, Duke criteria, Rome criteria)

f) MANAGEMENT / TREATMENT:
   - Non-pharmacological: lifestyle, diet, physiotherapy, counseling
   - Pharmacological: drug class, specific agents, mechanism of action, dosing considerations, duration
   - Surgical/interventional: indications, procedure overview, expected outcomes
   - Rationale for each intervention — explain WHY this treatment works based on pathophysiology
   - Monitoring: what to follow, how often, expected response timeline

g) PROGNOSIS & OUTCOMES:
   - Natural history if untreated
   - Expected outcomes with treatment
   - Prognostic factors (favorable and unfavorable)
   - Mortality/morbidity data where well-established

h) CLINICAL PEARLS & HIGH-YIELD EXAM POINTS:
   - "Classic presentations" and pathognomonic findings
   - Common examination pitfalls and frequently tested associations
   - Important differentiating features between look-alike conditions
   - Mnemonics where well-established ones exist

STRUCTURAL TEMPLATE — present content in this order:
Definition -> Mechanism/Pathophysiology -> Clinical Features -> Diagnosis -> Management -> Prognosis
${subdisciplineBlocks}
IMPORTANT: Every module must be anchored in the student's study material. Use these depth guidelines to ENHANCE the source content, not replace it. If the source material covers a topic briefly, expand it using these requirements. If the source material goes deeper in a specific area, preserve that depth.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Quiz / Question Generation Depth Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the depth instructions injected into quiz and question generation
 * prompts when medical content is detected.
 *
 * @param {string[]} subdisciplines - detected subdisciplines
 * @returns {string} Prompt section to inject
 */
function buildMedicineQuizDepthSection(subdisciplines = []) {
  const subdisciplineBlocks = buildSubdisciplineQuizBlocks(subdisciplines);

  return `
MEDICINE / MEDICAL SCIENCES — QUIZ DEPTH INSTRUCTIONS:
Questions MUST test clinical reasoning and application, NOT simple recall of isolated facts.

MANDATORY QUESTION FORMATS:
1. CLINICAL VIGNETTE / SCENARIO-BASED (at least 50% of questions):
   - Format: "A [age]-year-old [sex] presents with [symptoms] for [duration]. On examination, [findings]. Labs show [results with values and units]. What is the most likely diagnosis?"
   - Vignettes must include enough clinical detail to allow reasoning — not just one keyword
   - Include relevant positives AND negatives in the vignette
   - Vary the question stems: "most likely diagnosis", "best next step in management", "most appropriate initial investigation", "mechanism of action of the drug of choice", "most likely causative organism"

2. LAB RESULT INTERPRETATION:
   - Present a set of lab values (with reference ranges) and ask for interpretation
   - Example: "CBC shows Hb 7.2 g/dL (ref: 12-16), MCV 62 fL (ref: 80-100), MCHC 28 g/dL (ref: 32-36), RDW 18% (ref: 11.5-14.5). Serum iron 25 ug/dL (ref: 60-170), TIBC 450 ug/dL (ref: 250-370). What is the most likely diagnosis?"
   - Always include units and reference ranges in the question

3. MECHANISM / PATHOPHYSIOLOGY QUESTIONS:
   - Test understanding of WHY, not just WHAT
   - Example: "Which step in the pathogenesis of [disease] is directly targeted by [drug]?"
   - Connect basic science to clinical outcome

4. "MOST LIKELY" AND "BEST NEXT STEP" FORMAT:
   - Mirror the format used in USMLE, PLAB, NEET, and other medical licensing exams
   - All options should be plausible — distractors should be real differential diagnoses or management options for the described presentation, not obviously wrong choices
   - The correct answer should be the BEST answer among reasonable options, not the only possible answer

5. IMAGE/RESULT DESCRIPTION QUESTIONS (described textually):
   - Describe a microscopic finding, culture result, imaging finding, or ECG pattern in words
   - Example: "A peripheral blood smear shows microcytic hypochromic red cells with target cells and basophilic stippling. Hemoglobin electrophoresis shows elevated HbA2 at 5.8%. What is the diagnosis?"

MCQ DISTRACTOR QUALITY:
- Every distractor must be a plausible differential diagnosis, look-alike condition, or reasonable but suboptimal management choice
- Avoid obviously absurd options
- Include at least one "close distractor" that tests nuanced understanding
- Explanations must explain why EACH incorrect option is wrong, not just why the correct answer is right
${subdisciplineBlocks}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tutor Chat Depth Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the depth instructions injected into the tutor chat prompt
 * when medical content is detected.
 *
 * @param {string[]} subdisciplines - detected subdisciplines
 * @returns {string} Prompt section to inject
 */
function buildMedicineTutorDepthSection(subdisciplines = []) {
  const subdisciplineBlocks = buildSubdisciplineTutorBlocks(subdisciplines);

  return `
MEDICINE / MEDICAL SCIENCES — TUTOR DEPTH INSTRUCTIONS:
You are tutoring a medical/health sciences student. Apply these rules to ALL responses:

1. PATHOPHYSIOLOGY FIRST:
   When explaining any disease or condition, ALWAYS start with the pathophysiology/mechanism BEFORE listing clinical features. The student must understand WHY something happens before memorizing WHAT happens.
   Structure: Mechanism -> Clinical Features -> Diagnosis -> Management

2. SYSTEMATIC CLINICAL REASONING:
   - When discussing diagnosis: guide the student through the clinical reasoning framework:
     a) What is the presenting complaint? What are the key features?
     b) What is the differential diagnosis? (list at least 3-5 possibilities)
     c) What features help differentiate between the possibilities?
     d) What investigations would confirm/exclude each differential?
     e) What is the most likely diagnosis and why?
   - When discussing treatment: always explain the RATIONALE — link back to pathophysiology
     Example: "We use ACE inhibitors in diabetic nephropathy because they reduce intraglomerular pressure by dilating the efferent arteriole, which slows the progression of proteinuria."

3. LAB VALUES AND REFERENCE RANGES:
   - Whenever discussing investigations, include specific lab values with reference ranges
   - Explain what abnormal values indicate and the pathophysiological reason for the abnormality
   - Example: "Elevated AST (>40 U/L) and ALT (>56 U/L) indicate hepatocellular damage. An AST:ALT ratio >2:1 is suggestive of alcoholic liver disease because alcohol induces mitochondrial damage, releasing more AST."

4. CONNECT BASIC SCIENCE TO CLINICAL APPLICATION:
   - Always bridge the gap between theory and practice
   - Use phrases like: "This matters clinically because...", "In practice, this means...", "This is why patients with [condition] present with [symptom] — because at the molecular level..."
   - Never explain basic science in isolation — always tie it to a clinical scenario or patient outcome

5. CLINICAL REASONING ENCOURAGEMENT:
   - After providing an explanation, challenge the student with follow-up reasoning
   - "Given that this patient has [finding A] and [finding B], what does this pattern suggest about the underlying mechanism?"
   - "If the [lab value] was [different value] instead, how would that change your differential?"
   - "Why would [drug X] be preferred over [drug Y] in this specific situation?"

6. COMPLETE CLINICAL PICTURE:
   When a student asks about any condition, provide the COMPLETE picture systematically:
   Definition -> Etiology/Risk Factors -> Pathophysiology -> Clinical Features -> Diagnosis -> Management -> Complications -> Prognosis
   Do not leave gaps — if the student asks "What is [condition]?", they expect a thorough, structured answer, not a one-liner.

7. MNEMONICS AND MEMORY AIDS:
   Use well-established medical mnemonics where they exist:
   - Example: Causes of pancreatitis — "I GET SMASHED" (Idiopathic, Gallstones, Ethanol, Trauma, Steroids, Mumps, Autoimmune, Scorpion sting, Hyperlipidemia/Hypercalcemia/Hypothermia, ERCP, Drugs)
   - Only use widely recognized mnemonics — do not invent obscure ones
   - Explain what each letter stands for AND briefly explain each item

8. COMPARATIVE TEACHING:
   When relevant, compare and contrast similar conditions side by side:
   - Use comparison tables (in markdown) for differential diagnoses
   - Highlight the KEY differentiating features
   - Example: When discussing iron deficiency anemia, compare the iron studies panel across iron deficiency, anemia of chronic disease, sideroblastic anemia, and thalassemia
${subdisciplineBlocks}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — assemble subdiscipline-specific blocks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map of subdiscipline names to their module-generation depth blocks.
 */
const SUBDISCIPLINE_MODULE_BLOCKS = {
  microbiology: MICROBIOLOGY_MODULE_BLOCK,
  mls: MLS_MODULE_BLOCK,
  pharmacology: PHARMACOLOGY_MODULE_BLOCK,
  anatomy: ANATOMY_MODULE_BLOCK,
  pathology: PATHOLOGY_MODULE_BLOCK,
  biochemistry: BIOCHEMISTRY_MODULE_BLOCK,
};

/**
 * Build concatenated subdiscipline blocks for module generation.
 * If no subdisciplines detected, include ALL blocks (general medical content
 * may touch on any of them).
 *
 * @param {string[]} subdisciplines
 * @returns {string}
 */
function buildSubdisciplineModuleBlocks(subdisciplines) {
  if (!subdisciplines || subdisciplines.length === 0) {
    // No specific subdiscipline detected — include a general note
    return `
SUBDISCIPLINE NOTE: No specific medical subdiscipline was strongly detected. Apply the general medical depth requirements above. If the content touches on microbiology, lab science, pharmacology, anatomy, pathology, or biochemistry, apply the appropriate level of detail for that area.`;
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

  if (subdisciplines.includes('microbiology')) {
    blocks.push(`
MICROBIOLOGY QUIZ-SPECIFIC:
- Include questions requiring organism identification from described characteristics:
  "A Gram-positive coccus growing in clusters on blood agar produces golden-yellow colonies. It is catalase-positive and coagulase-positive. What is the most likely organism?"
- Include questions on antimicrobial selection and resistance:
  "Which antibiotic is the drug of choice for MRSA skin and soft tissue infections?"
- Include questions on specimen handling and culture interpretation:
  "A sputum culture on MacConkey agar grows lactose-fermenting colonies. Biochemical testing shows: IMViC pattern + + - -. What is the most likely organism?"
- Ask about virulence factors and their clinical significance
- Include questions that require distinguishing between similar organisms based on key differentiating tests`);
  }

  if (subdisciplines.includes('mls')) {
    blocks.push(`
MLS (MEDICAL LABORATORY SCIENCE) QUIZ-SPECIFIC:
- Include questions on specimen handling and rejection criteria:
  "A blood sample for coagulation studies is received in a lavender-top (EDTA) tube instead of a blue-top (citrate) tube. What is the correct action?"
- Include questions on QC rule interpretation:
  "A Levey-Jennings chart shows the last 7 QC points on the same side of the mean but all within 2 SD. Which Westgard rule is violated?"
- Include questions on method principles:
  "Which principle is used in the biuret method for total protein measurement?"
- Include result interpretation requiring correlation of multiple analytes:
  "Given these results — Total bilirubin: 8.2 mg/dL, Direct bilirubin: 6.5 mg/dL, ALP: 450 U/L (elevated), GGT: 380 U/L (elevated), AST: 85 U/L, ALT: 72 U/L — what pattern of liver disease does this suggest?"
- Include questions on interferences and troubleshooting:
  "A lipemic sample gives a falsely elevated total bilirubin result. What is the mechanism of this interference?"
- Test the three phases of laboratory testing (pre-analytical, analytical, post-analytical)`);
  }

  if (subdisciplines.includes('pharmacology')) {
    blocks.push(`
PHARMACOLOGY QUIZ-SPECIFIC:
- Include questions on mechanism of action linked to clinical effect:
  "A patient on a beta-blocker develops bradycardia. Which receptor type is responsible, and what is the intracellular signaling change?"
- Include drug interaction scenarios:
  "A patient on warfarin starts taking rifampicin. What is the expected effect on INR and by what mechanism?"
- Include adverse effect identification from clinical scenarios:
  "A patient on a statin presents with bilateral calf pain and dark urine. CK level is 12,000 U/L. What is the most likely adverse effect?"
- Include questions comparing drugs within the same class — what makes one preferred over another in a specific clinical context
- Test pharmacokinetic calculations where applicable (half-life, loading dose, maintenance dose)`);
  }

  if (subdisciplines.includes('anatomy')) {
    blocks.push(`
ANATOMY QUIZ-SPECIFIC:
- Include scenario-based injury/lesion localization:
  "A patient cannot abduct the arm beyond 15 degrees after a shoulder injury. Which nerve is most likely damaged and what is its root value?"
- Include questions requiring knowledge of spatial relationships:
  "During a posterior approach to the hip joint, which nerve is most at risk of injury?"
- Include developmental anatomy questions with clinical correlation:
  "A newborn presents with a midline neck swelling that moves upward on tongue protrusion. What is the embryological basis of this condition?"
- Include surface anatomy and imaging correlation:
  "At the level of the transpyloric plane (L1), which of the following structures is NOT found?"
- Test both structure-to-function and function-to-structure reasoning`);
  }

  if (subdisciplines.includes('pathology')) {
    blocks.push(`
PATHOLOGY QUIZ-SPECIFIC:
- Include described histological features requiring diagnosis:
  "A biopsy of a breast mass shows sheets of cells with high nuclear-to-cytoplasmic ratio, prominent nucleoli, numerous mitotic figures, and areas of central necrosis. IHC shows ER-negative, PR-negative, HER2-negative. What is the most likely diagnosis and subtype?"
- Include IHC marker interpretation:
  "A lymph node biopsy shows Reed-Sternberg cells that are CD15+ and CD30+. What is the diagnosis?"
- Include staging and grading questions:
  "A patient with colon cancer has a tumor invading through the muscularis propria into pericolorectal tissue with 2/14 positive lymph nodes and no distant metastasis. What is the TNM stage?"
- Include questions on pathological processes (inflammation, repair, neoplasia) and their mechanisms
- Ask about prognostic factors and their basis`);
  }

  if (subdisciplines.includes('biochemistry')) {
    blocks.push(`
BIOCHEMISTRY QUIZ-SPECIFIC:
- Include enzyme deficiency scenarios:
  "A child presents with hepatosplenomegaly and a cherry-red spot on fundoscopy. Enzyme assay shows deficient hexosaminidase A. What is the accumulated substrate and what is the diagnosis?"
- Include metabolic pathway questions requiring integration:
  "During prolonged fasting, which metabolic pathway is activated in the liver to provide glucose for the brain, and what is the rate-limiting enzyme?"
- Include regulation questions:
  "Insulin activates which enzyme in glycolysis by promoting its dephosphorylation?"
- Include clinical correlation with laboratory biomarkers:
  "A patient with suspected myocardial infarction has elevated troponin I and CK-MB. After 48 hours, CK-MB normalizes but troponin remains elevated. What is the explanation based on biomarker kinetics?"
- Test the fed/fasting/starvation metabolic state transitions
- Include vitamin/cofactor deficiency questions linked to specific enzyme impairment`);
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

  if (subdisciplines.includes('microbiology')) {
    blocks.push(`
MICROBIOLOGY TUTORING APPROACH:
- When explaining organisms, ALWAYS use the systematic format:
  Classification (kingdom/phylum/genus/species) -> Morphology & Staining -> Culture characteristics -> Biochemical reactions -> Virulence factors -> Diseases caused -> Lab diagnosis -> Treatment -> Prevention
- Describe Gram stain result with morphology together: "Gram-positive cocci in clusters" not just "Gram-positive"
- For lab diagnosis, walk through the complete workflow: specimen -> direct exam -> culture -> biochemical identification -> susceptibility testing
- Compare similar organisms side by side: "Both S. aureus and S. epidermidis are Gram-positive cocci in clusters, but the KEY difference is coagulase — S. aureus is coagulase-positive"
- When discussing antibiotics, explain mechanism of action AND the basis for resistance`);
  }

  if (subdisciplines.includes('mls')) {
    blocks.push(`
MLS TUTORING APPROACH:
- When explaining lab tests, ALWAYS explain the PRINCIPLE first — what physical/chemical/immunological property the test exploits — before explaining the procedure or result interpretation
  Example: "The biuret method measures total protein by reacting Cu2+ ions with peptide bonds in alkaline solution, forming a violet-colored complex. The intensity of color is proportional to the number of peptide bonds — and therefore the protein concentration — measured spectrophotometrically at 540 nm."
- Include specimen requirements for every test discussed: specimen type, anticoagulant, volume, storage conditions, stability
- Discuss pre-analytical, analytical, and post-analytical considerations for each test
- When discussing QC: explain what each Westgard rule detects (random error vs systematic error vs shift vs trend)
- Provide result interpretation in clinical context — "An elevated GGT alongside elevated ALP suggests the ALP elevation is of hepatobiliary origin rather than bone origin"
- Emphasize correlation: encourage the student to interpret results as a PANEL, not isolated values`);
  }

  if (subdisciplines.includes('pharmacology')) {
    blocks.push(`
PHARMACOLOGY TUTORING APPROACH:
- ALWAYS explain mechanism of action FIRST before listing indications or adverse effects
  Structure: Drug class -> Mechanism of action -> Pharmacokinetics -> Indications -> Adverse effects -> Interactions -> Contraindications
- Use receptor/molecular-level explanations: "Metformin activates AMP-activated protein kinase (AMPK), which inhibits hepatic gluconeogenesis and increases peripheral glucose uptake — this is why it reduces blood glucose without causing hypoglycemia."
- When discussing side effects, link them to the mechanism: "Beta-blockers cause bronchoconstriction because beta-2 receptors in bronchial smooth muscle normally mediate relaxation — blocking them leads to constriction. This is why they are contraindicated in asthma."
- For drug interactions, specify the mechanism (CYP450 inhibition/induction, protein binding, renal competition, pharmacodynamic synergy/antagonism)
- Compare drugs within the same class using tables: onset, duration, potency, selectivity, metabolism, special features`);
  }

  if (subdisciplines.includes('anatomy')) {
    blocks.push(`
ANATOMY TUTORING APPROACH:
- Use a layered approach: describe structures from superficial to deep, or from gross to microscopic
- Always include clinical relevance: "The recurrent laryngeal nerve loops under the arch of the aorta (left) and subclavian artery (right) — this is clinically important because thyroid surgery or aortic aneurysm can damage it, causing hoarseness"
- For muscles, consistently provide: origin, insertion, action, innervation, blood supply
- Encourage spatial reasoning: "If you are looking at a cross-section at the level of T4, what structures would you see from anterior to posterior?"
- Relate embryological development to adult anatomy and congenital anomalies
- Use surface anatomy to make structures tangible: "You can palpate the ischial tuberosity when the hip is flexed — this is the bone you sit on"`);
  }

  if (subdisciplines.includes('pathology')) {
    blocks.push(`
PATHOLOGY TUTORING APPROACH:
- Link gross and microscopic features to pathogenesis: "The caseous necrosis you see in tuberculosis occurs because the mycobacterial cell wall lipids (mycolic acid) resist digestion by macrophage enzymes, leading to this characteristic cheesy, amorphous necrotic material"
- When discussing tumors, always cover: classification (benign/malignant), grading, staging, IHC profile, prognosis
- Describe histological features with teaching intent: "High nuclear-to-cytoplasmic ratio means the nucleus is large relative to the cell — this suggests rapid division and is a hallmark of malignancy"
- Use the morphological pattern approach: "When you see granulomas on biopsy, your differential should include: TB, sarcoidosis, fungal infection, foreign body reaction, Crohn disease"
- Connect pathological findings to clinical features and lab results: "The elevated ALP and GGT with mildly elevated transaminases suggests a cholestatic pattern — on biopsy, you would expect bile duct proliferation and periportal inflammation"`);
  }

  if (subdisciplines.includes('biochemistry')) {
    blocks.push(`
BIOCHEMISTRY TUTORING APPROACH:
- Draw out metabolic pathways step by step — name every enzyme, substrate, product, and cofactor at each step
- Emphasize the rate-limiting step and its regulation in every pathway discussed
- Always connect pathway defects to clinical disease: "If pyruvate dehydrogenase is deficient, pyruvate accumulates and is shunted to lactate (causing lactic acidosis) and alanine. The TCA cycle is starved of acetyl-CoA, reducing ATP production — this is why patients present with neurological deficits, because the brain depends heavily on aerobic glucose metabolism."
- Teach metabolic integration: when discussing one pathway, show how it connects to others
- For enzyme deficiencies: always cover the inheritance pattern, the accumulated substrate, the deficient product, and the clinical features
- Use the fed/fasting/starvation framework to organize hormonal regulation of metabolism
- When discussing lab biomarkers (enzymes, metabolites), explain tissue specificity and kinetics of rise and fall`);
  }

  return blocks.length > 0 ? `\n${blocks.join('\n')}` : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  buildMedicineDepthSection,
  buildMedicineQuizDepthSection,
  buildMedicineTutorDepthSection,
};
