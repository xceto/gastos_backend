const ExpenseRepository = require('../repositories/ExpenseRepository');
const UserRepository = require('../repositories/UserRepository');
const MonthlySettingRepository = require('../repositories/MonthlySettingRepository');

class ExpenseService {
  async getExpenses(month, year, userIds) {
    if (month) {
      return ExpenseRepository.findByMonthAndYear(parseInt(month), parseInt(year), userIds);
    } else {
      return ExpenseRepository.findByYear(parseInt(year), userIds);
    }
  }

  async createExpense(data, userIds) {
    const { user_id, amount, description, category, is_shared, date, bonus, bonus_user_id, installments_total, is_credit_card } = data;

    if (userIds && !userIds.includes(Number(user_id))) {
      throw new Error('No autorizado para crear gastos para este usuario');
    }

    const expDate = date ? new Date(date) : new Date();
    const totalInst = installments_total ? parseInt(installments_total) : 1;
    const isCC = !!is_credit_card;

    const user = await UserRepository.findById(user_id);
    const ccClosingDay = user?.cc_closing_day ?? 20;

    let firstExpense = null;
    for (let i = 1; i <= totalInst; i++) {
      const baseYear = expDate.getFullYear();
      const baseMonth = expDate.getMonth();
      const baseDay = expDate.getDate();
      
      let instDate = new Date(baseYear, baseMonth + (i - 1), baseDay);
      if (instDate.getDate() !== baseDay) {
        instDate = new Date(baseYear, baseMonth + i, 0);
      }
      
      const calendarMonth = instDate.getMonth() + 1;
      const calendarYear = instDate.getFullYear();
      
      let budgetMonth = calendarMonth;
      let budgetYear = calendarYear;
      
      if (isCC && instDate.getDate() > ccClosingDay) {
        budgetMonth = calendarMonth + 1;
        if (budgetMonth > 12) {
          budgetMonth = 1;
          budgetYear = calendarYear + 1;
        }
      }
      
      const baseDesc = description ? description.trim() : '';
      const finalDesc = totalInst > 1
        ? (baseDesc ? `${baseDesc} (${i}/${totalInst})` : `Cuota ${i}/${totalInst}`)
        : baseDesc;

      const created = await ExpenseRepository.create({
        user_id,
        amount,
        description: finalDesc,
        category,
        is_shared: !!is_shared,
        date: instDate,
        month: budgetMonth,
        year: budgetYear,
        bonus: bonus || 0,
        bonus_user_id: bonus_user_id || null,
        is_credit_card: isCC,
      });

      if (i === 1) {
        firstExpense = created;
      }
    }
    return firstExpense;
  }

  async updateExpense(id, data, userIds) {
    const { user_id, amount, description, category, is_shared, date, bonus, bonus_user_id, is_credit_card } = data;

    const expense = await ExpenseRepository.findById(id);
    if (!expense) throw new Error('Gasto no encontrado');

    if (userIds && (!userIds.includes(Number(expense.user_id)) || !userIds.includes(Number(user_id)))) {
      throw new Error('No autorizado para modificar este gasto');
    }

    const expDate = date ? new Date(date) : new Date();
    const isCC = !!is_credit_card;

    const user = await UserRepository.findById(user_id);
    const ccClosingDay = user?.cc_closing_day ?? 20;

    const calendarMonth = expDate.getMonth() + 1;
    const calendarYear = expDate.getFullYear();
    
    let budgetMonth = calendarMonth;
    let budgetYear = calendarYear;
    
    if (isCC && expDate.getDate() > ccClosingDay) {
      budgetMonth = calendarMonth + 1;
      if (budgetMonth > 12) {
        budgetMonth = 1;
        budgetYear = calendarYear + 1;
      }
    }

    return ExpenseRepository.update(id, {
      user_id,
      amount,
      description: description ? description.trim() : '',
      category,
      is_shared: !!is_shared,
      date: expDate,
      month: budgetMonth,
      year: budgetYear,
      bonus: bonus || 0,
      bonus_user_id: bonus_user_id || null,
      is_credit_card: isCC
    });
  }

  async deleteExpense(id, userIds) {
    const expense = await ExpenseRepository.findById(id);
    if (!expense) throw new Error('Gasto no encontrado');

    if (userIds && !userIds.includes(Number(expense.user_id))) {
      throw new Error('No autorizado para eliminar este gasto');
    }

    return ExpenseRepository.delete(id);
  }

  async getSummary(month, year, userIds) {
    const parsedYear = parseInt(year);
    const parsedMonth = month ? parseInt(month) : null;

    const [users, expenses, settings] = await Promise.all([
      UserRepository.findByIds(userIds),
      parsedMonth 
        ? ExpenseRepository.findByMonthAndYear(parsedMonth, parsedYear, userIds)
        : ExpenseRepository.findByYear(parsedYear, userIds),
      parsedMonth
        ? MonthlySettingRepository.findByMonthAndYear(parsedMonth, parsedYear, userIds)
        : MonthlySettingRepository.findByYear(parsedYear, userIds)
    ]);

    const totalShared = expenses
      .filter(e => e.is_shared)
      .reduce((sum, e) => sum + (parseFloat(e.amount) - parseFloat(e.bonus || 0)), 0);

    const sharedPerPerson = users.length > 0 ? totalShared / users.length : 0;

    const summary = users.map(user => {
      let salary;
      if (parsedMonth) {
        const custom = settings.find(s => Number(s.user_id) === Number(user.id));
        salary = custom ? parseFloat(custom.salary) : parseFloat(user.default_salary || 0);
      } else {
        salary = 0;
        for (let m = 1; m <= 12; m++) {
          const custom = settings.find(s => Number(s.user_id) === Number(user.id) && s.month === m);
          salary += custom ? parseFloat(custom.salary) : parseFloat(user.default_salary || 0);
        }
      }

      const ownExpenses = expenses
        .filter(e => Number(e.user_id) === Number(user.id) && !e.is_shared)
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
        
      const sharedPaid = expenses
        .filter(e => e.is_shared)
        .reduce((sum, e) => {
          let val = 0;
          if (Number(e.user_id) === Number(user.id)) val += parseFloat(e.amount);
          if (Number(e.bonus_user_id) === Number(user.id)) val -= parseFloat(e.bonus || 0);
          return sum + val;
        }, 0);

      const effectiveCost = ownExpenses + sharedPerPerson;
      const balance = salary - effectiveCost;
      const sharedDebt = sharedPaid - sharedPerPerson;

      const byCategory = {};
      expenses.filter(e => Number(e.user_id) === Number(user.id)).forEach(e => {
        byCategory[e.category] = (byCategory[e.category] ?? 0) + parseFloat(e.amount);
      });

      return {
        user_id: user.id,
        name: user.name,
        salary,
        own_expenses: ownExpenses,
        shared_paid: sharedPaid,
        shared_owed: sharedPerPerson,
        shared_debt: sharedDebt,
        effective_cost: effectiveCost,
        balance,
        by_category: byCategory,
      };
    });

    return {
      month: parsedMonth,
      year: parsedYear,
      total_shared: totalShared,
      shared_per_person: sharedPerPerson,
      persons: summary,
    };
  }
}

module.exports = new ExpenseService();
