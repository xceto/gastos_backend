require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createTables } = require('./db/migrate');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/expenses', require('./routes/expenses'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Boot
createTables()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ DB init failed:', err);
    process.exit(1);
  });
