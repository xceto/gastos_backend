const DebtPaymentRepository = require('../repositories/DebtPaymentRepository');
const ExpenseRepository = require('../repositories/ExpenseRepository');

class PaymentController {
  /**
   * GET /api/payments
   * Returns all payments between the current user and their partner,
   * plus the accumulated net debt computed from all-time shared expenses.
   */
  async getPayments(req, res) {
    try {
      const currentUser = req.user;
      if (!currentUser.partner_id) {
        return res.json({ payments: [], accumulated_debt: 0, debtor_id: null });
      }

      const userIds = [currentUser.id, currentUser.partner_id];

      const { month, year } = req.query;
      let maxDate = null;
      let selectedMonth = null;
      let selectedYear = null;

      if (month && year) {
        selectedMonth = parseInt(month);
        selectedYear = parseInt(year);
        const budgetStartDay = currentUser.budget_start_day || 1;
        if (budgetStartDay > 1) {
          const endDay = budgetStartDay - 1;
          maxDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
        } else {
          // Calculate the last day of the selected month
          const lastDay = new Date(selectedYear, selectedMonth, 0);
          maxDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
        }
      }

      const [payments, allShared] = await Promise.all([
        DebtPaymentRepository.findBetweenUsers(currentUser.id, currentUser.partner_id, maxDate),
        ExpenseRepository.findAllSharedBetween(userIds, selectedMonth, selectedYear),
      ]);

      // Compute accumulated debt per user from all-time shared expenses
      const debtMap = {}; // debtMap[userId] = how much they effectively paid out of pocket
      userIds.forEach(id => { debtMap[id] = { fronted: 0, owed: 0 }; });

      const monthlyBreakdownData = {};

      for (const e of allShared) {
        const amt = parseFloat(e.amount);
        const bonus = parseFloat(e.bonus || 0);
        const netAmt = amt - bonus;

        // Who fronted this expense
        debtMap[e.user_id].fronted += netAmt;

        // What's each user's actual share
        for (const uid of userIds) {
          let share;
          if (e.own_amount != null) {
            share = e.user_id === uid
              ? parseFloat(e.own_amount)
              : amt - parseFloat(e.own_amount);
          } else {
            share = netAmt / 2;
          }
          debtMap[uid].owed += share;
        }

        // Group for monthly breakdown
        const key = `${e.year}-${e.month}`;
        if (!monthlyBreakdownData[key]) {
          monthlyBreakdownData[key] = {
            year: e.year,
            month: e.month,
            fronted_me: 0,
            owed_me: 0,
            payments_made: 0,
            payments_received: 0,
          };
        }

        const isMe = e.user_id === currentUser.id;
        if (isMe) {
          monthlyBreakdownData[key].fronted_me += netAmt;
        }

        let myShare;
        if (e.own_amount != null) {
          myShare = isMe ? parseFloat(e.own_amount) : amt - parseFloat(e.own_amount);
        } else {
          myShare = netAmt / 2;
        }
        monthlyBreakdownData[key].owed_me += myShare;
      }

      // Net debt per user = fronted - owed. Positive = others owe them.
      const rawDebt = {}; // positive: this user is owed money
      userIds.forEach(id => {
        rawDebt[id] = debtMap[id].fronted - debtMap[id].owed;
      });

      // Apply payments: from_user paid to_user → reduces their debt / builds credit
      let paymentBalance = 0; // positive = currentUser paid partner (reduces debt)
      const budgetStartDay = currentUser.budget_start_day || 1;
      for (const p of payments) {
        const pAmt = parseFloat(p.amount);
        if (p.from_user_id === currentUser.id) {
          paymentBalance += pAmt;
        } else {
          paymentBalance -= pAmt;
        }

        // Group payments for monthly breakdown
        const pDate = new Date(p.date + 'T00:00:00');
        let pMonth = pDate.getMonth() + 1;
        let pYear = pDate.getFullYear();

        if (budgetStartDay > 1 && pDate.getDate() >= budgetStartDay) {
          pMonth += 1;
          if (pMonth > 12) {
            pMonth = 1;
            pYear += 1;
          }
        }
        const key = `${pYear}-${pMonth}`;

        if (!monthlyBreakdownData[key]) {
          monthlyBreakdownData[key] = {
            year: pYear,
            month: pMonth,
            fronted_me: 0,
            owed_me: 0,
            payments_made: 0,
            payments_received: 0,
          };
        }

        if (p.from_user_id === currentUser.id) {
          monthlyBreakdownData[key].payments_made += pAmt;
        } else {
          monthlyBreakdownData[key].payments_received += pAmt;
        }
      }

      // Convert monthly breakdown to array and sort chronologically
      const breakdown = Object.values(monthlyBreakdownData)
        .map(m => {
          const expenses_debt = m.fronted_me - m.owed_me;
          const net_balance = expenses_debt + m.payments_made - m.payments_received;
          return {
            year: m.year,
            month: m.month,
            expenses_debt,
            payments_made: m.payments_made,
            payments_received: m.payments_received,
            net_balance,
          };
        })
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.month - b.month;
        });

      // accumulated_debt > 0 → current user is owed (partner owes them)
      // accumulated_debt < 0 → current user owes partner
      const accumulated_debt = rawDebt[currentUser.id] + paymentBalance;

      res.json({
        payments: payments.map(p => ({
          id: p.id,
          from_user_id: p.from_user_id,
          to_user_id: p.to_user_id,
          amount: parseFloat(p.amount),
          date: p.date,
          note: p.note,
        })),
        accumulated_debt,
        partner_id: currentUser.partner_id,
        breakdown,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/payments
   * Body: { to_user_id, amount, date?, note? }
   */
  async createPayment(req, res) {
    try {
      const { to_user_id, amount, date, note } = req.body;

      if (!to_user_id || !amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Datos inválidos' });
      }

      // Validate both users are partners
      const partnerIds = [req.user.id, req.user.partner_id];
      if (!partnerIds.includes(to_user_id)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const from_user_id = to_user_id === req.user.id ? req.user.partner_id : req.user.id;

      const payment = await DebtPaymentRepository.create({
        from_user_id,
        to_user_id,
        amount: parseFloat(amount),
        date: date || new Date(),
        note: note || null,
      });

      res.status(201).json({
        id: payment.id,
        from_user_id: payment.from_user_id,
        to_user_id: payment.to_user_id,
        amount: parseFloat(payment.amount),
        date: payment.date,
        note: payment.note,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new PaymentController();
