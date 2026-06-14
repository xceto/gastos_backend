const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', UserController.getAll);
router.put('/partner', UserController.updatePartner);
router.put('/:id', UserController.updateSettings);

module.exports = router;
