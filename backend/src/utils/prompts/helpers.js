function buildInterestsSection(interests, teachingLevel = null) {
  if (!interests || interests.length === 0) return '';

  const interestsList = interests.join(', ');

  if (teachingLevel === 'dummy') {
    return `The student likes: ${interestsList}.
Use their interests to create VERY simple, everyday analogies that make the concept instantly click. Rules:
- Keep each analogy to one short sentence — "Think of X like Y"
- The analogy must be simpler than the concept itself — if it needs explaining, don't use it
- Use the most obvious, surface-level connection to their interest — nothing technical
- Only use an analogy when it genuinely makes things easier, skip it if it would confuse
Example: If they like Sports → "Your heart pumps blood around your body, kind of like how a player passes the ball around the field to keep the game going."`;
  }

  if (teachingLevel === 'beginner') {
    return `The student's interests include: ${interestsList}.
Use their interests to create clear, relatable analogies when explaining concepts. Rules:
- One straightforward comparison per concept — don't stack multiple analogies
- The analogy itself should need zero explanation — it should be immediately obvious
- Connect to the fun, familiar side of their interest, not the technical side
- If an analogy would add confusion instead of clarity, leave it out
Example: If they like Gaming → "A variable is like a chest in a game — it holds something you can open and use later."`;
  }

  if (teachingLevel === 'advanced') {
    return `The student's interests include: ${interestsList}.
Where relevant, draw sophisticated parallels between academic concepts and the student's interests. You can reference technical aspects of their hobbies to build deeper understanding and illuminate nuances or edge cases.`;
  }

  // intermediate or unspecified — balanced approach
  return `The student's interests include: ${interestsList}.
Incorporate the student's interests into explanations through natural analogies and examples. For each major concept, include at least one connection to their interests that genuinely clarifies the idea. The analogy should be self-explanatory — the student should not need to understand a complex hobby concept to grasp the academic one.`;
}

/**
 * Build a prompt section describing the student's learning style (VARK).
 * @param {string} learningStyle - 'visual' | 'auditory' | 'reading_writing' | 'kinesthetic'
 */
function buildLearningStyleSection(learningStyle) {
  if (!learningStyle || learningStyle === 'auto') return '';

  const styleGuides = {
    visual: `Learning style: VISUAL learner.
Adaptation rules for visual learners:
- Use diagrams, charts, mind maps, and visual representations whenever possible
- Describe spatial relationships and use "picture this..." framing
- Use color-coding metaphors (e.g. "think of X as the red zone, Y as the green zone")
- Include visual summaries — tables, comparison grids, and flowchart descriptions
- When explaining processes, describe them as visual flows or timelines`,

    auditory: `Learning style: AUDITORY learner.
Adaptation rules for auditory learners:
- Use conversational, story-telling explanations — narrate the concept as if telling a story
- Include mnemonics, rhymes, and memorable phrases to aid recall
- Use plenty of real-world analogies and "imagine someone explaining this to you..." framing
- Frame explanations as dialogues or Q&A when possible
- Repeat key terms and definitions in different ways to reinforce through verbal patterns`,

    reading_writing: `Learning style: READING/WRITING learner.
Adaptation rules for reading/writing learners:
- Provide detailed written explanations with clear structure and headings
- Use bullet points, numbered lists, and well-organized text
- Include definitions, glossary-style key terms, and written summaries
- Encourage note-taking by providing key points in a format easy to copy
- Use precise, well-crafted language — clarity and completeness matter most`,

    kinesthetic: `Learning style: KINESTHETIC learner.
Adaptation rules for kinesthetic learners:
- Focus on hands-on, step-by-step walkthroughs and practical exercises
- Use "try this...", "let's work through...", and action-oriented language
- Break concepts into small, doable steps the student can follow along with
- Include practice problems, experiments, or real-world applications after each concept
- Relate abstract ideas to physical/tangible experiences and real-world scenarios`,
  };

  return styleGuides[learningStyle] || '';
}

/**
 * Build a prompt section describing the student's learning pace.
 * @param {string} pace - 'slow' | 'moderate' | 'fast'
 */
function buildPaceSection(pace) {
  if (!pace || pace === 'auto') return '';

  const paceGuides = {
    slow: `Learning pace: SLOW (needs more scaffolding).
Pace adaptation rules:
- Provide MORE examples and simpler language for every concept
- Break explanations into smaller, bite-sized chunks — one idea at a time
- Add extra practice questions and comprehension checks throughout
- Use step-by-step breakdowns even for straightforward concepts
- Repeat key ideas using different phrasing for reinforcement
- Include "checkpoint" summaries after every major point
- Be extra encouraging and patient in tone`,

    moderate: `Learning pace: MODERATE (balanced approach).
Pace adaptation rules:
- Use a balanced mix of explanation and examples
- Provide 1-2 examples per concept, with optional deeper exploration
- Standard pacing — cover concepts thoroughly but efficiently
- Include comprehension checks at natural breakpoints`,

    fast: `Learning pace: FAST (can accelerate).
Pace adaptation rules:
- Be concise and direct — skip obvious setup and get to the core insight quickly
- Minimize repetition — state key points once, clearly
- Focus on connections between concepts, advanced implications, and edge cases
- Include challenge questions that test deeper understanding rather than basic recall
- Assume prerequisites are understood unless the student asks otherwise
- Offer "deep dive" extensions and advanced applications
- Connect new concepts to broader frameworks and real-world complexity`,
  };

  return paceGuides[pace] || '';
}

/**
 * Detect if document content is legal in nature and return jurisdiction-aware grounding instructions.
 * The section is injected into module generation prompts to ensure legal content is grounded in
 * the correct jurisdiction's laws, constitution, and official sources.
 */
function buildLegalGroundingSection(documentText) {
  if (!documentText) return '';

  const sample = documentText.slice(0, 5000).toLowerCase();
  const isLegal = /\b(constitution|statute|legislation|jurisdiction|tort|contract law|criminal law|civil law|common law|precedent|case law|plaintiff|defendant|judicial|court|tribunal|arbitrat|litigat|amendment|article\s+\d|section\s+\d|act\s+of|penal code|civil code|habeas corpus|due process|mens rea|actus reus|stare decisis|jurisprudence|legal|lawyer|attorney|barrister|solicitor|regulation|ordinance)\b/i.test(sample);

  if (!isLegal) return '';

  // Detect specific jurisdiction for tailored grounding
  const jurisdictionSection = detectJurisdictionSection(sample);

  return `
LEGAL CONTENT GROUNDING — CRITICAL INSTRUCTIONS:
This document contains legal content. You MUST follow these rules:

1. JURISDICTION SPECIFICITY: Identify the jurisdiction (country/state/region) from the document content. ALL legal explanations, principles, and examples must be specific to THAT jurisdiction. Do NOT default to US law unless the content is explicitly about US law.

2. CONSTITUTIONAL GROUNDING: The constitution of the identified jurisdiction is the supreme ground truth. Any statute, regulation, or case law must be consistent with its constitutional framework. When explaining legal principles, reference the specific constitutional provisions where relevant (e.g., "Section 36 of the CFRN 1999" not just "right to fair hearing", "Article 21 of the Indian Constitution" not just "right to life").

3. OFFICIAL SOURCES ONLY: Only reference laws, cases, and legal principles from official sources:
   - Official legislation/statutes from government publications
   - Official law reports and court reporters (e.g., NWLR for Nigeria, SCC for India, UKSC for UK, BVerfGE for Germany)
   - Constitutional texts and amendments
   - Official gazettes and government legal databases
   - Recognized legal commentaries from authoritative publishers
   NEVER cite Wikipedia, blog posts, or unofficial legal summaries as authoritative.

4. CASE LAW: When referencing cases, use proper citation format for the jurisdiction:
   - Include case name, year, court, and official reporter citation
   - Only cite real, verifiable cases from official reporters
   - NEVER invent or fabricate case names or citations
   - Prefer landmark/leading cases that are well-established

5. LEGAL TERMINOLOGY: Use the correct legal terminology for the jurisdiction:
   - Common law: precedent, ratio decidendi, obiter dictum, stare decisis
   - Civil law: code, doctrine, commentary
   - Use jurisdiction-specific terms (e.g., "charge" in Nigeria, "FIR" in India, "indictment" in US, "charge sheet" in UK)

6. INTERNATIONAL LAW: If the content discusses international law, clearly distinguish between:
   - Binding treaties and conventions
   - Customary international law
   - Soft law (declarations, resolutions)
   - Jus cogens (peremptory norms)
   Reference the ICJ, ICC, or relevant international tribunals as appropriate.

7. ACCURACY OVER SIMPLIFICATION: Never oversimplify legal principles to the point of inaccuracy. A wrong legal statement is worse than a complex one. Include caveats and jurisdictional limitations where necessary.${jurisdictionSection}`;
}

/**
 * Detect specific legal jurisdictions and return tailored source hierarchy instructions.
 */
function detectJurisdictionSection(sampleText) {
  const isNigeria = /\b(nigeria|nigerian|cfrn|federal republic of nigeria|national assembly|state house(s)? of assembly|federal high court|nwlr|supreme court of nigeria|court of appeal.*nigeria|lagos|abuja|federal capital territory|criminal code act|penal code.*northern|evidence act|administration of criminal justice|acja|efcc|icpc|nigerian law reports|laws of the federation)\b/i.test(sampleText);
  const isIndia = /\b(india|indian|bharatiya|lok sabha|rajya sabha|supreme court of india|high court of|ipc|crpc|indian penal|constitution of india|article\s+\d+.*india|air\s+\d{4}|scc\s+\d|indian kanoon|fir\b|challan|advocate general)\b/i.test(sampleText);
  const isUK = /\b(united kingdom|england and wales|english law|house of lords|uk supreme court|crown court|magistrates.?\s*court|queen.s bench|king.s bench|ewca|ewhc|uksc|bailii|solicitor general|barrister|house of commons|act of parliament.*uk|criminal law act|theft act)\b/i.test(sampleText);
  const isUS = /\b(united states|u\.?s\.?\s+(constitution|code|supreme court)|federal register|scotus|circuit court|district court|amendment\s+(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv)|usc\b|cfr\b|westlaw|lexisnexis.*america|due process clause|commerce clause|bill of rights)\b/i.test(sampleText);

  if (isNigeria) {
    return `

NIGERIAN JURISDICTION DETECTED — APPLY THESE SPECIFIC RULES:

SOURCES OF LAW (in order of hierarchy):
1. Constitution of the Federal Republic of Nigeria 1999 (as amended) — the supreme law; any law inconsistent with it is void to the extent of the inconsistency (Section 1(3) CFRN 1999)
2. Acts of the National Assembly — federal legislation enacted by the Senate and House of Representatives
3. Laws of the State Houses of Assembly — state-level legislation applicable within each state
4. Subsidiary Legislation — regulations, orders, rules, and bye-laws made under enabling Acts
5. Received English Law — common law, doctrines of equity, and statutes of general application in force in England on 1 January 1900 (to the extent not superseded)
6. Customary Law — applicable where not repugnant to natural justice, equity, and good conscience, and not incompatible with any written law
7. Islamic Law (Sharia) — applicable in personal law matters in Northern states and as codified in the Sharia Penal Codes of applicable states
8. Judicial Precedent — binding decisions from superior courts (Supreme Court > Court of Appeal > Federal/State High Courts)

COURT HIERARCHY (descending authority):
- Supreme Court of Nigeria (final appellate court)
- Court of Appeal
- Federal High Court / State High Courts / National Industrial Court / Sharia Court of Appeal / Customary Court of Appeal
- Magistrate Courts / District Courts / Area Courts / Customary Courts

OFFICIAL REPORTERS & CITATION FORMAT:
- Nigerian Weekly Law Reports (NWLR) — e.g., Abacha v. Fawehinmi (2000) 6 NWLR (Pt. 660) 228
- Supreme Court of Nigeria Law Reports (SC)
- All Nigeria Law Reports (All NLR)
- Federation Weekly Law Reports (FWLR)
- Laws of the Federation of Nigeria (LFN) — e.g., Companies and Allied Matters Act, Cap C20, LFN 2004
- Federal Republic of Nigeria Official Gazette

KEY LEGISLATION TO REFERENCE ACCURATELY:
- Constitution of the Federal Republic of Nigeria 1999 (CFRN 1999) — cite specific Sections and Chapters
- Administration of Criminal Justice Act 2015 (ACJA) — for criminal procedure
- Evidence Act 2011
- Criminal Code Act (Southern Nigeria) / Penal Code (Northern Nigeria)
- Companies and Allied Matters Act (CAMA) 2020
- Land Use Act 1978
- Child Rights Act 2003
- Cite Acts with their full title and Cap/LFN number where applicable

IMPORTANT: Nigerian law follows the common law tradition but has significant statutory modifications. Always check whether an English common law principle has been modified or replaced by Nigerian legislation before citing it.`;
  }

  if (isIndia) {
    return `

INDIAN JURISDICTION DETECTED — APPLY THESE SPECIFIC RULES:

SOURCES OF LAW (hierarchy):
1. Constitution of India — supreme law, with Fundamental Rights (Part III) and Directive Principles (Part IV)
2. Parliamentary Acts / State Legislature Acts
3. Ordinances (Article 123 / Article 213)
4. Subordinate Legislation — rules, regulations, notifications
5. Judicial Precedent — Supreme Court decisions binding on all courts (Article 141)

COURT HIERARCHY: Supreme Court > High Courts > District Courts > Subordinate Courts
OFFICIAL REPORTERS: AIR (All India Reporter), SCC (Supreme Court Cases), SCR (Supreme Court Reports)
CITATION FORMAT: e.g., Maneka Gandhi v. Union of India, AIR 1978 SC 597`;
  }

  if (isUK) {
    return `

UK JURISDICTION DETECTED — APPLY THESE SPECIFIC RULES:

SOURCES OF LAW (hierarchy):
1. Acts of Parliament (primary legislation) — Parliamentary sovereignty
2. Delegated/secondary legislation (statutory instruments)
3. EU retained law (post-Brexit, where applicable)
4. Common law and equity (judicial precedent)

COURT HIERARCHY: UK Supreme Court > Court of Appeal > High Court > Crown/County Courts > Magistrates' Courts
OFFICIAL REPORTERS: UKSC, EWCA, EWHC, AC (Appeal Cases), QB (Queen's/King's Bench), WLR (Weekly Law Reports)
DATABASES: BAILII (free), Westlaw UK, LexisNexis UK`;
  }

  if (isUS) {
    return `

US JURISDICTION DETECTED — APPLY THESE SPECIFIC RULES:

SOURCES OF LAW (federal hierarchy):
1. US Constitution — supreme law of the land (Supremacy Clause, Article VI)
2. Federal Statutes (USC — United States Code)
3. Federal Regulations (CFR — Code of Federal Regulations)
4. Judicial Precedent — SCOTUS decisions binding on all courts

COURT HIERARCHY: US Supreme Court > Circuit Courts of Appeals > District Courts
OFFICIAL REPORTERS: U.S. Reports (U.S.), S.Ct., L.Ed., F.2d/F.3d/F.4th
CITATION FORMAT: e.g., Brown v. Board of Education, 347 U.S. 483 (1954)`;
  }

  return '';
}

module.exports = {
  buildInterestsSection,
  buildLearningStyleSection,
  buildPaceSection,
  buildLegalGroundingSection,
};
