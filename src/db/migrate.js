const sequelize = require('./connection');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const createTables = async () => {
  try {
    // 1. Create tables and check structure
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS monthly_settings (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        month INT NOT NULL,
        year INT NOT NULL,
        salary DECIMAL(12,2) DEFAULT 0,
        UNIQUE(user_id, month, year)
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(12,2) NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL,
        is_shared BOOLEAN DEFAULT false,
        date DATE DEFAULT CURRENT_DATE,
        month INT NOT NULL,
        year INT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 2. Add columns if they do not exist
    await sequelize.query(`
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS bonus DECIMAL(12,2) DEFAULT 0;
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS bonus_user_id INT REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS default_salary DECIMAL(12,2) DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS cc_closing_day INT DEFAULT 20;
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_credit_card BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_id INT REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS uuid UUID UNIQUE;
    `);

    // Populate UUIDs for users that don't have one
    const usersWithoutUuid = await sequelize.query(`
      SELECT id FROM users WHERE uuid IS NULL;
    `, { type: sequelize.QueryTypes.SELECT });

    for (const u of usersWithoutUuid) {
      const uId = u.id;
      const uUuid = crypto.randomUUID();
      await sequelize.query(`
        UPDATE users SET uuid = :uUuid WHERE id = :uId;
      `, { replacements: { uUuid, uId } });
    }


    // 3. Seed users with default passwords
    const hashAna = await bcrypt.hash('ana123', 10);
    const hashClaudio = await bcrypt.hash('claudio123', 10);

    // Insert Ana if she doesn't exist
    await sequelize.query(`
      INSERT INTO users (name, password_hash) 
      VALUES ('Ana', :hashAna) 
      ON CONFLICT (name) DO NOTHING;
    `, { replacements: { hashAna } });

    // Insert Claudio if he doesn't exist
    await sequelize.query(`
      INSERT INTO users (name, password_hash) 
      VALUES ('Claudio', :hashClaudio) 
      ON CONFLICT (name) DO NOTHING;
    `, { replacements: { hashClaudio } });

    // Update if they already existed but had no password_hash
    await sequelize.query(`
      UPDATE users SET password_hash = :hashAna WHERE name = 'Ana' AND password_hash IS NULL;
    `, { replacements: { hashAna } });

    await sequelize.query(`
      UPDATE users SET password_hash = :hashClaudio WHERE name = 'Claudio' AND password_hash IS NULL;
    `, { replacements: { hashClaudio } });

    // Update partner association between Ana and Claudio
    await sequelize.query(`
      UPDATE users 
      SET partner_id = (SELECT id FROM users WHERE name = 'Claudio') 
      WHERE name = 'Ana' AND partner_id IS NULL;
      
      UPDATE users 
      SET partner_id = (SELECT id FROM users WHERE name = 'Ana') 
      WHERE name = 'Claudio' AND partner_id IS NULL;
    `);

    console.log('✅ Tables created / verified / migrated (Sequelize)');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};

module.exports = { createTables };
