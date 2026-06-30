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

  async update(id, data) {
    const expense = await Expense.findByPk(id);
    if (!expense) return null;
    await expense.update(data);
    return this.findById(id);
  }

  /** All shared expenses ever for the given pair of users. Used for accumulated debt. */
  async findAllSharedBetween(userIds) {
    const list = await Expense.findAll({
      where: {
        is_shared: true,
        user_id: userIds,
      },
      attributes: ['user_id', 'amount', 'bonus', 'bonus_user_id', 'own_amount', 'month', 'year'],
    });
    return list.map(e => e.get({ plain: true }));
  }
}

module.exports = new ExpenseRepository();
