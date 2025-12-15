// ============================================================================
// GeoSecureOTP - Complete Node.js Backend
// ============================================================================

console.log(">>> Starting GeoSecureOTP Server (debug mode)...");

// --------------------------------------------------------------------------
// Imports
// --------------------------------------------------------------------------
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const path = require("path");
const multer = require("multer");

// --------------------------------------------------------------------------
// Environment Variables
// --------------------------------------------------------------------------
const PORT = 4000;
const GMAIL_EMAIL = process.env.GMAIL_EMAIL;
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS;
const JWT_SECRET = process.env.JWT_SECRET || "temp_jwt_secret";

// --------------------------------------------------------------------------
// Validate ENV
// --------------------------------------------------------------------------
if (!GMAIL_EMAIL || !GMAIL_APP_PASS) {
  console.error("❌ Gmail credentials missing");
  process.exit(1);
}

// --------------------------------------------------------------------------
// Mailer
// --------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: GMAIL_EMAIL, pass: GMAIL_APP_PASS },
});

// --------------------------------------------------------------------------
// Database
// --------------------------------------------------------------------------
const DB_PATH = path.join(__dirname, "otp.db");

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ DB open failed", err);
    process.exit(1);
  }
  console.log("✓ SQLite DB connected at:", DB_PATH);
});

// --------------------------------------------------------------------------
// Create Tables
// --------------------------------------------------------------------------
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      role TEXT,
      created_at INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS otps (
      email TEXT,
      hash TEXT,
      salt TEXT,
      expires_at INTEGER,
      used INTEGER DEFAULT 0,
      created_at INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS boundary (
      id INTEGER PRIMARY KEY,
      lat REAL,
      lon REAL,
      radius INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT,
      path TEXT,
      active INTEGER DEFAULT 1
    )
  `);
});

// --------------------------------------------------------------------------
// Express App
// --------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

// --------------------------------------------------------------------------
// JWT Middleware
// --------------------------------------------------------------------------
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    req.user = jwt.verify(auth.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "invalid-token" });
  }
}

// --------------------------------------------------------------------------
// OTP Helpers
// --------------------------------------------------------------------------
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(otp, salt) {
  return crypto.createHmac("sha256", salt).update(otp).digest("hex");
}

// --------------------------------------------------------------------------
// SEND OTP
// --------------------------------------------------------------------------
app.post("/send-otp", (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (!user) return res.json({ error: "email-not-registered" });

    const otp = generateOtp();
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = hashOtp(otp, salt);
    const expires = Date.now() + 5 * 60 * 1000;

    db.run(
      "INSERT INTO otps (email, hash, salt, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
      [email, hash, salt, expires, Date.now()]
    );

    try {
      await transporter.sendMail({
        from: `GeoSecureOTP <${GMAIL_EMAIL}>`,
        to: email,
        subject: "Your OTP",
        text: `Your OTP is ${otp}`,
      });
      res.json({ success: true });
    } catch {
      res.json({ error: "email-failed" });
    }
  });
});

// --------------------------------------------------------------------------
// VERIFY OTP
// --------------------------------------------------------------------------
app.post("/verify-otp", (req, res) => {
  const email = req.body.email.toLowerCase();
  const otp = req.body.otp;

  db.get(
    "SELECT * FROM otps WHERE email=? ORDER BY created_at DESC LIMIT 1",
    [email],
    (err, row) => {
      if (!row) return res.json({ error: "no-otp" });
      if (row.used || Date.now() > row.expires_at) return res.json({ error: "expired" });

      if (hashOtp(otp, row.salt) !== row.hash) {
        return res.json({ error: "wrong-otp" });
      }

      db.run("UPDATE otps SET used=1 WHERE email=?", [email]);
      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "2h" });
      res.json({ success: true, token });
    }
  );
});

// --------------------------------------------------------------------------
// PROFILE
// --------------------------------------------------------------------------
app.get("/profile", authMiddleware, (req, res) => {
  db.get(
    "SELECT email, role FROM users WHERE email=?",
    [req.user.email],
    (err, row) => {
      if (!row) return res.status(404).json({ error: "not-found" });
      res.json(row);
    }
  );
});

// --------------------------------------------------------------------------
// ADMIN - CREATE USER
// --------------------------------------------------------------------------
app.post("/admin/create-user", authMiddleware, (req, res) => {
  const { email, role } = req.body;

  db.get(
    "SELECT role FROM users WHERE email=?",
    [req.user.email],
    (err, admin) => {
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "not-admin" });
      }

      db.run(
        "INSERT INTO users (email, role, created_at) VALUES (?, ?, ?)",
        [email.toLowerCase(), role, Date.now()],
        (err) => {
          if (err) return res.status(409).json({ error: "exists" });
          res.json({ success: true });
        }
      );
    }
  );
});

// --------------------------------------------------------------------------
// ADMIN - GEO BOUNDARY
// --------------------------------------------------------------------------
app.post("/admin/set-boundary", authMiddleware, (req, res) => {
  const { lat, lon, radius } = req.body;

  db.get(
    "SELECT role FROM users WHERE email=?",
    [req.user.email],
    (err, row) => {
      if (!row || row.role !== "admin") {
        return res.status(403).json({ error: "not-admin" });
      }

      db.run("DELETE FROM boundary");
      db.run(
        "INSERT INTO boundary (lat, lon, radius) VALUES (?, ?, ?)",
        [lat, lon, radius],
        () => res.json({ success: true })
      );
    }
  );
});

// --------------------------------------------------------------------------
// FILE UPLOAD (ADMIN)
// --------------------------------------------------------------------------
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "uploads"),
    filename: (req, file, cb) =>
      cb(null, Date.now() + "-" + file.originalname),
  }),
});

app.post(
  "/admin/upload-file",
  authMiddleware,
  upload.single("file"),
  (req, res) => {
    db.get(
      "SELECT role FROM users WHERE email=?",
      [req.user.email],
      (err, row) => {
        if (!row || row.role !== "admin") {
          return res.status(403).json({ error: "not-admin" });
        }

        db.run(
          "INSERT INTO files (filename, path) VALUES (?, ?)",
          [req.file.originalname, req.file.filename],
          () => res.json({ success: true })
        );
      }
    );
  }
);

// --------------------------------------------------------------------------
// LIST FILES (USER)
// --------------------------------------------------------------------------
app.get("/files", authMiddleware, (req, res) => {
  db.all("SELECT id, filename FROM files WHERE active=1", (err, rows) => {
    res.json(rows || []);
  });
});

// --------------------------------------------------------------------------
// DOWNLOAD FILE
// --------------------------------------------------------------------------
app.get("/files/:id/download", authMiddleware, (req, res) => {
  db.get(
    "SELECT * FROM files WHERE id=?",
    [req.params.id],
    (err, row) => {
      if (!row) return res.status(404).end();
      res.download(path.join(__dirname, "uploads", row.path), row.filename);
    }
  );
});

// --------------------------------------------------------------------------
// START SERVER
// --------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`>>> GeoSecureOTP running at http://localhost:${PORT}`);
});
