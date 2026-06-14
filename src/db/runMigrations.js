const { execSync } = require('child_process');

const runMigrations = async () => {
  try {
    console.log('⏳ Running database migrations via Sequelize CLI...');
    // Run migrations
    execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
    
    console.log('⏳ Running database seeders...');
    // Run seeders (safe since our seed checks for existence)
    execSync('npx sequelize-cli db:seed:all', { stdio: 'inherit' });

    console.log('✅ Database is up to date.');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};

module.exports = { runMigrations };
