const User = require('../models/User');

class UserRepository {
  async create(data) {
    return User.create(data);
  }

  async findById(id) {
    return User.findByPk(id, {
      include: [{ model: User, as: 'Partner', attributes: ['id', 'name'] }]
    });
  }

  async findByUuid(uuid) {
    return User.findOne({
      where: { uuid },
      include: [{ model: User, as: 'Partner', attributes: ['id', 'name'] }]
    });
  }

  async findByIds(ids) {
    return User.findAll({
      where: { id: ids },
      include: [{ model: User, as: 'Partner', attributes: ['id', 'name'] }],
      order: [['id', 'ASC']]
    });
  }

  async findByName(name) {
    return User.findOne({
      where: { name },
      include: [{ model: User, as: 'Partner', attributes: ['id', 'name'] }]
    });
  }

  async findAll() {
    return User.findAll({
      include: [{ model: User, as: 'Partner', attributes: ['id', 'name'] }],
      order: [['id', 'ASC']]
    });
  }

  async update(id, data) {
    const user = await User.findByPk(id);
    if (!user) return null;
    await user.update(data);
    return this.findById(id);
  }
}

module.exports = new UserRepository();
