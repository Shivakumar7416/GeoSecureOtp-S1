// ============================================================================
// GeoSecureOTP - Backend (Original Code + Added Features ONLY)
// ============================================================================

require("dotenv").config();

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
// Config
// --------------------------------------------------------------------------
const PORT = 4000;
const GMAIL_EMAIL = process.env.GMAIL_EMAIL;
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS;
const JWT_SECRET = process.env.JWT_SECRET || "temp_jwt_secret";

// --------------------------------------------------------------------------
// Access Levels
// --------------------------------------------------------------------------
const ACCESS = {
  EMPLOYEE: 1,
  MANAGER: 2,
  ADMIN: 3,
};

// --------------------------------------------------------------------------
// App
// --------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

// --------------------------------------------------------------------------
// DB
// --------------------------------------------------------------------------
const db = new sqlite3.Database(path.join(__dirname, "otp.db"));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      access_level INTEGER DEFAULT 1,
      enabled INTEGER DEFAULT 1,
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
      owner_email TEXT,
      min_access_level INTEGER,
      active INTEGER DEFAULT 1
    )
  `);
});

// --------------------------------------------------------------------------
// Mail
// --------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: GMAIL_EMAIL, pass: GMAIL_APP_PASS },
});

// --------------------------------------------------------------------------
// JWT Middleware
// --------------------------------------------------------------------------
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const decoded = jwt.verify(auth.split(" ")[1], JWT_SECRET);

    db.get(
      "SELECT enabled FROM users WHERE email=?",
      [decoded.email],
      (err, row) => {
        if (!row || row.enabled === 0) {
          return res.status(403).json({ error: "user-disabled" });
        }
        req.user = decoded;
        next();
      }
    );
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
// Helpers
// --------------------------------------------------------------------------
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(otp, salt) {
  return crypto.createHmac("sha256", salt).update(otp).digest("hex");
}

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

    await transporter.sendMail({
      from: `GeoSecureOTP <${GMAIL_EMAIL}>`,
      to: email,
      subject: "Your OTP",
      text: `Your OTP is ${otp}`,
    });

    res.json({ success: true });
  });
});

// --------------------------------------------------------------------------
// VERIFY OTP
// --------------------------------------------------------------------------
app.post("/verify-otp", (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
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
  db.get(
    "SELECT access_level FROM users WHERE email=?",
    [req.user.email],
    (err, row) => {
      if (!row) {
        return res.status(404).json({ error: "user-not-found" });
      }

      res.json({
        email: req.user.email,
        accessLevel: row.access_level, // 🔥 LIVE ROLE FROM DB
      });
    }
  );
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
// ADMIN - VIEW USERS
// --------------------------------------------------------------------------
app.get(
  "/admin/users",
  authMiddleware,
  requireLevel(ACCESS.ADMIN),
  (req, res) => {
    db.all(
      "SELECT email, access_level, enabled, created_at FROM users",
      [],
      (err, rows) => res.json(rows || [])
    );
  }
);

// --------------------------------------------------------------------------
// ADMIN - ENABLE / DISABLE / ROLE
// --------------------------------------------------------------------------
app.put("/admin/users/:email/disable", authMiddleware, requireLevel(ACCESS.ADMIN),
  (req, res) => {
    db.run("UPDATE users SET enabled=0 WHERE email=?", [req.params.email],
      () => res.json({ success: true })
    );
  }
);

app.put("/admin/users/:email/enable", authMiddleware, requireLevel(ACCESS.ADMIN),
  (req, res) => {
    db.run("UPDATE users SET enabled=1 WHERE email=?", [req.params.email],
      () => res.json({ success: true })
    );
  }
);

app.put("/admin/users/:email/role", authMiddleware, requireLevel(ACCESS.ADMIN),
  (req, res) => {
    const { accessLevel } = req.body;
    if (![1, 2, 3].includes(accessLevel))
      return res.status(400).json({ error: "invalid-role" });

    db.run(
      "UPDATE users SET access_level=? WHERE email=?",
      [accessLevel, req.params.email],
      () => res.json({ success: true })
    );
  }
);

// --------------------------------------------------------------------------
// GEO BOUNDARY
// --------------------------------------------------------------------------
app.post(
  "/admin/set-boundary",
  authMiddleware,
  requireLevel(ACCESS.ADMIN),
  (req, res) => {
    const { lat, lon, radius } = req.body;

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
// FILE UPLOAD
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
  requireLevel(ACCESS.MANAGER),
  upload.single("file"),
  (req, res) => {
    const { minAccessLevel } = req.body;

    db.run(
      "INSERT INTO files (filename, path, owner_email, min_access_level) VALUES (?, ?, ?, ?)",
      [req.file.originalname, req.file.filename, req.user.email, minAccessLevel],
      () => res.json({ success: true })
    );
  }
);


// --------------------------------------------------------------------------
// ADMIN - CHANGE FILE ACCESS LEVEL
// --------------------------------------------------------------------------
app.put(
  "/admin/files/:id/access",
  authMiddleware,
  requireLevel(ACCESS.ADMIN),
  (req, res) => {
    const { accessLevel } = req.body;

    if (![ACCESS.EMPLOYEE, ACCESS.MANAGER, ACCESS.ADMIN].includes(accessLevel)) {
      return res.status(400).json({ error: "invalid-access-level" });
    }

    db.run(
      "UPDATE files SET min_access_level=? WHERE id=?",
      [accessLevel, req.params.id],
      function () {
        if (this.changes === 0) {
          return res.status(404).json({ error: "file-not-found" });
        }
        res.json({ success: true });
      }
    );
  }
);

// --------------------------------------------------------------------------
// LIST FILES (FINAL ACCESS RULE)
// --------------------------------------------------------------------------
app.get("/files", authMiddleware, (req, res) => {
  if (req.user.accessLevel === ACCESS.ADMIN) {
    db.all(
      "SELECT id, filename, min_access_level FROM files WHERE active=1",
      [],
      (err, rows) => res.json(rows || [])
    );
  } else {
    db.all(
      `SELECT id, filename, min_access_level FROM files
       WHERE active=1
       AND (
         owner_email = ?
         OR min_access_level = ?
       )`,
      [req.user.email, req.user.accessLevel],
      (err, rows) => res.json(rows || [])
    );
  }
});

// --------------------------------------------------------------------------
// DOWNLOAD FILE (FINAL ACCESS RULE)
// --------------------------------------------------------------------------
app.post("/files/:id/download", authMiddleware, (req, res) => {
  const { lat, lon } = req.body;

  db.get("SELECT * FROM boundary LIMIT 1", [], (err, boundary) => {
    if (!boundary)
      return res.status(403).json({ error: "geo-not-configured" });

    const dist = distanceMeters(lat, lon, boundary.lat, boundary.lon);
    if (dist > boundary.radius)
      return res.status(403).json({ error: "outside-allowed-location" });

    db.get(
      "SELECT * FROM files WHERE id=? AND active=1",
      [req.params.id],
      (err, file) => {
        if (!file) return res.status(404).end();

        if (
          req.user.accessLevel !== ACCESS.ADMIN &&
          file.owner_email !== req.user.email &&
          file.min_access_level !== req.user.accessLevel
        ) {
          return res.status(403).json({ error: "not-allowed" });
        }

        res.download(
          path.join(__dirname, "uploads", file.path),
          file.filename
        );
      }
    );
  });
});

// --------------------------------------------------------------------------
// START
// --------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`GeoSecureOTP running at http://localhost:${PORT}`);
});
