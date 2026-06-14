const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/UserRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'conteo_secret_key';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: falta token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await UserRepository.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'No autorizado: usuario no existe' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'No autorizado: token inválido o vencido' });
  }
};

module.exports = { authMiddleware, JWT_SECRET };
