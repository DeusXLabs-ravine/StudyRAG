/**
 * Architecture-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce rich, discipline-aware prompt sections that get
 * injected into module generation, quiz generation, flashcard generation,
 * and tutor chat prompts.  The goal is to produce THOROUGH, RIGOROUS
 * architecture content — design analysis, technical resolution, sustainability
 * assessment, historical context, and precedent studies — rather than the
 * surface-level summaries that generic prompts produce.
 *
 * Consumed by:  backend/src/utils/prompts/depthRouter.js
 * Subdisciplines detected by:  backend/src/utils/subjectDetector.js
 *   Possible values: design, technology, sustainability, urban, history
 */

// ─── Subdiscipline-specific blocks for module content ────────────────────────

/**
 * Returns additional depth instructions specific to detected subdisciplines.
 * Each block describes the content expectations unique to that branch of
 * architecture so the LLM produces domain-appropriate analysis, technical
 * detail, and contextual understanding.
 */
function _subdisciplineModuleBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('design')) {
    blocks.push(`
ARCHITECTURAL DESIGN — additional depth requirements:
- Design principles: explain proportion systems (golden ratio, classical orders, Le Corbusier's
  Modulor), rhythm (regular, alternating, progressive), hierarchy (size, placement, contrast),
  balance (symmetrical, asymmetrical, radial), and unity/variety.  For each principle, reference
  at least one canonical building that exemplifies it.
- Space planning methodology: discuss programme analysis (translating client needs into spatial
  requirements), adjacency matrices, bubble diagrams, and zoning strategies (public/private,
  served/servant, noisy/quiet).  Present area calculations and efficiency ratios
  (net-to-gross ratio typically 60-75% for office buildings, 75-85% for residential).
- Programming process: describe the systematic approach to defining project requirements —
  functional needs, spatial requirements (m^2 per occupant by use type), environmental criteria,
  budget constraints, and regulatory parameters.  Reference established programming methods
  (Pena's Problem Seeking, Duerk's architectural programming).
- Design critique framework: provide a structured vocabulary for analysing architectural work —
  spatial quality (compression/release, prospect/refuge, procession), materiality (tectonic
  expression, haptic qualities), light (natural light strategies, artificial lighting design),
  and relationship to context (site response, cultural resonance, urban fabric integration).`);
  }

  if (subdisciplines.includes('technology')) {
    blocks.push(`
BUILDING TECHNOLOGY — additional depth requirements:
- Structural system selection rationale: discuss load path logic ("gravity loads flow from
  slab to beam to column to foundation"), compare structural systems (frame, bearing wall,
  braced frame, moment frame, cable, shell, tensile) with their span capabilities, typical
  member sizes, and cost implications.  Reference span-to-depth ratios (steel beam ~L/20,
  concrete beam ~L/12, timber beam ~L/15) for preliminary sizing.
- Material properties comparison: present key properties (compressive strength, tensile
  strength, elastic modulus, density, thermal conductivity, embodied carbon) for concrete,
  steel, timber, masonry, glass, and composites.  Use tables with units (MPa, kg/m^3,
  W/mK, kgCO2eq/kg) for systematic comparison.
- Construction sequence: describe the logical order of construction operations — site
  preparation, foundations, structure, building envelope, MEP rough-in, interior finishes,
  commissioning.  Discuss critical path activities, construction tolerances, and coordination
  between trades.
- Building code compliance: reference the International Building Code (IBC), local building
  regulations, fire safety requirements (fire resistance ratings, means of egress, sprinkler
  requirements), accessibility standards (ADA, BS 8300, EN 17210), and structural loading
  codes (ASCE 7, Eurocode 1).  Discuss how code requirements influence design decisions.
- Detail resolution: explain the principles of architectural detailing — weather resistance
  (rain screen, drainage planes, flashing), thermal bridging prevention, movement joint design,
  material transitions, and constructability.  Reference detail typologies (parapet, window
  head/sill/jamb, foundation/wall junction, roof/wall junction).`);
  }

  if (subdisciplines.includes('sustainability')) {
    blocks.push(`
SUSTAINABLE ARCHITECTURE — additional depth requirements:
- Energy modeling concepts: explain building energy simulation principles — degree days,
  heating/cooling loads (Q = U * A * Delta T), solar heat gain coefficient (SHGC), internal
  heat gains, and annual energy use intensity (EUI, typically kWh/m^2/year).  Present benchmark
  EUI values by building type (office: 150-250 kWh/m^2, residential: 80-150 kWh/m^2,
  Passivhaus: <120 kWh/m^2 primary energy).
- Passive design strategies with climate-specific application: describe strategies and their
  climate applicability — thermal mass (hot-arid), cross-ventilation (warm-humid), solar
  orientation and shading (all climates but strategy varies), daylighting (all climates),
  earth sheltering (extreme climates), stack ventilation (temperate).  Quantify the impact
  where possible: "properly designed external shading can reduce cooling loads by 30-50%."
- LEED/BREEAM credit analysis: describe the rating system structure, credit categories
  (Energy, Water, Materials, Indoor Environmental Quality, Site, Innovation), point thresholds
  for certification levels, and strategies for achieving specific credits with their
  cost-benefit trade-offs.  Example: "LEED Energy credit EA.c1 requires a minimum 5%
  improvement over ASHRAE 90.1 baseline; achieving 20% improvement earns 5 additional points."
- Material lifecycle assessment: present lifecycle stages (A1-A3 product, A4-A5 construction,
  B1-B7 use, C1-C4 end of life, D beyond system boundary per EN 15978), key impact categories
  (global warming potential GWP, ozone depletion, acidification, eutrophication), and
  Environmental Product Declaration (EPD) interpretation.  Compare materials:
  "CLT has a GWP of approximately -500 to -700 kgCO2eq/m^3 (including biogenic carbon)
  vs. reinforced concrete at +300 to +500 kgCO2eq/m^3."`);
  }

  if (subdisciplines.includes('urban')) {
    blocks.push(`
URBAN DESIGN — additional depth requirements:
- Site analysis methodology: describe systematic site assessment — physical factors (topography,
  hydrology, vegetation, microclimate, solar access), infrastructure (transportation, utilities,
  services), regulatory context (zoning, heritage overlays, environmental constraints), and
  socio-cultural context (demographics, land use patterns, community character).  Present
  analytical techniques: figure-ground analysis, serial vision (Gordon Cullen), Lynch's
  imageability elements (paths, edges, districts, nodes, landmarks).
- Zoning analysis: explain zoning categories (residential R1-R5, commercial C1-C4, industrial
  M1-M3, mixed-use), permitted uses, conditional uses, and variance procedures.  Discuss how
  zoning shapes urban form and the relationship between regulation and design outcomes.
- Density calculations: Floor Area Ratio (FAR = total floor area / site area), site coverage
  (building footprint / site area), dwelling units per hectare, and plot ratio.  Show worked
  examples: "A 2000 m^2 site with FAR 3.0 permits 6000 m^2 of floor area; with an average
  apartment size of 75 m^2 plus 25% circulation/services, this yields approximately
  64 dwelling units, or 320 units/ha."  Discuss the urban design implications of different
  density levels.
- Public space design principles: hierarchy of public spaces (plaza, square, park, street,
  courtyard), design qualities that support use (Jan Gehl's criteria: protection, comfort,
  enjoyment), edge conditions and active frontages, microclimate design (sun, wind, rain
  protection), and universal accessibility.
- Precedent analysis: for each urban design concept discussed, reference at least one
  exemplary project with specific data — dimensions, density, mix of uses, and measurable
  outcomes (pedestrian counts, property values, user satisfaction surveys where available).`);
  }

  if (subdisciplines.includes('history')) {
    blocks.push(`
ARCHITECTURAL HISTORY — additional depth requirements:
- Style identification with defining features: for each architectural style/movement discussed,
  provide a systematic description — structural system, spatial organisation, facade composition,
  materials and construction techniques, ornamental vocabulary, and relationship to site/context.
  Use precise terminology (entablature, pilaster, tracery, curtain wall, brise-soleil, pilotis).
- Historical context driving design evolution: explain the social, technological, economic, and
  intellectual forces that gave rise to each architectural movement.  Example: "The Crystal
  Palace (1851) was made possible by industrialised cast iron and plate glass production, but
  it was the ideology of progress and international commerce embodied by the Great Exhibition
  that created the demand for such a building."
- Key buildings with analysis: for each period or movement, present at least one canonical
  building with detailed analysis — architect, date, location, programme, structural system,
  spatial organisation, material palette, and historical significance.  Go beyond factual
  description to analytical interpretation: what design problem was the architect solving, and
  how does the building express the ideas of its time?
- Theoretical manifestos: reference key architectural texts and their influence on practice —
  Vitruvius (firmitas, utilitas, venustas), Alberti (De Re Aedificatoria), Laugier (primitive
  hut), Ruskin (Seven Lamps), Le Corbusier (Vers une Architecture, Five Points), Venturi
  (Complexity and Contradiction), Koolhaas (Delirious New York), Frampton (critical
  regionalism).  Explain how theoretical positions translated into built work.`);
  }

  return blocks.join('\n');
}

// ─── Subdiscipline-specific blocks for quiz content ──────────────────────────

function _subdisciplineQuizBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('design')) {
    blocks.push(`
- Architectural design questions: include building analysis problems (identify design
  principles in described buildings), space planning calculations (area requirements,
  efficiency ratios), programme development scenarios, and design critique exercises.
  Distractors should reflect common errors such as confusing net and gross area, misidentifying
  spatial hierarchy, or applying design principles without considering context.`);
  }

  if (subdisciplines.includes('technology')) {
    blocks.push(`
- Building technology questions: include structural system selection for given spans and loads,
  material property comparison problems, code compliance scenarios (fire rating requirements,
  egress calculations, accessibility provisions), and construction sequence ordering.
  Distractors should capture mistakes like selecting the wrong structural system for the span,
  confusing dead load with live load in code calculations, misapplying fire resistance ratings,
  or ignoring thermal bridging in envelope details.`);
  }

  if (subdisciplines.includes('sustainability')) {
    blocks.push(`
- Sustainability questions: include energy performance calculations (U-value, heat loss,
  EUI estimation), passive design strategy selection for specified climates, LEED/BREEAM
  credit targeting scenarios, and lifecycle impact comparisons between materials.
  Distractors should reflect errors like confusing R-value with U-value, recommending
  thermal mass in a humid climate where night purge is ineffective, or misinterpreting
  embodied carbon data by ignoring system boundaries.`);
  }

  if (subdisciplines.includes('urban')) {
    blocks.push(`
- Urban design questions: include density calculations (FAR, coverage, units/ha), zoning
  compliance analysis, site analysis exercises, and public space evaluation scenarios.
  Distractors should reflect errors like confusing FAR with site coverage, miscalculating
  dwelling yield from floor area, ignoring setback requirements in buildable area
  calculations, or misapplying Lynch's imageability categories.`);
  }

  if (subdisciplines.includes('history')) {
    blocks.push(`
- Architectural history questions: include style identification from described features,
  chronological ordering of movements, matching architects to buildings and theoretical
  positions, and analytical interpretation of building descriptions.  Distractors should
  reflect common confusions like misattributing Gothic features to Romanesque, confusing
  Art Nouveau with Art Deco, or misidentifying Brutalist vs. late Modernist buildings.`);
  }

  return blocks.join('\n');
}

// ─── Subdiscipline-specific blocks for tutor chat ────────────────────────────

function _subdisciplineTutorBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('design')) {
    blocks.push(`
- For architectural design topics: always discuss design decisions in terms of the problem
  they solve — "the architect used a double-height space at the entrance to create a sense
  of arrival and to establish hierarchy between public and private zones."  Guide the student
  to develop a critical vocabulary for discussing spatial quality.  Encourage sketch-based
  thinking: "try diagramming the circulation pattern to see where the congestion occurs."
  Reference precedent buildings to illustrate design principles in practice.`);
  }

  if (subdisciplines.includes('technology')) {
    blocks.push(`
- For building technology topics: always start from load path logic and first principles —
  "before sizing the beam, trace the loads: where do they originate, and how do they reach
  the foundations?"  Help the student develop intuition for structural behaviour through
  analogies and order-of-magnitude estimates before detailed calculation.  When discussing
  details, always consider buildability: "can this joint actually be assembled on site?"
  Reference industry standards (IBC, Eurocodes, BS) and explain the safety philosophy behind
  code requirements.`);
  }

  if (subdisciplines.includes('sustainability')) {
    blocks.push(`
- For sustainability topics: always consider the climate context — "natural ventilation works
  in London but not in Dubai; the strategy must match the climate."  Help the student
  understand that sustainability is a design driver, not an add-on: early design decisions
  (orientation, massing, window-to-wall ratio) have far greater impact than technology
  selection later.  Quantify impacts: "increasing insulation from R-2.0 to R-4.0 reduces
  heating energy by approximately 25-35% depending on climate zone."  Discuss the performance
  gap between designed and actual building performance.`);
  }

  if (subdisciplines.includes('urban')) {
    blocks.push(`
- For urban design topics: always start from site analysis — "understand the site before
  proposing a design."  Help the student see the city as a system: transportation networks,
  land use patterns, economic forces, and social dynamics all shape the built environment.
  Reference precedent projects with specific data to support design arguments: "Barcelona's
  superblocks reduced traffic by 25% and increased pedestrian space by 300% — what principles
  made this possible?"  Encourage multi-scale thinking: building, street, neighbourhood, city.`);
  }

  if (subdisciplines.includes('history')) {
    blocks.push(`
- For architectural history topics: move beyond style identification to analytical
  interpretation — "why did this building look this way?  What social, technological, and
  intellectual forces shaped it?"  Help the student connect historical precedent to
  contemporary practice: "the Roman use of the arch and vault to span large spaces without
  columns is conceptually the same challenge that led to modern shell structures."  Encourage
  primary source reading (manifestos, treatises) alongside building analysis.  Always
  contextualise: place buildings within their cultural, economic, and political moment.`);
  }

  return blocks.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build depth instructions for architecture module generation.
 *
 * This replaces the generic "200-400 words per module" instruction with a far
 * more demanding specification: 600-1200 words, design analysis, technical
 * resolution, contextual understanding, and precedent studies.
 *
 * @param {string[]} subdisciplines - e.g. ['design', 'technology']
 * @returns {string} Prompt section to inject into the module generation prompt.
 */
function buildArchitectureDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineModuleBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general architecture';

  return `
═══════════════════════════════════════════════════════════════════════
ARCHITECTURE DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
These instructions OVERRIDE the default content-length and depth guidelines.
═══════════════════════════════════════════════════════════════════════

CONTENT LENGTH & RIGOUR:
- Each module MUST contain 600-1200 words of substantive architectural content.
- Do NOT produce surface-level summaries.  Architecture students need design analysis,
  technical detail, historical context, and precedent references — not bullet-point overviews.

MANDATORY ELEMENTS FOR EVERY ARCHITECTURAL CONCEPT COVERED:

a) DEFINE THE DESIGN PROBLEM
   Begin by articulating the architectural challenge: what functional, spatial, structural,
   environmental, or contextual problem does this concept address?  Architecture is a
   problem-solving discipline — every concept exists to resolve a design challenge.

b) ANALYSIS
   Present the relevant analytical framework:
   - For design: spatial analysis, programme requirements, site constraints
   - For technology: structural loads, environmental forces, material properties
   - For sustainability: climate data, energy flows, resource consumption
   - For urban: site context, regulatory framework, demographic data
   - For history: social, technological, and cultural context

c) CONCEPT DEVELOPMENT
   Explain how the architectural idea or solution emerges from the analysis:
   - Design intent and parti (the organising idea)
   - How the concept responds to the identified constraints and opportunities
   - Reference precedent buildings that inform or exemplify the approach

d) TECHNICAL RESOLUTION
   Show how the concept is realised physically:
   - Structural system and material selection with rationale
   - Environmental control strategies (heating, cooling, ventilation, lighting)
   - Building envelope performance (U-values, air tightness, weather resistance)
   - Construction methodology and detailing principles
   - Code compliance considerations

e) DISCUSS CONTEXT — CLIMATE, CULTURE, SITE
   Architecture does not exist in a vacuum.  Every concept must be discussed in relation to:
   - Climate: how does the local climate influence the design strategy?
   - Culture: what cultural values, traditions, or programmatic requirements shape the response?
   - Site: how does the building relate to its immediate physical context?
   - History: what precedents inform the approach, and how does it advance the discourse?

f) PRECEDENT AND REFERENCE
   Include at least one precedent building or project for each major concept:
   - Architect, date, location, and programme
   - What makes this an instructive precedent for the concept being discussed
   - Specific design strategies or technical solutions that can be applied elsewhere
   - Critical assessment: strengths and limitations of the precedent

STRUCTURE FOR EACH MODULE:
Follow this pedagogical sequence:
  Design Problem --> Analysis --> Concept --> Development --> Technical Resolution --> Precedent/Context

This mirrors how architecture is taught in design studios and prepares students for
professional practice.
${subBlocks}

VISUAL AND SPATIAL DESCRIPTION:
- Since architectural drawings cannot be directly included, use precise spatial descriptions:
  "the building is organised as two parallel bars connected by a glazed atrium running
  north-south, with the taller bar to the north to avoid overshadowing the lower wing."
- Reference well-known buildings as comparison points for scale, proportion, and character.
- Describe material qualities with sensory precision: texture, colour, reflectivity, warmth.

QUANTITATIVE DATA:
- Include dimensions, areas, and performance metrics where they support understanding.
- Use metric units (m, m^2, kWh/m^2, W/m^2K) with imperial equivalents where relevant.
- Reference building codes and standards with specific clause numbers where applicable.
`;
}

/**
 * Build depth instructions for architecture quiz / question generation.
 *
 * Ensures questions test genuine design analysis, technical problem-solving,
 * sustainability reasoning, and historical understanding — not surface-level recall.
 *
 * @param {string[]} subdisciplines - e.g. ['sustainability', 'history']
 * @returns {string} Prompt section to inject into quiz generation prompts.
 */
function buildArchitectureQuizDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineQuizBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general architecture';

  return `
═══════════════════════════════════════════════════════════════════════
ARCHITECTURE QUIZ DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
═══════════════════════════════════════════════════════════════════════

QUESTION PHILOSOPHY:
Architecture assessments test whether a student can ANALYSE BUILDINGS, SOLVE TECHNICAL PROBLEMS,
EVALUATE DESIGN STRATEGIES, and INTERPRET HISTORICAL CONTEXT — not just recall facts.
The questions you generate must reflect this reality.

MANDATORY QUESTION TYPES — include a mix of all of the following:

1. BUILDING ANALYSIS QUESTIONS (at least 25% of questions)
   - Describe a building scenario (spatial organisation, facade treatment, structural system,
     site relationship) and ask the student to identify design principles, evaluate design
     quality, or suggest improvements.
   - "A rectangular office building is oriented with its long axis east-west, with a fully
     glazed south facade and minimal openings on the north.  Describe two advantages and two
     potential problems with this orientation strategy, and suggest design modifications to
     address the problems."
   - Test the student's ability to think critically about architectural design decisions.

2. CODE COMPLIANCE SCENARIOS (at least 20% of questions)
   - Present a building scenario and ask whether it complies with specific code requirements.
   - "A three-storey mixed-use building has retail on the ground floor and residential above.
     The exit stairway is 1200 mm wide and serves an occupant load of 250 persons.  Does this
     meet IBC egress width requirements?  Show your calculation."
   - Include fire separation, accessibility, structural loading, and energy code scenarios.

3. SUSTAINABILITY STRATEGY SELECTION (at least 20% of questions)
   - "For a school building in a hot-humid climate (Koppen Af), rank the following passive
     design strategies by effectiveness: thermal mass, natural ventilation, external shading,
     green roof, earth tubes.  Justify your ranking."
   - Test the student's ability to match strategies to climate and building type.

4. STYLE IDENTIFICATION AND HISTORICAL ANALYSIS (at least 15% of questions)
   - Describe architectural features and ask the student to identify the style, period,
     or movement.
   - "A building features a reinforced concrete frame expressed on the exterior, deep
     window reveals, rough board-formed concrete surfaces, and massive projecting volumes.
     Identify the architectural movement and name two other buildings that exemplify it."
   - Include questions that connect style to social and technological context.

5. STRUCTURAL SYSTEM SELECTION (at least 10% of questions)
   - "A cultural centre requires a column-free exhibition hall spanning 40 metres.  Compare
     three structural options (steel truss, glulam portal frame, concrete shell) in terms of
     span capability, cost, construction time, and architectural expression."
   - Test the student's ability to integrate structural and architectural reasoning.

6. TECHNICAL CALCULATION PROBLEMS (at least 10% of questions)
   - Density calculations (FAR, site coverage, dwelling yield)
   - Energy performance estimates (U-value, heat loss, EUI)
   - Egress capacity calculations
   - Daylighting metrics (daylight factor, window-to-floor ratio)
   - Always state units in the question and expect units in the answer.

MCQ DISTRACTOR DESIGN:
- Distractors MUST represent common architectural errors, not random answers:
  a) Confusing net area with gross area in space planning
  b) Misapplying a passive design strategy to the wrong climate type
  c) Confusing architectural styles with similar features (e.g., Romanesque vs. Gothic)
  d) Selecting a structural system inappropriate for the required span
  e) Confusing R-value with U-value in thermal performance calculations
- Where applicable, include units in the answer choices.

EXPLANATION QUALITY:
- Every answer explanation must provide the full reasoning — not just "A is correct."
- For building analysis questions, explain the design logic behind the correct assessment.
- For technical problems, show the full calculation working.
- For historical questions, provide contextual information that reinforces learning.
${subBlocks}
`;
}

/**
 * Build depth instructions for the architecture tutor chat persona.
 *
 * Guides the tutor to explain with contextual sensitivity, precedent references,
 * and a balance between aesthetic and technical considerations.
 *
 * @param {string[]} subdisciplines - e.g. ['design', 'history']
 * @returns {string} Prompt section to inject into tutor chat prompts.
 */
function buildArchitectureTutorDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineTutorBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general architecture';

  return `
═══════════════════════════════════════════════════════════════════════
ARCHITECTURE TUTOR DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
═══════════════════════════════════════════════════════════════════════

You are tutoring an architecture student.  Architecture uniquely demands the integration of
artistic vision, technical competence, and contextual sensitivity.  Your explanations must
address all three dimensions.

WHEN EXPLAINING A CONCEPT:
1. Always CONSIDER CONTEXT — climate, culture, and site.
   - Never discuss a building or design strategy in isolation.  Always ask: "How does
     this relate to its context?"
   - Climate: "This deep overhang works in Singapore (1 deg N latitude) because the sun is
     nearly overhead year-round, but in London (51 deg N) it would block valuable winter sun."
   - Culture: "The courtyard house form recurs across Islamic architecture not only for
     climate reasons (shading, ventilation) but also for cultural privacy requirements."
   - Site: "The building steps down the hillside following the contours, preserving views
     for units behind and reducing the apparent mass from the street."

2. REFERENCE PRECEDENT BUILDINGS to illustrate principles.
   - Architecture is learned partly through the study of built work.  Always connect
     abstract principles to specific buildings the student can research further.
   - "The concept of 'servant and served spaces' is best illustrated by Louis Kahn's
     Richards Medical Research Laboratories (1960) — the exhaust stacks and stairwells are
     expressed as distinct brick towers flanking the glazed laboratory spaces."
   - Include architect, date, and location for every precedent mentioned.
   - Discuss what can be learned from the precedent and how it might be adapted.

3. BALANCE AESTHETICS WITH TECHNICAL REQUIREMENTS.
   - Architecture is neither pure art nor pure engineering.  Help the student see that
     the best architecture achieves both simultaneously.
   - "The exposed concrete structure is both the load-bearing system AND the interior
     finish — this is tectonic honesty, but it also means the concrete must achieve a
     high-quality surface finish, which has cost and construction implications."
   - When discussing technology, always connect back to architectural intent.
   - When discussing design, always consider technical feasibility.

4. Develop CRITICAL THINKING about design.
   - Encourage the student to question design decisions: "Why did the architect choose
     this material?  What alternatives existed, and what would have changed?"
   - Discuss trade-offs explicitly: "The all-glass facade maximises views and daylight
     but creates challenges for glare, thermal comfort, and energy consumption.  How
     might you mitigate these while preserving the design intent?"
   - Help the student develop a personal design position through informed analysis.

WHEN A STUDENT GETS A WRONG ANSWER:
- IDENTIFY THE SPECIFIC ERROR.  Do not simply say "that's wrong, the answer is X."
- Common architecture errors to diagnose:
  a) Applying a design strategy without considering climate (e.g., thermal mass in a
     consistently humid tropical climate where diurnal temperature range is small)
  b) Confusing architectural styles or misattributing features to the wrong period
  c) Ignoring code requirements in a design proposal (egress, fire separation,
     accessibility)
  d) Structural misunderstanding (e.g., proposing a cantilever without understanding
     the required depth and anchorage)
  e) Confusing net and gross area in space planning calculations
  f) Misinterpreting environmental performance metrics (R-value vs. U-value, EUI, SHGC)
- After identifying the error, guide the student to correct it themselves.  Ask leading
  questions: "Consider the climate of the project — what is the diurnal temperature range,
  and how does that affect the effectiveness of thermal mass?"

DESIGN STUDIO MENTALITY:
- Encourage iterative thinking: "This is a good starting point — how might you develop it
  further?  What if you tested an alternative arrangement?"
- Ask the student to justify every design decision: "Why this material?  Why this orientation?
  Why this structural system?"
- Develop the habit of multi-criteria evaluation: a design decision must satisfy functional,
  structural, environmental, aesthetic, economic, and regulatory requirements simultaneously.
- Reference real-world practice: how would this project proceed in a professional office?
  What consultants would be involved?  What information is needed at each design stage
  (concept, schematic, design development, construction documents)?
${subBlocks}

VISUAL AND SPATIAL COMMUNICATION:
- Since architectural drawings cannot be directly shown, use precise spatial descriptions
  to build the student's ability to visualise and communicate spatially.
- Use metric units (m, m^2, kWh/m^2) with imperial equivalents where the student's context
  requires it.
- Reference specific buildings as "mental models" for spatial concepts: "Imagine the scale
  of the Pantheon's oculus (8.7 m diameter) — that is the aperture through which all light
  enters the 43.3 m diameter space."
`;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  buildArchitectureDepthSection,
  buildArchitectureQuizDepthSection,
  buildArchitectureTutorDepthSection,
};
