const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

router.get('/', userController.getUsers);

router.get('/create', userController.userForm);
router.post('/create', userController.createUser);

router.get('/:id', userController.getUserInfo);
router.post('/:id', userController.updateUser);

router.post('/del/:id', userController.deleteUser);

module.exports = router;
