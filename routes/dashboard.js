const express = require('express');
const router = express.Router();
const dashController = require('../controllers/dashboardController');

router.get('/', dashController.getDashboard);

router.post('/getcategory', dashController.getCategory);
router.post('/updatecategory', dashController.updateCategory);
router.post('/deletecategory', dashController.deleteCategory);
router.post('/createcategory', dashController.createCategory);

router.post('/getservice', dashController.getService);
router.post('/updateservice', dashController.updateService);
router.post('/deleteservice', dashController.deleteService);
router.post('/createservice', dashController.createService);

router.get('/sales', dashController.getSales);

module.exports = router;
