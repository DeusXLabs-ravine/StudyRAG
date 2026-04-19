const express = require('express');
const multer = require('multer');
const { ocrScan } = require('../controllers/ocrController');

const router = express.Router();

// Keep the buffer in memory — OCR is a one-shot call per request, no reason
// to hit disk. Limit to 15MB (enforced again in the controller).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.post('/scan', upload.single('image'), ocrScan);

module.exports = router;
