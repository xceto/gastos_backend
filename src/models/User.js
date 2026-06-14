const { DataTypes } = require('sequelize');
const sequelize = require('../db/connection');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
  },
  default_salary: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  cc_closing_day: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  partner_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    unique: true,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'users',
  timestamps: false,
});

User.belongsTo(User, { foreignKey: 'partner_id', as: 'Partner' });

module.exports = User;
