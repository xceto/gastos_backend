const express = require('express');
const router = express.Router();
const ExpenseController = require('../controllers/ExpenseController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', ExpenseController.getExpenses);
router.post('/', ExpenseController.createExpense);
router.get('/summary', ExpenseController.getSummary);
router.get('/accumulated-balance', ExpenseController.getAccumulatedBalance);
router.put('/:id', ExpenseController.updateExpense);
router.delete('/:id', ExpenseController.deleteExpense);

module.exports = router;
