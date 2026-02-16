const { solveProblem, solveFollowUp, getSolverHistory } = require('../services/solverService');

async function solve(req, res, next) {
  try {
    const { problem, subject, documentId, useWebSearch = false } = req.body;

    if (!problem || !problem.trim()) {
      return res.status(400).json({ error: 'Problem is required' });
    }

    const result = await solveProblem(problem.trim(), subject || null, documentId || null, useWebSearch);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function followUp(req, res, next) {
  try {
    const { sessionId, question } = req.body;

    if (!sessionId || !question || !question.trim()) {
      return res.status(400).json({ error: 'Session ID and question are required' });
    }

    const result = await solveFollowUp(sessionId, question.trim());
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function history(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const sessions = await getSolverHistory(limit);
    res.json({ sessions });
  } catch (error) {
    next(error);
  }
}

module.exports = { solve, followUp, history };
