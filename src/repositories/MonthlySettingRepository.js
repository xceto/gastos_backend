const MonthlySetting = require('../models/MonthlySetting');
const User = require('../models/User');

class MonthlySettingRepository {
  async upsert(data) {
    const { user_id, month, year, salary } = data;
    const setting = await MonthlySetting.findOne({ where: { user_id, month, year } });
    if (setting) {
      return setting.update({ salary });
    } else {
      return MonthlySetting.create({ user_id, month, year, salary });
    }
  }

  async findByUserMonthYear(user_id, month, year) {
    return MonthlySetting.findOne({ where: { user_id, month, year } });
  }

  async findByMonthAndYear(month, year, userIds = null) {
    const where = { month, year };
    if (userIds) {
      where.user_id = userIds;
    }
    return MonthlySetting.findAll({
      where,
      include: [{ model: User, as: 'User', attributes: ['id', 'name'] }]
    });
  }

  async findByYear(year, userIds = null) {
    const where = { year };
    if (userIds) {
      where.user_id = userIds;
    }
    return MonthlySetting.findAll({
      where,
      include: [{ model: User, as: 'User', attributes: ['id', 'name'] }]
    });
  }
}

module.exports = new MonthlySettingRepository();
