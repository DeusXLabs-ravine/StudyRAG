/**
 * Psychology — Depth Prompt Builder
 *
 * Provides discipline-specific depth instructions that get injected into
 * StudyRAG's module generation, quiz generation, flashcard generation,
 * and tutor chat prompts.
 *
 * Supported subdisciplines (detected by subjectDetector.js):
 *   clinical, developmental, cognitive, social, neuro
 *
 * Each builder function receives the array of detected subdisciplines and
 * returns a single string block that is concatenated into the relevant
 * base prompt, replacing or augmenting the generic depth instructions.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Subdiscipline-specific module generation blocks
// ─────────────────────────────────────────────────────────────────────────────

const CLINICAL_MODULE_BLOCK = `
CLINICAL PSYCHOLOGY-SPECIFIC DEPTH REQUIREMENTS:
- DSM-5-TR diagnostic criteria with specific codes:
  a) Full alphanumeric diagnostic code (e.g., F32.1 Major Depressive Disorder, single episode, moderate)
  b) All required criteria sets (Criterion A through final criterion) listed verbatim or paraphrased with fidelity
  c) Specifiers: severity (mild, moderate, severe), course (in partial remission, in full remission, recurrent), and special specifiers (with anxious distress, with melancholic features, with peripartum onset, etc.)
  d) Rule-outs: substance/medication-induced conditions, conditions due to another medical condition
  e) Duration and frequency thresholds (e.g., "most of the day, nearly every day, for at least 2 weeks")
- Assessment tools with psychometric properties:
  a) Standardized instruments: name, author, year of publication, number of items, response format
  b) Reliability: internal consistency (Cronbach's alpha), test-retest reliability (with time interval and r value), inter-rater reliability (kappa or ICC)
  c) Validity: content validity, construct validity (convergent and discriminant), criterion validity (sensitivity, specificity, PPV, NPV where applicable)
  d) Normative data: standardization sample characteristics, age/cultural applicability, available norms
  e) Clinical cutoff scores and their empirical basis
  f) Commonly used instruments per disorder: BDI-II, PHQ-9, GAD-7, PCL-5, YBOCS, AUDIT, etc.
- Evidence-based treatment protocols:
  a) First-line treatments with level of evidence (e.g., Level I: multiple RCTs or meta-analyses)
  b) Manualized treatments: name, developer, number of sessions, core components (e.g., CBT for depression — Beck; behavioral activation, cognitive restructuring, relapse prevention)
  c) Effect sizes: Cohen's d or Hedges' g from meta-analyses, NNT where available
  d) Comparative efficacy: psychotherapy vs pharmacotherapy vs combined, head-to-head comparisons between modalities
  e) Treatment guidelines: APA Practice Guidelines, NICE guidelines, WHO mhGAP
  f) Contraindications and treatment matching: which patients respond best/worst to which modality
- Differential diagnosis:
  a) Systematic differential: list conditions with overlapping presentations
  b) Key differentiating features: the specific symptom, timeline, or context that distinguishes one diagnosis from another
  c) Comorbidity rates: common co-occurring conditions with prevalence figures
  d) Dimensional vs categorical considerations: where dimensional models (e.g., HiTOP, RDoC) offer additional insight`;

const DEVELOPMENTAL_MODULE_BLOCK = `
DEVELOPMENTAL PSYCHOLOGY-SPECIFIC DEPTH REQUIREMENTS:
- Stage theories with precise age ranges and transition markers:
  a) Piaget's cognitive development: sensorimotor (0-2), preoperational (2-7), concrete operational (7-11), formal operational (11+) — with substages, key achievements (object permanence, conservation, abstract reasoning), and classic experimental demonstrations
  b) Erikson's psychosocial stages: all eight stages with the specific psychosocial crisis, virtue gained, and maladaptive outcome for each (e.g., Trust vs Mistrust, 0-18 months, virtue = Hope)
  c) Kohlberg's moral development: preconventional, conventional, postconventional levels with all six stages — include Heinz dilemma responses at each stage
  d) Bowlby's attachment theory: phases of attachment formation, internal working models, attachment behavioral system
  e) Ainsworth's attachment classifications: secure, anxious-ambivalent, anxious-avoidant, disorganized (Main & Solomon) — with Strange Situation procedure methodology and behavioral markers
  f) Vygotsky's sociocultural theory: Zone of Proximal Development (ZPD), scaffolding, private speech, mediated learning
- Research methodology:
  a) Longitudinal designs: strengths (tracks individual change, establishes temporal precedence), limitations (attrition, practice effects, cohort effects, time and cost), landmark longitudinal studies (e.g., Minnesota Longitudinal Study of Risk and Adaptation, Dunedin Multidisciplinary Study)
  b) Cross-sectional designs: strengths (efficient, no attrition), limitations (cohort effects, cannot track individual change)
  c) Sequential designs: combining longitudinal and cross-sectional (Schaie's Seattle Longitudinal Study)
  d) Microgenetic method: intensive observation over period of change
  e) Ethical considerations: assent vs consent, minimal risk standard, deception with children, mandatory reporting
- Developmental milestone charts:
  a) Motor milestones: gross motor (head control, sitting, crawling, walking) and fine motor (palmar grasp, pincer grasp, drawing) with normative age ranges and red flags
  b) Language milestones: cooing, babbling, first words, two-word combinations, complex sentences — with normative ranges
  c) Social-emotional milestones: social smile, stranger anxiety, joint attention, theory of mind (false-belief task typically passed ~age 4-5)
  d) Cognitive milestones tied to Piagetian stages with specific task demonstrations
- Theoretical debates:
  a) Nature vs nurture: behavioral genetics (heritability estimates from twin/adoption studies), gene-environment interactions (diathesis-stress, differential susceptibility), epigenetics
  b) Continuity vs discontinuity: stage theories (qualitative change) vs continuous models (quantitative change)
  c) Critical periods vs sensitive periods: evidence from language acquisition (Lenneberg), visual development, attachment (Romanian orphan studies — Rutter, ERA study)
  d) Universal vs culturally specific development: cross-cultural research on attachment (van IJzendoorn & Kroonenberg meta-analysis), moral reasoning, cognitive development`;

const COGNITIVE_MODULE_BLOCK = `
COGNITIVE PSYCHOLOGY-SPECIFIC DEPTH REQUIREMENTS:
- Information processing models:
  a) Broadbent's filter model: early selection, bottleneck metaphor, sensory buffer — limitations exposed by cocktail party effect (Moray, 1959)
  b) Treisman's attenuation model: attenuator instead of filter, threshold differences for meaningful stimuli
  c) Deutsch & Deutsch late selection model: all stimuli processed to semantic level, selection occurs at response stage
  d) Lavie's perceptual load theory: reconciling early and late selection — high perceptual load forces early selection, low load allows late processing
  e) Kahneman's capacity model: attention as a limited resource pool, flexible allocation based on task demands
- Experimental paradigms:
  a) Stroop task: color-word interference, automaticity of reading, response time patterns, reverse Stroop effect — original study (Stroop, 1935), modern variations (emotional Stroop, spatial Stroop)
  b) Simon task: stimulus-response compatibility, spatial correspondence effect — Simon & Rudell (1967), implications for automatic spatial coding
  c) Flanker task (Eriksen & Eriksen, 1974): response competition, congruency effects, attentional spotlight
  d) Visual search: feature search vs conjunction search, Treisman's Feature Integration Theory (FIT), pop-out effect, search slopes
  e) Posner cueing paradigm: endogenous vs exogenous attention, valid/invalid/neutral cues, inhibition of return
  f) Change blindness and inattentional blindness paradigms (Simons & Chabris, 1999)
- Memory models:
  a) Atkinson-Shiffrin (Multi-Store Model, 1968): sensory register (iconic ~250ms, echoic ~3-4s), short-term store (capacity ~7+/-2, duration ~15-30s without rehearsal), long-term store — with evidence for each store (Sperling's partial report, serial position effect, case studies like HM)
  b) Baddeley's Working Memory Model (1974, revised 2000): phonological loop (phonological store + articulatory rehearsal), visuospatial sketchpad (visual cache + inner scribe), central executive (attention control, task switching, inhibition), episodic buffer (2000 addition — binding information across subsystems and LTM)
  c) Levels of Processing (Craik & Lockhart, 1972): shallow (structural/physical) vs deep (semantic) processing, self-reference effect, transfer-appropriate processing
  d) Tulving's memory systems: episodic, semantic, procedural — with neurological dissociations (e.g., KC, Clive Wearing)
  e) Encoding specificity principle and context-dependent memory (Godden & Baddeley, 1975 — underwater study)
- Cognitive biases with examples:
  a) Heuristics (Tversky & Kahneman): availability heuristic, representativeness heuristic (base-rate neglect, conjunction fallacy — Linda problem), anchoring and adjustment
  b) Confirmation bias: Wason's 2-4-6 task, real-world implications for reasoning and decision-making
  c) Framing effects (Tversky & Kahneman, 1981): Asian disease problem, loss aversion, prospect theory
  d) Hindsight bias ("knew-it-all-along" effect), overconfidence bias, dunning-Kruger effect
  e) Dual-process theory (Kahneman's System 1 vs System 2): automatic vs controlled processing, conditions favoring each system`;

const SOCIAL_MODULE_BLOCK = `
SOCIAL PSYCHOLOGY-SPECIFIC DEPTH REQUIREMENTS:
- Classic studies with methodology and findings:
  a) Milgram's obedience studies (1963): baseline paradigm (65% full obedience), key variations (proximity, authority presence, institutional prestige, peer pressure), agentic state theory, methodology details (40 male participants, 15-450V shock generator, confederate learner)
  b) Asch's conformity experiments (1951): line judgment task, 75% conformed at least once, 37% mean conformity rate, variations (group size, unanimity, ally effect), informational vs normative influence
  c) Zimbardo's Stanford Prison Experiment (1971): random assignment to guard/prisoner roles, terminated after 6 days, situational power of roles — BUT note severe methodological criticisms (demand characteristics, small N=24, selection bias, experimenter as participant, recent reanalysis challenges)
  d) Sherif's Robbers Cave (1954/1961): realistic conflict theory, three phases (in-group formation, friction, integration through superordinate goals), 22 boys, naturalistic field experiment
  e) Festinger's cognitive dissonance (1957/1959): $1 vs $20 experiment (insufficient justification), forced compliance paradigm, free-choice paradigm, selective exposure
  f) Darley & Latane's bystander effect (1968): Kitty Genovese case as catalyst (note: original reporting was inaccurate — Manning et al., 2007), diffusion of responsibility, pluralistic ignorance, evaluation apprehension, five-step model (notice -> interpret -> assume responsibility -> know how to help -> decide to help)
- Effect sizes and replication status:
  a) Report Cohen's d, r, or eta-squared where available from meta-analyses
  b) Replication status: indicate which findings have been successfully replicated in large-scale replication projects (Many Labs, Open Science Collaboration 2015) and which have failed replication or shown substantially smaller effects
  c) Publication bias considerations: file-drawer problem, p-hacking, pre-registration movement
  d) Cross-cultural replication: which findings generalize across cultures (WEIRD problem — Henrich, Heine & Norenzayan, 2010) and which are culturally specific
- Ethical considerations:
  a) Deception: when justified, debriefing requirements, psychological harm assessment
  b) Informed consent: specific challenges in social psychology where revealing the hypothesis would invalidate the study
  c) APA Ethical Principles: beneficence, nonmaleficence, fidelity, justice, respect for autonomy
  d) Institutional Review Boards (IRBs): how ethical oversight has changed methodology since Milgram and Zimbardo
  e) Right to withdraw, protection from harm, confidentiality, risk-benefit analysis
- Cultural variations:
  a) Individualism vs collectivism (Hofstede, Triandis): effects on conformity, attribution, self-concept, motivation
  b) Independent vs interdependent self-construal (Markus & Kitayama, 1991): implications for emotion, cognition, and motivation
  c) Attribution differences: fundamental attribution error is weaker in collectivistic cultures (Miller, 1984); Japanese participants show greater situational attribution
  d) Cross-cultural differences in prosocial behavior, aggression, attraction, and group dynamics`;

const NEURO_MODULE_BLOCK = `
NEUROPSYCHOLOGY-SPECIFIC DEPTH REQUIREMENTS:
- Brain region to function mapping:
  a) Frontal lobe: prefrontal cortex (dorsolateral — working memory, planning, cognitive flexibility; ventromedial — decision-making, emotional regulation, reward processing; orbitofrontal — impulse control, social behavior), motor cortex (primary M1, premotor, supplementary motor area), Broca's area (BA44/45 — speech production, syntax)
  b) Temporal lobe: auditory cortex (A1 — Heschl's gyrus), Wernicke's area (BA22 — speech comprehension), medial temporal lobe (hippocampus — episodic memory encoding and spatial navigation; amygdala — fear conditioning, emotional memory, threat detection), fusiform gyrus (face processing — fusiform face area, FFA)
  c) Parietal lobe: somatosensory cortex (S1 — tactile processing), posterior parietal cortex (spatial attention, sensorimotor integration), angular gyrus (reading, arithmetic, semantic processing), supramarginal gyrus (phonological processing)
  d) Occipital lobe: primary visual cortex (V1), visual association areas (V2, V3, V4 — color, V5/MT — motion), dorsal stream ("where/how") vs ventral stream ("what")
  e) Subcortical structures: basal ganglia (caudate, putamen, globus pallidus — motor control, habit learning, reward), thalamus (sensory relay, except olfaction), hypothalamus (homeostasis, HPA axis), cerebellum (motor coordination, timing, error-based learning, cognitive functions)
- Neurotransmitter systems:
  a) Dopamine: mesolimbic pathway (reward, motivation, addiction), mesocortical pathway (cognition, executive function — hypofunction in schizophrenia negative symptoms), nigrostriatal pathway (motor control — degeneration in Parkinson's), tuberoinfundibular pathway (prolactin regulation)
  b) Serotonin (5-HT): raphe nuclei origin, roles in mood regulation, sleep-wake cycle, appetite, pain modulation — involvement in depression (serotonin hypothesis and its limitations), anxiety, OCD
  c) Norepinephrine: locus coeruleus origin, roles in arousal, attention, stress response (fight-or-flight), mood — involvement in ADHD, PTSD, depression
  d) GABA: primary inhibitory neurotransmitter, GABA-A receptor (ionotropic, Cl- channel — benzodiazepine binding site, barbiturate binding site, alcohol effects), GABA-B receptor (metabotropic) — involvement in anxiety disorders, epilepsy
  e) Glutamate: primary excitatory neurotransmitter, NMDA receptor (voltage-dependent Mg2+ block, role in LTP and memory), AMPA receptor, metabotropic glutamate receptors — excitotoxicity in neurodegeneration
  f) Acetylcholine: basal forebrain (memory, attention — loss in Alzheimer's), neuromuscular junction, autonomic nervous system
- Research methods:
  a) fMRI: BOLD signal (blood-oxygen-level-dependent), measures hemodynamic response (not direct neural activity), spatial resolution (~1-3mm), temporal resolution (~1-2s), block designs vs event-related designs, resting-state connectivity, strengths (non-invasive, good spatial resolution), limitations (indirect measure, costly, motion artifacts, reverse inference problem)
  b) EEG: measures electrical activity via scalp electrodes, excellent temporal resolution (~1ms), poor spatial resolution, event-related potentials (ERPs — N170, P300, N400, P600), frequency bands (delta, theta, alpha, beta, gamma), clinical applications (epilepsy, sleep staging)
  c) Lesion studies: naturally occurring (stroke, tumor, TBI) and animal lesion models, single dissociations vs double dissociations, classic cases (HM/Henry Molaie — hippocampus and memory; Phineas Gage — frontal lobe and personality; Broca's patient Tan — speech production), limitations (lesions rarely respect functional boundaries, plasticity, pre-morbid function unknown)
  d) TMS and tDCS: non-invasive brain stimulation, virtual lesion approach (TMS), modulation of cortical excitability (tDCS), research and clinical applications
  e) PET: radioactive tracers, measures metabolic activity or neurotransmitter binding, better for receptor mapping and neurochemistry, limitations (invasive due to radiation, poor temporal resolution)
- Neural pathway descriptions:
  a) Describe specific tracts and circuits: corticospinal tract (voluntary movement), spinothalamic tract (pain, temperature), dorsal column-medial lemniscus (fine touch, proprioception)
  b) Limbic circuit: hippocampus -> fornix -> mammillary bodies -> anterior thalamic nuclei -> cingulate cortex -> parahippocampal gyrus -> hippocampus (Papez circuit, extended by MacLean)
  c) Prefrontal-subcortical circuits: dorsolateral prefrontal, orbitofrontal, anterior cingulate — each with distinct cognitive/behavioral functions and clinical syndromes when disrupted
  d) Reward circuit: VTA -> nucleus accumbens -> prefrontal cortex (mesolimbic/mesocortical dopamine), role in addiction, motivation, reinforcement learning`;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Module Generation Depth Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the depth instructions injected into the module generation prompt
 * when psychology content is detected.
 *
 * Replaces the generic "200-400 words" instruction with 600-1200 word
 * comprehensive academic-depth content requirements.
 *
 * @param {string[]} subdisciplines - e.g. ['clinical', 'developmental', 'cognitive']
 * @returns {string} Prompt section to inject
 */
function buildPsychologyDepthSection(subdisciplines = []) {
  const subdisciplineBlocks = buildSubdisciplineModuleBlocks(subdisciplines);

  return `
PSYCHOLOGY — ENHANCED DEPTH INSTRUCTIONS:
Override the default content length. Each module MUST contain 600-1200 words of substantive content. Surface-level summaries are unacceptable for psychology education.

MANDATORY COVERAGE FOR EVERY PSYCHOLOGICAL CONCEPT:
For each theory, model, disorder, phenomenon, or research finding covered in a module, you MUST address ALL of the following (where applicable to the topic):

a) THEORY / MODEL:
   - Original theorist/researcher, year, and publication context
   - Core propositions and assumptions
   - Formal definitions of key constructs with operational definitions where applicable
   - How the theory explains the phenomenon — step-by-step causal or process account
   - Position within broader theoretical tradition (behaviorist, cognitive, psychodynamic, humanistic, biological, sociocultural)

b) KEY RESEARCH:
   - Landmark studies: researcher(s), year, sample (N, demographics), methodology, key findings, and effect sizes where available
   - Subsequent replications and extensions: successful replications, failed replications, boundary conditions
   - Meta-analytic findings: pooled effect sizes, moderators identified, number of studies included
   - Cross-cultural evidence: does the finding generalize beyond WEIRD (Western, Educated, Industrialized, Rich, Democratic) samples?

c) METHODOLOGY:
   - Research design used to establish the finding (experimental, quasi-experimental, correlational, longitudinal, cross-sectional, qualitative)
   - Independent and dependent variables with operationalization details
   - Control conditions and confounds addressed
   - Statistical analyses employed and key statistics reported (p-values, confidence intervals, effect sizes)
   - Methodological strengths and limitations specific to the research described

d) EVIDENCE:
   - Converging evidence from multiple methods (behavioral, neuroimaging, clinical, developmental, cross-cultural)
   - Contradictory evidence and unresolved debates
   - Ecological validity: how well laboratory findings translate to real-world settings
   - Replication status in light of the replication crisis in psychology (Open Science Collaboration, 2015)

e) APPLICATIONS:
   - Clinical applications: therapeutic techniques derived from the theory/finding
   - Educational applications: implications for teaching, learning, and curriculum design
   - Organizational/workplace applications where relevant
   - Policy implications: how the research has influenced or should influence public policy
   - Forensic applications where relevant

f) CRITICISMS / LIMITATIONS:
   - Methodological criticisms: sample limitations, measurement issues, confounds
   - Theoretical criticisms: alternative explanations, parsimony, falsifiability
   - Ethical criticisms: historical ethical concerns with the research or its application
   - Cultural and diversity criticisms: assumptions about universality, lack of diverse samples
   - Contemporary status: is this theory/finding still accepted, modified, or largely abandoned?

STRUCTURAL TEMPLATE — present content in this order:
Theory/Model -> Key Research -> Methodology -> Evidence -> Applications -> Criticisms/Limitations
${subdisciplineBlocks}
IMPORTANT: Every module must be anchored in the student's study material. Use these depth guidelines to ENHANCE the source content, not replace it. If the source material covers a topic briefly, expand it using these requirements. If the source material goes deeper in a specific area, preserve that depth.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Quiz / Question Generation Depth Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the depth instructions injected into quiz and question generation
 * prompts when psychology content is detected.
 *
 * @param {string[]} subdisciplines - detected subdisciplines
 * @returns {string} Prompt section to inject
 */
function buildPsychologyQuizDepthSection(subdisciplines = []) {
  const subdisciplineBlocks = buildSubdisciplineQuizBlocks(subdisciplines);

  return `
PSYCHOLOGY — QUIZ DEPTH INSTRUCTIONS:
Questions MUST test critical thinking, research literacy, and application, NOT simple recall of names and dates.

MANDATORY QUESTION FORMATS:
1. CASE STUDY ANALYSIS (at least 40% of questions):
   - Format: "A [age]-year-old [person] presents to a psychologist with [symptoms/behaviors] for [duration]. Background includes [relevant history]. Assessment reveals [test results/observations]. Based on DSM-5-TR criteria, what is the most likely diagnosis?"
   - Case studies must include enough detail for differential diagnosis — not just one textbook keyword
   - Include relevant positives AND negatives in the case
   - Vary the question stems: "most likely diagnosis", "most appropriate evidence-based treatment", "which assessment tool would be most informative", "which theoretical perspective best explains this presentation", "what is the most important differential to rule out"

2. RESEARCH METHODOLOGY CRITIQUE (at least 20% of questions):
   - Present a brief study description and ask students to identify:
     a) Threats to internal validity (confounding variables, demand characteristics, experimenter bias)
     b) Threats to external validity (sample limitations, ecological validity, generalizability)
     c) Appropriate statistical analysis for the design described
     d) Whether the conclusions are supported by the methodology (correlation vs causation)
   - Example: "A researcher finds that children who watch more violent TV have higher aggression scores (r = 0.35, p < .01). The researcher concludes that violent TV causes aggression. What is the primary methodological limitation of this conclusion?"

3. THEORY APPLICATION TO SCENARIOS:
   - Present a real-world scenario and ask which theoretical perspective best explains it
   - Require students to apply a specific theory to generate predictions about behavior
   - Example: "According to Bandura's social learning theory, which of the following conditions would MOST increase the likelihood that a child imitates an aggressive model?"
   - Include questions requiring comparison of how different theories explain the same phenomenon

4. EXPERIMENTAL DESIGN QUESTIONS:
   - Ask students to identify the IV, DV, control conditions, and potential confounds
   - Present a research question and ask students to design an appropriate study
   - Example: "A researcher hypothesizes that mindfulness meditation reduces test anxiety. Design a study to test this hypothesis. What would be the most appropriate control condition?"
   - Include questions on operationalization: "How would you operationally define 'aggression' in a study of preschool children?"

5. DATA INTERPRETATION:
   - Present results (means, SDs, p-values, effect sizes, confidence intervals) and ask for interpretation
   - Example: "A meta-analysis of CBT for depression reports a pooled effect size of d = 0.71 (95% CI: 0.56-0.86) across 42 RCTs. What does this indicate about the efficacy of CBT for depression?"
   - Include questions on statistical conclusion validity: sample size, power, Type I/II errors

MCQ DISTRACTOR QUALITY:
- Every distractor must represent a plausible alternative theory, diagnosis, methodology, or interpretation
- Avoid obviously absurd options
- Include at least one "close distractor" that tests nuanced understanding (e.g., similar diagnoses, related but distinct theories)
- Explanations must explain why EACH incorrect option is wrong, not just why the correct answer is right
- When a question involves a study, explanations must address the methodological reasoning
${subdisciplineBlocks}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tutor Chat Depth Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the depth instructions injected into the tutor chat prompt
 * when psychology content is detected.
 *
 * @param {string[]} subdisciplines - detected subdisciplines
 * @returns {string} Prompt section to inject
 */
function buildPsychologyTutorDepthSection(subdisciplines = []) {
  const subdisciplineBlocks = buildSubdisciplineTutorBlocks(subdisciplines);

  return `
PSYCHOLOGY — TUTOR DEPTH INSTRUCTIONS:
You are tutoring a psychology student. Apply these rules to ALL responses:

1. ALWAYS CITE LANDMARK STUDIES:
   When discussing any psychological phenomenon, ALWAYS reference the key researchers and studies:
   - Format: "Researcher (Year) demonstrated that..." or "In the classic study by Researcher (Year)..."
   - Include: researcher name(s), year, brief methodology, key finding, sample size where notable
   - Example: "Milgram (1963) demonstrated that 65% of participants administered what they believed were lethal shocks to a confederate, showing the powerful influence of authority on obedience. The study used 40 male participants recruited through newspaper ads."
   - When multiple studies support a point, cite the most influential ones, not just one
   - Distinguish between primary sources (original research) and secondary summaries

2. DISTINGUISH CORRELATION FROM CAUSATION:
   This is a CRITICAL thinking skill in psychology. Apply it consistently:
   - When a finding is correlational, ALWAYS state: "This is a correlational finding — it shows that X and Y are related, but we cannot conclude that X causes Y"
   - Explain the three criteria for causal inference: covariation, temporal precedence, elimination of alternative explanations
   - Identify the "third variable problem" whenever relevant: "The relationship between X and Y might be explained by Z"
   - Distinguish between experimental and correlational evidence for the same phenomenon
   - Use phrases like: "Experimental evidence from [study] supports a causal link...", "Correlational data suggest an association, but the direction of causation is unclear..."

3. DISCUSS METHODOLOGICAL STRENGTHS AND LIMITATIONS:
   For every study or finding discussed, address methodology:
   - Sample: size, demographics, recruitment method, WEIRD bias
   - Design: experimental vs correlational vs quasi-experimental, within vs between subjects
   - Measurement: reliability and validity of instruments, operationalization choices
   - Specific limitations: demand characteristics, social desirability, experimenter bias, attrition, practice effects
   - Strengths: what the study design does well, why it is an appropriate methodology for the question
   - Replication status: has the finding been replicated? In what contexts has it failed to replicate?

4. MULTI-PERSPECTIVE ANALYSIS:
   Psychology is a multi-paradigm discipline. When explaining any phenomenon:
   - Present at least 2-3 theoretical perspectives (biological, cognitive, behavioral, psychodynamic, humanistic, sociocultural, evolutionary)
   - Compare their explanations: what does each perspective emphasize? What does each miss?
   - Example: "Depression can be understood from multiple perspectives: biologically (monoamine hypothesis, HPA axis dysregulation), cognitively (Beck's cognitive triad, negative automatic thoughts), behaviorally (learned helplessness, reduced positive reinforcement), and socioculturally (social isolation, cultural factors, socioeconomic stressors)."

5. EVIDENCE HIERARCHY:
   When presenting evidence, be explicit about its quality:
   - "A single case study suggests..." (weakest)
   - "Correlational studies show an association between..."
   - "Quasi-experimental evidence indicates..."
   - "Randomized controlled trials demonstrate..." (strong)
   - "A meta-analysis of N studies (combined N = X) found..." (strongest)
   - Acknowledge the replication crisis and its implications for confidence in specific findings

6. COMPLETE PSYCHOLOGICAL PICTURE:
   When a student asks about any concept, provide the COMPLETE picture systematically:
   Theory/Model -> Key Researchers and Studies -> Methodology -> Supporting Evidence -> Applications -> Criticisms/Limitations -> Current Status
   Do not leave gaps — if the student asks "What is [concept]?", they expect a thorough, structured answer, not a one-liner.

7. CRITICAL EVALUATION:
   Encourage and model critical thinking:
   - "What are the strengths and limitations of this study?"
   - "How might we design a study to test the alternative explanation?"
   - "If you were on the ethics board reviewing this study, what concerns would you raise?"
   - "How does this finding apply to populations that differ from the original sample?"
   - Challenge the student to evaluate evidence, not just accept it

8. ETHICAL AWARENESS:
   When relevant, discuss the ethical dimensions of psychological research and practice:
   - Historical ethical violations and what they taught the field (Milgram, Zimbardo, Little Albert, Tuskegee)
   - Current ethical standards: APA Ethics Code, informed consent, confidentiality, duty to warn, competence
   - Ethical dilemmas in practice: dual relationships, cultural competence, boundary issues
${subdisciplineBlocks}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — assemble subdiscipline-specific blocks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map of subdiscipline names to their module-generation depth blocks.
 */
const SUBDISCIPLINE_MODULE_BLOCKS = {
  clinical: CLINICAL_MODULE_BLOCK,
  developmental: DEVELOPMENTAL_MODULE_BLOCK,
  cognitive: COGNITIVE_MODULE_BLOCK,
  social: SOCIAL_MODULE_BLOCK,
  neuro: NEURO_MODULE_BLOCK,
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
    // No specific subdiscipline detected — include a general note
    return `
SUBDISCIPLINE NOTE: No specific psychology subdiscipline was strongly detected. Apply the general psychology depth requirements above. If the content touches on clinical, developmental, cognitive, social, or neuropsychology, apply the appropriate level of detail for that area.`;
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

  if (subdisciplines.includes('clinical')) {
    blocks.push(`
CLINICAL PSYCHOLOGY QUIZ-SPECIFIC:
- Include case study questions requiring DSM-5-TR diagnosis from a clinical vignette:
  "A 34-year-old woman reports persistent sadness, loss of interest in activities, insomnia, fatigue, difficulty concentrating, and recurrent thoughts of death for the past 3 weeks. She denies substance use. PHQ-9 score is 22. According to DSM-5-TR criteria, what is the most likely diagnosis, and what is the minimum symptom duration required?"
- Include questions on differential diagnosis:
  "A patient presents with depressed mood, weight gain, fatigue, and psychomotor retardation. Which additional finding would MOST strongly suggest hypothyroidism rather than Major Depressive Disorder?"
- Include questions on evidence-based treatment selection:
  "For a patient with moderate severity OCD (YBOCS score of 22), what is the first-line evidence-based treatment according to APA guidelines, and what is the expected effect size?"
- Include questions on psychometric properties of assessment tools:
  "A screening tool has a sensitivity of 0.90 and specificity of 0.60 for detecting depression. In a population with 10% prevalence, what is the approximate positive predictive value, and what are the implications for clinical use?"
- Test the distinction between similar diagnostic categories (e.g., Bipolar II vs MDD with mixed features, PTSD vs Acute Stress Disorder, GAD vs adjustment disorder with anxiety)`);
  }

  if (subdisciplines.includes('developmental')) {
    blocks.push(`
DEVELOPMENTAL PSYCHOLOGY QUIZ-SPECIFIC:
- Include scenario-based questions applying stage theories:
  "A 5-year-old child is shown two identical glasses of water. The water from one glass is poured into a taller, narrower glass. The child says the taller glass has 'more water.' According to Piaget, which cognitive limitation explains this response, and in which stage would the child typically overcome it?"
- Include research design evaluation questions:
  "A researcher wants to study how language abilities change from age 2 to age 10. Compare the advantages and disadvantages of using a longitudinal design versus a cross-sectional design for this research question."
- Include questions on milestone recognition and red flags:
  "A 15-month-old child does not respond to their name, makes no attempt at words, and shows no joint attention behaviors. Which developmental concern is most warranted, and what assessment tool would be most appropriate?"
- Include questions requiring application of attachment theory:
  "In the Strange Situation, a 14-month-old shows distress upon separation, seeks comfort upon reunion but also hits the caregiver, and is not easily soothed. What attachment classification does this pattern represent, and what caregiving style is typically associated with it?"
- Test understanding of research methodology debates: nature vs nurture, critical vs sensitive periods, continuity vs discontinuity`);
  }

  if (subdisciplines.includes('cognitive')) {
    blocks.push(`
COGNITIVE PSYCHOLOGY QUIZ-SPECIFIC:
- Include questions requiring explanation of experimental paradigm results:
  "In a Stroop task, participants name the ink color of color words. Response times are significantly slower for incongruent trials (e.g., the word 'RED' in blue ink) compared to congruent trials. Explain this finding in terms of automatic and controlled processing."
- Include questions on memory model application:
  "A patient with damage to the hippocampus can still learn new motor skills (e.g., mirror tracing) but cannot form new episodic memories. Which memory model best accounts for this dissociation, and what does this tell us about memory systems?"
- Include questions on cognitive bias identification:
  "A hiring manager interviews a candidate and, within the first 30 seconds, forms a positive impression based on the candidate's firm handshake. For the remaining 45 minutes, the manager primarily asks questions that confirm this positive impression and discounts contradictory information. Identify the cognitive bias and explain the underlying mechanism."
- Include experimental design questions:
  "Design a study to test whether divided attention during encoding impairs recall more than divided attention during retrieval. Specify your IV, DV, conditions, and control variables."
- Test understanding of the relationship between cognitive models and neural substrates (e.g., working memory model components and their neural correlates)`);
  }

  if (subdisciplines.includes('social')) {
    blocks.push(`
SOCIAL PSYCHOLOGY QUIZ-SPECIFIC:
- Include questions requiring critical evaluation of classic studies:
  "Zimbardo's Stanford Prison Experiment (1971) is frequently cited as evidence for the power of situational forces on behavior. Identify three methodological limitations of this study that weaken this conclusion."
- Include questions on replication and effect sizes:
  "The original study on ego depletion (Baumeister et al., 1998) reported a large effect. A subsequent pre-registered replication across 23 labs (Hagger et al., 2016) found a near-zero effect (d = 0.04). What does this pattern suggest about the original finding, and what methodological factors might explain the discrepancy?"
- Include questions applying social psychological theories to real-world scenarios:
  "A bystander witnesses a person collapse on a crowded city street but does not intervene. Using Darley and Latane's model, explain the psychological processes that might account for the bystander's inaction, and identify which step in the model was most likely the point of failure."
- Include questions on cultural variations:
  "Research on the fundamental attribution error suggests that East Asian participants are more likely to make situational attributions than Western participants. Explain this finding in terms of independent vs interdependent self-construal (Markus & Kitayama, 1991)."
- Test the ability to distinguish correlation from causation in social psychological research and to identify confounding variables in quasi-experimental field studies`);
  }

  if (subdisciplines.includes('neuro')) {
    blocks.push(`
NEUROPSYCHOLOGY QUIZ-SPECIFIC:
- Include questions on brain-behavior relationships from case descriptions:
  "A patient with damage to the ventromedial prefrontal cortex performs normally on IQ tests and memory tasks but makes catastrophically poor decisions in daily life and shows impaired emotional regulation. Which classic case is this pattern consistent with, and what does the Iowa Gambling Task reveal about this deficit?"
- Include questions on neurotransmitter system dysfunction:
  "A patient presents with resting tremor, bradykinesia, and rigidity. Which neurotransmitter system and specific neural pathway are primarily affected? Explain why dopamine replacement (L-DOPA) is effective but does not halt disease progression."
- Include questions on research method selection:
  "A researcher wants to investigate the precise timing of neural responses to emotional faces versus neutral faces. Which neuroimaging technique would be most appropriate, and why? What would be the main limitation of using fMRI for this specific research question?"
- Include questions requiring interpretation of neuroimaging findings:
  "An fMRI study shows increased BOLD signal in the amygdala when participants view fearful faces compared to neutral faces. What does this tell us about amygdala function, and what caution should we exercise in interpreting BOLD signal as a direct measure of neural activity?"
- Test understanding of double dissociations and their importance for neuropsychological theory:
  "Patient A has impaired episodic memory but intact procedural learning. Patient B has impaired procedural learning but intact episodic memory. What does this double dissociation tell us about the organization of memory in the brain?"`);
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

  if (subdisciplines.includes('clinical')) {
    blocks.push(`
CLINICAL PSYCHOLOGY TUTORING APPROACH:
- When explaining disorders, ALWAYS use the systematic format:
  DSM-5-TR Criteria (with code) -> Prevalence & Demographics -> Etiology (biopsychosocial model) -> Assessment (specific tools with psychometric properties) -> Evidence-Based Treatment (with effect sizes) -> Prognosis & Course -> Differential Diagnosis
- Emphasize the biopsychosocial model: "Depression is not simply a 'chemical imbalance' — biological factors (genetics, neurotransmitter dysregulation), psychological factors (cognitive distortions, learned helplessness, personality traits), and social factors (social isolation, life stressors, socioeconomic status) all contribute and interact."
- When discussing treatment, always cite the evidence base: "CBT for depression has demonstrated efficacy with an effect size of d = 0.71 in meta-analyses (Cuijpers et al., 2013), comparable to antidepressant medication for moderate severity."
- Compare and contrast similar diagnoses using tables: "GAD vs Panic Disorder vs Social Anxiety Disorder — core fear, physical symptoms, avoidance pattern, first-line treatment"
- Address the dimensional vs categorical debate: "While the DSM uses categorical diagnoses, research increasingly supports dimensional models like HiTOP and RDoC that capture the spectrum nature of psychopathology"`);
  }

  if (subdisciplines.includes('developmental')) {
    blocks.push(`
DEVELOPMENTAL PSYCHOLOGY TUTORING APPROACH:
- When explaining developmental concepts, ALWAYS ground them in specific age ranges and observable behaviors:
  "Object permanence typically emerges around 8 months — before this, an infant will not search for a toy hidden under a blanket. Piaget's A-not-B error (searching in the previously successful location) demonstrates the gradual nature of this achievement."
- Compare stage theories side by side: "At age 6, a child is in Piaget's preoperational→concrete operational transition, Erikson's Industry vs Inferiority stage, and Kohlberg's preconventional level — show how these different perspectives illuminate different aspects of the same child's development."
- Always distinguish between normative development and clinically significant delays: "While there is considerable normal variation in when children achieve milestones, persistent absence of joint attention by 18 months warrants developmental screening."
- Connect research methodology to conclusions: "This finding comes from a cross-sectional study, so the observed age differences could reflect cohort effects rather than true developmental change. A longitudinal design would be needed to confirm actual developmental trajectories."
- Address nature-nurture interaction with specific examples: "Heritability of IQ is estimated at 0.50-0.80 in adulthood (Bouchard & McGue, 1981; Plomin et al., 2016), but heritability is a population statistic — it does not mean that 50-80% of an individual's intelligence is genetic. Gene-environment interactions (like the MAOA gene and childhood maltreatment interaction found by Caspi et al., 2002) show that genes and environment are inseparable."`);
  }

  if (subdisciplines.includes('cognitive')) {
    blocks.push(`
COGNITIVE PSYCHOLOGY TUTORING APPROACH:
- When explaining cognitive models, ALWAYS walk through the information flow step by step:
  "In Baddeley's Working Memory Model, when you try to remember a phone number: the phonological loop's articulatory rehearsal process actively refreshes the digits (subvocal repetition), maintaining them in the phonological store. If you are simultaneously asked to count backwards, this occupies the articulatory rehearsal process, and the digits decay from the phonological store within about 2 seconds."
- Connect models to evidence: "We know the phonological loop exists because of the phonological similarity effect (Conrad & Hull, 1964) — lists of similar-sounding letters (B, C, D, G, T) are harder to recall than dissimilar ones (K, R, W, Y, X), even when presented visually. This suggests a speech-based code in short-term memory."
- When discussing biases, use concrete examples the student can experience: "Try the anchoring effect yourself: if I first ask 'Is the population of Turkey more or less than 150 million?' and then ask you to estimate the actual population, your estimate will likely be higher than if I had anchored you with 20 million."
- Link cognitive psychology to practical applications: "Understanding the testing effect (retrieval practice) has direct implications for study strategies — actively recalling information is more effective for long-term retention than passive re-reading (Roediger & Karpicke, 2006)."
- Always discuss ecological validity: "Most cognitive psychology experiments use artificial lab tasks. The question is always: do these controlled findings reflect how cognition works in the messy, motivated, emotional real world?"`);
  }

  if (subdisciplines.includes('social')) {
    blocks.push(`
SOCIAL PSYCHOLOGY TUTORING APPROACH:
- When discussing classic studies, ALWAYS include methodological details AND modern critique:
  "Milgram's study used a standardized procedure with scripted prods from the experimenter. However, recent analysis of Milgram's archives (Perry, 2012) revealed that many participants were suspicious of the setup, the 'prods' were sometimes delivered more forcefully than scripted, and the debriefing data were selectively reported. The obedience rates may therefore overestimate genuine compliance."
- Always report effect sizes alongside statistical significance: "While the study found a statistically significant effect (p < .01), the effect size was small (d = 0.15), meaning the practical significance is limited despite statistical significance."
- Address the replication crisis explicitly: "This is one of the findings that has not been successfully replicated in recent large-scale attempts. The Many Labs 2 project (Klein et al., 2018) found [result], which suggests we should hold this finding with appropriate uncertainty."
- Discuss the WEIRD problem (Henrich et al., 2010) for every major finding: "This study was conducted with American college students. Cross-cultural research by [researchers] found that the effect [was/was not] observed in [cultures], suggesting that [conclusion about universality/cultural specificity]."
- Encourage critical thinking about real-world application: "How might the fundamental attribution error play out differently in a collectivistic culture where situational explanations are more normative?"
- Always distinguish between laboratory demonstrations and real-world behavior: "The bystander effect has been demonstrated reliably in laboratory settings, but field studies and CCTV footage analyses (Philpot et al., 2020) show that bystander intervention is actually quite common in real-world emergencies."`);
  }

  if (subdisciplines.includes('neuro')) {
    blocks.push(`
NEUROPSYCHOLOGY TUTORING APPROACH:
- When explaining brain-behavior relationships, ALWAYS specify the evidence type:
  "We know that the hippocampus is critical for episodic memory encoding from converging evidence: lesion studies (Patient HM — bilateral medial temporal lobe resection resulted in profound anterograde amnesia), fMRI studies (hippocampal activation during successful encoding — the subsequent memory effect), and animal studies (Morris water maze performance after hippocampal lesions in rats)."
- Use precise neuroanatomical language: "The dorsolateral prefrontal cortex (Brodmann areas 9 and 46)" rather than just "the frontal lobe"
- Explain neurotransmitter effects at the receptor level: "SSRIs block the serotonin transporter (SERT), preventing reuptake of 5-HT from the synaptic cleft. This increases serotonin availability at postsynaptic 5-HT receptors. However, the therapeutic delay of 2-4 weeks suggests that downstream neuroplastic changes (receptor downregulation, BDNF upregulation, hippocampal neurogenesis) are the actual mechanism of antidepressant action."
- When discussing neuroimaging findings, ALWAYS note the inferential limitations: "fMRI shows us where blood flow increases, not which neurons are firing. The BOLD signal is an indirect, hemodynamic measure with a temporal resolution of seconds — far slower than neural activity. Seeing 'activation' in a brain region during a task does not prove that region is necessary for the task (it might be incidental). Lesion studies or TMS provide stronger evidence for necessity."
- Discuss the structure-function relationship with appropriate complexity: "The amygdala's role extends beyond 'fear center' — it responds to salience and relevance more broadly, including positive stimuli. The 'fear center' label is an oversimplification that persists in popular neuroscience."
- Connect neuroscience to clinical applications: "Understanding the dopaminergic pathways explains both the therapeutic effects and side effects of antipsychotics: blocking D2 receptors in the mesolimbic pathway reduces positive symptoms, but blocking D2 receptors in the nigrostriatal pathway causes extrapyramidal side effects, and blocking D2 in the tuberoinfundibular pathway causes hyperprolactinemia."`);
  }

  return blocks.length > 0 ? `\n${blocks.join('\n')}` : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  buildPsychologyDepthSection,
  buildPsychologyQuizDepthSection,
  buildPsychologyTutorDepthSection,
};
