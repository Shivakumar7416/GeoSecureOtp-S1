const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(path.join(__dirname, "otp.db"));

db.get(
  "SELECT email, access_level FROM users WHERE email=?",
  ["nikhil8hh@gmail.com"],
  (err, row) => {
    if (err) {
      console.error(err);
    } else {
      console.log(row);
    }
    db.close();
  }
);
