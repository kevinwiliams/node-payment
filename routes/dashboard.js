const express = require('express');
const router = express.Router();
const dashController = require('../controllers/dashboardController');

router.get('/', dashController.getDashboard);
router.post('/getcategory', dashController.getCategory);
router.post('/getservice', dashController.getService);

module.exports = router;
