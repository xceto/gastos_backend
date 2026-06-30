const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');
const User = require('./User');

const DebtPayment = sequelize.define('DebtPayment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  from_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: User, key: 'id' },
  },
  to_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: User, key: 'id' },
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'debt_payments',
  timestamps: false,
});

DebtPayment.belongsTo(User, { foreignKey: 'from_user_id', as: 'FromUser' });
DebtPayment.belongsTo(User, { foreignKey: 'to_user_id', as: 'ToUser' });

module.exports = DebtPayment;
