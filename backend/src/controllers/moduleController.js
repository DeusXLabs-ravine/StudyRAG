const supabase = require('../config/database');
const { getAllModules, getModuleById, getModulesByDocument, getModulesByCourse, regenerateQuestions: regenerateModuleQuestions, isGeneratingModules } = require('../services/moduleGenerator');
const { shouldGenerateBridge, triggerBridgeGeneration } = require('../services/bridgeModuleService');

async function getProgressForModule(moduleId) {
  const { data: row, error } = await supabase
    .from('module_progress')
    .select('*')
    .eq('module_id', moduleId)
    .single();

  if (error && error.code === 'PGRST116') {
    return { completed: false, score: null, attempts: 0 };
  }
  if (error) throw error;

  return {
    completed: !!row.completed,
    score: row.best_score,
    attempts: row.attempts,
    lastAttempt: row.last_attempt,
  };
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

    const modulesWithProgress = await Promise.all(
      modules.map(async (mod) => ({
        ...mod,
        progress: await getProgressForModule(mod.id),
      }))
    );

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
    const { score, answers } = req.body;
    const userId = req.user?.id || null;

    const module = await getModuleById(id);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const completed = score >= 70;

    await supabase.rpc('upsert_module_progress', {
      p_module_id: id,
      p_completed: completed,
      p_best_score: score,
      p_last_attempt: new Date().toISOString(),
      p_user_id: userId,
    });

    // Record topic performance
    if (module.topic) {
      const row = {
        topic: module.topic,
        source_mode: 'module',
        source_id: id,
        score: score / 100,
      };
      if (userId) row.user_id = userId;
      const { error: tpErr } = await supabase.from('topic_performance').insert(row);
      if (tpErr) throw tpErr;
    }

    // Record study session
    const sessRow = {
      mode: 'learn',
      details_json: { moduleId: id, score },
    };
    if (userId) sessRow.user_id = userId;
    const { error: sessErr } = await supabase.from('study_sessions').insert(sessRow);
    if (sessErr) throw sessErr;

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
