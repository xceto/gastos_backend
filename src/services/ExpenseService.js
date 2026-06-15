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
    const { user_id, amount, description, category, is_shared, date, bonus, bonus_user_id, installments_total, is_credit_card, own_amount } = data;

    if (userIds && !userIds.includes(user_id)) {
      throw new Error('No autorizado para crear gastos para este usuario');
    }

    const expDate = date ? new Date(date) : new Date();
    const totalInst = installments_total ? parseInt(installments_total) : 1;
    const isCC = !!is_credit_card;

    const user = await UserRepository.findById(user_id);
    const ccClosingDay = user?.cc_closing_day ?? 20;

    const formattedTotal = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount);

    const baseAmount = Math.round(amount / totalInst);
    const firstAmount = baseAmount + (amount - (baseAmount * totalInst));

    const totalBonus = bonus ? parseFloat(bonus) : 0;
    const baseBonus = totalInst > 1 ? Math.round(totalBonus / totalInst) : totalBonus;
    const firstBonus = baseBonus + (totalBonus - (baseBonus * totalInst));

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
        ? (baseDesc ? `${baseDesc} (${i}/${totalInst}) Total monto: ${formattedTotal}` : `Cuota ${i}/${totalInst} Total monto: ${formattedTotal}`)
        : baseDesc;

      const created = await ExpenseRepository.create({
        user_id,
        amount: i === 1 ? firstAmount : baseAmount,
        description: finalDesc,
        category,
        is_shared: !!is_shared,
        date: instDate,
        month: budgetMonth,
        year: budgetYear,
        bonus: i === 1 ? firstBonus : baseBonus,
        bonus_user_id: bonus_user_id || null,
        is_credit_card: isCC,
        own_amount: is_shared && own_amount != null ? parseFloat(own_amount) / totalInst : null,
      });

      if (i === 1) {
        firstExpense = created;
      }
    }
    return firstExpense;
  }

  async updateExpense(id, data, userIds) {
    const { user_id, amount, description, category, is_shared, date, bonus, bonus_user_id, is_credit_card, own_amount } = data;

    const expense = await ExpenseRepository.findById(id);
    if (!expense) throw new Error('Gasto no encontrado');

    if (userIds && (!userIds.includes(expense.user_id) || !userIds.includes(user_id))) {
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
      is_credit_card: isCC,
      own_amount: is_shared && own_amount != null && own_amount !== '' ? parseFloat(own_amount) : null,
    });
  }

  async deleteExpense(id, userIds) {
    const expense = await ExpenseRepository.findById(id);
    if (!expense) throw new Error('Gasto no encontrado');

    if (userIds && !userIds.includes(expense.user_id)) {
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

    const shared_category_totals = {};
    expenses.filter(e => e.is_shared).forEach(e => {
      shared_category_totals[e.category] = (shared_category_totals[e.category] ?? 0) + parseFloat(e.amount);
    });

    const summary = users.map(user => {
      let salary;
      if (parsedMonth) {
        const custom = settings.find(s => s.user_id === user.id);
        salary = custom ? parseFloat(custom.salary) : parseFloat(user.default_salary || 0);
      } else {
        salary = 0;
        for (let m = 1; m <= 12; m++) {
          const custom = settings.find(s => s.user_id === user.id && s.month === m);
          salary += custom ? parseFloat(custom.salary) : parseFloat(user.default_salary || 0);
        }
      }

      const ownExpenses = expenses
        .filter(e => e.user_id === user.id && !e.is_shared)
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
        
      const sharedPaid = expenses
        .filter(e => e.is_shared)
        .reduce((sum, e) => {
          let val = 0;
          if (e.user_id === user.id) {
            // how much of this shared expense is charged to the payer
            const ownAmt = e.own_amount != null ? parseFloat(e.own_amount) : parseFloat(e.amount) / 2;
            val += parseFloat(e.amount) - parseFloat(e.bonus || 0); // total they fronted
            // but sharedPaid represents only what they actually put in
            // we keep the full fronted amount and adjust sharedPerPerson in balance
          }
          if (e.bonus_user_id === user.id) val -= parseFloat(e.bonus || 0);
          return sum + val;
        }, 0);

      // Effective cost: own expenses + my real share of shared expenses
      const mySharedCost = expenses
        .filter(e => e.is_shared)
        .reduce((sum, e) => {
          let share;
          if (e.own_amount != null) {
            // custom split
            share = e.user_id === user.id
              ? parseFloat(e.own_amount)
              : parseFloat(e.amount) - parseFloat(e.own_amount);
          } else {
            // 50/50 default
            share = (parseFloat(e.amount) - parseFloat(e.bonus || 0)) / 2;
          }
          return sum + share;
        }, 0);

      // sharedPaid = total money user actually fronted for shared expenses
      const sharedFronted = expenses
        .filter(e => e.is_shared && e.user_id === user.id)
        .reduce((sum, e) => sum + parseFloat(e.amount) - parseFloat(e.bonus || 0), 0);

      const sharedDebt = sharedFronted - mySharedCost;
      const effectiveCost = ownExpenses + mySharedCost;
      const balance = salary - effectiveCost;

      const byCategory = {};
      expenses.filter(e => e.user_id === user.id).forEach(e => {
        byCategory[e.category] = (byCategory[e.category] ?? 0) + parseFloat(e.amount);
      });

      // PersonBalance calculations
      let paid_cc = 0;
      let paid_cash = 0;
      expenses.forEach(e => {
        if (e.user_id === user.id) {
          const amt = parseFloat(e.amount || 0);
          if (e.is_credit_card) paid_cc += amt; else paid_cash += amt;
        }
        if (e.bonus_user_id === user.id) {
          const bns = parseFloat(e.bonus || 0);
          if (e.is_credit_card) paid_cc -= bns; else paid_cash -= bns;
        }
      });

      // MyExpensesSection calculations
      const myExpensesList = expenses.filter(e => e.user_id === user.id);
      
      const my_total_amount = myExpensesList.reduce((sum, e) => {
        let val = parseFloat(e.amount);
        if (e.bonus_user_id === user.id) val -= parseFloat(e.bonus || 0);
        return sum + val;
      }, 0);

      const my_own_amount = myExpensesList.filter(e => !e.is_shared).reduce((sum, e) => sum + parseFloat(e.amount), 0);

      const my_shared_amount = myExpensesList.filter(e => e.is_shared).reduce((sum, e) => {
        let val = parseFloat(e.amount);
        if (e.bonus_user_id === user.id) val -= parseFloat(e.bonus || 0);
        return sum + val;
      }, 0);

      const my_category_totals = {};
      myExpensesList.forEach(e => {
        let val = parseFloat(e.amount);
        if (e.bonus_user_id === user.id) val -= parseFloat(e.bonus || 0);
        my_category_totals[e.category] = (my_category_totals[e.category] ?? 0) + val;
      });

      return {
        user_id: user.id,
        name: user.name,
        salary,
        own_expenses: ownExpenses,
        shared_paid: sharedFronted,
        shared_owed: mySharedCost,
        shared_debt: sharedDebt,
        effective_cost: effectiveCost,
        balance,
        by_category: byCategory,
        paid_cc,
        paid_cash,
        my_total_amount,
        my_own_amount,
        my_shared_amount,
        my_category_totals,
      };
    });

    return {
      month: parsedMonth,
      year: parsedYear,
      total_shared: totalShared,
      shared_per_person: sharedPerPerson,
      shared_category_totals,
      persons: summary,
    };
  }
}

module.exports = new ExpenseService();
