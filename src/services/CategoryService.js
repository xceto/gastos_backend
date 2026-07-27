const { Op } = require('sequelize');
const Category = require('../models/Category');

class CategoryService {
  /**
   * Returns system categories + custom categories for the given user,
   * ordered by sort_order then label.
   */
  async getAll(userId, partnerId) {
    const userIds = [userId];
    if (partnerId) {
      userIds.push(partnerId);
    }
    const rows = await Category.findAll({
      where: {
        [Op.or]: [
          { user_id: null },
          { user_id: { [Op.in]: userIds } }
        ],
      },
      order: [['sort_order', 'ASC'], ['label', 'ASC']],
      raw: true,
    });
    return rows;
  }

  /**
   * Create a custom category for a user.
   * Validates that the key is unique for that user (system keys are also reserved).
   */
  async create(userId, { key, label, icon, color, sort_order }) {
    const slug = (key || label).toLowerCase().trim().replace(/\s+/g, '-');

    // Check uniqueness across system + user's own categories
    const exists = await Category.findOne({
      where: {
        key:  slug,
        [Op.or]: [{ user_id: null }, { user_id: userId }],
      },
    });
    if (exists) throw new Error(`Ya existe una categoría con el key "${slug}"`);

    const cat = await Category.create({
      user_id:    userId,
      key:        slug,
      label:      label.trim(),
      icon:       icon   || '📦',
      color:      color  || '#94a3b8',
      sort_order: sort_order != null ? sort_order : 50,
    });
    return cat.toJSON();
  }

  /**
   * Update a custom category. Only the owner can edit their own categories;
   * system categories (user_id = null) are immutable.
   */
  async update(userId, id, { label, icon, color, sort_order }) {
    const cat = await Category.findOne({ where: { id, user_id: userId } });
    if (!cat) throw new Error('Categoría no encontrada o no tenés permiso para editarla');

    await cat.update({
      label:      label      != null ? label.trim() : cat.label,
      icon:       icon       != null ? icon          : cat.icon,
      color:      color      != null ? color         : cat.color,
      sort_order: sort_order != null ? sort_order    : cat.sort_order,
    });
    return cat.toJSON();
  }

  /**
   * Delete a custom category. Only the owner can delete their own categories.
   */
  async delete(userId, id) {
    const cat = await Category.findOne({ where: { id, user_id: userId } });
    if (!cat) throw new Error('Categoría no encontrada o no tenés permiso para borrarla');
    await cat.destroy();
    return true;
  }
}

module.exports = new CategoryService();
