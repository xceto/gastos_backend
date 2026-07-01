const ExpenseService = require('../services/ExpenseService');

class ExpenseController {
  async getExpenses(req, res) {
    try {
      const { month, year } = req.query;
      const userIds = req.user.partner_id ? [req.user.id, req.user.partner_id] : [req.user.id];
      const budgetStartDay = req.user.budget_start_day || 1;
      const data = await ExpenseService.getExpenses(month, year, userIds, budgetStartDay);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createExpense(req, res) {
    try {
      const userIds = req.user.partner_id ? [req.user.id, req.user.partner_id] : [req.user.id];
      const expense = await ExpenseService.createExpense(req.body, userIds);
      res.status(201).json(expense);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateExpense(req, res) {
    try {
      const { id } = req.params;
      const userIds = req.user.partner_id ? [req.user.id, req.user.partner_id] : [req.user.id];
      const expense = await ExpenseService.updateExpense(id, req.body, userIds);
      if (!expense) {
        return res.status(404).json({ error: 'Gasto no encontrado' });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteExpense(req, res) {
    try {
      const { id } = req.params;
      const userIds = req.user.partner_id ? [req.user.id, req.user.partner_id] : [req.user.id];
      const deleted = await ExpenseService.deleteExpense(id, userIds);
      if (!deleted) {
        return res.status(404).json({ error: 'Gasto no encontrado' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getSummary(req, res) {
    try {
      const { month, year } = req.query;
      const userIds = req.user.partner_id ? [req.user.id, req.user.partner_id] : [req.user.id];
      const budgetStartDay = req.user.budget_start_day || 1;
      const summary = await ExpenseService.getSummary(month, year, userIds, budgetStartDay);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ExpenseController();
