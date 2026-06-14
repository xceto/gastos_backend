'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // users
    await queryInterface.createTable('users', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey:   true,
        allowNull:    false,
      },
      name: {
        type:      Sequelize.STRING(50),
        unique:    true,
        allowNull: false,
      },
      default_salary: {
        type:         Sequelize.DECIMAL(12, 2),
        defaultValue: 0,
      },
      cc_closing_day: {
        type:         Sequelize.INTEGER,
        defaultValue: 20,
      },
      password_hash: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      partner_id: {
        type:       Sequelize.UUID,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onDelete:   'SET NULL',
      },
      created_at: {
        type:         Sequelize.DATE,
        defaultValue: Sequelize.literal('now()'),
      },
    });

    // monthly_settings
    await queryInterface.createTable('monthly_settings', {
      id: {
        type:          Sequelize.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      user_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onDelete:   'CASCADE',
      },
      month: {
        type:      Sequelize.INTEGER,
        allowNull: false,
      },
      year: {
        type:      Sequelize.INTEGER,
        allowNull: false,
      },
      salary: {
        type:         Sequelize.DECIMAL(12, 2),
        defaultValue: 0,
      },
    });

    await queryInterface.addIndex('monthly_settings', ['user_id', 'month', 'year'], {
      unique: true,
      name:   'monthly_settings_user_month_year_unique',
    });

    // expenses
    await queryInterface.createTable('expenses', {
      id: {
        type:          Sequelize.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      user_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onDelete:   'CASCADE',
      },
      amount: {
        type:      Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      description: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type:      Sequelize.STRING(50),
        allowNull: false,
      },
      is_shared: {
        type:         Sequelize.BOOLEAN,
        defaultValue: false,
      },
      date: {
        type:         Sequelize.DATEONLY,
        defaultValue: Sequelize.literal('CURRENT_DATE'),
      },
      month: {
        type:      Sequelize.INTEGER,
        allowNull: false,
      },
      year: {
        type:      Sequelize.INTEGER,
        allowNull: false,
      },
      created_at: {
        type:         Sequelize.DATE,
        defaultValue: Sequelize.literal('now()'),
      },
      bonus: {
        type:         Sequelize.DECIMAL(12, 2),
        defaultValue: 0,
      },
      bonus_user_id: {
        type:       Sequelize.UUID,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onDelete:   'SET NULL',
      },
      is_credit_card: {
        type:         Sequelize.BOOLEAN,
        defaultValue: false,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('expenses');
    await queryInterface.dropTable('monthly_settings');
    await queryInterface.dropTable('users');
  },
};
