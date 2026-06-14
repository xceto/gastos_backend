const sequelize = require('./connection');
const bcrypt = require('bcryptjs');

const createTables = async () => {
  try {
    // Drop in reverse FK order
    await sequelize.query(`
      DROP TABLE IF EXISTS expenses CASCADE;
      DROP TABLE IF EXISTS monthly_settings CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // users — UUID primary key (public identifier)
    await sequelize.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        default_salary DECIMAL(12,2) DEFAULT 0,
        cc_closing_day INT DEFAULT 20,
        password_hash TEXT,
        partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // monthly_settings — SERIAL primary key, UUID FK
    await sequelize.query(`
      CREATE TABLE monthly_settings (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month INT NOT NULL,
        year INT NOT NULL,
        salary DECIMAL(12,2) DEFAULT 0,
        UNIQUE(user_id, month, year)
      );
    `);

    // expenses — SERIAL primary key, UUID FKs
    await sequelize.query(`
      CREATE TABLE expenses (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(12,2) NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL,
        is_shared BOOLEAN DEFAULT false,
        date DATE DEFAULT CURRENT_DATE,
        month INT NOT NULL,
        year INT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        bonus DECIMAL(12,2) DEFAULT 0,
        bonus_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        is_credit_card BOOLEAN DEFAULT false
      );
    `);

    // Seed users
    const hashAna     = await bcrypt.hash('ana123', 10);
    const hashClaudio = await bcrypt.hash('claudio123', 10);

    await sequelize.query(`
      INSERT INTO users (name, password_hash)
      VALUES ('Ana', :hashAna), ('Claudio', :hashClaudio)
      ON CONFLICT (name) DO NOTHING;
    `, { replacements: { hashAna, hashClaudio } });

    // Link partners bidirectionally
    await sequelize.query(`
      UPDATE users
      SET partner_id = (SELECT id FROM users WHERE name = 'Claudio')
      WHERE name = 'Ana';

      UPDATE users
      SET partner_id = (SELECT id FROM users WHERE name = 'Ana')
      WHERE name = 'Claudio';
    `);

    console.log('✅ Tables created / migrated (users=UUID, expenses/settings=SERIAL)');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};

module.exports = { createTables };
