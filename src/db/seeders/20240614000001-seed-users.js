'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const hashAna     = await bcrypt.hash('ana123', 10);
    const hashClaudio = await bcrypt.hash('claudio123', 10);

    await queryInterface.bulkInsert('users', [
      { name: 'Ana',     password_hash: hashAna,     created_at: new Date() },
      { name: 'Claudio', password_hash: hashClaudio, created_at: new Date() },
    ], { ignoreDuplicates: true });

    // Link partners bidirectionally
    await queryInterface.sequelize.query(`
      UPDATE users
      SET partner_id = (SELECT id FROM users WHERE name = 'Claudio')
      WHERE name = 'Ana' AND partner_id IS NULL;

      UPDATE users
      SET partner_id = (SELECT id FROM users WHERE name = 'Ana')
      WHERE name = 'Claudio' AND partner_id IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { name: ['Ana', 'Claudio'] });
  },
};
