const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/SettingsController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', SettingsController.getSettings);
router.post('/', SettingsController.upsertSalary);

module.exports = router;
