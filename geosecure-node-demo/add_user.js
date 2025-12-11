// add_user.js — insert/replace a user into otp.db
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'otp.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open DB:', err.message);
    process.exit(1);
  }
});

const email = process.argv[2];
if (!email) {
  console.error('Usage: node add_user.js user@example.com');
  process.exit(1);
}

const now = Date.now();
const sql = `INSERT OR REPLACE INTO users(email, role, created_at) VALUES (?, ?, ?)`;

db.run(sql, [email.toLowerCase().trim(), 'lower', now], function (err) {
  if (err) {
    console.error('Insert error:', err.message);
    db.close();
    process.exit(1);
  }
  console.log('User added/updated:', email);
  db.close();
});
