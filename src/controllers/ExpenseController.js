const ExpenseService = require('../services/ExpenseService');
const ImportService = require('../services/ImportService');

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

  /**
   * POST /api/expenses/import/preview
   * Body: { rows: [{ date, amount, description }] }
   * Returns: { newExpenses, duplicates }
   */
  async importPreview(req, res) {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows)) {
        return res.status(400).json({ error: 'rows must be an array' });
      }
      const result = await ImportService.preview(rows, req.user.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/expenses/import/confirm
   * Body: { rows: [{ date, amount, description, category, is_shared, own_amount }] }
   * Saves each row as a CC expense.
   */
  async importConfirm(req, res) {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'rows must be a non-empty array' });
      }
      const userIds = req.user.partner_id
        ? [req.user.id, req.user.partner_id]
        : [req.user.id];

      const created = [];
      for (const row of rows) {
        const expense = await ExpenseService.createExpense(
          {
            user_id: req.user.id,
            amount: row.amount,
            description: row.description || '',
            category: row.category || 'otros',
            is_shared: !!row.is_shared,
            date: row.date,
            bonus: 0,
            bonus_user_id: null,
            installments_total: 1,
            is_credit_card: true,
            own_amount: row.is_shared && row.own_amount != null ? row.own_amount : null,
          },
          userIds
        );
        created.push(expense);
      }
      res.status(201).json({ imported: created.length, expenses: created });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAccumulatedBalance(req, res) {
    try {
      const userIds = req.user.partner_id ? [req.user.id, req.user.partner_id] : [req.user.id];
      const data = await ExpenseService.getAccumulatedBalance(userIds);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ExpenseController();
