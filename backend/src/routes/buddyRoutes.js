const express = require('express');
const router = express.Router();
const {
  listPresets,
  listVoices,
  getMyProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  listSessions,
  getSession,
  listMemory,
  deleteMemory,
  wipeMemory,
  getUsage,
} = require('../controllers/buddyController');

// Catalog — these don't need a tier check (let users see the feature before paying)
router.get('/presets', listPresets);
router.get('/voices',  listVoices);

// Profile (one active per user)
router.get('/profile',      getMyProfile);
router.post('/profile',     createProfile);
router.patch('/profile/:id', updateProfile);
router.delete('/profile/:id', deleteProfile);

// Sessions
router.get('/sessions',     listSessions);
router.get('/sessions/:id', getSession);

// Memory
router.get('/memory',         listMemory);
router.post('/memory/wipe',   wipeMemory);
router.delete('/memory/:id',  deleteMemory);

// Usage (minutes this cycle)
router.get('/usage', getUsage);

module.exports = router;
