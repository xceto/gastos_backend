const SettingsService = require('../services/SettingsService');

class SettingsController {
  async getSettings(req, res) {
    try {
      const { month, year } = req.query;
      const userIds = req.user.partner_id ? [req.user.id, req.user.partner_id] : [req.user.id];
      const data = await SettingsService.getSettings(month, year, userIds);
      
      const formatted = data.map(item => {
        const plain = item.get ? item.get({ plain: true }) : item;
        return {
          id: plain.id,
          user_id: plain.user_id,
          name: plain.User?.name ?? '',
          salary: plain.salary,
          month: plain.month,
          year: plain.year
        };
      });
      
      res.json(formatted);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async upsertSalary(req, res) {
    try {
      const { user_id, month, year, salary } = req.body;
      const userIds = req.user.partner_id ? [req.user.id, req.user.partner_id] : [req.user.id];
      if (!userIds.includes(Number(user_id))) {
        return res.status(403).json({ error: 'No autorizado para modificar el sueldo de este usuario' });
      }
      const setting = await SettingsService.upsertSalary({
        user_id: Number(user_id),
        month: Number(month),
        year: Number(year),
        salary: parseFloat(salary || 0)
      });
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new SettingsController();
