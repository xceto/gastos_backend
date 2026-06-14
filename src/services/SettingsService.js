const MonthlySettingRepository = require('../repositories/MonthlySettingRepository');
const UserRepository = require('../repositories/UserRepository');

class SettingsService {
  async getSettings(month, year, userIds) {
    if (month) {
      return MonthlySettingRepository.findByMonthAndYear(parseInt(month), parseInt(year), userIds);
    } else {
      return MonthlySettingRepository.findByYear(parseInt(year), userIds);
    }
  }

  async upsertSalary(data) {
    return MonthlySettingRepository.upsert(data);
  }

  async updateUserSettings(id, data) {
    return UserRepository.update(id, data);
  }
}

module.exports = new SettingsService();
