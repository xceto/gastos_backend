require('dotenv').config();

const useSSL = process.env.DB_SSL === 'true';

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  dialect:  'postgres',
  logging:  false,
  ...(useSSL ? {
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
  } : {}),
};

module.exports = {
  development: base,
  production:  base,
};
