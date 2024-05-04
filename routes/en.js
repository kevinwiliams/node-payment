const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainController');
const paymentController = require('../controllers/paymentController');

router.get('/', mainController.getMain);
router.post('/checkout', mainController.loadPaymentInfo);
router.post('/service', mainController.getService);
router.post('/auth', paymentController.authenticate);
router.post('/confirmation', paymentController.completePayment);

router.get('/terms', (req, res) => {
    res.render('en/terms', {title: 'Terms & Conditions'}); 
});

router.get('/privacy', (req, res) => {
    res.render('en/privacy', {title: 'Privacy Policy'}); 
});

module.exports = router;
