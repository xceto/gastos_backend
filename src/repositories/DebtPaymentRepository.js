const DebtPayment = require('../models/DebtPayment');
const { Op } = require('sequelize');

class DebtPaymentRepository {
  /**
   * All payments between two users (in either direction).
   */
  findBetweenUsers(userIdA, userIdB) {
    return DebtPayment.findAll({
      where: {
        [Op.or]: [
          { from_user_id: userIdA, to_user_id: userIdB },
          { from_user_id: userIdB, to_user_id: userIdA },
        ],
      },
      order: [['date', 'DESC'], ['created_at', 'DESC']],
    });
  }

  create(data) {
    return DebtPayment.create(data);
  }
}

module.exports = new DebtPaymentRepository();
