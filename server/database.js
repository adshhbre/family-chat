const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Render 환경에서는 DATABASE_PATH 환경변수를 사용하고, 로컬에서는 현재 폴더의 chat.db를 사용합니다.
const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'chat.db');

// 데이터베이스에 연결합니다. 파일이 없으면 새로 생성됩니다.
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the SQLite database.', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Promise 기반으로 db.run, db.get, db.all을 사용하기 위한 래퍼 함수들입니다.
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        // this.lastID는 방금 INSERT된 행의 ID를 반환합니다.
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};


const initDb = async () => {
  // users 테이블에 avatar 컬럼 추가
  const usersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT
    );
  `;

  // messages 테이블에 avatar 컬럼 추가
  const messagesTableQuery = `
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      username TEXT NOT NULL,
      avatar TEXT,
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await dbRun(usersTableQuery);
    console.log('Users table created or already exists.');
    await dbRun(messagesTableQuery);
    console.log('Messages table created or already exists.');
  } catch (err) {
    console.error('Error initializing database tables:', err.stack);
  }
};

// 새로운 db 객체와 initDb 함수를 export 합니다.
module.exports = { db, initDb, dbRun, dbGet, dbAll };