const express = require('express');
const { getDailyWidgetContent } = require('../controllers/widgetController');

const router = express.Router();

// Mobile clients hit this once a day (and on login / foreground). The controller
// sets a 6h private Cache-Control so a warm refresh is cheap.
router.get('/daily', getDailyWidgetContent);

module.exports = router;
