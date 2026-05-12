const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { getProfile, createProfile, updateProfile, adminGrantTier } = require('../controllers/authController');
const { adminMaxEmails } = require('../config/env');
const supabase = require('../config/database');

const router = Router();

// All profile routes require authentication
router.get('/profile', requireAuth, getProfile);
router.post('/profile', requireAuth, createProfile);
router.put('/profile', requireAuth, updateProfile);

// Claim student discount: verify .edu email, mark is_student on profile
router.post('/claim-student', requireAuth, async (req, res) => {
  const { studentEmail } = req.body;
  if (!studentEmail || typeof studentEmail !== 'string') {
    return res.status(400).json({ error: 'studentEmail is required.' });
  }
  const normalizedEmail = studentEmail.toLowerCase().trim();
  // Accept .edu and common academic TLDs (.ac.uk, .edu.ng, .ac.za, etc.)
  const isAcademic = /\.edu(\.[a-z]{2})?$|\.ac\.[a-z]{2,}$/.test(normalizedEmail);
  if (!isAcademic) {
    return res.status(400).json({ error: 'A valid academic email (.edu or .ac.*) is required.' });
  }
  const { error } = await supabase
    .from('profiles')
    .update({ is_student: true, student_email: normalizedEmail, updated_at: new Date().toISOString() })
    .eq('id', req.user.id);
  if (error) {
    console.error('[AuthRoutes] claim-student update failed:', error.message);
    return res.status(500).json({ error: 'Failed to apply student status.' });
  }
  res.json({ success: true });
});

// Admin: grant/set tier for any user by email (requires ADMIN_SECRET header)
router.post('/admin/grant-tier', requireAuth, (req, res, next) => {
  // Only emails in adminMaxEmails can call this endpoint
  if (!adminMaxEmails.includes(req.user.email?.toLowerCase())) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}, adminGrantTier);

module.exports = router;
