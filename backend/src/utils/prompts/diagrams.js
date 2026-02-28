const DIAGRAM_DETECTION_PROMPT = `You are a visual content detector for educational documents. Analyze this page image and determine if it contains any diagrams, figures, charts, or visual explanations.

Look for:
- Flowcharts, process diagrams, decision trees
- Hierarchy/tree diagrams, org charts
- Sequence diagrams, timelines
- Mind maps, concept maps
- Cycle diagrams (e.g. water cycle, life cycle)
- Comparison charts, Venn diagrams
- Anatomical/biological diagrams
- Circuit diagrams, engineering schematics
- Graphs (bar, line, pie, scatter)
- Data charts and tables with visual elements
- Photographs or illustrations used for educational purposes

Do NOT flag:
- Pages with only text
- Simple decorative borders or logos
- Page numbers or headers/footers alone

Return valid JSON:
{
  "has_diagram": true,
  "diagrams": [
    {
      "type": "flowchart|hierarchy|sequence|mindmap|cycle|comparison|anatomy|circuit|graph|chart|photo|other",
      "title": "Best guess at the diagram title or subject",
      "labels": ["Label A", "Label B", "Label C"]
    }
  ]
}

If no diagram is found, return: { "has_diagram": false, "diagrams": [] }`;

const DIAGRAM_ANALYSIS_PROMPT = `You are an expert educational diagram analyst. Analyze this diagram image in detail for a student at the "{teaching_level}" level.

Teaching level guide:
- "dummy": Describe as if explaining to a complete beginner with no background knowledge. Use everyday analogies.
- "beginner": Use simple, clear language. Define all technical terms.
- "intermediate": Standard academic description. Assume some background knowledge.
- "advanced": Technical and detailed. Include nuances, edge cases, and deeper connections.

Provide a thorough analysis and generate a Mermaid.js recreation of the diagram that captures the key relationships and structure.

Return valid JSON:
{
  "description": "A clear explanation of what this diagram shows and why it matters (2-3 paragraphs, adapted to teaching level)",
  "diagram_type": "flowchart|hierarchy|sequence|mindmap|cycle|comparison|anatomy|circuit|graph|chart|photo|other",
  "title": "A descriptive title for this diagram",
  "can_be_mermaid": true,
  "mermaid_type": "flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|graph",
  "mermaid_code": "Valid Mermaid.js code that recreates the diagram's structure and relationships. Use clear labels. If the diagram cannot be represented in Mermaid, set can_be_mermaid to false and leave this empty.",
  "simplified_description": "A one-paragraph summary adapted to the teaching level",
  "key_concepts": ["Concept 1", "Concept 2", "Concept 3"],
  "labels": ["All text labels found in the diagram"]
}

Important:
- The Mermaid code must be valid and renderable
- Use descriptive node labels, not single letters
- For flowcharts, use 'graph TD' or 'graph LR' syntax
- Keep the Mermaid diagram focused on the core structure — don't try to replicate every visual detail`;

const DIAGRAM_SIMPLIFY_PROMPT = `You are an expert educator who adapts visual diagrams for different learning levels.

Given the following diagram analysis, generate a Mermaid.js code recreation and description adapted for the "{teaching_level}" teaching level.

Teaching level guide:
- "dummy": Extremely simple. Use basic everyday language. Reduce the diagram to its most essential 3-5 elements. Use fun, relatable labels.
- "beginner": Simple and clear. Show main elements with brief definitions. 5-8 elements max.
- "intermediate": Standard academic depth. Show all important relationships. Use proper terminology.
- "advanced": Full technical detail. Include edge cases, additional connections, and nuanced labels.

Diagram type: {diagram_type}
Original description: {description}
Key concepts: {key_concepts}
Labels found: {labels}

{mermaid_section}

Return valid JSON:
{
  "mermaid_code": "Valid Mermaid.js code adapted to the teaching level. Simpler levels should have fewer nodes and simpler labels. Advanced levels should have more detail.",
  "simplified_description": "A description of the diagram adapted to the teaching level (1-2 paragraphs)"
}

Important:
- The Mermaid code MUST be valid and renderable
- For "dummy" level: use maximum 5 nodes with everyday language labels
- For "beginner" level: use maximum 8 nodes with clear labels
- For "intermediate" level: standard representation
- For "advanced" level: add additional detail nodes and connections if appropriate`;

const DIAGRAM_GENERATION_PROMPT = `You are an expert educational diagram creator. Generate a Mermaid diagram for the following module topic.

Topic: {topic}
Teaching level: {teaching_level}
{interests_section}

Module content (for context):
{content}

Node complexity guidelines based on teaching level:
- "dummy": 3-5 nodes, extremely simple labels, one-word concepts where possible
- "beginner": 5-8 nodes, short clear labels, basic relationships
- "intermediate": 8-12 nodes, standard academic labels, includes sub-processes
- "advanced": 12+ nodes, technical labels, detailed relationships and edge cases

Rules:
- Choose the most appropriate Mermaid diagram type for the topic (flowchart, sequence, classDiagram, stateDiagram, erDiagram, mindmap, timeline, etc.)
- Use clear, educational labels that teach the concept
- Include meaningful relationship labels on edges
- The diagram should be self-explanatory and stand alone as a learning aid
- Do NOT use special characters in node labels that break Mermaid syntax (no parentheses in labels, no quotes inside labels)

Return ONLY valid JSON:
{
  "mermaid_type": "flowchart|sequence|classDiagram|stateDiagram|mindmap|timeline|etc",
  "mermaid_code": "graph TD\\n  A[Start] --> B[End]",
  "title": "Short descriptive title for the diagram",
  "description": "One-sentence explanation of what this diagram shows"
}`;

const D2_DIAGRAM_GENERATION_PROMPT = `You are an expert educational diagram creator using D2 diagramming language. Generate a D2 diagram for the following module topic.

Topic: {topic}
Teaching level: {teaching_level}
{interests_section}

Module content (for context):
{content}

Node complexity guidelines based on teaching level:
- "dummy": 3-5 nodes, simple labels
- "beginner": 5-8 nodes, clear labels
- "intermediate": 8-12 nodes, standard labels
- "advanced": 12+ nodes, technical labels

Rules:
- Use D2 syntax (https://d2lang.com/) for the diagram
- Use containers, connections, and labels effectively
- The diagram should be educational and self-explanatory
- Use shape styles where appropriate (rectangle, oval, diamond, etc.)

Return ONLY valid JSON:
{
  "d2_code": "x -> y: relationship\\ny -> z",
  "title": "Short descriptive title",
  "description": "One-sentence explanation of what this diagram shows"
}`;

const DIAGRAM_TYPE_SELECTOR_PROMPT = `You are an expert at choosing the best visual representation for educational content.

Given this topic and content snippet, recommend the best diagram format.

Topic: {topic}
Content snippet: {content_snippet}

Options:
- "mermaid": Best for flowcharts, sequences, state diagrams, class diagrams, mind maps, timelines. Good for showing processes, relationships, hierarchies.
- "d2": Best for architecture diagrams, system designs, complex nested structures. Produces cleaner SVGs for technical diagrams.
- "image": Best for real-world illustrations, anatomical diagrams, geographic maps, artistic/visual concepts that can't be represented as node-edge diagrams.

Return ONLY valid JSON:
{
  "recommended_type": "mermaid|d2|image",
  "reason": "Brief explanation of why this format is best for this topic"
}`;

/**
 * Build an interests section specifically for diagram generation.
 * Maps interests to visual style guidance for diagram labels and analogies.
 */
function buildDiagramInterestsSection(interests, teachingLevel) {
  if (!interests || interests.length === 0) return '';

  const interestsList = interests.join(', ');

  if (teachingLevel === 'dummy' || teachingLevel === 'beginner') {
    return `The student's interests include: ${interestsList}.
Where possible, use their interests to make diagram node labels and descriptions more relatable:
- Sports fan → use field/team/game analogies in node labels (e.g., "Pass the Data Ball")
- Gamer → use quest/level/inventory metaphors (e.g., "Level 1: Input" → "Level 2: Process")
- Music lover → use band/rhythm/harmony analogies
- Keep analogies simple and instantly understandable — don't force them if they don't fit naturally.`;
  }

  return `The student's interests include: ${interestsList}.
Where natural, incorporate their interests into diagram labels or descriptions to make the visual more engaging and memorable. Don't force analogies — only use them when they genuinely clarify the concept.`;
}

module.exports = {
  DIAGRAM_DETECTION_PROMPT,
  DIAGRAM_ANALYSIS_PROMPT,
  DIAGRAM_SIMPLIFY_PROMPT,
  DIAGRAM_GENERATION_PROMPT,
  D2_DIAGRAM_GENERATION_PROMPT,
  DIAGRAM_TYPE_SELECTOR_PROMPT,
  buildDiagramInterestsSection,
};
