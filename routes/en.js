const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainController');
const paymentController = require('../controllers/paymentController');

router.get('/', mainController.getMain);
router.post('/service', mainController.getService);
router.post('/auth', paymentController.authenticate);
router.post('/confirmation', paymentController.completePayment);

module.exports = router;
