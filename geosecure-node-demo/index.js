// ============================================================================
// GeoSecureOTP - Node.js OTP Server (Debug Enabled)
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

// --------------------------------------------------------------------------
// Environment Variables
// --------------------------------------------------------------------------
const PORT = 4000;
const GMAIL_EMAIL = process.env.GMAIL_EMAIL;
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS;
const JWT_SECRET = process.env.JWT_SECRET || "temp_jwt_secret";

// Debug Logs
console.log(">>> ENV LOADED:");
console.log("   GMAIL_EMAIL:", GMAIL_EMAIL);
console.log("   GMAIL_APP_PASS:", GMAIL_APP_PASS ? "(OK)" : "(MISSING)");
console.log("   JWT_SECRET:", JWT_SECRET);

// --------------------------------------------------------------------------
// Validation of ENV Vars
// --------------------------------------------------------------------------
if (!GMAIL_EMAIL || !GMAIL_APP_PASS) {
    console.error("❌ ERROR: Gmail credentials are missing. Set env variables before running.");
    console.error('Example:');
    console.error('$env:GMAIL_EMAIL="your@gmail.com"');
    console.error('$env:GMAIL_APP_PASS="your_app_password"');
    process.exit(1);
}

// --------------------------------------------------------------------------
// Nodemailer (Gmail SMTP) Setup
// --------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: GMAIL_EMAIL,
        pass: GMAIL_APP_PASS
    }
});

// --------------------------------------------------------------------------
// SQLite Database Setup
// --------------------------------------------------------------------------
const db = new sqlite3.Database("./otp.db", (err) => {
    if (err) {
        console.error("❌ Failed to open SQLite DB:", err);
        process.exit(1);
    }
    console.log("✓ SQLite database connected.");
});

// Create Tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        role TEXT,
        created_at INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS otps (
        email TEXT,
        hash TEXT,
        salt TEXT,
        expires_at INTEGER,
        used INTEGER DEFAULT 0,
        created_at INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS logs (
        email TEXT,
        event TEXT,
        timestamp INTEGER
    )`);

    // Insert demo user
    db.get("SELECT * FROM users WHERE email = ?", ["test@example.com"], (err, row) => {
        if (!row) {
            db.run(
                "INSERT INTO users (email, role, created_at) VALUES (?, ?, ?)",
                ["test@example.com", "lower", Date.now()]
            );
            console.log("✓ Demo user added: test@example.com");
        }
    });
});

// --------------------------------------------------------------------------
// Express Setup
// --------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

// --------------------------------------------------------------------------
// Helper Functions
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

    console.log(">>> /send-otp called for email:", email);

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (!user) return res.json({ error: "email-not-registered" });

        const otp = generateOtp();
        const salt = crypto.randomBytes(16).toString("hex");
        const hash = hashOtp(otp, salt);
        const expires = Date.now() + 5 * 60 * 1000; // 5 mins

        db.run(
            "INSERT INTO otps (email, hash, salt, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
            [email, hash, salt, expires, Date.now()]
        );

        // Send Email
        try {
            await transporter.sendMail({
                from: `GeoSecureOTP <${GMAIL_EMAIL}>`,
                to: email,
                subject: "Your OTP Code",
                text: `Your OTP is for login ${otp}`,
                html: `<h3 color="red">Your OTP is <b color="red">${otp}</b></h3>`
            });

            console.log("✓ OTP sent to:", email);
            return res.json({ success: true, message: "otp-sent" });
        } catch (e) {
            console.error("❌ Email sending failed:", e);
            return res.json({ error: "email-failed" });
        }
    });
});

// --------------------------------------------------------------------------
// VERIFY OTP
// --------------------------------------------------------------------------
app.post("/verify-otp", (req, res) => {
    const email = (req.body.email || "").trim().toLowerCase();
    const otp = (req.body.otp || "").trim();

    console.log(">>> /verify-otp called for email:", email);

    db.get(
        "SELECT * FROM otps WHERE email = ? ORDER BY created_at DESC LIMIT 1",
        [email],
        (err, row) => {
            if (!row) return res.json({ error: "no-otp" });
            if (row.used) return res.json({ error: "otp-used" });
            if (Date.now() > row.expires_at) return res.json({ error: "otp-expired" });

            const attemptHash = hashOtp(otp, row.salt);
            if (attemptHash !== row.hash) return res.json({ error: "otp-wrong" });

            // Mark OTP as used
            db.run("UPDATE otps SET used = 1 WHERE email = ?", [email]);

            // Generate JWT
            const token = jwt.sign({ email: email }, JWT_SECRET, { expiresIn: "2h" });

            console.log("✓ OTP verified for:", email);
            return res.json({ success: true, token });
        }
    );
});


// --------------------------------------------------------------------------
// PROFILE - returns email & role for Bearer token
// --------------------------------------------------------------------------
app.get("/profile", (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) return res.status(401).json({ error: "unauth" });
    const token = auth.split(" ")[1];
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: "invalid-token" });
    }
    const email = (payload.email || "").toLowerCase();
    if (!email) return res.status(400).json({ error: "no-email" });

    db.get("SELECT email, role FROM users WHERE email = ?", [email], (err, row) => {
      if (err) {
        console.error("profile db error:", err);
        return res.status(500).json({ error: "db-error" });
      }
      if (!row) return res.status(404).json({ error: "user-not-found" });
      return res.json({ email: row.email, role: row.role });
    });
  } catch (err) {
    console.error("profile error:", err);
    return res.status(500).json({ error: "internal-error" });
  }
});


// --------------------------------------------------------------------------
// START SERVER
// --------------------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`>>> GeoSecureOTP Server running at http://localhost:${PORT}`);
});
