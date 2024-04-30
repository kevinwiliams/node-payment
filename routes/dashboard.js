const express = require('express');
const router = express.Router();
const dashController = require('../controllers/dashboardController');

router.get('/', dashController.getDashboard);

module.exports = router;
