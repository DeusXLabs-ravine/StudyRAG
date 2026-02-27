const express = require('express');
const router = express.Router();
const simulationController = require('../controllers/simulationController');

router.post('/generate-params', simulationController.generateParams);
router.get('/catalog', simulationController.getCatalog);

module.exports = router;
