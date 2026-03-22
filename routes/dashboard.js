const express = require('express');
const router = express.Router();
const dashController = require('../controllers/dashboardController');
const upload = require('../helpers/upload');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

router.get('/', dashController.getDashboard);

router.post('/getcategory', dashController.getCategory);
router.post('/updatecategory', dashController.updateCategory);
router.post('/deletecategory', dashController.deleteCategory);
router.post('/createcategory', dashController.createCategory);

router.post('/getservice', dashController.getService);
router.post('/updateservice', upload.single('serviceImage'), dashController.updateService);
router.post('/createservice', upload.single('serviceImage'), dashController.createService);
router.post('/deleteservice', dashController.deleteService);
router.post('/getprintandsubrate', dashController.getPrintAndSubRate);
router.post('/createprintandsubrate', dashController.createPrintAndSubRate);
router.post('/updateprintandsubrate', dashController.updatePrintAndSubRate);
router.post('/deleteprintandsubrate', dashController.deletePrintAndSubRate);

router.get('/sales', dashController.getSales);
router.get('/sales/awvision', dashController.getAWVisionSales);

module.exports = router;
