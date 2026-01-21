// ============================================================================
// GeoSecureOTP - Complete Node.js Backend (RBAC + GEO LOCATION ENFORCED)
// ============================================================================
require("dotenv").config();

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
const fs = require("fs");

// --------------------------------------------------------------------------
// Environment Variables
// --------------------------------------------------------------------------
const PORT = 4000;
const GMAIL_EMAIL = process.env.GMAIL_EMAIL;
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS;
const JWT_SECRET = process.env.JWT_SECRET || "temp_jwt_secret";

// Access Levels
const ACCESS = {
  LOW: 1,
  HIGH: 2,
  ADMIN: 3,
};

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
      access_level INTEGER DEFAULT 1,
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
      min_access_level INTEGER,
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

function requireLevel(level) {
  return (req, res, next) => {
    if (req.user.accessLevel >= level) next();
    else res.status(403).json({ error: "access-denied" });
  };
}

// --------------------------------------------------------------------------
// GEO UTILITY
// --------------------------------------------------------------------------
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --------------------------------------------------------------------------
// OTP HELPERS
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

  db.get("SELECT * FROM users WHERE email=?", [email], async (err, user) => {
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
    "SELECT rowid,* FROM otps WHERE email=? ORDER BY created_at DESC LIMIT 1",
    [email],
    (err, row) => {
      if (!row || row.used || Date.now() > row.expires_at) {
        return res.json({ error: "otp-invalid" });
      }

      if (hashOtp(otp, row.salt) !== row.hash) {
        return res.json({ error: "wrong-otp" });
      }

      db.run("UPDATE otps SET used=1 WHERE rowid=?", [row.rowid]);

      db.get(
        "SELECT access_level FROM users WHERE email=?",
        [email],
        (err, user) => {
          const token = jwt.sign(
            { email, accessLevel: user.access_level },
            JWT_SECRET,
            { expiresIn: "2h" }
          );
          res.json({ success: true, token });
        }
      );
    }
  );
});

// --------------------------------------------------------------------------
// PROFILE
// --------------------------------------------------------------------------
app.get("/profile", authMiddleware, (req, res) => {
  res.json({
    email: req.user.email,
    accessLevel: req.user.accessLevel,
  });
});

// --------------------------------------------------------------------------
// ADMIN - CREATE USER
// --------------------------------------------------------------------------
app.post(
  "/admin/create-user",
  authMiddleware,
  requireLevel(ACCESS.ADMIN),
  (req, res) => {
    const { email, accessLevel } = req.body;

    db.run(
      "INSERT INTO users (email, access_level, created_at) VALUES (?, ?, ?)",
      [email.toLowerCase(), accessLevel, Date.now()],
      (err) => {
        if (err) return res.status(409).json({ error: "exists" });
        res.json({ success: true });
      }
    );
  }
);

// --------------------------------------------------------------------------
// ADMIN - SAVE GEO BOUNDARY (MAIN)
// --------------------------------------------------------------------------
app.post(
  "/admin/geo-boundary",
  authMiddleware,
  requireLevel(ACCESS.ADMIN),
  (req, res) => {
    const { lat, lon, radius } = req.body;
    if (!lat || !lon || !radius)
      return res.status(400).json({ error: "invalid-data" });

    db.serialize(() => {
      db.run("DELETE FROM boundary");
      db.run(
        "INSERT INTO boundary (lat, lon, radius) VALUES (?, ?, ?)",
        [lat, lon, radius],
        () => res.json({ success: true })
      );
    });
  }
);

// --------------------------------------------------------------------------
// ADMIN - SAVE GEO BOUNDARY (ALIAS FOR OLD FRONTEND)
// --------------------------------------------------------------------------
app.post(
  "/admin/set-boundary",
  authMiddleware,
  requireLevel(ACCESS.ADMIN),
  (req, res) => {
    const { lat, lon, radius } = req.body;
    if (!lat || !lon || !radius)
      return res.status(400).json({ error: "invalid-data" });

    db.serialize(() => {
      db.run("DELETE FROM boundary");
      db.run(
        "INSERT INTO boundary (lat, lon, radius) VALUES (?, ?, ?)",
        [lat, lon, radius],
        () => res.json({ success: true })
      );
    });
  }
);

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
  requireLevel(ACCESS.ADMIN),
  upload.single("file"),
  (req, res) => {
    const { minAccessLevel } = req.body;
    db.run(
      "INSERT INTO files (filename, path, min_access_level) VALUES (?, ?, ?)",
      [req.file.originalname, req.file.filename, minAccessLevel],
      () => res.json({ success: true })
    );
  }
);

// --------------------------------------------------------------------------
// LIST FILES
// --------------------------------------------------------------------------
app.get("/files", authMiddleware, (req, res) => {
  db.all(
    "SELECT id, filename, min_access_level FROM files WHERE active=1 AND min_access_level <= ?",
    [req.user.accessLevel],
    (err, rows) => res.json(rows || [])
  );
});

// --------------------------------------------------------------------------
// DOWNLOAD FILE (RBAC + GEO)
// --------------------------------------------------------------------------
app.post("/files/:id/download", authMiddleware, (req, res) => {
  const { lat, lon } = req.body;
  if (!lat || !lon)
    return res.status(400).json({ error: "location-required" });

  db.get("SELECT * FROM boundary LIMIT 1", [], (err, boundary) => {
    if (!boundary)
      return res.status(403).json({ error: "geo-not-configured" });

    const dist = distanceMeters(
      lat,
      lon,
      boundary.lat,
      boundary.lon
    );

    if (dist > boundary.radius)
      return res.status(403).json({ error: "outside-allowed-location" });

    db.get(
      "SELECT * FROM files WHERE id=? AND active=1",
      [req.params.id],
      (err, file) => {
        if (!file) return res.status(404).end();
        if (req.user.accessLevel < file.min_access_level)
          return res.status(403).json({ error: "access-denied" });

        res.download(
          path.join(__dirname, "uploads", file.path),
          file.filename
        );
      }
    );
  });
});

// --------------------------------------------------------------------------
// ADMIN - DELETE FILE
// --------------------------------------------------------------------------
app.delete(
  "/admin/files/:id",
  authMiddleware,
  requireLevel(ACCESS.ADMIN),
  (req, res) => {
    db.get(
      "SELECT * FROM files WHERE id=? AND active=1",
      [req.params.id],
      (err, file) => {
        if (!file)
          return res.status(404).json({ error: "file-not-found" });

        fs.unlink(path.join(__dirname, "uploads", file.path), () => {
          db.run(
            "UPDATE files SET active=0 WHERE id=?",
            [req.params.id],
            () => res.json({ success: true })
          );
        });
      }
    );
  }
);

// --------------------------------------------------------------------------
// START SERVER
// --------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`>>> GeoSecureOTP running at http://localhost:${PORT}`);
});
