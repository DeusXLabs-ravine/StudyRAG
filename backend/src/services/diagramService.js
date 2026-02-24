const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/database');
const { generateContentWithVision, getGenerativeModel } = require('../config/gemini');
const { extractImagesFromBuffer } = require('./imageExtractor');
const {
  DIAGRAM_DETECTION_PROMPT,
  DIAGRAM_ANALYSIS_PROMPT,
  DIAGRAM_SIMPLIFY_PROMPT,
} = require('../utils/prompts');

const VISION_CONCURRENCY = 3;
const STORAGE_BUCKET = 'diagram-images';
const TEACHING_LEVELS = ['dummy', 'beginner', 'intermediate', 'advanced'];
const DEFAULT_ANALYSIS_LEVEL = 'intermediate';

// ─── Storage Bucket ────────────────────────────────────────

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

// ─── JSON Parsing Helpers ──────────────────────────────────

function parseJsonResponse(text) {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

// ─── Concurrency Limiter ───────────────────────────────────

async function runWithConcurrency(tasks, concurrency) {
  const results = [];
  const executing = new Set();

  for (const task of tasks) {
    const p = task().then(r => {
      executing.delete(p);
      return r;
    });
    executing.add(p);
    results.push(p);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  return Promise.allSettled(results);
}

// ─── Step 1: Detect Diagrams ──────────────────────────────

async function detectDiagrams(images) {
  const detected = [];

  const tasks = images.map((img) => async () => {
    try {
      const response = await generateContentWithVision(
        img.imageBuffer, img.mimeType, DIAGRAM_DETECTION_PROMPT, 'fast'
      );
      const result = parseJsonResponse(response);

      if (result.has_diagram && result.diagrams?.length > 0) {
        detected.push({
          ...img,
          detectedDiagrams: result.diagrams,
        });
      }
    } catch (err) {
      console.warn(`[DiagramService] Detection failed for page ${img.pageNumber}: ${err.message}`);
    }
  });

  await runWithConcurrency(tasks, VISION_CONCURRENCY);
  return detected;
}

// ─── Step 2: Analyze a Single Diagram ──────────────────────

async function analyzeDiagram(imageBuffer, mimeType, detectedInfo) {
  const prompt = DIAGRAM_ANALYSIS_PROMPT.replace('{teaching_level}', DEFAULT_ANALYSIS_LEVEL);
  const response = await generateContentWithVision(imageBuffer, mimeType, prompt, 'standard');
  return parseJsonResponse(response);
}

// ─── Step 3: Generate Simplified Levels (Text-Only) ────────

async function generateSimplifiedLevel(analysis, level) {
  const mermaidSection = analysis.mermaid_code
    ? `Reference Mermaid code:\n\`\`\`mermaid\n${analysis.mermaid_code}\n\`\`\``
    : 'No reference Mermaid code available.';

  const prompt = DIAGRAM_SIMPLIFY_PROMPT
    .replace('{teaching_level}', level)
    .replace('{diagram_type}', analysis.diagram_type || 'other')
    .replace('{description}', analysis.description || '')
    .replace('{key_concepts}', JSON.stringify(analysis.key_concepts || []))
    .replace('{labels}', JSON.stringify(analysis.labels || []))
    .replace('{mermaid_section}', mermaidSection);

  const model = getGenerativeModel('fast');
  const result = await model.generateContent(prompt);
  return parseJsonResponse(result.response.text());
}

// ─── Pipeline Orchestrator ─────────────────────────────────

async function processDocumentDiagrams(docId, buffer, ext, pageTexts) {
  const prefix = `[DiagramService ${docId.slice(0, 8)}]`;

  try {
    // Step 1: Extract candidate images
    const t0 = Date.now();
    const images = await extractImagesFromBuffer(buffer, ext, pageTexts);
    console.log(`${prefix} Extracted ${images.length} candidate images (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

    if (images.length === 0) {
      console.log(`${prefix} No candidate images found — skipping diagram processing`);
      return;
    }

    // Step 2: Detect which pages actually have diagrams
    const t1 = Date.now();
    const detected = await detectDiagrams(images);
    console.log(`${prefix} Detected ${detected.length} pages with diagrams (${((Date.now() - t1) / 1000).toFixed(1)}s)`);

    if (detected.length === 0) {
      console.log(`${prefix} No diagrams detected — done`);
      return;
    }

    // Step 3: Upload original images and create DB rows
    await ensureBucket();

    const diagramRows = [];
    for (const item of detected) {
      for (const diag of item.detectedDiagrams) {
        const id = uuidv4();
        const storagePath = `${docId}/${id}.png`;

        // Upload original page image
        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, item.imageBuffer, { contentType: item.mimeType });
        if (uploadErr) {
          console.warn(`${prefix} Failed to upload image for page ${item.pageNumber}: ${uploadErr.message}`);
          continue;
        }

        // Create DB row
        const row = {
          id,
          document_id: docId,
          page_number: item.pageNumber,
          diagram_type: diag.type || 'other',
          title: diag.title || null,
          description: '',
          labels: diag.labels || [],
          mermaid_code: {},
          simplified_descriptions: {},
          original_image_path: storagePath,
          status: 'analyzing',
        };

        const { error: insertErr } = await supabase.from('document_diagrams').insert(row);
        if (insertErr) {
          console.warn(`${prefix} Failed to insert diagram row: ${insertErr.message}`);
          continue;
        }

        diagramRows.push({ ...row, imageBuffer: item.imageBuffer, mimeType: item.mimeType });
      }
    }

    // Step 4: Full analysis + level generation for each diagram
    const t2 = Date.now();
    const analysisTasks = diagramRows.map((row) => async () => {
      try {
        // Full vision analysis at default level
        const analysis = await analyzeDiagram(row.imageBuffer, row.mimeType, null);

        const mermaidCode = {};
        const descriptions = {};

        // Set the analyzed level
        if (analysis.can_be_mermaid && analysis.mermaid_code) {
          mermaidCode[DEFAULT_ANALYSIS_LEVEL] = analysis.mermaid_code;
        }
        descriptions[DEFAULT_ANALYSIS_LEVEL] = analysis.simplified_description || analysis.description;

        // Generate other levels via text-only simplification
        const otherLevels = TEACHING_LEVELS.filter(l => l !== DEFAULT_ANALYSIS_LEVEL);
        for (const level of otherLevels) {
          try {
            const simplified = await generateSimplifiedLevel(analysis, level);
            if (simplified.mermaid_code) mermaidCode[level] = simplified.mermaid_code;
            if (simplified.simplified_description) descriptions[level] = simplified.simplified_description;
          } catch (err) {
            console.warn(`${prefix} Failed to generate ${level} level for ${row.id}: ${err.message}`);
          }
        }

        // Update DB row
        await supabase.from('document_diagrams').update({
          description: analysis.description || 'Diagram analysis complete',
          title: analysis.title || row.title,
          diagram_type: analysis.diagram_type || row.diagram_type,
          labels: analysis.labels || row.labels,
          mermaid_code: mermaidCode,
          simplified_descriptions: descriptions,
          analysis_json: analysis,
          status: 'ready',
        }).eq('id', row.id);

        console.log(`${prefix} Diagram ${row.id.slice(0, 8)} (page ${row.page_number}) → ready`);
      } catch (err) {
        console.error(`${prefix} Analysis failed for diagram ${row.id}: ${err.message}`);
        await supabase.from('document_diagrams').update({
          status: 'failed',
          error_message: err.message,
        }).eq('id', row.id);
      }
    });

    await runWithConcurrency(analysisTasks, VISION_CONCURRENCY);
    console.log(`${prefix} All diagram analysis complete (${((Date.now() - t2) / 1000).toFixed(1)}s)`);
  } catch (err) {
    console.error(`${prefix} Diagram processing failed: ${err.message}`);
  }
}

// ─── CRUD Functions ────────────────────────────────────────

async function getDiagramsByDocument(docId) {
  const { data, error } = await supabase
    .from('document_diagrams')
    .select('*')
    .eq('document_id', docId)
    .order('page_number', { ascending: true });
  if (error) throw error;
  return (data || []).map(formatDiagram);
}

async function getDiagramById(id) {
  const { data, error } = await supabase
    .from('document_diagrams')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return formatDiagram(data);
}

async function getDiagramImageUrl(id) {
  const diagram = await getDiagramById(id);
  if (!diagram || !diagram.originalImagePath) return null;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(diagram.originalImagePath, 3600); // 1hr expiry
  if (error) throw error;
  return data.signedUrl;
}

async function regenerateDiagramLevel(id, level) {
  if (!TEACHING_LEVELS.includes(level)) {
    throw new Error(`Invalid teaching level: ${level}. Must be one of: ${TEACHING_LEVELS.join(', ')}`);
  }

  const diagram = await getDiagramById(id);
  if (!diagram) throw new Error('Diagram not found');

  const analysis = diagram.analysisJson || {
    description: diagram.description,
    diagram_type: diagram.diagramType,
    key_concepts: [],
    labels: diagram.labels || [],
    mermaid_code: Object.values(diagram.mermaidCode || {})[0] || '',
  };

  const simplified = await generateSimplifiedLevel(analysis, level);

  // Merge into existing
  const mermaidCode = { ...diagram.mermaidCode };
  const descriptions = { ...diagram.simplifiedDescriptions };

  if (simplified.mermaid_code) mermaidCode[level] = simplified.mermaid_code;
  if (simplified.simplified_description) descriptions[level] = simplified.simplified_description;

  const { error } = await supabase.from('document_diagrams').update({
    mermaid_code: mermaidCode,
    simplified_descriptions: descriptions,
  }).eq('id', id);
  if (error) throw error;

  return { mermaidCode, simplifiedDescriptions: descriptions };
}

async function deleteDiagramsByDocument(docId) {
  // Get image paths to clean up storage
  const { data: diagrams } = await supabase
    .from('document_diagrams')
    .select('original_image_path')
    .eq('document_id', docId);

  if (diagrams && diagrams.length > 0) {
    const paths = diagrams.map(d => d.original_image_path).filter(Boolean);
    if (paths.length > 0) {
      try {
        await supabase.storage.from(STORAGE_BUCKET).remove(paths);
      } catch (err) {
        console.warn(`[DiagramService] Failed to delete stored images: ${err.message}`);
      }
    }
  }

  const { error } = await supabase
    .from('document_diagrams')
    .delete()
    .eq('document_id', docId);
  if (error) throw error;
}

// ─── Helpers ───────────────────────────────────────────────

function formatDiagram(row) {
  return {
    id: row.id,
    documentId: row.document_id,
    pageNumber: row.page_number,
    diagramType: row.diagram_type,
    title: row.title,
    description: row.description,
    labels: row.labels,
    mermaidCode: row.mermaid_code,
    simplifiedDescriptions: row.simplified_descriptions,
    originalImagePath: row.original_image_path,
    analysisJson: row.analysis_json,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

module.exports = {
  processDocumentDiagrams,
  getDiagramsByDocument,
  getDiagramById,
  getDiagramImageUrl,
  regenerateDiagramLevel,
  deleteDiagramsByDocument,
};
