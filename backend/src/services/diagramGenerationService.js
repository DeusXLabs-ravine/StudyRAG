const { v4: uuidv4 } = require('uuid');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const supabase = require('../config/database');
const { getGenerativeModel, getImageGenerationModel, withRetryOnRateLimit } = require('../config/gemini');
const {
  DIAGRAM_GENERATION_PROMPT,
  D2_DIAGRAM_GENERATION_PROMPT,
  DIAGRAM_TYPE_SELECTOR_PROMPT,
  buildDiagramInterestsSection,
} = require('../utils/prompts');

const STORAGE_BUCKET = 'diagram-images';

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

// ─── Storage Bucket ───────────────────────────────────────────

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const { data: existing } = await supabase.storage.getBucket(STORAGE_BUCKET);
  if (!existing) {
    const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, { public: false });
    if (error && !error.message?.includes('already exists')) throw error;
  }
  bucketReady = true;
}

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
  const interestsSection = buildDiagramInterestsSection(interests, teachingLevel);

  const prompt = DIAGRAM_GENERATION_PROMPT
    .replace('{topic}', topic)
    .replace('{content}', (content || '').slice(0, 8000))
    .replace('{teaching_level}', teachingLevel)
    .replace('{interests_section}', interestsSection);

  const result = await withRetryOnRateLimit(async () => {
    const model = getGenerativeModel('fast');
    return model.generateContent(prompt);
  });

  return parseJsonResponse(result.response.text());
}

// ─── Generate D2 Diagram ──────────────────────────────────────

async function generateD2Diagram(topic, content, teachingLevel, interests) {
  const interestsSection = buildDiagramInterestsSection(interests, teachingLevel);

  const prompt = D2_DIAGRAM_GENERATION_PROMPT
    .replace('{topic}', topic)
    .replace('{content}', (content || '').slice(0, 8000))
    .replace('{teaching_level}', teachingLevel)
    .replace('{interests_section}', interestsSection);

  const result = await withRetryOnRateLimit(async () => {
    const model = getGenerativeModel('fast');
    return model.generateContent(prompt);
  });

  return parseJsonResponse(result.response.text());
}

// ─── Generate AI Image ────────────────────────────────────────

async function generateAIImage(topic, teachingLevel, interests) {
  const interestsHint = interests?.length > 0
    ? `The student is interested in: ${interests.join(', ')}. Subtly incorporate visual elements related to their interests where natural.`
    : '';

  const imagePrompt = `Create a clean, educational illustration for a ${teachingLevel}-level student about: "${topic}".
The image should be a clear, informative diagram or illustration suitable for a textbook or educational slide.
Use a clean white or light background. Include labeled parts where appropriate.
Style: professional educational illustration, clean lines, clear colors, informative.
${interestsHint}
Do NOT include any text that is hard to read. Keep labels large and clear.`;

  try {
    const result = await withRetryOnRateLimit(async () => {
      const model = getImageGenerationModel();
      return model.generateContent(imagePrompt);
    });

    // Extract image data from response
    const response = result.response;
    const candidates = response.candidates || [];

    for (const candidate of candidates) {
      for (const part of (candidate.content?.parts || [])) {
        if (part.inlineData) {
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

    return null; // No image in response
  } catch (err) {
    console.warn(`[DiagramGen] AI image generation failed (may not be available on this account): ${err.message}`);
    return null;
  }
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
      const imgResult = await generateAIImage(topic, teachingLevel, interests);
      if (imgResult) {
        await ensureBucket();
        const storagePath = `generated/${moduleId || 'global'}/${id}.png`;
        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, imgResult.imageBuffer, { contentType: imgResult.mimeType });

        if (uploadErr) throw new Error(`Image upload failed: ${uploadErr.message}`);

        updateData = {
          ...updateData,
          image_storage_path: storagePath,
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
  if (!diagram || !diagram.imageStoragePath) return null;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(diagram.imageStoragePath, 3600);
  if (error) throw error;
  return data.signedUrl;
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
