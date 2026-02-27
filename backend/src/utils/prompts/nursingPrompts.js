/**
 * Nursing — Depth Prompt Builder
 *
 * Provides discipline-specific depth instructions that get injected into
 * StudyRAG's module generation, quiz generation, flashcard generation,
 * and tutor chat prompts.
 *
 * Supported subdisciplines (detected by subjectDetector.js):
 *   fundamentals, medical_surgical, critical_care, community, mental_health
 *
 * Each builder function receives the array of detected subdisciplines and
 * returns a single string block that is concatenated into the relevant
 * base prompt, replacing or augmenting the generic depth instructions.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Subdiscipline-specific module generation blocks
// ─────────────────────────────────────────────────────────────────────────────

const FUNDAMENTALS_MODULE_BLOCK = `
FUNDAMENTALS OF NURSING-SPECIFIC DEPTH REQUIREMENTS:
- Nursing process application (ADPIE) for every concept:
  a) Assessment: comprehensive data collection — subjective (patient interview, health history, symptom analysis using OLDCARTS/PQRSTU) and objective (physical examination findings, vital signs, diagnostic data)
  b) Diagnosis: formulate NANDA-I nursing diagnoses using the PES format (Problem related to Etiology as evidenced by Signs/Symptoms); distinguish between actual, risk, health promotion, and syndrome diagnoses
  c) Planning: develop individualized care plans with SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound); identify NIC (Nursing Interventions Classification) interventions with rationale; define NOC (Nursing Outcomes Classification) outcome indicators with baseline and target scores
  d) Implementation: evidence-based nursing interventions with step-by-step procedure, delegation considerations (RN vs LPN/LVN vs UAP scope of practice), documentation requirements (narrative, SBAR, DAR/DARP)
  e) Evaluation: reassessment of patient outcomes against NOC indicators, modification of care plan based on patient response, quality improvement considerations
- Assessment techniques with normal and abnormal findings:
  a) Inspection: color, symmetry, size, shape, position, movement — state normal finding THEN abnormal variants with clinical significance
  b) Palpation: temperature, moisture, texture, turgor, tenderness, masses, pulsations, crepitus — light vs deep palpation technique
  c) Percussion: resonance, hyperresonance, dullness, flatness, tympany — expected findings by body region
  d) Auscultation: breath sounds (vesicular, bronchovesicular, bronchial, adventitious — crackles, wheezes, rhonchi, stridor, pleural friction rub), heart sounds (S1, S2, S3, S4, murmurs — grading, timing, location), bowel sounds (normal, hyperactive, hypoactive, absent)
- Care plan development:
  a) Priority setting using Maslow's hierarchy of needs (physiological → safety → love/belonging → esteem → self-actualization)
  b) Priority setting using ABCs (Airway → Breathing → Circulation)
  c) At least 3 NANDA nursing diagnoses per concept with full PES statements
  d) At least 2 NIC interventions per diagnosis with evidence-based rationale
  e) At least 2 NOC outcomes per diagnosis with measurable indicators
- Patient safety considerations: fall prevention, infection control (standard precautions, transmission-based precautions), medication safety (rights of medication administration), patient identification protocols, SBAR communication`;

const MEDICAL_SURGICAL_MODULE_BLOCK = `
MEDICAL-SURGICAL NURSING-SPECIFIC DEPTH REQUIREMENTS:
- Pathophysiology brief then nursing-focused assessment:
  a) Concise pathophysiology overview: the underlying disease mechanism explained at a level sufficient for nursing clinical reasoning — what is going wrong physiologically and how does it produce the signs/symptoms the nurse will observe?
  b) Focused nursing assessment: priority assessment findings organized by body system, RED FLAG findings requiring immediate intervention, expected vs unexpected findings
  c) Diagnostic data interpretation: lab values relevant to the condition with normal ranges AND critical values requiring nursing action (notify provider, hold medication, implement protocol)
- Priority nursing diagnoses:
  a) Rank nursing diagnoses by priority using ABCs and Maslow's hierarchy
  b) Use current NANDA-I taxonomy with full PES format
  c) Differentiate between collaborative problems (potential complications requiring physician-prescribed and nurse-prescribed interventions) and independent nursing diagnoses
  d) Include risk nursing diagnoses with identified risk factors
- Medication administration:
  a) Rights of medication administration: right patient, right drug, right dose, right route, right time, right documentation, right reason, right response, right to refuse, right education
  b) Dosage calculations: dimensional analysis method for oral, parenteral, and IV medications; weight-based calculations (mg/kg); IV drip rate calculations (mL/hr, gtt/min); pediatric safe dose range verification
  c) Route-specific nursing considerations: oral (crushing/splitting contraindications, enteral tube administration), IV (compatibility, rate, vesicant vs non-vesicant, extravasation management), IM (Z-track technique, site selection, volume limits by site), subcutaneous (rotation sites, angle of insertion)
  d) High-alert medications: insulin, heparin, warfarin, opioids, potassium chloride — independent double-check requirements, monitoring parameters, reversal agents
- Patient education points:
  a) Teach-back method verification
  b) Health literacy considerations
  c) Discharge teaching: medications (name, purpose, dose, schedule, side effects to report), activity restrictions, diet modifications, follow-up appointments, when to seek emergency care
  d) Disease-specific self-management skills`;

const CRITICAL_CARE_MODULE_BLOCK = `
CRITICAL CARE NURSING-SPECIFIC DEPTH REQUIREMENTS:
- Hemodynamic parameter interpretation with normal ranges:
  a) Heart rate: normal 60-100 bpm; tachycardia causes and nursing implications; bradycardia causes and nursing implications
  b) Blood pressure: MAP (Mean Arterial Pressure) normal 65-110 mmHg; calculation: MAP = [(2 x DBP) + SBP] / 3; significance of MAP <65 mmHg (organ perfusion compromise)
  c) Central venous pressure (CVP): normal 2-8 mmHg; interpretation in context of fluid status and cardiac function
  d) Pulmonary artery pressures: PA systolic 15-30 mmHg, PA diastolic 4-12 mmHg, PAWP/PCWP 4-12 mmHg; clinical significance of elevation (left-sided heart failure, fluid overload)
  e) Cardiac output (CO): normal 4-8 L/min; Cardiac index (CI): normal 2.5-4.0 L/min/m2; SVR: normal 800-1200 dynes/sec/cm5
  f) Mixed venous oxygen saturation (SvO2): normal 60-80%; significance of low SvO2 (increased oxygen extraction = tissue hypoperfusion or increased demand)
  g) Hemodynamic profile patterns: cardiogenic shock vs septic shock vs hypovolemic shock — differentiate by CO, SVR, CVP, PAWP
- Ventilator settings and nursing considerations:
  a) Modes: AC (Assist Control), SIMV (Synchronized Intermittent Mandatory Ventilation), PSV (Pressure Support Ventilation), CPAP, BiPAP — indications and nursing implications for each mode
  b) Key settings: FiO2 (goal <60% to prevent oxygen toxicity), tidal volume (6-8 mL/kg IBW for lung-protective ventilation), PEEP (positive end-expiratory pressure — prevents alveolar collapse), respiratory rate, I:E ratio
  c) Alarm management: high pressure alarm (causes: kinking, biting, secretions, bronchospasm, pneumothorax), low pressure alarm (causes: disconnection, cuff leak), high/low minute ventilation alarms
  d) Nursing assessment: breath sounds, chest rise symmetry, ABG interpretation (pH, PaCO2, PaO2, HCO3, SaO2 — with normal ranges and acid-base interpretation), ventilator waveform basics
  e) Complications: ventilator-associated pneumonia (VAP bundle: HOB elevation 30-45°, oral care q2-4h, DVT prophylaxis, peptic ulcer prophylaxis, daily sedation vacation, daily spontaneous breathing trial), barotrauma, auto-PEEP
- Emergency protocols step-by-step:
  a) Rapid Response: recognition of deteriorating patient (early warning signs), SBAR communication, rapid assessment protocol
  b) Code Blue: BLS/ACLS algorithms — CPR quality (rate 100-120/min, depth 2-2.4 inches, full recoil, minimal interruptions), defibrillation (shockable vs non-shockable rhythms), medication administration (epinephrine 1mg q3-5min, amiodarone 300mg then 150mg for VF/pVT)
  c) Sepsis protocol: Surviving Sepsis Campaign bundles — hour-1 bundle (lactate, blood cultures before antibiotics, broad-spectrum antibiotics, 30 mL/kg crystalloid for hypotension, vasopressors for MAP <65 after fluid resuscitation)
  d) Stroke protocol: FAST assessment, door-to-needle time goals, tPA administration criteria and nursing monitoring
- ABCDE assessment framework:
  a) Airway: patency, positioning, adjuncts (oral/nasal airway, ETT), cervical spine considerations
  b) Breathing: rate, depth, pattern, SpO2, breath sounds, work of breathing, need for supplemental oxygen or ventilatory support
  c) Circulation: heart rate, rhythm, blood pressure, capillary refill, skin color/temperature, IV access, fluid status, cardiac monitoring
  d) Disability: neurological status — GCS (Glasgow Coma Scale: Eye 1-4, Verbal 1-5, Motor 1-6), pupil assessment (PERRL), blood glucose, pain assessment
  e) Exposure: full body assessment, temperature management, injury identification, maintain dignity`;

const COMMUNITY_MODULE_BLOCK = `
COMMUNITY HEALTH NURSING-SPECIFIC DEPTH REQUIREMENTS:
- Epidemiological concepts:
  a) Disease frequency measures: incidence (new cases/population at risk/time), prevalence (existing cases/total population), attack rate, mortality rate, case fatality rate — with calculation examples
  b) Study designs: descriptive (case report, case series, cross-sectional, ecological), analytical (case-control — odds ratio, cohort — relative risk), experimental (RCT) — strengths and limitations of each
  c) Screening: sensitivity (true positives/all diseased), specificity (true negatives/all non-diseased), positive predictive value, negative predictive value; screening criteria (Wilson & Jungner); community screening program planning
  d) Outbreak investigation steps: verify diagnosis, confirm outbreak, establish case definition, count cases, orient data (person/place/time), develop hypotheses, evaluate hypotheses, implement control measures, communicate findings
  e) Levels of prevention: primary (health promotion, specific protection), secondary (early diagnosis, prompt treatment, disability limitation), tertiary (rehabilitation, maximizing function)
- Health promotion models:
  a) Health Promotion Model (HPM — Pender): individual characteristics and experiences → behavior-specific cognitions and affect (perceived benefits, perceived barriers, perceived self-efficacy, activity-related affect, interpersonal influences, situational influences) → behavioral outcome; nursing application in program planning
  b) Health Belief Model (HBM — Rosenstock): perceived susceptibility, perceived severity, perceived benefits, perceived barriers, cues to action, self-efficacy; use in designing health education interventions
  c) Transtheoretical Model (TTM — Prochaska & DiClemente): precontemplation → contemplation → preparation → action → maintenance → termination; stage-matched nursing interventions for behavior change
  d) Social Ecological Model: intrapersonal, interpersonal, organizational, community, public policy levels — multi-level intervention design
- Community assessment frameworks:
  a) Windshield survey: systematic observation of community characteristics (housing, transportation, environment, services, demographics, safety indicators)
  b) Community health assessment process: data collection (primary and secondary sources), community diagnosis, prioritization (using criteria: size of problem, seriousness, effectiveness of interventions), planning, implementation, evaluation
  c) Assets-based community development: identify community strengths, resources, and social capital alongside needs
  d) Healthy People objectives: national health targets, leading health indicators, determinants of health framework
- Cultural competency considerations:
  a) Campinha-Bacote model: cultural awareness, cultural knowledge, cultural skill, cultural encounters, cultural desire
  b) Health disparities: social determinants of health (SDOH) — economic stability, education access, healthcare access, neighborhood/environment, social/community context
  c) Culturally sensitive assessment: dietary practices, health beliefs, traditional healing practices, family decision-making dynamics, religious/spiritual considerations, language and interpreter needs
  d) Vulnerable populations: homeless, migrant workers, refugees, LGBTQ+ communities, incarcerated individuals, individuals with disabilities — unique health needs and access barriers`;

const MENTAL_HEALTH_MODULE_BLOCK = `
MENTAL HEALTH NURSING-SPECIFIC DEPTH REQUIREMENTS:
- Therapeutic communication techniques with examples:
  a) Active listening: SOLER technique (Sit squarely, Open posture, Lean forward, Eye contact, Relax)
  b) Techniques that FACILITATE communication:
     - Open-ended questions: "Tell me about your experience with..." (NOT "Are you feeling better?")
     - Reflection: Patient: "I feel like nobody cares." Nurse: "You feel that nobody cares about you."
     - Restating: Patient: "I can't sleep at night." Nurse: "You're having difficulty sleeping."
     - Clarifying: "What do you mean when you say you feel 'off'?"
     - Silence: purposeful use of silence to allow patient to process and respond
     - Summarizing: "Let me make sure I understand. You've been feeling anxious since..."
     - Focusing: "You mentioned feeling anxious at work. Let's talk more about that."
     - Validating: "It's understandable that you would feel that way given what you've been through."
  c) Techniques that BLOCK communication (AVOID these):
     - Giving advice: "You should..." — takes away patient autonomy
     - False reassurance: "Everything will be fine" — dismisses patient concerns
     - Changing the subject: redirecting to avoid uncomfortable topics
     - Asking "why" questions: perceived as judgmental; use "what" or "how" instead
     - Agreeing/disagreeing: takes a position rather than exploring the patient's perspective
     - Social responses: "I know how you feel" — can minimize the patient's unique experience
- De-escalation approaches:
  a) Verbal de-escalation: calm tone, slow speech, short sentences, empathic statements ("I can see you're upset"), offering choices, setting clear limits respectfully, avoid arguing or challenging
  b) Environmental modifications: reduce stimulation (noise, lights, people), increase personal space, remove potential weapons, ensure exit route
  c) CPI (Crisis Prevention Institute) nonviolent crisis intervention framework: anxiety → defensive behavior → acting-out behavior → tension reduction; staff responses: supportive → directive → nonviolent physical crisis intervention → therapeutic rapport
  d) Least restrictive intervention principle: verbal de-escalation → PRN medication → seclusion → physical restraint (LAST RESORT)
  e) Seclusion and restraint: documentation requirements, time limits, continuous assessment (circulation, respiration, nutrition, hydration, elimination, vital signs, mental status), physician orders, patient rights
- Medication classes with nursing considerations:
  a) Antidepressants: SSRIs (fluoxetine, sertraline — 4-6 week onset, serotonin syndrome risk, black box warning suicidality <25 years), SNRIs, TCAs (anticholinergic effects, cardiac toxicity in overdose), MAOIs (tyramine dietary restrictions — hypertensive crisis risk)
  b) Antipsychotics: first-generation/typical (haloperidol — EPS risk: acute dystonia, akathisia, parkinsonism, tardive dyskinesia; treat with benztropine/diphenhydramine) vs second-generation/atypical (risperidone, olanzapine, clozapine — metabolic syndrome monitoring, clozapine requires ANC monitoring for agranulocytosis)
  c) Mood stabilizers: lithium (narrow therapeutic index 0.6-1.2 mEq/L, toxicity signs: coarse tremor, vomiting, diarrhea, confusion, seizures; monitor levels, renal function, thyroid function, hydration/sodium status) and anticonvulsants (valproate — hepatotoxicity, teratogenicity; carbamazepine — aplastic anemia, Stevens-Johnson syndrome)
  d) Anxiolytics: benzodiazepines (lorazepam, diazepam — CNS depression, respiratory depression, dependence risk, avoid abrupt discontinuation, reversal agent flumazenil) and buspirone (non-sedating, no dependence, 2-4 week onset)
  e) NMS (Neuroleptic Malignant Syndrome): hyperthermia, muscle rigidity ("lead pipe"), altered consciousness, autonomic instability — EMERGENCY: stop antipsychotic, supportive care, dantrolene, bromocriptine
- Legal and ethical frameworks:
  a) Involuntary commitment criteria (danger to self, danger to others, gravely disabled/unable to provide for basic needs); due process rights of the patient; time limits and judicial review requirements
  b) Patient rights in psychiatric settings: right to treatment, right to refuse treatment (competent patients), right to informed consent, right to least restrictive environment, right to confidentiality, right to communicate with persons outside the facility
  c) Duty to warn (Tarasoff): obligation to warn identifiable potential victims when a patient makes credible threats
  d) Suicide risk assessment: SAD PERSONS scale, Columbia Suicide Severity Rating Scale (C-SSRS); risk factors (previous attempt — strongest predictor, mental illness, substance abuse, access to means, hopelessness, social isolation, recent loss); protective factors (social support, reasons for living, coping skills, therapeutic relationship)
  e) Ethical principles: autonomy, beneficence, nonmaleficence, justice, veracity, fidelity — application in psychiatric nursing dilemmas`;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Module Generation Depth Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the depth instructions injected into the module generation prompt
 * when nursing content is detected.
 *
 * Replaces the generic "200-400 words" instruction with 600-1200 word
 * comprehensive nursing-depth content requirements.
 *
 * @param {string[]} subdisciplines - e.g. ['fundamentals', 'medical_surgical', 'critical_care']
 * @returns {string} Prompt section to inject
 */
function buildNursingDepthSection(subdisciplines = []) {
  const subdisciplineBlocks = buildSubdisciplineModuleBlocks(subdisciplines);

  return `
NURSING — ENHANCED DEPTH INSTRUCTIONS:
Override the default content length. Each module MUST contain 600-1200 words of substantive content. Surface-level summaries are unacceptable for nursing education.

MANDATORY COVERAGE FOR EVERY NURSING CONCEPT:
For each condition, procedure, concept, or clinical scenario covered in a module, you MUST address ALL of the following using the nursing process framework (where applicable to the topic):

a) ASSESSMENT:
   - Subjective data: health history, chief complaint, symptom analysis (OLDCARTS/PQRSTU), relevant past medical/surgical/family/social history, medication history, allergies
   - Objective data: vital signs (with normal ranges), physical examination findings organized by body system, relevant laboratory and diagnostic data (with normal values and units), functional status assessment
   - Risk factor identification: modifiable and non-modifiable risk factors for the condition
   - Assessment tools: validated scales and instruments (Braden scale, Morse Fall Scale, pain scales, GCS, NIHSS, etc.) with scoring interpretation

b) NURSING DIAGNOSIS:
   - NANDA-I nursing diagnoses in PES format (Problem related to Etiology as evidenced by Signs/Symptoms)
   - Priority ranking using ABCs (Airway, Breathing, Circulation) and Maslow's hierarchy of needs
   - Differentiate: actual vs risk vs health promotion diagnoses
   - Collaborative problems: potential complications requiring both physician-prescribed and nurse-prescribed interventions
   - At least 3 prioritized nursing diagnoses per major concept

c) PLANNING:
   - SMART goals for each nursing diagnosis (Specific, Measurable, Achievable, Relevant, Time-bound)
   - NOC (Nursing Outcomes Classification) outcome indicators with baseline and target scores
   - NIC (Nursing Interventions Classification) interventions with evidence-based rationale
   - Priority setting: which interventions to perform first and why (clinical decision-making rationale)
   - Collaborative care: expected medical orders and nurse's role in collaborative management

d) IMPLEMENTATION:
   - Evidence-based nursing interventions with step-by-step detail
   - Medication administration: drug name, class, dose, route, frequency, mechanism of action, nursing considerations (assessment before administration, monitoring after administration, patient teaching)
   - Delegation considerations: what can be delegated to LPN/LVN vs UAP; supervision requirements; tasks that CANNOT be delegated (assessment, teaching, evaluation, unstable patients)
   - Documentation: SBAR communication, nursing notes, incident reporting requirements
   - Patient safety: National Patient Safety Goals, fall prevention, infection control, medication safety

e) EVALUATION:
   - Reassessment of patient outcomes compared to SMART goals and NOC indicators
   - Expected vs unexpected outcomes — what to do when the patient is not meeting goals
   - Care plan modification based on evaluation data
   - Quality indicators and evidence-based practice benchmarks

f) PATIENT TEACHING:
   - Disease process explanation in patient-friendly language
   - Medication education: name, purpose, dose, schedule, common side effects, when to call the provider
   - Self-care management: activity, diet, wound care, equipment use
   - Discharge planning: follow-up appointments, community resources, when to seek emergency care
   - Health literacy assessment and teach-back method for verification
   - Cultural and developmental considerations in teaching approach

STRUCTURAL TEMPLATE — present nursing content in this order:
Assessment → Nursing Diagnosis → Planning → Implementation → Evaluation → Patient Teaching
${subdisciplineBlocks}
IMPORTANT: Every module must be anchored in the student's study material. Use these depth guidelines to ENHANCE the source content, not replace it. If the source material covers a topic briefly, expand it using these requirements. If the source material goes deeper in a specific area, preserve that depth.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Quiz / Question Generation Depth Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the depth instructions injected into quiz and question generation
 * prompts when nursing content is detected.
 *
 * @param {string[]} subdisciplines - detected subdisciplines
 * @returns {string} Prompt section to inject
 */
function buildNursingQuizDepthSection(subdisciplines = []) {
  const subdisciplineBlocks = buildSubdisciplineQuizBlocks(subdisciplines);

  return `
NURSING — QUIZ DEPTH INSTRUCTIONS:
Questions MUST test clinical nursing judgment and application of the nursing process, NOT simple recall of isolated facts. Mirror the format and rigor of NCLEX-RN/NCLEX-PN examinations.

MANDATORY QUESTION FORMATS:

1. SELECT ALL THAT APPLY (SATA) (at least 20% of questions):
   - Format: "A nurse is caring for a patient with [condition]. Which of the following nursing interventions are appropriate? Select all that apply."
   - Must have between 4-6 answer options with 2-4 correct answers
   - Each option must be plausible — avoid obviously incorrect distractors
   - Explanations must address why EACH option is correct or incorrect with clinical rationale
   - Example: "A nurse is caring for a patient receiving IV heparin therapy. Which of the following assessments should the nurse perform? Select all that apply. a) Monitor aPTT levels b) Check platelet count c) Assess for signs of bleeding d) Monitor INR e) Check stool for occult blood"

2. PRIORITY AND DELEGATION QUESTIONS (at least 25% of questions):
   - "Which action should the nurse take FIRST?"
   - "Which patient should the nurse assess FIRST?" (prioritization among multiple patients)
   - "Which task can the nurse delegate to the unlicensed assistive personnel (UAP)?"
   - "Which finding should the nurse report to the provider IMMEDIATELY?"
   - Apply ABCs, Maslow's hierarchy, nursing process priority (assessment before intervention), and acute vs chronic framework
   - All options must be valid nursing actions — the question tests PRIORITY, not right vs wrong
   - Example: "The nurse receives report on four patients. Which patient should the nurse assess FIRST? a) A patient with COPD and SpO2 of 89% on 2L nasal cannula b) A patient 1 day post-op cholecystectomy reporting incisional pain of 6/10 c) A patient with diabetes who has a fasting blood glucose of 180 mg/dL d) A patient with heart failure who gained 3 lbs overnight"

3. MEDICATION CALCULATION QUESTIONS (at least 10% of questions):
   - Use dimensional analysis method for solving
   - Types: oral dosage calculations, parenteral dosage calculations, IV flow rate (mL/hr and gtt/min), weight-based dosing (mg/kg), reconstitution problems, safe dose range verification (especially pediatric)
   - Always include units and require unit conversion where applicable
   - Example: "The provider orders dopamine 5 mcg/kg/min IV for a patient weighing 82 kg. The pharmacy provides dopamine 400 mg in 250 mL D5W. At what rate (mL/hr) should the nurse set the infusion pump?"
   - Example: "The provider orders amoxicillin 500 mg PO. The pharmacy provides amoxicillin 250 mg/5 mL oral suspension. How many mL should the nurse administer?"

4. CLINICAL JUDGMENT / SCENARIO-BASED (at least 30% of questions):
   - Present a clinical scenario with assessment data and ask the student to identify the priority nursing action, appropriate nursing diagnosis, or expected outcome
   - Include relevant lab values with reference ranges and ask for nursing interpretation and action
   - Format: "A nurse is caring for a patient admitted with [diagnosis]. Assessment findings include [data]. Lab results show [values with units and reference ranges]. Which nursing action is the priority?"
   - Example: "A nurse is caring for a patient on lithium therapy. The patient's serum lithium level is 2.1 mEq/L (therapeutic range: 0.6-1.2 mEq/L). The patient is exhibiting coarse tremors, vomiting, and confusion. What is the priority nursing action? a) Administer the next scheduled dose of lithium b) Hold lithium and notify the provider immediately c) Encourage the patient to increase fluid intake d) Document the findings and recheck the level in 4 hours"

5. LAB VALUE INTERPRETATION WITH NURSING ACTIONS:
   - Present lab values and ask what the nurse should do (not just what the values mean)
   - Include critical values that require immediate nursing action
   - Example: "A patient's potassium level is 6.2 mEq/L (normal: 3.5-5.0 mEq/L). Which nursing action is the priority? a) Place the patient on continuous cardiac monitoring b) Administer the scheduled potassium supplement c) Encourage the patient to eat bananas and oranges d) Recheck the level in 24 hours"

MCQ DISTRACTOR QUALITY:
- Every distractor must be a plausible nursing action or assessment finding — not an obviously wrong answer
- Include at least one "close distractor" that tests nuanced clinical judgment
- Distractors should represent common nursing errors or misconceptions
- Explanations must explain why EACH incorrect option is wrong AND why the correct answer is best, using nursing rationale (ABCs, Maslow's, nursing process, safety, evidence-based practice)
- Always include the clinical reasoning framework used to arrive at the correct answer
${subdisciplineBlocks}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tutor Chat Depth Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the depth instructions injected into the tutor chat prompt
 * when nursing content is detected.
 *
 * @param {string[]} subdisciplines - detected subdisciplines
 * @returns {string} Prompt section to inject
 */
function buildNursingTutorDepthSection(subdisciplines = []) {
  const subdisciplineBlocks = buildSubdisciplineTutorBlocks(subdisciplines);

  return `
NURSING — TUTOR DEPTH INSTRUCTIONS:
You are tutoring a nursing student. Apply these rules to ALL responses:

1. NURSING PROCESS FRAMEWORK:
   ALWAYS frame explanations through the nursing process (ADPIE). When a student asks about any condition, concept, or clinical scenario, organize your response using:
   Assessment → Nursing Diagnosis → Planning → Implementation → Evaluation
   Do NOT present content as a physician would (diagnosis → treatment). Present it as a NURSE would — focusing on what the nurse assesses, identifies, plans, does, and evaluates.

2. PRIORITIZATION USING ABCs AND MASLOW'S HIERARCHY:
   - When discussing patient care priorities, ALWAYS apply:
     a) ABCs (Airway → Breathing → Circulation) for acute/emergency situations
     b) Maslow's hierarchy (Physiological → Safety → Love/Belonging → Esteem → Self-Actualization) for general care planning
     c) Nursing process order: Assessment before Intervention (always assess before acting)
     d) Acute over chronic: new-onset or unstable conditions take priority over stable chronic conditions
   - When multiple nursing actions are possible, explicitly state WHY one takes priority:
     "The nurse should assess the airway FIRST because, according to the ABC framework, airway patency is the highest priority — without a patent airway, no other intervention will be effective."

3. SAFETY CONSIDERATIONS IN EVERY RESPONSE:
   - Patient identification: two identifiers before every medication, procedure, or blood product
   - Fall prevention: assess risk factors, implement interventions based on Morse Fall Scale score
   - Infection control: standard precautions (hand hygiene, PPE), transmission-based precautions (airborne — N95 for TB, measles, varicella; droplet — surgical mask for flu, pertussis, meningococcal; contact — gown/gloves for MRSA, C. diff, VRE)
   - Medication safety: rights of medication administration, high-alert medication protocols, sound-alike/look-alike (SALAD) awareness, barcode medication administration (BCMA)
   - National Patient Safety Goals: apply relevant goals to every clinical scenario discussed
   - When explaining any nursing intervention, always include potential complications and how to prevent them

4. MEDICATION CALCULATIONS WITH DIMENSIONAL ANALYSIS:
   - When any medication dosing question arises, ALWAYS demonstrate the dimensional analysis method step by step:
     Step 1: Identify what you HAVE (available concentration/supply)
     Step 2: Identify what you WANT (ordered dose)
     Step 3: Set up the equation with conversion factors so units cancel
     Step 4: Solve and include units in every step
   - Example: "Order: Amoxicillin 500 mg PO. Available: Amoxicillin 250 mg/5 mL.
     500 mg × (5 mL / 250 mg) = 10 mL
     The nurse should administer 10 mL."
   - For IV calculations, always show:
     mL/hr = (total volume in mL × drop factor) / (time in minutes) for gtt/min
     OR total volume / total time in hours for mL/hr
   - For weight-based dosing: verify safe dose range before calculating administration dose

5. CLINICAL JUDGMENT AND CRITICAL THINKING:
   - After providing an explanation, challenge the student with clinical reasoning questions:
     "If this patient's condition worsens and the SpO2 drops to 88%, what would be your priority nursing intervention and why?"
     "The patient's potassium level is now 3.2 mEq/L. How does this change your nursing care plan?"
     "Which assessment finding would indicate that the intervention was effective?"
   - Guide students to THINK through clinical scenarios rather than memorize responses
   - Encourage the student to verbalize their clinical reasoning: "Walk me through your thought process — what assessment data supports that nursing diagnosis?"

6. DELEGATION AND SCOPE OF PRACTICE:
   - When discussing nursing care, always clarify WHO can perform each task:
     a) RN ONLY: initial assessment, nursing diagnosis, care plan development, patient teaching, evaluation, IV medication administration, blood product administration, care of unstable patients
     b) LPN/LVN: medication administration (in most states — not IV push in many), wound care, data collection on stable patients, reinforcing established teaching
     c) UAP (CNA/nursing assistant): vital signs on stable patients, ADLs (bathing, feeding, ambulation), I&O measurement, specimen collection, glucose monitoring
   - The "Five Rights of Delegation": right task, right circumstance, right person, right direction/communication, right supervision

7. NURSING DIAGNOSES — PROPER FORMULATION:
   - When the student asks about a condition, always provide at least 3 prioritized NANDA-I nursing diagnoses in PES format
   - Distinguish between actual ("Impaired gas exchange related to alveolar-capillary membrane changes as evidenced by SpO2 88%, dyspnea, and cyanosis") and risk ("Risk for falls related to altered mobility, medication side effects, and age >65 years") diagnoses
   - Explain WHY each diagnosis is ranked in its priority position

8. COMPARATIVE TEACHING WITH NURSING FOCUS:
   When relevant, compare and contrast similar conditions from a NURSING perspective:
   - Use comparison tables (in markdown) focused on nursing assessment differences, priority nursing diagnoses, and key nursing interventions
   - Highlight the assessment findings that differentiate conditions
   - Example: When discussing left-sided vs right-sided heart failure — compare assessment findings (left: crackles, dyspnea, orthopnea, pink frothy sputum vs right: JVD, peripheral edema, hepatomegaly, weight gain), priority nursing diagnoses, and nursing interventions for each
${subdisciplineBlocks}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — assemble subdiscipline-specific blocks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map of subdiscipline names to their module-generation depth blocks.
 */
const SUBDISCIPLINE_MODULE_BLOCKS = {
  fundamentals: FUNDAMENTALS_MODULE_BLOCK,
  medical_surgical: MEDICAL_SURGICAL_MODULE_BLOCK,
  critical_care: CRITICAL_CARE_MODULE_BLOCK,
  community: COMMUNITY_MODULE_BLOCK,
  mental_health: MENTAL_HEALTH_MODULE_BLOCK,
};

/**
 * Build concatenated subdiscipline blocks for module generation.
 * If no subdisciplines detected, include ALL blocks (general nursing content
 * may touch on any of them).
 *
 * @param {string[]} subdisciplines
 * @returns {string}
 */
function buildSubdisciplineModuleBlocks(subdisciplines) {
  if (!subdisciplines || subdisciplines.length === 0) {
    // No specific subdiscipline detected — include a general note
    return `
SUBDISCIPLINE NOTE: No specific nursing subdiscipline was strongly detected. Apply the general nursing depth requirements above. If the content touches on fundamentals, medical-surgical, critical care, community health, or mental health nursing, apply the appropriate level of detail for that area.`;
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

  if (subdisciplines.includes('fundamentals')) {
    blocks.push(`
FUNDAMENTALS OF NURSING QUIZ-SPECIFIC:
- Include questions testing the nursing process application:
  "A nurse is developing a care plan for a patient with impaired mobility. Which of the following is a correctly written SMART goal? a) Patient will ambulate b) Patient will walk 50 feet with a walker by discharge c) Patient will feel better about mobility d) Patient will not fall"
- Include vital signs interpretation with nursing actions:
  "A nurse obtains the following vital signs: BP 88/56 mmHg, HR 112 bpm, RR 24/min, T 101.4°F. Which action should the nurse take FIRST?"
- Include questions on proper body mechanics, positioning, infection control procedures, and documentation
- Test prioritization of basic care needs using Maslow's hierarchy
- Include delegation questions: "Which task can the nurse safely delegate to the UAP?"
- Include questions on therapeutic communication: "Which nurse response is MOST therapeutic?"
- Ask about assessment techniques: inspection, palpation, percussion, auscultation — correct sequence and expected findings`);
  }

  if (subdisciplines.includes('medical_surgical')) {
    blocks.push(`
MEDICAL-SURGICAL NURSING QUIZ-SPECIFIC:
- Include post-operative nursing assessment scenarios:
  "A patient returns from abdominal surgery. During assessment, the nurse notes absent bowel sounds, abdominal distension, and nausea. Which nursing action is the priority?"
- Include medication administration calculations:
  "The provider orders heparin 18 units/kg/hr IV for a patient weighing 90 kg. The pharmacy provides heparin 25,000 units in 500 mL D5W. At what rate (mL/hr) should the nurse set the infusion pump?"
- Include questions on pre- and post-procedure nursing care:
  "A patient is scheduled for a cardiac catheterization via the femoral artery. Which nursing assessment is MOST important in the immediate post-procedure period?"
- Include disease-specific nursing assessment questions with lab value interpretation:
  "A patient with cirrhosis has the following labs: albumin 2.1 g/dL (normal 3.5-5.0), INR 2.8 (normal 0.8-1.2), ammonia 85 mcg/dL (normal 15-45). Which nursing assessment finding is the nurse MOST likely to observe?"
- Include patient education scenarios: "Which statement by the patient indicates understanding of warfarin therapy?"
- Test application of the nursing process to common medical-surgical conditions`);
  }

  if (subdisciplines.includes('critical_care')) {
    blocks.push(`
CRITICAL CARE NURSING QUIZ-SPECIFIC:
- Include hemodynamic monitoring interpretation:
  "A patient's hemodynamic readings show: CO 2.8 L/min, CI 1.6 L/min/m2, SVR 2200 dynes/sec/cm5, CVP 18 mmHg, PAWP 24 mmHg. These findings are MOST consistent with which type of shock?"
- Include ventilator management scenarios:
  "A ventilated patient's high-pressure alarm is sounding. The nurse assesses coarse crackles bilaterally and thick, yellow secretions in the ETT. Which nursing action should the nurse take FIRST?"
- Include ABG interpretation with nursing actions:
  "ABG results: pH 7.28, PaCO2 55 mmHg, PaO2 68 mmHg, HCO3 24 mEq/L. The nurse interprets this as: a) Respiratory acidosis, uncompensated b) Metabolic acidosis, uncompensated c) Respiratory alkalosis, compensated d) Mixed acid-base disorder"
- Include emergency response scenarios (code blue, rapid response):
  "During a code blue, the cardiac monitor shows ventricular fibrillation. After initiating CPR, what is the nurse's NEXT action?"
- Include questions on critical care medication titration:
  "A patient on a norepinephrine drip has a MAP of 58 mmHg. The titration protocol states to increase the rate by 2 mcg/min for MAP <65. The current rate is 8 mcg/min. What should the nurse do?"
- Test ECG rhythm recognition and appropriate nursing interventions`);
  }

  if (subdisciplines.includes('community')) {
    blocks.push(`
COMMUNITY HEALTH NURSING QUIZ-SPECIFIC:
- Include epidemiology calculation questions:
  "In a community of 50,000 people, 200 new cases of tuberculosis were diagnosed in 2025. What is the incidence rate? a) 0.4% b) 4 per 1,000 c) 40 per 100,000 d) 400 per 100,000"
- Include community assessment scenarios:
  "A nurse conducting a windshield survey of a neighborhood observes boarded-up buildings, limited sidewalks, no grocery stores within walking distance, and a high density of fast food restaurants. Which community nursing diagnosis is MOST appropriate?"
- Include health promotion model application:
  "Using the Health Belief Model, which nursing intervention would be MOST effective in increasing flu vaccination rates among elderly adults who believe they are not susceptible to influenza?"
- Include cultural competency scenarios:
  "A nurse is caring for a patient from a culture where direct eye contact is considered disrespectful. The patient avoids eye contact during the health history. How should the nurse interpret this behavior?"
- Include questions on levels of prevention:
  "A community nurse provides immunizations at a local health fair. This activity is an example of which level of prevention?"
- Test disaster preparedness, outbreak investigation, and public health reporting requirements`);
  }

  if (subdisciplines.includes('mental_health')) {
    blocks.push(`
MENTAL HEALTH NURSING QUIZ-SPECIFIC:
- Include therapeutic communication scenarios:
  "A patient says, 'There's no point in going on. Nobody would miss me.' Which nurse response is MOST therapeutic? a) 'Don't say that. You have so much to live for.' b) 'Are you thinking about hurting yourself?' c) 'Let's talk about something more positive.' d) 'I'm sure your family would miss you.'"
- Include de-escalation scenarios:
  "A patient in the psychiatric unit becomes agitated, is pacing rapidly, and is raising their voice. Which nursing action should the nurse take FIRST?"
- Include psychiatric medication management:
  "A patient on clozapine has a WBC of 2,800/mm3 (normal 4,500-11,000) and ANC of 1,400/mm3 (normal >1,500). What is the priority nursing action?"
- Include mental status examination (MSE) interpretation:
  "During a mental status examination, the nurse observes a patient who is wearing multiple layers of clothing, speaking rapidly with flight of ideas, and reports sleeping only 2 hours per night for the past week. These findings are MOST consistent with which condition?"
- Include questions on legal/ethical considerations:
  "A patient voluntarily admitted to the psychiatric unit wants to leave against medical advice. The patient denies suicidal and homicidal ideation. What is the nurse's BEST action?"
- Include suicide risk assessment scenarios requiring identification of risk factors and appropriate nursing interventions
- Test application of milieu therapy principles and group therapy dynamics`);
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

  if (subdisciplines.includes('fundamentals')) {
    blocks.push(`
FUNDAMENTALS TUTORING APPROACH:
- When explaining any nursing concept, ALWAYS walk through ADPIE step by step:
  "Let's work through this using the nursing process. First, what would you assess? What subjective and objective data do you need?"
- For assessment techniques, describe the technique AND the normal/abnormal findings:
  "When auscultating lung sounds, you're listening for vesicular sounds in the periphery — these are soft, low-pitched, and heard throughout inspiration with a brief expiration. If you hear crackles (fine or coarse), this is abnormal and may indicate fluid in the alveoli."
- Always formulate NANDA nursing diagnoses in PES format and explain each component:
  "'Impaired gas exchange' is the PROBLEM — this is the NANDA-I label. 'Related to alveolar-capillary membrane changes' is the ETIOLOGY — this explains WHY it's happening. 'As evidenced by SpO2 88% and dyspnea on exertion' is the defining characteristics — this is your EVIDENCE."
- When discussing care planning, always include delegation considerations:
  "The RN must perform the initial assessment, but vital signs on a stable patient can be delegated to the UAP."
- Emphasize documentation: teach SBAR format for communication, DAR/DARP for focus charting
- Build from simple to complex: master basic concepts before applying them to clinical scenarios`);
  }

  if (subdisciplines.includes('medical_surgical')) {
    blocks.push(`
MEDICAL-SURGICAL TUTORING APPROACH:
- Start with a brief pathophysiology overview, then SHIFT to nursing focus:
  "The pathophysiology of heart failure involves reduced cardiac output due to impaired contractility. Now, as a nurse, what does this mean for YOUR assessment? You'll look for signs of decreased perfusion (fatigue, confusion, decreased urine output) and fluid backup (crackles, edema, JVD, weight gain)."
- For medications, always cover the nursing considerations, not just pharmacology:
  "Furosemide is a loop diuretic. But what does the NURSE need to know? Assess potassium before giving it (hypokalemia risk), monitor I&O, daily weights, assess for dehydration, hold if BP is below parameters, teach the patient to take it in the morning to avoid nocturia."
- Walk through medication calculations step by step using dimensional analysis:
  "The order says heparin 1,200 units/hr. You have 25,000 units in 500 mL. Set up your dimensional analysis: 1,200 units/hr × (500 mL / 25,000 units) = 24 mL/hr."
- For surgical patients, organize teaching around perioperative phases:
  Pre-operative: teaching, consent, assessment, preparation
  Intra-operative: roles, safety (time-out, surgical checklist)
  Post-operative: assessment priorities (ABCs, pain, bleeding, complications), activity progression, discharge teaching
- Always connect lab values to nursing actions, not just diagnosis:
  "Potassium is 3.0 mEq/L — that's low. What do you DO as the nurse? Place on cardiac monitor (arrhythmia risk), assess for symptoms (muscle weakness, cramping, dysrhythmias), hold digoxin if prescribed (hypokalemia increases dig toxicity), notify the provider, anticipate potassium replacement order."`);
  }

  if (subdisciplines.includes('critical_care')) {
    blocks.push(`
CRITICAL CARE TUTORING APPROACH:
- Teach hemodynamic interpretation using pattern recognition:
  "Let's build your critical care thinking. When you see high CVP + high PAWP + low CO + high SVR, what does that pattern tell you? The heart is failing as a pump (low CO), fluid is backing up (high CVP, high PAWP), and the body is compensating with vasoconstriction (high SVR). This is cardiogenic shock."
- For ventilator settings, explain the RATIONALE behind each setting:
  "We keep tidal volume at 6-8 mL/kg ideal body weight because the ARDS Network trial showed that lower tidal volumes reduce mortality by preventing ventilator-induced lung injury. As the nurse, you need to calculate the patient's IBW and verify the TV is appropriate."
- ABG interpretation — teach the systematic approach:
  Step 1: Look at pH (normal 7.35-7.45) — is it acidotic (<7.35) or alkalotic (>7.45)?
  Step 2: Look at PaCO2 (normal 35-45 mmHg) — does it match the pH direction? If pH is low and PaCO2 is high = respiratory acidosis
  Step 3: Look at HCO3 (normal 22-26 mEq/L) — does it match? If pH is low and HCO3 is low = metabolic acidosis
  Step 4: Is there compensation? Is the other value trying to bring pH back to normal?
- For emergency situations, teach the algorithm approach:
  "In a code, you follow the ACLS algorithm. First question: is it a shockable rhythm (VF/pulseless VT) or non-shockable (asystole/PEA)? This determines your next step."
- Always emphasize nursing priorities in critical care: early recognition of deterioration, timely intervention, clear communication (SBAR), meticulous documentation`);
  }

  if (subdisciplines.includes('community')) {
    blocks.push(`
COMMUNITY HEALTH TUTORING APPROACH:
- Shift focus from individual patient to POPULATION:
  "In community nursing, you're not just caring for one patient — you're looking at the health of an entire community. Instead of asking 'What's wrong with this patient?', you're asking 'What are the health patterns in this population and what are the root causes?'"
- Teach epidemiology with real-world examples:
  "Incidence is the number of NEW cases in a population over a specific time period. Think of it as the SPEED of disease occurrence. Prevalence is all EXISTING cases at a point in time. Think of it as the BURDEN of disease. A disease with high incidence but low prevalence means people are getting sick quickly but also recovering (or dying) quickly."
- Connect health promotion models to nursing interventions:
  "Using the Transtheoretical Model: your patient is in the contemplation stage — they're thinking about quitting smoking but haven't committed. As the nurse, what's your intervention? You wouldn't push them into action (that creates resistance). Instead, you'd explore their ambivalence, discuss pros and cons, and build self-efficacy."
- For cultural competency, teach self-reflection:
  "Before you can provide culturally competent care, you need cultural AWARENESS — understanding your OWN biases, assumptions, and cultural lens. Then you build cultural KNOWLEDGE about the specific populations you serve."
- Emphasize social determinants of health in every discussion:
  "When you see a patient with uncontrolled diabetes who keeps missing appointments, don't just label them 'non-compliant.' Ask: Do they have transportation? Can they afford their medications? Do they have a refrigerator for insulin? Is their neighborhood safe for walking?"`);
  }

  if (subdisciplines.includes('mental_health')) {
    blocks.push(`
MENTAL HEALTH TUTORING APPROACH:
- Teach therapeutic communication through practice:
  "Let me give you a patient statement and you tell me the MOST therapeutic response. Patient: 'My husband left me. I'm worthless.' Now, what would you say? Think about it before I give you the answer."
  Then explain: "A therapeutic response would be REFLECTION: 'You feel worthless because your husband left.' This shows you heard the patient and encourages further expression. Saying 'You're not worthless!' is FALSE REASSURANCE — it dismisses the patient's feelings."
- For psychiatric medications, always emphasize NURSING CONSIDERATIONS over pharmacology:
  "Lithium: the pharmacist knows the mechanism. The NURSE needs to know: therapeutic level 0.6-1.2 mEq/L, check levels 12 hours after last dose, maintain adequate sodium and fluid intake (lithium and sodium compete for reabsorption — low sodium = lithium retention = toxicity), teach signs of toxicity (fine tremor → coarse tremor, N/V/D, confusion, seizures), regular monitoring (renal function, thyroid — lithium can cause hypothyroidism and nephrogenic DI)."
- De-escalation — teach the progressive approach:
  "Always start with the LEAST restrictive intervention. Step 1: Verbal de-escalation (calm voice, empathic statements, offering choices). Step 2: Offer PRN medication. Step 3: If the patient is an imminent danger and verbal approaches fail, then and ONLY then consider seclusion/restraint as a LAST RESORT."
- For legal/ethical scenarios, teach the decision-making framework:
  "When you face an ethical dilemma in psych nursing, work through these principles: Autonomy (patient's right to make decisions), Beneficence (acting in patient's best interest), Nonmaleficence (do no harm), Justice (fair treatment). When principles conflict — like autonomy vs beneficence in involuntary commitment — the law provides guidance: the patient must meet criteria (danger to self, danger to others, or gravely disabled)."
- Suicide assessment — teach systematic approach:
  "ALWAYS ask directly: 'Are you thinking about hurting yourself or ending your life?' Asking does NOT plant the idea — research confirms this. Then assess: Do they have a PLAN? Do they have ACCESS to means? What is the TIMELINE? Have they made preparations (giving away belongings, writing a note)? The presence of a specific plan with access to lethal means is a psychiatric EMERGENCY."`);
  }

  return blocks.length > 0 ? `\n${blocks.join('\n')}` : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  buildNursingDepthSection,
  buildNursingQuizDepthSection,
  buildNursingTutorDepthSection,
};
