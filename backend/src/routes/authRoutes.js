const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { getProfile, createProfile, updateProfile } = require('../controllers/authController');

const router = Router();

// All profile routes require authentication
router.get('/profile', requireAuth, getProfile);
router.post('/profile', requireAuth, createProfile);
router.put('/profile', requireAuth, updateProfile);

module.exports = router;
