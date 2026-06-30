const UserRepository = require('../repositories/UserRepository');
const SettingsService = require('../services/SettingsService');

class UserController {
  async getAll(req, res) {
    try {
      const users = await UserRepository.findAll();
      const currentUserId = req.user?.id;
      const partnerId = req.user?.partner_id;

      const filtered = users.filter(u => u.id !== currentUserId && u.id !== partnerId);

      const mapped = filtered.map(u => {
        const plain = u.get ? u.get({ plain: true }) : u;
        delete plain.password_hash;
        return plain;
      });
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async updateSettings(req, res) {
    try {
      const { id } = req.params;
      if (id !== req.user.id) {
        return res.status(403).json({ error: 'No autorizado para modificar la configuración de otro usuario' });
      }
      const { default_salary, cc_closing_day, active_categories } = req.body;
      const updatePayload = {
        default_salary: parseFloat(default_salary || 0),
        cc_closing_day: parseInt(cc_closing_day || 20),
      };
      // active_categories: array of category keys, or null (= all active)
      if (active_categories !== undefined) {
        updatePayload.active_categories = active_categories;
      }
      const updated = await SettingsService.updateUserSettings(id, updatePayload);
      if (!updated) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      const plain = updated.get ? updated.get({ plain: true }) : updated;
      delete plain.password_hash;
      res.json(plain);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async updatePartner(req, res) {
    try {
      const { partnerUuid } = req.body;
      const userId = req.user.id;

      if (partnerUuid) {
        const partner = await UserRepository.findByUuid(partnerUuid);
        if (!partner) {
          return res.status(404).json({ error: 'Compañero no encontrado' });
        }
        if (partner.id === userId) {
          return res.status(400).json({ error: 'No te podés vincular con vos mismo' });
        }

        // Desvincular antiguos compañeros si los hubiera
        if (req.user.partner_id) {
          await UserRepository.update(req.user.partner_id, { partner_id: null });
        }
        if (partner.partner_id) {
          await UserRepository.update(partner.partner_id, { partner_id: null });
        }

        // Vincular mutuamente
        await UserRepository.update(userId, { partner_id: partner.id });
        await UserRepository.update(partner.id, { partner_id: userId });
      } else {
        // Desvincular
        if (req.user.partner_id) {
          await UserRepository.update(req.user.partner_id, { partner_id: null });
        }
        await UserRepository.update(userId, { partner_id: null });
      }

      const updatedUser = await UserRepository.findById(userId);
      const plain = updatedUser.get ? updatedUser.get({ plain: true }) : updatedUser;
      delete plain.password_hash;
      res.json(plain);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new UserController();
