const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/PaymentController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', PaymentController.getPayments.bind(PaymentController));
router.post('/', PaymentController.createPayment.bind(PaymentController));

module.exports = router;
