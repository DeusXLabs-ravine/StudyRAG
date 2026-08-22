const { v4: uuidv4 } = require('uuid');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const supabase = require('../config/database');
const { getGenerativeModel, keyPool, markImageModelFailed, markImageModelWorking, withRetryOnRateLimit, MODELS } = require('../config/gemini');
const {
  DIAGRAM_GENERATION_PROMPT,
  D2_DIAGRAM_GENERATION_PROMPT,
  DIAGRAM_TYPE_SELECTOR_PROMPT,
  buildDiagramInterestsSection,
} = require('../utils/prompts');

const STORAGE_BUCKET = 'diagram-images'; // legacy Supabase key prefix, retained on image_storage_path
const { v2: cloudinary } = require('cloudinary');
const { cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret } = require('../config/env');
if (cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret) {
  cloudinary.config({ cloud_name: cloudinaryCloudName, api_key: cloudinaryApiKey, api_secret: cloudinaryApiSecret, secure: true });
}

/** Upload a diagram image buffer to Cloudinary; resolves to the upload result (secure_url, public_id). */
function uploadImageToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: 'image', overwrite: true, invalidate: true },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(buffer);
  });
}

// ─── D2 CLI Availability Check ────────────────────────────────

let _d2Available = null;

async function checkD2Available() {
  if (_d2Available !== null) return _d2Available;

  return new Promise(resolve => {
    execFile('d2', ['--version'], { timeout: 5000 }, (err) => {
      _d2Available = !err;
      if (_d2Available) {
        console.log('[DiagramGen] D2 CLI available');
      } else {
        console.log('[DiagramGen] D2 CLI not found — D2 diagrams will fall back to Mermaid');
      }
      resolve(_d2Available);
    });
  });
}

// ─── JSON Parsing Helper ──────────────────────────────────────

function parseJsonResponse(text) {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

// ─── D2 Rendering via CLI ─────────────────────────────────────

async function renderD2ToSvg(d2Code) {
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `d2-${uuidv4()}.d2`);
  const outputPath = path.join(tmpDir, `d2-${uuidv4()}.svg`);

  try {
    fs.writeFileSync(inputPath, d2Code, 'utf-8');

    return await new Promise((resolve, reject) => {
      execFile('d2', [inputPath, outputPath], { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`D2 render failed: ${stderr || err.message}`));
          return;
        }
        try {
          const svg = fs.readFileSync(outputPath, 'utf-8');
          resolve(svg);
        } catch (readErr) {
          reject(new Error(`Failed to read D2 output: ${readErr.message}`));
        }
      });
    });
  } finally {
    try { fs.unlinkSync(inputPath); } catch (_) {}
    try { fs.unlinkSync(outputPath); } catch (_) {}
  }
}

// Diagram images now live on Cloudinary; no Supabase Storage bucket to provision.

// ─── Auto-Select Diagram Type ─────────────────────────────────

async function selectDiagramType(topic, contentSnippet) {
  try {
    const prompt = DIAGRAM_TYPE_SELECTOR_PROMPT
      .replace('{topic}', topic)
      .replace('{content_snippet}', (contentSnippet || '').slice(0, 1000));

    const result = await withRetryOnRateLimit(async () => {
      const model = getGenerativeModel('fast');
      return model.generateContent(prompt);
    });

    const parsed = parseJsonResponse(result.response.text());
    return parsed.recommended_type || 'mermaid';
  } catch (err) {
    console.warn(`[DiagramGen] Type selection failed, defaulting to mermaid: ${err.message}`);
    return 'mermaid';
  }
}

// ─── Generate Mermaid Diagram ─────────────────────────────────

async function generateMermaidDiagram(topic, content, teachingLevel, interests) {
  // Interests removed from diagrams — they cause oversimplification and loss of meaning
  const prompt = DIAGRAM_GENERATION_PROMPT
    .replace('{topic}', topic)
    .replace('{content}', (content || '').slice(0, 8000))
    .replace('{teaching_level}', teachingLevel)
    .replace('{interests_section}', '');

  const result = await withRetryOnRateLimit(async () => {
    const model = getGenerativeModel('fast');
    return model.generateContent(prompt);
  });

  return parseJsonResponse(result.response.text());
}

// ─── Generate D2 Diagram ──────────────────────────────────────

async function generateD2Diagram(topic, content, teachingLevel, interests) {
  const prompt = D2_DIAGRAM_GENERATION_PROMPT
    .replace('{topic}', topic)
    .replace('{content}', (content || '').slice(0, 8000))
    .replace('{teaching_level}', teachingLevel)
    .replace('{interests_section}', '');

  const result = await withRetryOnRateLimit(async () => {
    const model = getGenerativeModel('fast');
    return model.generateContent(prompt);
  });

  return parseJsonResponse(result.response.text());
}

// ─── Generate AI Image ────────────────────────────────────────

function buildImagePrompt(topic, teachingLevel, moduleContent) {
  const searchText = `${topic} ${(moduleContent || '').slice(0, 2000)}`.toLowerCase();

  // Detect subject domain from both topic AND content for better matching
  const isMedical = /\b(anatomy|organ|cell|tissue|muscle|bone|heart|lung|brain|nervous|vascular|patholog|pharmacol|receptor|enzyme|protein|dna|rna|mitosis|meiosis|synapse|neuron|artery|vein|immune|antibod|antigen|clinical|diagnos|symptom|disease|therapy|blood|plasma|platelet|hemoglobin|insulin|cortisol|dopamine|serotonin)\b/i.test(searchText);
  const isLaw = /\b(constitution|statute|legislation|jurisdiction|tort|contract law|criminal law|civil law|common law|precedent|case law|plaintiff|defendant|appellant|respondent|judicial|court|tribunal|arbitrat|litigat|regulat|amendment|article\s+\d|section\s+\d|act\s+of|penal code|civil code|habeas corpus|due process|mens rea|actus reus|stare decisis|ratio decidendi|obiter dictum|ultra vires|writ|injunction|damages|liability|negligence|fiduciary|equity|jurisprudence|legal|lawyer|attorney|barrister|solicitor)\b/i.test(searchText);
  const isChemistry = /\b(molecule|compound|reaction|bond|orbital|element|acid|base|catalyst|oxidat|reduct|polymer|isomer|stoichio|equilibrium|enthalp|entropy|molarity|titrat|electroly|nucleophil|electrophil)\b/i.test(searchText);
  const isPhysics = /\b(force|velocity|momentum|wave|circuit|field|energy|thermodynamic|quantum|relativi|optic|magnet|electric|gravit|torque|frequency|amplitude|resistanc|capacit|inductan|photon|wavelength)\b/i.test(searchText);
  const isCS = /\b(algorithm|data structure|tree|graph|stack|queue|hash|sort|search|linked list|binary|recursion|pointer|memory|cpu|network|protocol|database|sql|api|class|method|object|interface|pattern|refactor)\b/i.test(searchText);
  const isMath = /\b(theorem|proof|integral|derivative|matrix|vector|equation|function|limit|convergence|polynomial|linear algebra|calculus|geometry|topology|probability|statistics|eigenvalue|determinant)\b/i.test(searchText);

  // Extract key concepts from content for specificity
  const contentExcerpt = (moduleContent || '').slice(0, 3000);

  let subjectStyle, composition, details, accuracy;

  if (isMedical) {
    subjectStyle = 'medical textbook illustration style, precise anatomical detail, Netter-inspired color palette with warm skin tones and cool organ blues/reds';
    composition = 'centered anatomical view with clean labeled callouts, white background, cross-section or anterior view as appropriate';
    details = 'Include accurate anatomical labels in large bold sans-serif font. Use color-coding: arteries in red, veins in blue, nerves in yellow, muscles in reddish-brown. Show spatial relationships clearly.';
    accuracy = 'CRITICAL: This is a medical/scientific diagram. Every structure, pathway, and label must be anatomically and physiologically accurate. Do not invent or approximate — if a specific structure is named, render it in its correct anatomical position and proportion. Incorrect medical diagrams are dangerous.';
  } else if (isLaw) {
    subjectStyle = 'legal textbook diagram style, formal and authoritative, dark navy and gold color scheme with clean hierarchy lines, professional serif typography for legal terms';
    composition = 'structured hierarchical layout showing legal relationships, jurisdictional hierarchy, or procedural flow, white background, clear directional arrows';
    // Detect Nigerian legal content for jurisdiction-specific diagram instructions
    const isNigerianLaw = /\b(nigeria|nigerian|cfrn|national assembly|state house|federal high court|nwlr|lagos|abuja|criminal code act|penal code.*northern|acja|efcc)\b/i.test(searchText);
    if (isNigerianLaw) {
      details = 'Use formal Nigerian legal terminology. Court hierarchy must follow: Supreme Court of Nigeria > Court of Appeal > Federal High Court / State High Courts / National Industrial Court > Magistrate Courts. Show the correct Nigerian legislative hierarchy: CFRN 1999 > Acts of National Assembly > Laws of State Houses of Assembly > Subsidiary Legislation. Use distinct colors for branches (legislative=green, judicial=dark red, executive=blue). Label with Nigerian-specific terms.';
      accuracy = 'CRITICAL: This is a Nigerian legal diagram. The court hierarchy, legislative structure, and constitutional framework must reflect the Nigerian legal system specifically. Use CFRN 1999 as the supreme source. Do NOT substitute with US, UK, or generic common law structures. Nigerian courts and institutions have specific names and ranks — use them exactly (e.g., "Federal High Court" not "Federal District Court", "State High Court" not "Superior Court"). Do not invent case names, statutes, or legal principles.';
    } else {
      details = 'Use formal legal terminology with proper citations format. Show court hierarchies with proper rank ordering. Use distinct colors for different branches (legislative=blue, judicial=dark red, executive=green). Include jurisdiction labels where applicable.';
      accuracy = 'CRITICAL: This is a legal diagram. All court hierarchies, procedural steps, constitutional structures, and legal relationships must be jurisdictionally accurate. If the content references a specific country or jurisdiction, the diagram must reflect THAT jurisdiction\'s legal system — not a generic or US-defaulted system. Legal terminology must match the jurisdiction (e.g., "High Court" not "Supreme Court" for UK, "Tribunal" for EU). Do not invent case names, statutes, or legal principles.';
    }
  } else if (isChemistry) {
    subjectStyle = 'scientific illustration style, precise molecular rendering, clean pastel color scheme with element-specific colors (O=red, N=blue, C=gray, H=white)';
    composition = 'centered molecular or reaction diagram, white background, clear directional arrows for processes';
    details = 'Show bond angles and molecular geometry accurately. Label key atoms, functional groups, and reaction arrows. Use standard chemistry color conventions.';
    accuracy = 'CRITICAL: All molecular structures, bond angles, electron configurations, and reaction mechanisms must be chemically accurate. Use correct IUPAC conventions. Do not approximate molecular geometry.';
  } else if (isPhysics) {
    subjectStyle = 'physics textbook diagram style, vector arrows with precise directions, clean grid or coordinate system background';
    composition = 'schematic diagram layout, muted background, force vectors and field lines clearly visible';
    details = 'Use colored arrows for different forces/vectors. Include magnitude labels and unit indicators. Show coordinate axes where relevant.';
    accuracy = 'CRITICAL: All force directions, field line patterns, circuit connections, and physical relationships must be physically accurate. Vector magnitudes and directions must reflect the actual physics described.';
  } else if (isCS) {
    subjectStyle = 'clean technical diagram style, flat design with rounded rectangles and connecting arrows, modern blue and gray palette';
    composition = 'top-down or left-to-right flowchart layout, white background, clear hierarchy and data flow';
    details = 'Use monospace font for code/values inside nodes. Color-code different operations (green=insert, red=delete, blue=search). Show pointer/reference arrows clearly.';
    accuracy = 'CRITICAL: Data structure shapes, algorithm steps, pointer references, and code patterns must be technically correct. If showing a specific algorithm or data structure operation, each step must be accurate.';
  } else if (isMath) {
    subjectStyle = 'mathematical illustration style, clean geometric shapes, precise coordinate planes with gridlines';
    composition = 'centered diagram with labeled axes, white background, curves and shapes in distinct colors';
    details = 'Render equations and notation in large clear serif font. Use color to distinguish different functions or geometric elements. Include gridlines for scale.';
    accuracy = 'CRITICAL: All mathematical notation, graph shapes, geometric relationships, and numeric values must be mathematically correct. Curves must have the right shape (e.g., parabolas are parabolic, not arbitrary curves).';
  } else {
    subjectStyle = 'professional educational illustration, clean infographic style, modern color palette with 3-4 distinct colors';
    composition = 'balanced layout suitable for a presentation slide, white or light gray background, clear visual hierarchy';
    details = 'Use icons and visual metaphors to represent abstract concepts. Group related items visually. Include concise labels in bold sans-serif font.';
    accuracy = 'Ensure all labeled relationships, hierarchies, and categorizations are factually correct based on the source material provided below.';
  }

  return `Subject: A precise, detailed educational diagram about "${topic}" for a ${teachingLevel}-level student.
Composition: ${composition}. Medium shot, straight-on perspective, 4:3 aspect ratio.
Style: ${subjectStyle}. Professional quality suitable for a university textbook or educational presentation.
Lighting: Flat, even studio lighting with no harsh shadows — optimized for readability and clarity.
${details}
${accuracy}

SOURCE MATERIAL — base the diagram strictly on this content:
${contentExcerpt}

Important: All text labels must be large (minimum 14pt equivalent), bold, and high-contrast. The diagram must accurately represent the specific concepts from the source material above — do not generalize or substitute with generic illustrations. Every label, relationship, and structure must match what is described in the source material.`;
}

async function generateAIImage(topic, teachingLevel, interests, moduleContent) {
  const imagePrompt = buildImagePrompt(topic, teachingLevel, moduleContent);
  const imageModels = MODELS.imageGen;

  // Try each image model in priority order (pro → 3.1 flash → 2.5 flash)
  for (const modelName of imageModels) {
    try {
      const result = await withRetryOnRateLimit(async () => {
        const entry = keyPool.getClient();
        const model = entry.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseModalities: ['image', 'text'] },
        });
        return model.generateContent(imagePrompt);
      });

      // Extract image data from response
      const response = result.response;
      const candidates = response.candidates || [];

      for (const candidate of candidates) {
        for (const part of (candidate.content?.parts || [])) {
          if (part.inlineData) {
            markImageModelWorking(modelName);
            return {
              imageBuffer: Buffer.from(part.inlineData.data, 'base64'),
              mimeType: part.inlineData.mimeType || 'image/png',
              prompt: imagePrompt,
              title: `${topic} — Educational Illustration`,
              description: `AI-generated educational illustration about ${topic}`,
            };
          }
        }
      }

      // Response had no image data — try next model
      markImageModelFailed(modelName);
      console.warn(`[DiagramGen] Model "${modelName}" returned no image data, trying next`);
    } catch (err) {
      const isQuotaZero = err.message?.includes('limit: 0') || err.message?.includes('Quota exceeded');
      markImageModelFailed(modelName);
      if (isQuotaZero) {
        console.warn(`[DiagramGen] Model "${modelName}" unavailable (zero quota), trying next fallback`);
      } else {
        console.warn(`[DiagramGen] Model "${modelName}" failed: ${err.message}`);
      }
    }
  }

  // All models exhausted
  console.warn(`[DiagramGen] All image generation models failed for "${topic}"`);
  return null;
}

// ─── Main Generation Orchestrator ─────────────────────────────

/**
 * Generate a diagram for a topic.
 * @param {Object} opts
 * @param {string} opts.topic - The topic/title
 * @param {string} opts.moduleContent - Module content for context
 * @param {string} opts.moduleId - Module ID
 * @param {string} opts.documentId - Document ID
 * @param {string} opts.diagramType - 'mermaid' | 'd2' | 'image' | 'auto'
 * @param {string} opts.teachingLevel - Teaching level
 * @param {string[]} opts.interests - Student interests
 * @param {string} opts.userId - User ID
 * @returns {Object} The generated diagram record
 */
/**
 * Whether this user may have AI-generated diagram IMAGES.
 *
 * Reuses the existing `proModels` entitlement (true for pro/max, false for
 * free/basic) rather than inventing a parallel flag. Anonymous or unresolvable
 * users get code-rendered diagrams, which is also the safe default on error.
 */
async function canUseImageDiagrams(userId) {
  if (!userId) return false;
  try {
    const { getSubscriptionSnapshotForUser } = require('./subscriptionService');
    const sub = await getSubscriptionSnapshotForUser(userId);
    return Boolean(sub?.featureAccess?.canUseProModels);
  } catch (err) {
    console.warn(`[DiagramGen] Entitlement check failed, defaulting to code diagram: ${err.message}`);
    return false;
  }
}

async function generateDiagramForTopic({
  topic, moduleContent, moduleId, documentId,
  diagramType = 'auto', teachingLevel = 'intermediate',
  interests = [], userId = null,
}) {
  const id = uuidv4();
  const prefix = `[DiagramGen ${id.slice(0, 8)}]`;

  // Create pending record
  await supabase.from('generated_diagrams').insert({
    id,
    module_id: moduleId,
    document_id: documentId,
    topic,
    diagram_type: diagramType === 'auto' ? 'mermaid' : diagramType,
    teaching_level: teachingLevel,
    interests_used: interests,
    status: 'generating',
    user_id: userId,
  });

  try {
    // Auto-select type if needed
    let resolvedType = diagramType;
    if (resolvedType === 'auto') {
      resolvedType = await selectDiagramType(topic, moduleContent);
    }

    // If D2 requested but CLI not available, fall back to mermaid
    if (resolvedType === 'd2') {
      const d2Ok = await checkD2Available();
      if (!d2Ok) {
        console.log(`${prefix} D2 not available, falling back to mermaid`);
        resolvedType = 'mermaid';
      }
    }

    // Code-first diagrams. Image generation left the Gemini free tier, so it is
    // reserved for paid plans — and only for content the type selector judged
    // genuinely spatial (anatomy, physical layout), which is the one case code
    // rendering cannot serve. For process, hierarchy and comparison content
    // Mermaid is not a downgrade but an upgrade: it is free, ~10x faster, and
    // renders text labels accurately, which AI image models reliably garble.
    //
    // Gating here rather than inside generateAIImage matters: it avoids
    // attempting an image model that will 429 or reject the key, burning retries
    // and adding seconds before falling back to mermaid anyway.
    if (resolvedType === 'image' && !(await canUseImageDiagrams(userId))) {
      console.log(`${prefix} Image diagrams are a paid feature — rendering as mermaid`);
      resolvedType = 'mermaid';
    }

    let updateData = { diagram_type: resolvedType };

    if (resolvedType === 'mermaid') {
      const result = await generateMermaidDiagram(topic, moduleContent, teachingLevel, interests);
      updateData = {
        ...updateData,
        diagram_code: result.mermaid_code,
        title: result.title,
        description: result.description,
        generation_model: 'gemini-flash',
        status: 'ready',
      };
    } else if (resolvedType === 'd2') {
      const result = await generateD2Diagram(topic, moduleContent, teachingLevel, interests);
      let renderedSvg = null;
      try {
        renderedSvg = await renderD2ToSvg(result.d2_code);
      } catch (renderErr) {
        console.warn(`${prefix} D2 SVG render failed, storing code only: ${renderErr.message}`);
      }
      updateData = {
        ...updateData,
        diagram_code: result.d2_code,
        rendered_svg: renderedSvg,
        title: result.title,
        description: result.description,
        generation_model: 'gemini-flash',
        status: 'ready',
      };
    } else if (resolvedType === 'image') {
      const imgResult = await generateAIImage(topic, teachingLevel, interests, moduleContent);
      if (imgResult) {
        const storagePath = `generated/${moduleId || 'global'}/${id}.png`;
        const publicId = `studyrag/diagrams/${moduleId || 'global'}/${id}`;
        const uploaded = await uploadImageToCloudinary(imgResult.imageBuffer, publicId);

        updateData = {
          ...updateData,
          image_storage_path: storagePath,
          image_url: uploaded.secure_url,
          cloudinary_public_id: uploaded.public_id,
          image_prompt: imgResult.prompt,
          title: imgResult.title,
          description: imgResult.description,
          generation_model: 'gemini-image',
          status: 'ready',
        };
      } else {
        // Image gen not available — fall back to mermaid
        console.log(`${prefix} Image gen unavailable, falling back to mermaid`);
        const result = await generateMermaidDiagram(topic, moduleContent, teachingLevel, interests);
        updateData = {
          diagram_type: 'mermaid',
          diagram_code: result.mermaid_code,
          title: result.title,
          description: result.description,
          generation_model: 'gemini-flash',
          status: 'ready',
        };
      }
    }

    await supabase.from('generated_diagrams').update(updateData).eq('id', id);
    console.log(`${prefix} Generated ${updateData.diagram_type} diagram for "${topic}"`);

    // Return full record
    return await getGeneratedDiagramById(id);
  } catch (err) {
    console.error(`${prefix} Generation failed: ${err.message}`);
    await supabase.from('generated_diagrams').update({
      status: 'failed',
      error_message: err.message,
    }).eq('id', id);
    throw err;
  }
}

// ─── Batch Helper: Generate diagrams for a module ─────────────

/**
 * Generate 1 Mermaid + optionally 1 AI image for a module. Non-throwing.
 */
async function generateModuleDiagrams(moduleId, docId, topic, content, teachingLevel, interests, userId) {
  const prefix = `[DiagramGen batch ${(moduleId || '').slice(0, 8)}]`;

  try {
    // Generate Mermaid diagram
    await generateDiagramForTopic({
      topic,
      moduleContent: content,
      moduleId,
      documentId: docId,
      diagramType: 'mermaid',
      teachingLevel,
      interests,
      userId,
    });
    console.log(`${prefix} Mermaid diagram generated for "${topic}"`);
  } catch (err) {
    console.warn(`${prefix} Mermaid generation failed for "${topic}": ${err.message}`);
  }

  // Optionally try AI image (non-blocking, graceful skip)
  try {
    await generateDiagramForTopic({
      topic,
      moduleContent: content,
      moduleId,
      documentId: docId,
      diagramType: 'image',
      teachingLevel,
      interests,
      userId,
    });
    console.log(`${prefix} AI image generated for "${topic}"`);
  } catch (err) {
    console.warn(`${prefix} AI image generation skipped for "${topic}": ${err.message}`);
  }
}

// ─── CRUD ─────────────────────────────────────────────────────

async function getDiagramsForModule(moduleId) {
  const { data, error } = await supabase
    .from('generated_diagrams')
    .select('*')
    .eq('module_id', moduleId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(formatGeneratedDiagram);
}

async function getGeneratedDiagramById(id) {
  const { data, error } = await supabase
    .from('generated_diagrams')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return formatGeneratedDiagram(data);
}

async function getGeneratedDiagramImageUrl(id) {
  const diagram = await getGeneratedDiagramById(id);
  if (!diagram) return null;
  // Images now live on Cloudinary (public secure_url stored on the row).
  return diagram.imageUrl || null;
}

function formatGeneratedDiagram(row) {
  return {
    id: row.id,
    moduleId: row.module_id,
    documentId: row.document_id,
    topic: row.topic,
    diagramType: row.diagram_type,
    title: row.title,
    description: row.description,
    teachingLevel: row.teaching_level,
    diagramCode: row.diagram_code,
    renderedSvg: row.rendered_svg,
    imageStoragePath: row.image_storage_path,
    imageUrl: row.image_url || null,
    cloudinaryPublicId: row.cloudinary_public_id || null,
    imagePrompt: row.image_prompt,
    interestsUsed: row.interests_used,
    generationModel: row.generation_model,
    status: row.status,
    errorMessage: row.error_message,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

module.exports = {
  generateDiagramForTopic,
  generateModuleDiagrams,
  getDiagramsForModule,
  getGeneratedDiagramById,
  getGeneratedDiagramImageUrl,
  checkD2Available,
};
