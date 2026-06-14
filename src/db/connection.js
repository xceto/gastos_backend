const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER     || 'conteo',
  password: process.env.DB_PASSWORD || 'conteo_local_pw',
  database: process.env.DB_NAME     || 'conteo_gastos',
  logging: false,
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

module.exports = sequelize;
