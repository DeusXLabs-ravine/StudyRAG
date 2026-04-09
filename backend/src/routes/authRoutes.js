const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { getProfile, createProfile, updateProfile, adminGrantTier } = require('../controllers/authController');
const { adminMaxEmails } = require('../config/env');

const router = Router();

// All profile routes require authentication
router.get('/profile', requireAuth, getProfile);
router.post('/profile', requireAuth, createProfile);
router.put('/profile', requireAuth, updateProfile);

// Admin: grant/set tier for any user by email (requires ADMIN_SECRET header)
router.post('/admin/grant-tier', requireAuth, (req, res, next) => {
  // Only emails in adminMaxEmails can call this endpoint
  if (!adminMaxEmails.includes(req.user.email?.toLowerCase())) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}, adminGrantTier);

module.exports = router;
