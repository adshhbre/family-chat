const { Pool } = require('pg');

// Render PostgreSQL 서비스는 'DATABASE_URL' 환경 변수를 자동으로 제공합니다.
// pg 라이브러리는 이 변수를 사용하여 자동으로 데이터베이스에 연결합니다.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render의 Postgres에 연결할 때는 SSL 연결이 필요합니다.
  ssl: {
    rejectUnauthorized: false
  }
});

const db = {
  query: (text, params) => pool.query(text, params),
};

const initDb = async () => {
  const usersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
  `;

  const messagesTableQuery = `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  try {
    await pool.query(usersTableQuery);
    console.log('Users table created or already exists.');
    await pool.query(messagesTableQuery);
    console.log('Messages table created or already exists.');
  } catch (err) {
    console.error('Error initializing database tables:', err.stack);
  }
};

module.exports = { db, initDb };