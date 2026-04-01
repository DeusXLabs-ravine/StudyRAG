const supabase = require('../config/database');
const { getAllModules, getModuleById, getModulesByDocument, getModulesByCourse, regenerateQuestions: regenerateModuleQuestions, isGeneratingModules } = require('../services/moduleGenerator');
const { shouldGenerateBridge, triggerBridgeGeneration } = require('../services/bridgeModuleService');

function formatProgress(row) {
  if (!row) return { completed: false, score: null, attempts: 0 };
  return {
    completed: !!row.completed,
    score: row.best_score,
    attempts: row.attempts,
    lastAttempt: row.last_attempt,
  };
}

async function getProgressForModule(moduleId) {
  const { data: row, error } = await supabase
    .from('module_progress')
    .select('*')
    .eq('module_id', moduleId)
    .single();

  if (error && error.code === 'PGRST116') return formatProgress(null);
  if (error) throw error;
  return formatProgress(row);
}

/**
 * Batch-fetch progress for many modules in a single query (eliminates N+1).
 * Returns a Map<moduleId, progress>.
 */
async function getProgressBatch(moduleIds) {
  if (moduleIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('module_progress')
    .select('*')
    .in('module_id', moduleIds);
  if (error) throw error;
  const map = new Map((data || []).map(row => [row.module_id, formatProgress(row)]));
  return map;
}

async function listModules(req, res, next) {
  try {
    const { documentId, courseId } = req.query;
    let modules;

    if (courseId) {
      modules = await getModulesByCourse(courseId);
    } else if (documentId) {
      modules = await getModulesByDocument(documentId);
    } else {
      modules = await getAllModules();
    }

    // Single batch query instead of N individual queries
    const progressMap = await getProgressBatch(modules.map(m => m.id));
    const modulesWithProgress = modules.map(mod => ({
      ...mod,
      progress: progressMap.get(mod.id) || formatProgress(null),
    }));

    const generating = documentId ? isGeneratingModules(documentId) : false;
    res.json({ modules: modulesWithProgress, generating });
  } catch (error) {
    next(error);
  }
}

async function getModule(req, res, next) {
  try {
    const module = await getModuleById(req.params.id);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const progress = await getProgressForModule(module.id);
    res.json({ ...module, progress });
  } catch (error) {
    next(error);
  }
}

async function updateProgress(req, res, next) {
  try {
    const { id } = req.params;
    const { score, answers, durationSeconds } = req.body;
    const userId = req.user?.id || null;

    const module = await getModuleById(id);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const completed = score >= 70;

    const tpRow = module.topic ? {
      topic: module.topic,
      source_mode: 'module',
      source_id: id,
      score: score / 100,
      ...(userId ? { user_id: userId } : {}),
    } : null;

    const sessRow = {
      mode: 'learn',
      duration_seconds: durationSeconds || null,
      details_json: { moduleId: id, score },
      ...(userId ? { user_id: userId } : {}),
    };

    // Run all 3 writes in parallel
    const [, tpRes, sessRes] = await Promise.all([
      supabase.rpc('upsert_module_progress', {
        p_module_id: id,
        p_completed: completed,
        p_best_score: score,
        p_last_attempt: new Date().toISOString(),
        p_user_id: userId,
      }),
      tpRow ? supabase.from('topic_performance').insert(tpRow) : Promise.resolve({ error: null }),
      supabase.from('study_sessions').insert(sessRow),
    ]);
    if (tpRes.error) throw tpRes.error;
    if (sessRes.error) throw sessRes.error;

    // Check if a bridge module should be generated (non-blocking)
    let bridgeGenerating = false;
    if (answers) {
      try {
        const needsBridge = await shouldGenerateBridge(id, score, userId);
        if (needsBridge) {
          triggerBridgeGeneration(id, module, score, answers, userId);
          bridgeGenerating = true;
        }
      } catch (bridgeErr) {
        console.error(`[moduleController] Bridge check failed:`, bridgeErr.message);
      }
    }

    const progress = await getProgressForModule(id);
    res.json({ moduleId: id, progress, bridgeGenerating });
  } catch (error) {
    next(error);
  }
}

async function regenerateQuestions(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const updatedModule = await regenerateModuleQuestions(id, userId);
    const progress = await getProgressForModule(id);
    res.json({ ...updatedModule, progress });
  } catch (error) {
    next(error);
  }
}

module.exports = { listModules, getModule, updateProgress, regenerateQuestions };
