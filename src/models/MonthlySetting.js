const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');
const User = require('./User');

const MonthlySetting = sequelize.define('MonthlySetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    }
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  salary: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  }
}, {
  tableName: 'monthly_settings',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'month', 'year']
    }
  ]
});

MonthlySetting.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

module.exports = MonthlySetting;
