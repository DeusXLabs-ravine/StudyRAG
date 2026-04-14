const express = require('express');
const router = express.Router();
const simulationController = require('../controllers/simulationController');
const { requireFeature } = require('../middleware/tierAuth');

router.post('/generate-params', requireFeature('simulations'), simulationController.generateParams);
router.get('/catalog', simulationController.getCatalog);

module.exports = router;
