const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const UserRepository = require('../repositories/UserRepository');
const { JWT_SECRET } = require('../middleware/authMiddleware');

class AuthService {
  async login(name, password) {
    const user = await UserRepository.findByName(name);
    if (!user) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '30d' });

    const userObj = user.get ? user.get({ plain: true }) : user;
    delete userObj.password_hash;

    return { user: userObj, token };
  }

  async validateUser(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    const userObj = user.get ? user.get({ plain: true }) : user;
    delete userObj.password_hash;
    return userObj;
  }

  async register(name, password) {
    if (!name || !password) {
      throw new Error('Faltan nombre de usuario o contraseña');
    }
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      throw new Error('El nombre de usuario debe tener al menos 2 caracteres');
    }
    const existing = await UserRepository.findByName(cleanName);
    if (existing) {
      throw new Error('El nombre de usuario ya está registrado');
    }

    const hash = await bcrypt.hash(password, 10);
    const created = await UserRepository.create({
      name: cleanName,
      password_hash: hash,
      default_salary: 0,
      cc_closing_day: 20
    });

    const token = jwt.sign({ id: created.id, name: created.name }, JWT_SECRET, { expiresIn: '30d' });

    // Fetch again to ensure Partner fields or default values are properly included
    const fetched = await UserRepository.findById(created.id);
    const userObj = fetched.get ? fetched.get({ plain: true }) : fetched;
    delete userObj.password_hash;

    return { user: userObj, token };
  }
}

module.exports = new AuthService();
