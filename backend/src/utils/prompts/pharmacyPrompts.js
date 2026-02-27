/**
 * Pharmacy & Pharmaceutical Sciences — Depth Prompt Builder
 *
 * Provides discipline-specific depth instructions that get injected into
 * StudyRAG's module generation, quiz generation, flashcard generation,
 * and tutor chat prompts.
 *
 * Supported subdisciplines (detected by subjectDetector.js):
 *   pharmaceutics, pharmaceutical_chemistry, pharmacognosy, clinical_pharmacy, pharmacy_practice
 *
 * Each builder function receives the array of detected subdisciplines and
 * returns a single string block that is concatenated into the relevant
 * base prompt, replacing or augmenting the generic depth instructions.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Subdiscipline-specific module generation blocks
// ─────────────────────────────────────────────────────────────────────────────

const PHARMACEUTICS_MODULE_BLOCK = `
PHARMACEUTICS-SPECIFIC DEPTH REQUIREMENTS:
- Formulation principles:
  a) Dosage form selection rationale: why a particular dosage form (tablet, capsule, suspension, emulsion, parenteral, transdermal, etc.) is chosen for a given drug based on physicochemical properties, therapeutic goal, and patient factors
  b) Excipient selection and rationale: binders (PVP, HPMC, starch paste — why each is preferred), disintegrants (croscarmellose sodium, sodium starch glycolate — superdisintegrants vs conventional), lubricants (magnesium stearate — concentration limits and why), glidants, fillers, coating agents — explain the FUNCTION and RATIONALE for each excipient choice
  c) Preformulation studies: solubility profiling (Henderson-Hasselbalch for ionizable drugs), partition coefficient (log P), polymorphism screening (DSC, XRPD), hygroscopicity, compatibility studies (drug-excipient interactions via FTIR, DSC)
- Drug delivery mechanisms:
  a) Immediate release: disintegration → dissolution → absorption sequence, factors affecting each step
  b) Modified release: matrix systems (Higuchi model), reservoir systems, osmotic systems (OROS), enteric coating principles (pH-dependent polymers — Eudragit L/S types), sustained vs controlled vs delayed release distinctions
  c) Novel drug delivery: liposomes (composition, preparation methods, types — SUV, MLV, LUV), nanoparticles (polymeric, lipid, metallic — preparation and characterization), microspheres, transdermal patches (drug-in-adhesive vs reservoir), targeted delivery (passive targeting via EPR effect, active targeting via ligand conjugation)
- Bioavailability calculations:
  a) AUC calculation: trapezoidal rule (linear and log-linear methods) with worked examples
  b) Cmax (peak plasma concentration) and Tmax (time to peak) — interpretation and clinical significance
  c) Absolute bioavailability (F = AUC_oral / AUC_IV) and relative bioavailability (F_rel = AUC_test / AUC_reference) with worked calculations
  d) Bioequivalence criteria: 90% CI of AUC and Cmax ratios within 80-125%, study design (crossover), regulatory requirements (FDA, EMA guidelines)
- Dissolution testing:
  a) USP apparatus selection: Type I (basket) vs Type II (paddle) vs Type III (reciprocating cylinder) vs Type IV (flow-through cell) — when and why each is used
  b) Dissolution media selection: pH, surfactant addition, biorelevant media (FaSSIF, FeSSIF)
  c) Dissolution specifications: Q-value, acceptance criteria, f2 similarity factor calculation
  d) In vitro-in vivo correlation (IVIVC): Level A (point-to-point), Level B (mean times), Level C (single point) — significance for biowaivers
- Stability kinetics:
  a) Zero-order degradation: rate equation (C = C0 - k0t), shelf life (t90 = 0.1C0/k0), characteristic of suspension degradation
  b) First-order degradation: rate equation (ln C = ln C0 - k1t), shelf life (t90 = 0.105/k1), most common for drug solutions
  c) Arrhenius equation: k = A × e^(-Ea/RT) — accelerated stability testing, Q10 method, extrapolation to room temperature
  d) ICH stability guidelines: climatic zones, storage conditions (25°C/60% RH, 30°C/65% RH, 40°C/75% RH), testing intervals, shelf life determination`;

const PHARMACEUTICAL_CHEMISTRY_MODULE_BLOCK = `
PHARMACEUTICAL CHEMISTRY-SPECIFIC DEPTH REQUIREMENTS:
- Structure-Activity Relationship (SAR) analysis:
  a) Pharmacophore identification: essential structural features required for biological activity
  b) Systematic structural modifications and their effects: substituent effects (electron-withdrawing vs electron-donating groups on potency), chain length optimization, ring modifications (bioisosteric replacements), stereochemistry influence (enantiomers — eutomer vs distomer)
  c) Quantitative SAR (QSAR): Hansch analysis (correlation of log P, sigma, Es with activity), Free-Wilson analysis, molecular descriptors
  d) Lead optimization strategies: scaffold hopping, fragment-based drug design, structure-based drug design using X-ray crystallography and molecular docking
- Drug-receptor interactions at molecular level:
  a) Binding forces: ionic bonds, hydrogen bonds, van der Waals forces, hydrophobic interactions, cation-pi interactions — relative strength and distance dependence of each
  b) Lock-and-key vs induced fit models, conformational selection
  c) Receptor binding kinetics: kon, koff, KD (dissociation constant), residence time concept
  d) Receptor types and signaling: GPCRs (Gs, Gi, Gq subtypes and their second messengers), ligand-gated ion channels, receptor tyrosine kinases, nuclear receptors — structural features and signal transduction for each
  e) Agonist-antagonist spectrum: full agonist, partial agonist, neutral antagonist, inverse agonist — molecular basis and clinical implications
- Metabolic pathways:
  a) Phase I reactions: oxidation (CYP450 system — specify isoforms CYP3A4, CYP2D6, CYP2C9, CYP2C19, CYP1A2 with substrate examples), reduction (azo reduction, nitro reduction, carbonyl reduction), hydrolysis (ester hydrolysis, amide hydrolysis)
  b) Phase II reactions: glucuronidation (UGT enzymes), sulfation (SULT enzymes), acetylation (NAT1, NAT2 — pharmacogenetic polymorphism), glutathione conjugation, methylation (COMT, TPMT), amino acid conjugation (glycine, glutamine)
  c) Metabolic activation: bioactivation to toxic metabolites (e.g., acetaminophen → NAPQI via CYP2E1), reactive metabolite trapping studies
  d) Species differences in metabolism, first-pass metabolism quantification, enterohepatic recycling
- Prodrug design rationale:
  a) Purpose: improving oral bioavailability, reducing first-pass metabolism, site-specific delivery, improving stability, reducing toxicity, improving taste
  b) Carrier-linked prodrugs: ester prodrugs (pivampicillin → ampicillin), amide prodrugs, phosphate prodrugs (fosphenytoin → phenytoin)
  c) Bioprecursor prodrugs: require metabolic activation without a carrier group (e.g., sulindac → sulindac sulfide)
  d) Mutual prodrugs: two active drugs linked together (e.g., sulfasalazine → 5-ASA + sulfapyridine)
  e) Design considerations: enzymatic cleavage rate, toxicity of carrier moiety, stability in GI tract, aqueous solubility improvement`;

const PHARMACOGNOSY_MODULE_BLOCK = `
PHARMACOGNOSY-SPECIFIC DEPTH REQUIREMENTS:
- Extraction methods with yields:
  a) Maceration: cold extraction, suitable for thermolabile constituents, typical yield ranges, solvent selection (ethanol, methanol, water, hydroalcoholic mixtures)
  b) Percolation: continuous extraction, higher efficiency than maceration, packing considerations, marc exhaustion
  c) Soxhlet extraction: continuous hot extraction, suitable for stable compounds, solvent recycling, limitations (thermal degradation)
  d) Modern extraction: supercritical fluid extraction (CO2 — advantages for lipophilic compounds, pressure-temperature optimization), ultrasound-assisted extraction (UAE), microwave-assisted extraction (MAE) — efficiency comparisons and yield improvements
  e) Liquid-liquid partitioning: sequential extraction with solvents of increasing polarity (hexane → chloroform → ethyl acetate → butanol → water) for phytochemical group separation
- Phytochemical classification:
  a) Alkaloids: classification by biosynthetic origin (indole, isoquinoline, tropane, purine, steroidal), chemical tests (Dragendorff, Mayer, Wagner reagents), pharmacological significance (morphine, quinine, vincristine, atropine)
  b) Terpenoids and steroids: classification by isoprene units (mono-, sesqui-, di-, tri-, tetra-terpenoids), biosynthesis via mevalonate and MEP pathways, examples (artemisinin, taxol, digoxin)
  c) Phenolics and flavonoids: structural classes (flavones, flavonols, flavanones, isoflavones, anthocyanins, catechins), antioxidant activity (DPPH, ABTS, FRAP assays), pharmacological activities
  d) Glycosides: cardiac glycosides (digitalis — structure, pharmacology, narrow therapeutic index), cyanogenic glycosides, saponins (hemolytic activity, foam test), anthraquinone glycosides (Borntrager test)
  e) Tannins: hydrolyzable vs condensed tannins, gelatin test, ferric chloride test, astringent and antimicrobial properties
- Quality control methods for herbal products:
  a) Authentication: macroscopic evaluation (organoleptic characters), microscopic evaluation (powder microscopy — diagnostic features: trichomes, calcium oxalate crystals, starch grains, fibers), DNA barcoding
  b) Physicochemical evaluation: ash values (total ash, acid-insoluble ash, water-soluble ash), extractive values (water-soluble, alcohol-soluble), moisture content (loss on drying, Karl Fischer titration), foreign organic matter
  c) Chemical evaluation: TLC fingerprinting (Rf values, marker identification), HPLC/HPTLC quantification of marker compounds, UV-Vis spectrophotometry
  d) Biological contamination testing: microbial limits (TPC, TYMC, absence of specific pathogens), heavy metal testing (Pb, Cd, Hg, As — ICP-MS/AAS), pesticide residue testing, aflatoxin detection
  e) Standardization: marker-based vs bioactivity-based standardization, WHO/pharmacopoeial monograph requirements
- Bioassay techniques:
  a) In vitro bioassays: antimicrobial assays (disk diffusion, MIC/MBC by broth microdilution), antioxidant assays (DPPH, ABTS, ORAC), cytotoxicity assays (MTT, SRB), enzyme inhibition assays (alpha-glucosidase, AChE, COX)
  b) In vivo bioassays: acute toxicity (LD50 determination, OECD guidelines 423/425), anti-inflammatory models (carrageenan-induced paw edema), analgesic models (hot plate, tail flick, acetic acid writhing)
  c) Bioactivity-guided fractionation: systematic approach to isolating active compounds from crude extracts`;

const CLINICAL_PHARMACY_MODULE_BLOCK = `
CLINICAL PHARMACY-SPECIFIC DEPTH REQUIREMENTS:
- Drug therapy review framework:
  a) Indication assessment: is each medication indicated? Is there an untreated indication?
  b) Effectiveness evaluation: is the drug the most effective choice? Is the dose optimized? Are therapeutic goals being met? (e.g., HbA1c < 7%, BP < 130/80 mmHg, LDL < 70 mg/dL for high-risk patients)
  c) Safety assessment: are there adverse drug reactions? Are monitoring parameters being followed? Are there contraindications or precautions?
  d) Adherence evaluation: is the patient taking medications as prescribed? Barriers to adherence (cost, complexity, side effects, health literacy)?
  e) Documentation: SOAP note format (Subjective, Objective, Assessment, Plan) for pharmaceutical care documentation
- Drug-Related Problem (DRP) identification and resolution:
  a) DRP classification (Strand/Hepler-Strand or PCNE system):
    - Unnecessary drug therapy (no indication, duplication, treating avoidable ADR)
    - Needs additional drug therapy (untreated condition, preventive therapy needed, synergistic therapy needed)
    - Wrong drug (more effective alternative available, contraindication present, drug interaction)
    - Dose too low (ineffective dose, frequency inadequate, duration inadequate)
    - Dose too high (dose exceeds maximum, frequency too frequent, duration too long)
    - Adverse drug reaction (undesirable effect, unsafe drug for patient, drug interaction causing ADR)
    - Non-adherence (patient not taking as directed — intentional vs unintentional)
  b) For each DRP: identify the problem → determine the cause → propose an intervention → follow up on outcome
  c) Prioritization: rank DRPs by clinical significance (life-threatening > serious > moderate > minor)
- Patient counseling points:
  a) Medication name, purpose, and expected benefit — in patient-friendly language
  b) Dosing instructions: dose, frequency, timing (with/without food, morning/evening), duration
  c) Administration technique: inhaler technique (MDI with spacer, DPI), insulin injection (rotation sites, angle, pinch-up technique), eye drops (nasolacrimal occlusion), suppositories, topical applications
  d) Expected side effects and management: what to expect, when they typically resolve, when to seek medical attention
  e) Drug-food interactions: warfarin-vitamin K foods, tetracycline-dairy, MAOIs-tyramine, grapefruit juice interactions
  f) Storage requirements: refrigeration (insulin, some antibiotics), light protection, moisture protection
  g) Missed dose instructions and what NOT to do (double dosing)
- Evidence-based drug selection with guidelines:
  a) Use current clinical guidelines as the basis for drug selection:
    - Hypertension: JNC/ACC/AHA guidelines — first-line agents by compelling indication
    - Diabetes: ADA Standards of Care — stepwise approach, individualization
    - Asthma: GINA guidelines — stepwise approach by severity
    - Anticoagulation: CHEST/AHA guidelines — CHADS2-VASc, HAS-BLED scoring
    - Infectious disease: IDSA guidelines, local antibiograms
  b) Patient-specific factors in drug selection: comorbidities, renal/hepatic function, age, pregnancy/lactation, allergies, concomitant medications, cost, formulary status
  c) Therapeutic drug monitoring (TDM): drugs requiring monitoring (vancomycin, aminoglycosides, lithium, phenytoin, digoxin, theophylline), target ranges, timing of sampling (peak/trough), dose adjustments`;

const PHARMACY_PRACTICE_MODULE_BLOCK = `
PHARMACY PRACTICE-SPECIFIC DEPTH REQUIREMENTS:
- Prescription interpretation:
  a) Prescription components: prescriber information, patient information, superscription (Rx), inscription (drug name, strength, form), subscription (quantity, dispensing instructions), signa/sig (directions for use), refill information, prescriber signature
  b) Latin abbreviations: bid (twice daily), tid (three times daily), qid (four times daily), q4h/q6h/q8h (every 4/6/8 hours), prn (as needed), ac (before meals), pc (after meals), hs (at bedtime), stat (immediately), po (by mouth), IV, IM, SC, SL, PR, top, gtt (drops), tab, cap, supp, ung (ointment), cr (cream)
  c) Prescription screening: verify completeness, check for errors (wrong dose, wrong route, wrong frequency, wrong drug form), therapeutic appropriateness, drug interactions, allergies, duplication therapy, formulary coverage
  d) Red flags: doses exceeding maximum recommended, unusual routes for the drug, controlled substance irregularities, potential forgery indicators
- Dosage calculations with worked examples:
  a) Basic calculations:
    - Dose per body weight: "A 70 kg patient requires gentamicin 5 mg/kg/day in 3 divided doses. Calculate the dose per administration. Solution: Total daily dose = 5 mg/kg x 70 kg = 350 mg/day. Dose per administration = 350/3 = 116.7 mg q8h"
    - Dose per body surface area (BSA): using Mosteller formula (BSA = sqrt(height_cm x weight_kg / 3600)), chemotherapy dosing
    - Pediatric dosing: Young's rule, Clark's rule, BSA-based dosing — when each is appropriate
  b) Concentration and dilution:
    - Dilution calculations: C1V1 = C2V2, serial dilutions
    - Percentage solutions: w/v, w/w, v/v — conversion between percentage and mg/mL
    - Parts per million (ppm) calculations
    - Alligation alternate and alligation medial for mixing different concentrations
  c) IV flow rate calculations:
    - Drops per minute: (Volume_mL x drop factor) / (Time_min), standard drop factors (10, 15, 20, 60 gtt/mL)
    - mL per hour for infusion pumps
    - Duration of infusion: Time = Volume / Rate
    - Drug infusion rates: mcg/kg/min to mL/hr conversions (dopamine, norepinephrine, heparin)
  d) Renal dose adjustment: Cockcroft-Gault equation for CrCl estimation, dose adjustment methods (interval extension vs dose reduction), specific drug examples
  e) Isotonicity calculations: sodium chloride equivalents, freezing point depression method, E-values for common drugs
- Drug interaction severity classification:
  a) Severity levels:
    - Contraindicated (X): avoid combination entirely (e.g., MAOIs + SSRIs, methotrexate + trimethoprim at high doses)
    - Major (D): consider therapy modification, monitor closely (e.g., warfarin + NSAIDs, ACEIs + potassium-sparing diuretics)
    - Moderate (C): monitor therapy, may need dose adjustment (e.g., fluoroquinolones + antacids, statins + macrolides)
    - Minor (B): no action needed, monitor if symptomatic (e.g., mild absorption interactions)
  b) Mechanism-based classification: pharmacokinetic (absorption, distribution, metabolism, excretion) vs pharmacodynamic (synergism, antagonism)
  c) Clinical significance assessment: onset (rapid vs delayed), documentation quality (established vs theoretical), patient risk factors
  d) Management strategies: dose adjustment, timing separation, alternative drug selection, enhanced monitoring
- Regulatory requirements:
  a) Controlled substance scheduling: Schedule I-V classification with examples, prescribing and dispensing restrictions per schedule, record-keeping requirements, DEA number verification (check digit algorithm)
  b) Prescription validity: valid prescriber-patient relationship, prescription dating and expiration, refill limitations by drug schedule
  c) Pharmacy operations: dispensing workflow (receive → verify → prepare → check → counsel → dispense), medication error prevention (tall man lettering, barcode verification, independent double-check for high-alert medications)
  d) Drug recall classifications: Class I (serious adverse health consequences or death), Class II (temporary or medically reversible), Class III (unlikely to cause adverse health consequences)
  e) Pharmacovigilance: adverse drug reaction reporting (MedWatch/FDA, Yellow Card/MHRA, national reporting systems), causality assessment (Naranjo algorithm), post-marketing surveillance obligations`;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Module Generation Depth Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the depth instructions injected into the module generation prompt
 * when pharmacy/pharmaceutical-sciences content is detected.
 *
 * Replaces the generic "200-400 words" instruction with 600-1200 word
 * comprehensive pharmaceutical-depth content requirements.
 *
 * @param {string[]} subdisciplines - e.g. ['pharmaceutics', 'clinical_pharmacy']
 * @returns {string} Prompt section to inject
 */
function buildPharmacyDepthSection(subdisciplines = []) {
  const subdisciplineBlocks = buildSubdisciplineModuleBlocks(subdisciplines);

  return `
PHARMACY / PHARMACEUTICAL SCIENCES — ENHANCED DEPTH INSTRUCTIONS:
Override the default content length. Each module MUST contain 600-1200 words of substantive content. Surface-level summaries are unacceptable for pharmaceutical education.

MANDATORY COVERAGE FOR EVERY PHARMACEUTICAL CONCEPT:
For each drug, formulation, therapeutic topic, or pharmaceutical concept covered in a module, you MUST address ALL of the following (where applicable to the topic):

a) DRUG / CONCEPT IDENTIFICATION:
   - INN (International Nonproprietary Name), brand names, chemical class
   - Position within the therapeutic class (prototype vs derivative)
   - Pharmacopoeial status (USP, BP, Ph. Eur.) where relevant

b) MECHANISM / PRINCIPLE:
   - Molecular mechanism of action: target identification (receptor, enzyme, ion channel, transporter), binding characteristics, signal transduction pathway
   - For formulation topics: underlying physicochemical principles (solubility, partition coefficient, crystal form, polymorphism)
   - For natural products: biosynthetic pathway, active constituent(s), mechanism of pharmacological effect

c) FORMULATION / CHEMISTRY:
   - Physicochemical properties relevant to formulation: pKa, log P, solubility profile, stability, hygroscopicity
   - Dosage form design: excipient selection with rationale, manufacturing process considerations
   - Structure-activity relationships: pharmacophore identification, key structural features for activity, effect of modifications
   - Chemical stability: degradation pathways, stabilization strategies

d) CLINICAL APPLICATION:
   - Evidence-based indications with guideline references
   - Patient selection criteria: which patients benefit most, contraindications, special populations
   - Therapeutic monitoring: parameters to monitor, target ranges, frequency
   - Comparative effectiveness: how does this drug/formulation compare to alternatives?

e) CALCULATIONS:
   - Dosage calculations with worked examples where applicable
   - Pharmacokinetic parameters: bioavailability (F), volume of distribution (Vd), clearance (CL), half-life (t1/2), steady-state calculations
   - Formulation calculations: percentage solutions, dilutions, isotonicity, flow rates where relevant

f) REGULATORY / SAFETY:
   - Adverse effects: classify by type and frequency, management strategies
   - Drug interactions: major interactions with mechanism and clinical significance
   - Regulatory classification: prescription-only, OTC, controlled substance schedule
   - Storage and handling requirements, beyond-use dating
   - Patient counseling essentials

STRUCTURAL TEMPLATE — present content in this order:
Drug/Concept -> Mechanism/Principle -> Formulation/Chemistry -> Clinical Application -> Calculations -> Regulatory/Safety
${subdisciplineBlocks}
IMPORTANT: Every module must be anchored in the student's study material. Use these depth guidelines to ENHANCE the source content, not replace it. If the source material covers a topic briefly, expand it using these requirements. If the source material goes deeper in a specific area, preserve that depth.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Quiz / Question Generation Depth Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the depth instructions injected into quiz and question generation
 * prompts when pharmacy content is detected.
 *
 * @param {string[]} subdisciplines - detected subdisciplines
 * @returns {string} Prompt section to inject
 */
function buildPharmacyQuizDepthSection(subdisciplines = []) {
  const subdisciplineBlocks = buildSubdisciplineQuizBlocks(subdisciplines);

  return `
PHARMACY / PHARMACEUTICAL SCIENCES — QUIZ DEPTH INSTRUCTIONS:
Questions MUST test pharmaceutical reasoning, calculation ability, and clinical judgment — NOT simple recall of isolated facts.

MANDATORY QUESTION FORMATS:
1. DOSAGE CALCULATION PROBLEMS (at least 20% of questions):
   - Format: Present patient parameters (weight, age, renal function, BSA) and ask for specific dose, rate, or quantity calculations
   - Example: "A 68 kg patient with CrCl 35 mL/min requires vancomycin. The standard dose is 15 mg/kg q12h for normal renal function. Using the dose adjustment table provided, calculate the appropriate dose and interval."
   - Include IV flow rate calculations, dilution problems, alligation, and pediatric dosing
   - Always require showing the calculation method, not just the final answer

2. DRUG INTERACTION IDENTIFICATION:
   - Present a patient medication profile and ask to identify clinically significant interactions
   - Example: "A patient is taking warfarin 5 mg daily, amiodarone 200 mg daily, and omeprazole 20 mg daily. Which interaction is most clinically significant, and what monitoring is required?"
   - Include the mechanism of interaction and management strategy in the answer explanation
   - Test both pharmacokinetic and pharmacodynamic interactions

3. FORMULATION SELECTION:
   - Present a drug's physicochemical properties or a patient scenario and ask for appropriate dosage form selection
   - Example: "A drug has a log P of 0.5, is unstable at gastric pH, and undergoes extensive first-pass metabolism (oral bioavailability 8%). Which dosage form strategy would best improve its bioavailability?"
   - Include questions on excipient selection, stability considerations, and route of administration

4. PATIENT COUNSELING SCENARIOS:
   - Present a dispensing scenario and ask what counseling points are essential
   - Example: "A patient presents a new prescription for metformin 500 mg twice daily. They report taking antacids regularly and have a history of alcohol use. What are the essential counseling points?"
   - Test administration technique (inhalers, insulin, eye drops), storage, food interactions, and missed dose instructions
   - Include scenarios requiring assessment of patient understanding (teach-back)

5. PRESCRIPTION ERROR IDENTIFICATION:
   - Present a prescription with deliberate errors (wrong dose, wrong route, interaction, contraindication) and ask the student to identify and resolve them
   - Example: "Rx: Methotrexate 10 mg DAILY for rheumatoid arthritis. Patient is a 28-year-old female with a positive pregnancy test. Identify ALL errors and problems with this prescription."
   - Include controlled substance prescription verification, incomplete prescriptions, and therapeutic duplication

6. MECHANISM-BASED CLINICAL QUESTIONS:
   - Link drug mechanism to clinical outcome or adverse effect
   - Example: "A patient on an ACE inhibitor develops a dry cough. Explain the mechanism. If switched to an ARB, why is cough less likely?"
   - Test SAR principles: "Which structural modification to penicillin confers resistance to beta-lactamase?"

MCQ DISTRACTOR QUALITY:
- Every distractor must be a plausible pharmaceutical answer — real drugs from the same class, real formulation strategies, realistic but incorrect calculations
- For calculation questions: include common error results as distractors (e.g., forgetting to convert units, using wrong formula)
- Explanations must explain why EACH incorrect option is wrong, not just why the correct answer is right
- For interaction questions: include drugs that are commonly confused as interacting but actually do not
${subdisciplineBlocks}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tutor Chat Depth Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the depth instructions injected into the tutor chat prompt
 * when pharmacy content is detected.
 *
 * @param {string[]} subdisciplines - detected subdisciplines
 * @returns {string} Prompt section to inject
 */
function buildPharmacyTutorDepthSection(subdisciplines = []) {
  const subdisciplineBlocks = buildSubdisciplineTutorBlocks(subdisciplines);

  return `
PHARMACY / PHARMACEUTICAL SCIENCES — TUTOR DEPTH INSTRUCTIONS:
You are tutoring a pharmacy/pharmaceutical sciences student. Apply these rules to ALL responses:

1. MECHANISM BEFORE CLINICAL USE:
   When explaining any drug, ALWAYS start with the mechanism of action BEFORE discussing indications, dosing, or adverse effects. The student must understand HOW a drug works before learning WHEN and HOW to use it.
   Structure: Drug Class -> Mechanism of Action -> Pharmacokinetics (ADME) -> Indications -> Dosing -> Adverse Effects -> Interactions -> Contraindications -> Counseling Points

2. DOSAGE CALCULATIONS STEP-BY-STEP:
   - Whenever a calculation is involved, show EVERY step explicitly:
     a) Identify what is being asked
     b) Write the formula
     c) Substitute values with units
     d) Show intermediate steps
     e) State the final answer with appropriate units and rounding
   - Example: "To calculate the IV flow rate: Rate (gtt/min) = (Volume_mL x Drop Factor_gtt/mL) / Time_min = (1000 mL x 15 gtt/mL) / (480 min) = 15000/480 = 31.25 ≈ 31 gtt/min"
   - Always check for unit consistency and reasonableness of the answer
   - For renal dose adjustments: show CrCl calculation first, then dose adjustment

3. COMPARE DRUGS WITHIN THERAPEUTIC CLASS:
   - When discussing any drug, always compare it to other drugs in the same class using a structured format:
     a) Shared mechanism of action (what makes them a class)
     b) Key differences: potency, selectivity, pharmacokinetics (onset, duration, metabolism, elimination), unique adverse effects, unique indications
     c) Clinical preference: when is one agent preferred over another and WHY
   - Use comparison tables (in markdown) when comparing 3 or more drugs
   - Example: "Among the PPIs, omeprazole, esomeprazole, lansoprazole, pantoprazole, and rabeprazole all inhibit H+/K+-ATPase irreversibly. Key differences: pantoprazole has the least CYP450 interaction potential (preferred in polypharmacy), esomeprazole (S-enantiomer of omeprazole) has marginally higher bioavailability, rabeprazole has the fastest onset due to its lower pKa."

4. FORMULATION RATIONALE:
   - When discussing any dosage form, explain WHY it is designed that way:
     "Enteric-coated omeprazole uses an acid-resistant coating because omeprazole is acid-labile — it would be degraded in the stomach before reaching the small intestine for absorption."
   - Connect physicochemical properties to formulation decisions
   - Explain excipient choices in terms of their function

5. CONNECT CHEMISTRY TO CLINICAL OUTCOME:
   - Always bridge the gap between molecular structure and therapeutic effect
   - Use phrases like: "The structural modification matters clinically because...", "This SAR principle explains why...", "The formulation choice directly affects patient outcomes because..."
   - When discussing adverse effects, link them to the mechanism: "Aminoglycoside nephrotoxicity occurs because these drugs accumulate in proximal tubular cells via megalin-mediated endocytosis, disrupting mitochondrial function and causing oxidative stress — this is why monitoring trough levels and maintaining adequate hydration are essential."

6. EVIDENCE-BASED PRACTICE:
   - Reference current clinical guidelines when recommending drug therapy
   - Explain the evidence hierarchy: guidelines > meta-analyses > RCTs > cohort studies > case reports > expert opinion
   - When guidelines differ, acknowledge the discrepancy and explain possible reasons
   - Teach the student to evaluate drug information critically

7. PHARMACEUTICAL CARE APPROACH:
   When a student asks about any drug therapy:
   Drug/Concept -> Mechanism -> Pharmacokinetics -> Clinical Use (with guidelines) -> Dosing (with calculations if applicable) -> Monitoring -> Adverse Effects -> Interactions -> Counseling Points
   Do not leave gaps — if the student asks "Tell me about [drug]", they expect a thorough, structured answer covering all pharmaceutical care aspects.

8. REGULATORY AWARENESS:
   - Include relevant regulatory considerations: controlled substance status, storage requirements, dispensing restrictions, prescription validity
   - Mention medication safety practices: tall man lettering, sound-alike/look-alike drug pairs, high-alert medication precautions
   - Discuss pharmacovigilance when relevant: ADR reporting, post-marketing surveillance
${subdisciplineBlocks}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — assemble subdiscipline-specific blocks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map of subdiscipline names to their module-generation depth blocks.
 */
const SUBDISCIPLINE_MODULE_BLOCKS = {
  pharmaceutics: PHARMACEUTICS_MODULE_BLOCK,
  pharmaceutical_chemistry: PHARMACEUTICAL_CHEMISTRY_MODULE_BLOCK,
  pharmacognosy: PHARMACOGNOSY_MODULE_BLOCK,
  clinical_pharmacy: CLINICAL_PHARMACY_MODULE_BLOCK,
  pharmacy_practice: PHARMACY_PRACTICE_MODULE_BLOCK,
};

/**
 * Build concatenated subdiscipline blocks for module generation.
 * If no subdisciplines detected, include ALL blocks (general pharmacy content
 * may touch on any of them).
 *
 * @param {string[]} subdisciplines
 * @returns {string}
 */
function buildSubdisciplineModuleBlocks(subdisciplines) {
  if (!subdisciplines || subdisciplines.length === 0) {
    // No specific subdiscipline detected — include a general note
    return `
SUBDISCIPLINE NOTE: No specific pharmaceutical subdiscipline was strongly detected. Apply the general pharmacy depth requirements above. If the content touches on pharmaceutics, pharmaceutical chemistry, pharmacognosy, clinical pharmacy, or pharmacy practice, apply the appropriate level of detail for that area.`;
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

  if (subdisciplines.includes('pharmaceutics')) {
    blocks.push(`
PHARMACEUTICS QUIZ-SPECIFIC:
- Include formulation design problems:
  "A drug has poor aqueous solubility (BCS Class II) and high permeability. Which formulation strategy is MOST appropriate to improve its oral bioavailability? A) Enteric coating B) Salt formation and micronization C) Sustained-release matrix D) Lyophilized parenteral"
- Include dissolution and bioavailability calculations:
  "Given AUC_oral = 320 mg.h/L and AUC_IV = 400 mg.h/L after equal doses, calculate the absolute bioavailability. If the bioequivalence study shows 90% CI of AUC ratio = 82-118%, is the test product bioequivalent?"
- Include stability kinetics problems:
  "A drug solution degrades by first-order kinetics with k = 0.0046 day^-1 at 25°C. Calculate the shelf life (t90). If Ea = 80 kJ/mol, predict k at 40°C using the Arrhenius equation."
- Include excipient function identification and dosage form design rationale
- Test understanding of drug delivery systems: liposomes, nanoparticles, transdermal patches — mechanism and advantages/limitations`);
  }

  if (subdisciplines.includes('pharmaceutical_chemistry')) {
    blocks.push(`
PHARMACEUTICAL CHEMISTRY QUIZ-SPECIFIC:
- Include SAR analysis questions:
  "Compound A (R1=H, R2=CH3) has an IC50 of 50 nM. Compound B (R1=Cl, R2=CH3) has an IC50 of 5 nM. Compound C (R1=H, R2=H) has an IC50 of 500 nM. What conclusions can you draw about the SAR at R1 and R2 positions?"
- Include metabolic pathway questions:
  "Codeine is a prodrug that requires metabolic activation. Which CYP450 enzyme converts codeine to morphine? What is the clinical significance of CYP2D6 poor metabolizer status?"
- Include drug-receptor interaction questions:
  "A drug has a KD of 10 nM at receptor X and a KD of 1000 nM at receptor Y. At a plasma concentration of 50 nM, which receptor is predominantly occupied? What are the clinical implications for selectivity?"
- Include prodrug design rationale:
  "Why is enalapril formulated as an ester prodrug (enalapril maleate) rather than using the active diacid (enalaprilat) orally?"
- Test stereochemistry and its pharmacological significance: enantiomers, diastereomers, geometric isomers`);
  }

  if (subdisciplines.includes('pharmacognosy')) {
    blocks.push(`
PHARMACOGNOSY QUIZ-SPECIFIC:
- Include phytochemical identification from chemical tests:
  "A plant extract gives a positive Dragendorff test (orange-red precipitate), negative Shinoda test, and negative Borntrager test. Which class of phytochemicals is likely present?"
- Include extraction method selection:
  "You need to extract thermolabile alkaloids from dried plant material. Which extraction method is MOST appropriate and why? What solvent system would you choose?"
- Include quality control interpretation:
  "An herbal product has total ash 12% (specification: NMT 8%), acid-insoluble ash 4% (specification: NMT 2%). What do these results indicate about the product?"
- Include bioassay interpretation:
  "An ethanolic extract shows IC50 = 25 ug/mL in DPPH assay and MIC = 500 ug/mL against S. aureus. How would you interpret these results in terms of antioxidant potency and antimicrobial potential?"
- Test authentication skills: microscopic identification of diagnostic features, organoleptic evaluation, adulterant detection`);
  }

  if (subdisciplines.includes('clinical_pharmacy')) {
    blocks.push(`
CLINICAL PHARMACY QUIZ-SPECIFIC:
- Include drug therapy review scenarios:
  "Review this medication profile: Metformin 1000 mg bid, Glipizide 10 mg bid, Atorvastatin 40 mg daily, Lisinopril 20 mg daily, Amlodipine 10 mg daily. Labs: HbA1c 9.2%, eGFR 28 mL/min/1.73m2, K+ 5.6 mEq/L. Identify ALL drug-related problems."
- Include DRP identification and resolution:
  "A patient on warfarin (INR target 2-3) presents with INR 5.8 and no active bleeding. What is the most appropriate management?"
- Include patient counseling assessment:
  "A patient is starting a fluticasone/salmeterol DPI for asthma. List the essential counseling points. What technique errors would reduce drug delivery to the lungs?"
- Include evidence-based drug selection questions referencing current guidelines:
  "According to ADA guidelines, what is the recommended second-line agent for a patient with T2DM and established cardiovascular disease whose HbA1c is not controlled on metformin alone?"
- Include therapeutic drug monitoring interpretation:
  "A patient on vancomycin has a trough level of 22 mcg/mL (target: 15-20 mcg/mL for serious infections). SCr has risen from 0.9 to 1.6 mg/dL over 3 days. What is your assessment and recommendation?"`);
  }

  if (subdisciplines.includes('pharmacy_practice')) {
    blocks.push(`
PHARMACY PRACTICE QUIZ-SPECIFIC:
- Include prescription interpretation and error detection:
  "Rx: Amoxicillin 500 mg. Sig: 1 cap po tid x 10d. Disp: #20. Patient weighs 30 kg and is 8 years old. Identify the problem(s) with this prescription."
- Include dosage calculation problems with clinical context:
  "Calculate the vancomycin dose for a 58-year-old male, weight 92 kg, height 178 cm, SCr 1.4 mg/dL. Target trough: 15-20 mcg/mL. Show all steps including CrCl estimation."
- Include IV preparation and compounding calculations:
  "You need to prepare 500 mL of D5W containing dopamine at a concentration of 1600 mcg/mL from a 40 mg/mL vial. How many mL of the dopamine vial do you need?"
- Include drug interaction severity assessment:
  "Classify the following interactions by severity and provide management for each: 1) Methotrexate + NSAIDs 2) Ciprofloxacin + calcium supplements 3) SSRIs + triptans 4) Phenytoin + carbamazepine"
- Include controlled substance and regulatory questions:
  "A patient presents a prescription for oxycodone 10 mg q6h prn pain, dated 45 days ago, with 3 refills indicated. What issues must the pharmacist address before dispensing?"
- Test medication safety practices: error prevention strategies, high-alert medication handling, look-alike/sound-alike awareness`);
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

  if (subdisciplines.includes('pharmaceutics')) {
    blocks.push(`
PHARMACEUTICS TUTORING APPROACH:
- When explaining any dosage form, ALWAYS start with the physicochemical rationale:
  "We formulate this drug as a sustained-release matrix tablet because it has a short half-life (2-3 hours) requiring frequent dosing, good absorption throughout the GI tract, and adequate aqueous solubility. The HPMC matrix swells on hydration, forming a gel layer that controls drug release by diffusion and erosion."
- Walk through formulation design decisions systematically: preformulation data -> dosage form selection -> excipient selection -> manufacturing method -> quality control tests
- For drug delivery systems, explain the release mechanism mathematically where applicable (Higuchi, Korsmeyer-Peppas, zero-order models)
- When discussing bioavailability, always show the calculation and explain clinical significance: "An F of 0.3 means only 30% of the oral dose reaches systemic circulation — the prescriber must account for this when converting from IV to oral dosing"
- Connect dissolution testing to clinical performance through IVIVC concepts
- Explain stability testing in the context of shelf life determination: show Arrhenius calculations step by step`);
  }

  if (subdisciplines.includes('pharmaceutical_chemistry')) {
    blocks.push(`
PHARMACEUTICAL CHEMISTRY TUTORING APPROACH:
- When explaining any drug's chemistry, start with the STRUCTURE and build outward:
  Structure -> Functional groups -> Physicochemical properties -> SAR -> Mechanism of action -> Metabolism -> Clinical implications
- Use SAR analysis as a teaching framework: "Notice how adding a fluorine atom at the 6-position of the quinolone ring (making fluoroquinolones) dramatically increases DNA gyrase binding affinity and broadens the antimicrobial spectrum — this single structural change transformed a narrow-spectrum agent into a broad-spectrum one."
- When discussing metabolism, draw the metabolic map: parent drug -> Phase I metabolites (specify CYP isoform) -> Phase II conjugates -> excretion route
- Teach prodrug concepts by contrasting the prodrug with the active form: "Enalapril (the ethyl ester prodrug) has 40% oral bioavailability, while enalaprilat (the active diacid) has only 3-12% orally — the ester group masks the ionized carboxylate, enabling passive absorption"
- For receptor pharmacology, explain binding interactions at the molecular level: which amino acid residues interact with which functional groups of the drug
- Always link structural features to clinical properties: selectivity, duration of action, adverse effect profile`);
  }

  if (subdisciplines.includes('pharmacognosy')) {
    blocks.push(`
PHARMACOGNOSY TUTORING APPROACH:
- When explaining any natural product, follow the systematic format:
  Botanical source (family, genus, species) -> Part used -> Collection/harvesting -> Active constituents (chemical class, specific compounds) -> Extraction method -> Pharmacological activity -> Clinical evidence -> Quality control -> Safety/interactions
- Connect phytochemistry to pharmacology: "Curcumin's phenolic hydroxyl groups enable it to scavenge free radicals directly, while its beta-diketone moiety chelates metal ions that catalyze ROS formation — this dual mechanism underlies its anti-inflammatory and antioxidant properties"
- Teach extraction methods by connecting polarity of target compounds to solvent selection: "Alkaloids are basic — we use acidified water or dilute acids for initial extraction, then basify and re-extract with chloroform to isolate the free base"
- For quality control, explain WHY each test matters: "Acid-insoluble ash detects sandy/earthy contamination that would not be removed by acid digestion — a high value means adulteration with inorganic material"
- Emphasize evidence-based evaluation: distinguish between traditional use claims and evidence from clinical trials
- Discuss herb-drug interactions with the same rigor as drug-drug interactions: mechanism, severity, clinical management`);
  }

  if (subdisciplines.includes('clinical_pharmacy')) {
    blocks.push(`
CLINICAL PHARMACY TUTORING APPROACH:
- When discussing any drug therapy, use the pharmaceutical care framework:
  Indication -> Effectiveness -> Safety -> Adherence for EACH medication
- Teach DRP identification systematically: walk through the entire medication list, checking each drug against the seven DRP categories
- For drug selection, always reference current guidelines and explain the evidence:
  "ADA recommends GLP-1 receptor agonists as preferred second-line agents in T2DM with established ASCVD, based on the LEADER (liraglutide) and SUSTAIN-6 (semaglutide) trials showing cardiovascular mortality benefit"
- Show therapeutic drug monitoring interpretation step by step: "The vancomycin trough of 22 mcg/mL exceeds the target range. Combined with rising creatinine, this suggests drug accumulation due to declining renal function. We should hold the next dose, recheck trough and SCr in 24 hours, then recalculate using updated CrCl."
- When discussing patient counseling, model the conversation: show what to say and how to verify understanding using teach-back
- Encourage clinical reasoning: "Given this patient's HbA1c, eGFR, and potassium level, which medications need adjustment? What are the consequences of NOT adjusting?"
- Integrate pharmacoeconomic considerations where relevant: cost-effectiveness, generic substitution, formulary management`);
  }

  if (subdisciplines.includes('pharmacy_practice')) {
    blocks.push(`
PHARMACY PRACTICE TUTORING APPROACH:
- When teaching prescription interpretation, walk through each component systematically and verify completeness and appropriateness
- For dosage calculations, ALWAYS show every step — never skip intermediate steps:
  a) "First, let's calculate CrCl using Cockcroft-Gault: CrCl = [(140 - age) x weight x (0.85 if female)] / (72 x SCr)"
  b) "Substituting: CrCl = [(140 - 58) x 92 x 1] / (72 x 1.4) = 7544 / 100.8 = 74.8 mL/min"
  c) "This is mild-moderate renal impairment. Per the dosing table, we adjust to..."
- Teach drug interaction assessment using the severity-mechanism-management framework: classify severity, explain mechanism, recommend specific management
- For regulatory topics, explain the RATIONALE behind regulations: "Controlled substance prescriptions have refill limits because tolerance and dependence develop with prolonged use — the refill restriction ensures periodic prescriber reassessment"
- Model the dispensing workflow: receive prescription -> verify legal requirements -> clinical screening -> preparation -> verification -> patient counseling -> documentation
- Emphasize medication safety at every step: teach error-prone situations, high-alert medications, and prevention strategies
- Practice prescription error scenarios: present a problematic prescription and guide the student through identification, assessment, and resolution`);
  }

  return blocks.length > 0 ? `\n${blocks.join('\n')}` : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  buildPharmacyDepthSection,
  buildPharmacyQuizDepthSection,
  buildPharmacyTutorDepthSection,
};
