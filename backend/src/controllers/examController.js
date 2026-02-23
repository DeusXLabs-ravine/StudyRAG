const { generateQuiz, submitQuiz, getQuizHistory } = require('../services/quizGenerator');
const examPrepService = require('../services/examPrepService');
const path = require('path');

async function generateExam(req, res, next) {
  try {
    const {
      numQuestions = 20,
      difficulty = 'medium',
      documentId,
      timeLimitMinutes = 30,
    } = req.body;

    const exam = await generateQuiz({
      numQuestions,
      difficulty,
      docId: documentId,
      adaptive: true,
      isExam: true,
      timeLimitSeconds: timeLimitMinutes * 60,
      userId: req.user?.id || null,
    });

    res.json(exam);
  } catch (error) {
    next(error);
  }
}

async function submitExam(req, res, next) {
  try {
    const { quizId, answers, questions, timeSpentSeconds } = req.body;

    if (!answers || !questions) {
      return res.status(400).json({ error: 'Answers and questions are required' });
    }

    const result = await submitQuiz(quizId, answers, questions, timeSpentSeconds, req.user?.id || null);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getExamHistory(req, res, next) {
  try {
    const history = (await getQuizHistory(req.user?.id || null)).filter(h => h.isExam);
    res.json({ history });
  } catch (error) {
    next(error);
  }
}

// ─── Exam Prep Endpoints ───────────────────────────────────

async function createPrepSession(req, res, next) {
  try {
    const { documentIds, name, config } = req.body;
    if (!documentIds || documentIds.length === 0) {
      return res.status(400).json({ error: 'At least one document ID is required' });
    }
    const session = await examPrepService.createSession({ documentIds, name, config, userId: req.user?.id || null });
    res.json(session);
  } catch (error) {
    next(error);
  }
}

async function listPrepSessions(req, res, next) {
  try {
    const sessions = await examPrepService.listSessions(req.user?.id || null);
    res.json({ sessions });
  } catch (error) {
    next(error);
  }
}

async function getPrepSession(req, res, next) {
  try {
    const session = await examPrepService.getSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Prep session not found' });
    }
    res.json(session);
  } catch (error) {
    next(error);
  }
}

async function deletePrepSession(req, res, next) {
  try {
    await examPrepService.deleteSession(req.params.sessionId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function addPrepMaterial(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { materialType, text } = req.body;

    if (!materialType) {
      return res.status(400).json({ error: 'materialType is required' });
    }

    let material;
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      material = await examPrepService.addMaterial(sessionId, {
        materialType,
        buffer: req.file.buffer,
        ext,
        originalName: req.file.originalname,
      });
    } else if (text) {
      material = await examPrepService.addMaterial(sessionId, {
        materialType,
        text,
        originalName: req.body.originalName || 'Pasted text',
      });
    } else {
      return res.status(400).json({ error: 'Either a file or text content is required' });
    }

    res.json(material);
  } catch (error) {
    next(error);
  }
}

async function startPrepGeneration(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await examPrepService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Prep session not found' });
    }

    res.json({ status: 'generating', sessionId });

    examPrepService.generatePrepContent(sessionId, req.user?.id || null).catch(err => {
      console.error('Background exam prep generation failed:', err.message);
    });
  } catch (error) {
    next(error);
  }
}

async function generatePrepPracticeExam(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { numQuestions = 20, difficulty = 'medium', timeLimitMinutes = 30 } = req.body;

    const exam = await examPrepService.generatePracticeExam(sessionId, {
      numQuestions,
      difficulty,
      timeLimitMinutes,
      userId: req.user?.id || null,
    });

    res.json(exam);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  generateExam,
  submitExam,
  getExamHistory,
  createPrepSession,
  listPrepSessions,
  getPrepSession,
  deletePrepSession,
  addPrepMaterial,
  startPrepGeneration,
  generatePrepPracticeExam,
};
