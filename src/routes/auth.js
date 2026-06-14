const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.get('/validate', authMiddleware, AuthController.validate);

module.exports = router;
