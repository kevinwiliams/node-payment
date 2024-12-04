const express = require('express');
const router = express.Router();
const dashController = require('../controllers/dashboardController');
const upload = require('../helpers/upload');

router.get('/', dashController.getDashboard);

router.post('/getcategory', dashController.getCategory);
router.post('/updatecategory', dashController.updateCategory);
router.post('/deletecategory', dashController.deleteCategory);
router.post('/createcategory', dashController.createCategory);

router.post('/getservice', dashController.getService);
router.post('/updateservice', upload.single('serviceImage'), dashController.updateService);
router.post('/createservice', upload.single('serviceImage'), dashController.createService);
router.post('/deleteservice', dashController.deleteService);

router.get('/sales', dashController.getSales);
router.get('/sales/awvision', dashController.getAWVisionSales);

module.exports = router;
