const AuthService = require('../services/AuthService');

class AuthController {
  async login(req, res) {
    try {
      const { name, password } = req.body;
      if (!name || !password) {
        return res.status(400).json({ error: 'Faltan nombre de usuario o contraseña' });
      }
      const data = await AuthService.login(name, password);
      res.json(data);
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  async validate(req, res) {
    try {
      res.json(req.user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async register(req, res) {
    try {
      const { name, password } = req.body;
      const data = await AuthService.register(name, password);
      res.status(201).json(data);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new AuthController();
