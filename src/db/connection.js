const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({ 
  dialect: 'postgres',
  host:     process.env.DB_HOST  ,
  port:     parseInt(process.env.DB_PORT ),
  username: process.env.DB_USER  ,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ,
  logging: false,
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

module.exports = sequelize;
