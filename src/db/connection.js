const { Sequelize } = require('sequelize');

const databaseUrl = process.env.DATABASE_URL || 'postgresql://conteo:conteo_local_pw@localhost:5432/conteo_gastos';

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

module.exports = sequelize;
