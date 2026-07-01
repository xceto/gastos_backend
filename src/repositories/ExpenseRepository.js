const Expense = require('../models/Expense');
const User = require('../models/User');

class ExpenseRepository {
  flatten(expenseInstance) {
    if (!expenseInstance) return null;
    const plain = expenseInstance.get ? expenseInstance.get({ plain: true }) : expenseInstance;
    return {
      ...plain,
      user_id: plain.User?.id ?? plain.user_id,
      user_name: plain.User?.name ?? '',
      bonus_user_name: plain.BonusUser?.name ?? null,
    };
  }

  async create(data) {
    const expense = await Expense.create(data);
    return this.findById(expense.id);
  }

  async findById(id) {
    const exp = await Expense.findByPk(id, {
      include: [
        { model: User, as: 'User', attributes: ['id', 'name'] },
        { model: User, as: 'BonusUser', attributes: ['id', 'name'] }
      ]
    });
    return this.flatten(exp);
  }

  async delete(id) {
    const expense = await Expense.findByPk(id);
    if (!expense) return false;
    await expense.destroy();
    return true;
  }

  async findByMonthAndYear(month, year, userIds = null) {
    const where = { month, year };
    if (userIds) {
      where.user_id = userIds;
    }
    const list = await Expense.findAll({
      where,
      include: [
        { model: User, as: 'User', attributes: ['id', 'name'] },
        { model: User, as: 'BonusUser', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });
    return list.map(item => this.flatten(item));
  }

  async findByYear(year, userIds = null) {
    const where = { year };
    if (userIds) {
      where.user_id = userIds;
    }
    const list = await Expense.findAll({
      where,
      include: [
        { model: User, as: 'User', attributes: ['id', 'name'] },
        { model: User, as: 'BonusUser', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });
    return list.map(item => this.flatten(item));
  }

  /**
   * Fetches expenses for a "budget period" defined by a custom start day.
   * For the period labeled month/year with budgetStartDay D:
   *   - Non-CC: date >= (M-1)/D  to  M/(D-1)   (date range on real calendar date)
   *   - CC:     uses stored month/year columns  (already shifted at creation time)
   * Falls back to findByMonthAndYear when budgetStartDay <= 1.
   */
  async findByBudgetPeriod(month, year, budgetStartDay, userIds = null) {
    if (!budgetStartDay || budgetStartDay <= 1) {
      return this.findByMonthAndYear(month, year, userIds);
    }

    const { Op } = require('sequelize');

    // Period "Month M Year Y" with budgetStartDay D:
    // starts: day D of month (M-1), or Dec of (Y-1) when M=1
    // ends:   day (D-1) of month M
    let startMonth = month - 1;
    let startYear = year;
    if (startMonth === 0) { startMonth = 12; startYear = year - 1; }

    const startStr = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(budgetStartDay).padStart(2, '0')}`;
    const endDay = budgetStartDay - 1;
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

    const orConditions = [
      // CC expenses: already shifted at creation, trust stored month/year
      { is_credit_card: true, month, year },
      // Non-CC: filter by the real calendar date range
      { is_credit_card: false, date: { [Op.between]: [startStr, endStr] } },
    ];

    const where = { [Op.or]: orConditions };
    if (userIds) {
      where.user_id = userIds;
    }

    const list = await Expense.findAll({
      where,
      include: [
        { model: User, as: 'User', attributes: ['id', 'name'] },
        { model: User, as: 'BonusUser', attributes: ['id', 'name'] }
      ],
      order: [['date', 'DESC'], ['created_at', 'DESC']]
    });
    return list.map(item => this.flatten(item));
  }

  async findAll(userIds = null) {
    const where = {};
    if (userIds) {
      where.user_id = userIds;
    }
    const list = await Expense.findAll({
      where,
      attributes: ['user_id', 'amount', 'bonus', 'bonus_user_id', 'own_amount', 'month', 'year', 'is_shared', 'is_credit_card'],
    });
    return list.map(e => e.get({ plain: true }));
  }

  async update(id, data) {
    const expense = await Expense.findByPk(id);
    if (!expense) return null;
    await expense.update(data);
    return this.findById(id);
  }

  /** All shared expenses ever or up to a specific month/year for the given pair of users. Used for accumulated debt. */
  async findAllSharedBetween(userIds, maxMonth = null, maxYear = null) {
    const where = {
      is_shared: true,
      user_id: userIds,
    };
    if (maxMonth && maxYear) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { year: { [Op.lt]: maxYear } },
        { year: maxYear, month: { [Op.lte]: maxMonth } }
      ];
    }
    const list = await Expense.findAll({
      where,
      attributes: ['user_id', 'amount', 'bonus', 'bonus_user_id', 'own_amount', 'month', 'year'],
    });
    return list.map(e => e.get({ plain: true }));
  }
}

module.exports = new ExpenseRepository();
