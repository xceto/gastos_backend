const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const Category = sequelize.define('Category', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true,
  },
  user_id: {
    type:      DataTypes.UUID,
    allowNull: true, // null = system category
  },
  key: {
    type:      DataTypes.STRING(50),
    allowNull: false,
  },
  label: {
    type:      DataTypes.STRING(50),
    allowNull: false,
  },
  icon: {
    type:         DataTypes.STRING(10),
    allowNull:    false,
    defaultValue: '📦',
  },
  color: {
    type:         DataTypes.STRING(20),
    allowNull:    false,
    defaultValue: '#94a3b8',
  },
  sort_order: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 50,
  },
  created_at: {
    type:         DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName:  'categories',
  timestamps: false,
});

module.exports = Category;
