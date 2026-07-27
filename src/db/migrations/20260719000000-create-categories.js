'use strict';

const SYSTEM_CATEGORIES = [
  { key: 'supermercado', label: 'Supermercado',  icon: '🛒', color: '#22c55e',   sort_order: 1 },
  { key: 'bencina',      label: 'Bencina',        icon: '⛽', color: '#f97316',   sort_order: 2 },
  { key: 'delivery',     label: 'Delivery',        icon: '🛵', color: '#a855f7',   sort_order: 3 },
  { key: 'copito',       label: 'Copito',          icon: '🧸', color: '#fbbf24',   sort_order: 4 },
  { key: 'arriendo',     label: 'Arriendo',        icon: '🏠', color: '#a12d2d',   sort_order: 5 },
  { key: 'gasto comun',  label: 'Gasto Común',     icon: '🏬', color: '#a12d2d',   sort_order: 6 },
  { key: 'niñera',       label: 'Niñera',          icon: '👧🏼', color: '#e9ff6c',  sort_order: 7 },
  { key: 'ropa',         label: 'Ropa',            icon: '👕', color: '#ec4899',   sort_order: 8 },
  { key: 'cuota auto',   label: 'Cuota Auto',      icon: '🚗', color: '#b0ff00',   sort_order: 9 },
  { key: 'Seguro Auto',  label: 'Seguro Auto',     icon: '🚗', color: '#56ff00',   sort_order: 10 },
  { key: 'servicios',    label: 'Servicios',       icon: '💡', color: '#06b6d4',   sort_order: 11 },
  { key: 'juegos',       label: 'Juegos',          icon: '🎮', color: '#6366f1',   sort_order: 12 },
  { key: 'salud',        label: 'Salud',           icon: '🏥', color: '#ef4444',   sort_order: 13 },
  { key: 'restaurante',  label: 'Restaurante',     icon: '🍽️', color: '#f59e0b',   sort_order: 14 },
  { key: 'transporte',   label: 'Transporte',      icon: '🚌', color: '#84cc16',   sort_order: 15 },
  { key: 'pc',           label: 'PC',              icon: '💻', color: '#ff0008',   sort_order: 16 },
  { key: 'otro',         label: 'Otro',            icon: '📦', color: '#94a3b8',   sort_order: 99 },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categories', {
      id: {
        type:          Sequelize.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
        allowNull:     false,
      },
      user_id: {
        // NULL = system category (visible to all users)
        type:       Sequelize.UUID,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onDelete:   'CASCADE',
      },
      key: {
        type:      Sequelize.STRING(50),
        allowNull: false,
      },
      label: {
        type:      Sequelize.STRING(50),
        allowNull: false,
      },
      icon: {
        type:         Sequelize.STRING(10),
        allowNull:    false,
        defaultValue: '📦',
      },
      color: {
        type:         Sequelize.STRING(20),
        allowNull:    false,
        defaultValue: '#94a3b8',
      },
      sort_order: {
        type:         Sequelize.INTEGER,
        allowNull:    false,
        defaultValue: 50,
      },
      created_at: {
        type:         Sequelize.DATE,
        defaultValue: Sequelize.literal('now()'),
      },
    });

    // Unique key per user (null user = system categories must also be unique by key)
    await queryInterface.addIndex('categories', ['user_id', 'key'], {
      name: 'categories_user_key_unique',
    });

    // Seed system categories
    const now = new Date();
    await queryInterface.bulkInsert('categories',
      SYSTEM_CATEGORIES.map(c => ({ ...c, user_id: null, created_at: now }))
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('categories');
  },
};
