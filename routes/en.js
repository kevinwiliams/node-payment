const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainController');

router.get('/', mainController.getMain);
router.post('/service', mainController.getService);
// router.post('/authenticate', mainController.authenticate);
// router.post('/paymentCompletion', mainController.completePayment);

module.exports = router;
