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
// Security Headers — disable screen capture, embedding, sniffing
// --------------------------------------------------------------------------
app.use((req, res, next) => {
  // Block browser-level screen capture API where supported
  res.setHeader("Permissions-Policy", "screen-wake-lock=(), display-capture=()");
  // Prevent clickjacking / iframe embedding
  res.setHeader("X-Frame-Options", "DENY");
  // Prevent MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // No caching of sensitive responses
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  next();
});

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

  db.run(`
    CREATE TABLE IF NOT EXISTS access_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT,
      file_id    INTEGER,
      filename   TEXT,
      lat        REAL,
      lon        REAL,
      ip         TEXT,
      status     TEXT,
      reason     TEXT,
      timestamp  INTEGER
    )
  `);

  // Login activity log
  db.run(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      email     TEXT,
      event     TEXT,
      ip        TEXT,
      timestamp INTEGER
    )
  `);

  // OTP attempt tracking for brute-force lockout
  db.run(`
    CREATE TABLE IF NOT EXISTS otp_attempts (
      email      TEXT PRIMARY KEY,
      attempts   INTEGER DEFAULT 0,
      locked_until INTEGER DEFAULT 0
    )
  `);

  // Folders
  db.run(`
    CREATE TABLE IF NOT EXISTS folders (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      icon       TEXT DEFAULT 'folder',
      color      TEXT DEFAULT '#3b82f6',
      created_by TEXT,
      created_at INTEGER
    )
  `);

  // Add folder_id to files if column doesn't exist yet (safe migration)
  db.run(`ALTER TABLE files ADD COLUMN folder_id INTEGER DEFAULT NULL`, () => {});
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

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function insertLog({ userEmail, fileId, filename, lat, lon, ip, status, reason }) {
  db.run(
    `INSERT INTO access_logs
       (user_email, file_id, filename, lat, lon, ip, status, reason, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userEmail,
      fileId   || null,
      filename || null,
      lat      || null,
      lon      || null,
      ip,
      status,
      reason   || null,
      Date.now(),
    ]
  );
}

function insertLoginLog({ email, event, ip }) {
  db.run(
    `INSERT INTO login_logs (email, event, ip, timestamp) VALUES (?, ?, ?, ?)`,
    [email, event, ip, Date.now()]
  );
}

// OTP brute-force helpers
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCKOUT_MS   = 15 * 60 * 1000; // 15 minutes

function checkLockout(email, cb) {
  db.get("SELECT * FROM otp_attempts WHERE email=?", [email], (err, row) => {
    if (!row) return cb(false, 0);
    if (row.locked_until > Date.now()) return cb(true, row.locked_until);
    cb(false, row.attempts);
  });
}

function recordFailedAttempt(email) {
  db.get("SELECT * FROM otp_attempts WHERE email=?", [email], (err, row) => {
    const attempts = (row?.attempts || 0) + 1;
    const lockedUntil = attempts >= OTP_MAX_ATTEMPTS
      ? Date.now() + OTP_LOCKOUT_MS : 0;

    if (row) {
      db.run(
        "UPDATE otp_attempts SET attempts=?, locked_until=? WHERE email=?",
        [attempts, lockedUntil, email]
      );
    } else {
      db.run(
        "INSERT INTO otp_attempts (email, attempts, locked_until) VALUES (?,?,?)",
        [email, attempts, lockedUntil]
      );
    }
  });
}

function clearAttempts(email) {
  db.run("UPDATE otp_attempts SET attempts=0, locked_until=0 WHERE email=?", [email]);
}

// --------------------------------------------------------------------------
// SEND OTP
// --------------------------------------------------------------------------
app.post("/send-otp", (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const ip    = getClientIp(req);

  db.get("SELECT * FROM users WHERE email=?", [email], async (err, user) => {
    if (!user) {
      insertLoginLog({ email, event: "otp-request-unknown-email", ip });
      return res.json({ error: "email-not-registered" });
    }

    // Check lockout
    checkLockout(email, async (locked, lockedUntil) => {
      if (locked) {
        const mins = Math.ceil((lockedUntil - Date.now()) / 60000);
        insertLoginLog({ email, event: "otp-request-locked", ip });
        return res.status(429).json({
          error: "account-locked",
          message: `Too many attempts. Try again in ${mins} minute(s).`,
          lockedUntil,
        });
      }

      const otp     = generateOtp();
      const salt    = crypto.randomBytes(16).toString("hex");
      const hash    = hashOtp(otp, salt);
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

      insertLoginLog({ email, event: "otp-sent", ip });
      res.json({ success: true });
    });
  });
});

// --------------------------------------------------------------------------
// VERIFY OTP
// --------------------------------------------------------------------------
app.post("/verify-otp", (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const otp   = req.body.otp;
  const ip    = getClientIp(req);

  // Check lockout first
  checkLockout(email, (locked, lockedUntil) => {
    if (locked) {
      const mins = Math.ceil((lockedUntil - Date.now()) / 60000);
      insertLoginLog({ email, event: "verify-blocked-locked", ip });
      return res.status(429).json({
        error: "account-locked",
        message: `Too many attempts. Try again in ${mins} minute(s).`,
        lockedUntil,
      });
    }

    db.get(
      "SELECT rowid,* FROM otps WHERE email=? ORDER BY created_at DESC LIMIT 1",
      [email],
      (err, row) => {
        if (!row || row.used || Date.now() > row.expires_at) {
          insertLoginLog({ email, event: "verify-fail-expired", ip });
          return res.json({ error: "otp-invalid" });
        }

        if (hashOtp(otp, row.salt) !== row.hash) {
          recordFailedAttempt(email);
          insertLoginLog({ email, event: "verify-fail-wrong-otp", ip });

          // Check if now locked after this attempt
          checkLockout(email, (nowLocked, lockedUntil2) => {
            if (nowLocked) {
              return res.status(429).json({
                error: "account-locked",
                message: "Too many wrong attempts. Account locked for 15 minutes.",
                lockedUntil: lockedUntil2,
              });
            }
            return res.json({ error: "wrong-otp" });
          });
          return;
        }

        // Success — clear attempts, mark OTP used
        clearAttempts(email);
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
            insertLoginLog({ email, event: "login-success", ip });
            res.json({ success: true, token });
          }
        );
      }
    );
  });
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
    const { minAccessLevel, folderId } = req.body;

    db.run(
      "INSERT INTO files (filename, path, owner_email, min_access_level, folder_id) VALUES (?, ?, ?, ?, ?)",
      [req.file.originalname, req.file.filename, req.user.email, minAccessLevel, folderId || null],
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
  const ip = getClientIp(req);

  db.get("SELECT * FROM boundary LIMIT 1", [], (err, boundary) => {
    if (!boundary) {
      insertLog({
        userEmail: req.user.email, fileId: req.params.id,
        lat, lon, ip, status: "denied", reason: "geo-not-configured",
      });
      return res.status(403).json({ error: "geo-not-configured" });
    }

    const dist = distanceMeters(lat, lon, boundary.lat, boundary.lon);
    if (dist > boundary.radius) {
      db.get("SELECT filename FROM files WHERE id=?", [req.params.id], (err2, f) => {
        insertLog({
          userEmail: req.user.email, fileId: req.params.id,
          filename: f?.filename, lat, lon, ip,
          status: "denied", reason: "outside-allowed-location",
        });
      });
      return res.status(403).json({ error: "outside-allowed-location" });
    }

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
          insertLog({
            userEmail: req.user.email, fileId: file.id,
            filename: file.filename, lat, lon, ip,
            status: "denied", reason: "not-allowed",
          });
          return res.status(403).json({ error: "not-allowed" });
        }

        insertLog({
          userEmail: req.user.email, fileId: file.id,
          filename: file.filename, lat, lon, ip,
          status: "success", reason: null,
        });

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
    db.run(
      "UPDATE files SET active=0 WHERE id=?",
      [req.params.id],
      function () {
        if (this.changes === 0)
          return res.status(404).json({ error: "file-not-found" });
        res.json({ success: true });
      }
    );
  }
);

// --------------------------------------------------------------------------
// ADMIN - ACCESS LOGS
// --------------------------------------------------------------------------
app.get(
  "/admin/logs",
  authMiddleware,
  requireLevel(ACCESS.ADMIN),
  (req, res) => {
    const limit  = parseInt(req.query.limit)  || 200;
    const filter = req.query.filter || "all";

    let where = "";
    if (filter === "denied")  where = "WHERE status='denied'";
    if (filter === "success") where = "WHERE status='success'";

    db.all(
      `SELECT * FROM access_logs ${where} ORDER BY timestamp DESC LIMIT ?`,
      [limit],
      (err, rows) => res.json(rows || [])
    );
  }
);

app.get(
  "/admin/logs/unread-count",
  authMiddleware,
  requireLevel(ACCESS.ADMIN),
  (req, res) => {
    const since = parseInt(req.query.since) || 0;
    db.get(
      "SELECT COUNT(*) as count FROM access_logs WHERE timestamp > ? AND status='denied'",
      [since],
      (err, row) => res.json({ count: row?.count || 0 })
    );
  }
);

// --------------------------------------------------------------------------
// ADMIN - LOGIN LOGS
// --------------------------------------------------------------------------
app.get(
  "/admin/login-logs",
  authMiddleware,
  requireLevel(ACCESS.ADMIN),
  (req, res) => {
    const limit = parseInt(req.query.limit) || 200;
    db.all(
      "SELECT * FROM login_logs ORDER BY timestamp DESC LIMIT ?",
      [limit],
      (err, rows) => res.json(rows || [])
    );
  }
);

// --------------------------------------------------------------------------
// FOLDERS — CRUD
// --------------------------------------------------------------------------
app.get("/admin/folders", authMiddleware, requireLevel(ACCESS.ADMIN), (req, res) => {
  db.all("SELECT * FROM folders ORDER BY name ASC", [], (err, rows) => res.json(rows || []));
});

app.get("/folders", authMiddleware, (req, res) => {
  db.all("SELECT * FROM folders ORDER BY name ASC", [], (err, rows) => res.json(rows || []));
});

app.post("/admin/folders", authMiddleware, requireLevel(ACCESS.ADMIN), (req, res) => {
  const { name, icon, color } = req.body;
  if (!name) return res.status(400).json({ error: "name-required" });
  db.run(
    "INSERT INTO folders (name, icon, color, created_by, created_at) VALUES (?,?,?,?,?)",
    [name, icon || "folder", color || "#3b82f6", req.user.email, Date.now()],
    function (err) {
      if (err) return res.status(409).json({ error: "exists" });
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.put("/admin/folders/:id", authMiddleware, requireLevel(ACCESS.ADMIN), (req, res) => {
  const { name, icon, color } = req.body;
  db.run(
    "UPDATE folders SET name=?, icon=?, color=? WHERE id=?",
    [name, icon, color, req.params.id],
    () => res.json({ success: true })
  );
});

app.delete("/admin/folders/:id", authMiddleware, requireLevel(ACCESS.ADMIN), (req, res) => {
  // Unassign files in this folder first
  db.run("UPDATE files SET folder_id=NULL WHERE folder_id=?", [req.params.id]);
  db.run("DELETE FROM folders WHERE id=?", [req.params.id], () => res.json({ success: true }));
});

// Assign file to folder
app.put("/admin/files/:id/folder", authMiddleware, requireLevel(ACCESS.ADMIN), (req, res) => {
  const { folderId } = req.body;
  db.run(
    "UPDATE files SET folder_id=? WHERE id=?",
    [folderId || null, req.params.id],
    () => res.json({ success: true })
  );
});

// List files with folder info
app.get("/files/with-folders", authMiddleware, (req, res) => {
  if (req.user.accessLevel === ACCESS.ADMIN) {
    db.all(
      `SELECT f.*, fo.name as folder_name, fo.color as folder_color, fo.icon as folder_icon
       FROM files f LEFT JOIN folders fo ON f.folder_id = fo.id
       WHERE f.active=1 ORDER BY fo.name ASC, f.filename ASC`,
      [],
      (err, rows) => res.json(rows || [])
    );
  } else {
    db.all(
      `SELECT f.*, fo.name as folder_name, fo.color as folder_color, fo.icon as folder_icon
       FROM files f LEFT JOIN folders fo ON f.folder_id = fo.id
       WHERE f.active=1 AND (f.owner_email=? OR f.min_access_level=?)
       ORDER BY fo.name ASC, f.filename ASC`,
      [req.user.email, req.user.accessLevel],
      (err, rows) => res.json(rows || [])
    );
  }
});

// --------------------------------------------------------------------------
// START
// --------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`GeoSecureOTP running at http://localhost:${PORT}`);
});